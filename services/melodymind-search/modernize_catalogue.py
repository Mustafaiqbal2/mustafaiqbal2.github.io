"""Collect a modern, genre-balanced Spotify catalogue with LRCLIB lyrics.

This writes a resumable CSV outside the website build. Search results are taken
from small genre/year slices so one dominant genre cannot fill the catalogue.
The command never changes Pinecone; build_catalogue.py performs that separate,
explicit step after the collected rows have been inspected.
"""

from __future__ import annotations

import argparse
import base64
import json
import os
from pathlib import Path
import re
import tempfile
import time
from typing import Any

import pandas as pd
import requests


DEFAULT_GENRES = (
    "pop", "hip hop", "r&b", "rock", "indie", "electronic", "dance",
    "punk", "metal", "country", "folk", "jazz", "soul", "reggae",
)


def arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Collect modern Spotify tracks and lyrics")
    parser.add_argument("--source-root", type=Path, required=True)
    parser.add_argument("--output", type=Path)
    parser.add_argument("--start-year", type=int, default=2015)
    parser.add_argument("--end-year", type=int, default=2026)
    parser.add_argument("--per-genre-year", type=int, default=20)
    parser.add_argument("--minimum-popularity", type=int, default=30)
    parser.add_argument("--genres", nargs="*", default=list(DEFAULT_GENRES))
    parser.add_argument("--skip-lyrics", action="store_true")
    return parser.parse_args()


def load_env(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line.strip() or line.lstrip().startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def atomic_csv(path: Path, rows: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    handle, temporary = tempfile.mkstemp(dir=path.parent, prefix=path.name, suffix=".partial")
    os.close(handle)
    pd.DataFrame(rows).to_csv(temporary, index=False)
    os.replace(temporary, path)


def normalized(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", value.casefold())


class Spotify:
    def __init__(self, client_id: str, client_secret: str) -> None:
        self.client_id = client_id
        self.client_secret = client_secret
        self.token = ""
        self.authenticate()

    def authenticate(self) -> None:
        auth = base64.b64encode(f"{self.client_id}:{self.client_secret}".encode()).decode()
        response = requests.post(
            "https://accounts.spotify.com/api/token",
            headers={"Authorization": "Basic " + auth},
            data={"grant_type": "client_credentials"},
            timeout=20,
        )
        response.raise_for_status()
        self.token = str(response.json()["access_token"])

    def search(self, genre: str, year: int, offset: int) -> list[dict[str, Any]]:
        for attempt in range(6):
            try:
                response = requests.get(
                    "https://api.spotify.com/v1/search",
                    headers={"Authorization": "Bearer " + self.token},
                    params={
                        "q": f'genre:"{genre}" year:{year}',
                        "type": "track",
                        "market": "US",
                        "limit": 10,
                        "offset": offset,
                    },
                    timeout=20,
                )
            except requests.RequestException:
                if attempt == 5:
                    raise
                time.sleep(1.5 * (attempt + 1))
                continue
            if response.status_code == 401:
                self.authenticate()
                continue
            if response.status_code != 429:
                response.raise_for_status()
                return list(response.json().get("tracks", {}).get("items", []))
            time.sleep(min(30, int(response.headers.get("Retry-After", "2"))) + attempt)
        raise RuntimeError("Spotify search remained rate limited")


def lyrics_for(track: dict[str, Any]) -> str:
    name = str(track.get("name", ""))
    artists = track.get("artists") or []
    artist = str(artists[0].get("name", "")) if artists else ""
    if not name or not artist:
        return ""
    response = None
    for attempt in range(4):
        try:
            response = requests.get(
                "https://lrclib.net/api/search",
                params={"track_name": name, "artist_name": artist},
                headers={"User-Agent": "MelodyMind catalogue builder/1.0 (portfolio demo)"},
                timeout=20,
            )
            break
        except requests.RequestException:
            if attempt < 3:
                time.sleep(1.5 * (attempt + 1))
    if response is None:
        return ""
    if response.status_code != 200:
        return ""
    target_name, target_artist = normalized(name), normalized(artist)
    duration = int(track.get("duration_ms", 0)) // 1000
    ranked: list[tuple[int, dict[str, Any]]] = []
    for item in response.json() if isinstance(response.json(), list) else []:
        plain = str(item.get("plainLyrics") or "").strip()
        if len(plain) < 80:
            continue
        score = 0
        if normalized(str(item.get("trackName", ""))) == target_name:
            score += 4
        if normalized(str(item.get("artistName", ""))) == target_artist:
            score += 4
        item_duration = int(float(item.get("duration") or 0))
        if duration and item_duration and abs(duration - item_duration) <= 4:
            score += 2
        ranked.append((score, item))
    if not ranked:
        return ""
    ranked.sort(key=lambda value: value[0], reverse=True)
    return str(ranked[0][1].get("plainLyrics") or "").strip() if ranked[0][0] >= 6 else ""


def row_for(track: dict[str, Any], genre: str, lyrics: str) -> dict[str, Any]:
    album = track.get("album") or {}
    artists = track.get("artists") or []
    artist = ", ".join(str(value.get("name", "")) for value in artists if value.get("name"))
    release = str(album.get("release_date") or "")
    return {
        "track_id": "spotify:" + str(track["id"]),
        "spotify_id": str(track["id"]),
        "name": str(track.get("name") or "Unknown"),
        "artist": artist or "Unknown",
        "album": str(album.get("name") or ""),
        "year": int(release[:4]) if release[:4].isdigit() else 0,
        "tags": genre,
        "genre": genre,
        "duration_ms": int(track.get("duration_ms") or 0),
        "explicit": bool(track.get("explicit", False)),
        "popularity": int(track.get("popularity") or 0),
        "lyrics": lyrics,
        "reddit_text": "",
        "catalogue_source": "spotify-modern-v1",
    }


def main() -> None:
    args = arguments()
    root = args.source_root.resolve()
    env = load_env(root / ".env")
    client_id = env.get("SPOTIFY_CLIENT_ID", "")
    client_secret = env.get("SPOTIFY_CLIENT_SECRET", "")
    if not client_id or not client_secret:
        raise RuntimeError("Spotify client credentials are missing")
    output = (args.output or root / "Model" / "modern_catalogue.csv").resolve()
    existing: list[dict[str, Any]] = []
    if output.is_file():
        existing = pd.read_csv(output, low_memory=False).fillna("").to_dict(orient="records")
    rows = {str(row["spotify_id"]): row for row in existing if row.get("spotify_id")}
    spotify = Spotify(client_id, client_secret)
    collected = 0
    for year in range(args.start_year, args.end_year + 1):
        for genre in args.genres:
            for offset in range(0, args.per_genre_year, 10):
                for track in spotify.search(genre, year, offset):
                    spotify_id = str(track.get("id") or "")
                    if not spotify_id or spotify_id in rows:
                        continue
                    if int(track.get("popularity") or 0) < args.minimum_popularity:
                        continue
                    lyrics = "" if args.skip_lyrics else lyrics_for(track)
                    if not args.skip_lyrics and len(lyrics) < 80:
                        continue
                    rows[spotify_id] = row_for(track, genre, lyrics)
                    collected += 1
                    if collected % 25 == 0:
                        atomic_csv(output, list(rows.values()))
                        print(json.dumps({"new_tracks": collected, "total_tracks": len(rows)}), flush=True)
                    time.sleep(0.08)
                time.sleep(0.12)
    atomic_csv(output, list(rows.values()))
    print(json.dumps({"new_tracks": collected, "total_tracks": len(rows), "output": str(output)}, indent=2))


if __name__ == "__main__":
    main()
