"""Build the evidence-rich MelodyMind Pinecone namespaces.

The command is read-only unless an explicit commit flag is supplied. It keeps the
existing namespaces intact, selects only tracks with lyric or Reddit evidence,
caps the over-represented rock/metal groups, copies the existing Model A audio
vectors into a metadata-rich namespace, and embeds lyric/evidence chunks with the
same frozen CLaMP3 text encoder used at query time.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
from pathlib import Path
import re
import sys
import tempfile
import time
from typing import Any, Iterable
import warnings

import pandas as pd
from pinecone import Pinecone


DEFAULT_AUDIO_SOURCE = "clamp3-reddit-evidence-a-v1"
DEFAULT_AUDIO_TARGET = "melodymind-audio-curated-v1"
DEFAULT_LYRICS_TARGET = "melodymind-lyrics-mpnet-v1"

GROUP_RULES: tuple[tuple[str, tuple[str, ...]], ...] = (
    ("rap", ("rap", "hip hop", "hip-hop", "hip_hop")),
    ("rnb", ("rnb", "r&b", "rhythm and blues", "soul", "funk")),
    ("pop", ("pop", "dance pop", "synthpop", "electropop")),
    ("reggae", ("reggae", "ska", "dub")),
    ("country", ("country", "americana", "bluegrass")),
    ("folk", ("folk", "singer-songwriter")),
    ("jazz", ("jazz", "blues")),
    ("electronic", ("electronic", "electronica", "house", "techno", "edm", "trance", "ambient")),
    ("punk", ("punk", "punk rock", "pop punk", "hardcore")),
    ("metal", ("metal", "heavy metal", "death metal", "doom metal", "black metal")),
    ("rock", ("rock", "alternative", "indie", "grunge", "britpop")),
    ("classical", ("classical", "soundtrack", "score", "orchestral")),
)

GROUP_CAPS = {
    "classical": 500,
    "country": 600,
    "electronic": 1000,
    "folk": 600,
    "jazz": 800,
    "metal": 500,
    "other": 600,
    "pop": 1500,
    "punk": 500,
    "rap": 1000,
    "reggae": 500,
    "rnb": 1000,
    "rock": 1200,
}


def arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build curated MelodyMind search namespaces")
    parser.add_argument("--source-root", type=Path, required=True)
    parser.add_argument("--model-dir", default="sentence-transformers/all-mpnet-base-v2", help="Lyrics text model path or Hugging Face model ID")
    parser.add_argument("--model-revision", default="e8c3b32edf5434bc2275fc9bab85f82640a19130")
    parser.add_argument("--extras", type=Path)
    parser.add_argument("--index", default="melodymind-embeddings")
    parser.add_argument("--audio-source", default=DEFAULT_AUDIO_SOURCE)
    parser.add_argument("--audio-target", default=DEFAULT_AUDIO_TARGET)
    parser.add_argument("--lyrics-target", default=DEFAULT_LYRICS_TARGET)
    parser.add_argument("--state", type=Path)
    parser.add_argument("--limit", type=int, default=0)
    parser.add_argument("--embedding-batch", type=int, default=48)
    parser.add_argument("--upsert-batch", type=int, default=100)
    parser.add_argument("--commit-audio", action="store_true")
    parser.add_argument("--commit-lyrics", action="store_true")
    return parser.parse_args()


def text(value: object) -> str:
    if value is None or (isinstance(value, float) and math.isnan(value)):
        return ""
    return re.sub(r"\s+", " ", str(value)).strip()


def tags(value: object) -> list[str]:
    values = [re.sub(r"[_-]+", " ", item.strip().lower()) for item in text(value).split(",")]
    return list(dict.fromkeys(item for item in values if item))[:24]


def group_for(values: list[str]) -> str:
    available = set(values)
    for group, aliases in GROUP_RULES:
        if available.intersection(aliases):
            return group
    return "other"


def load_source(root: Path, extras: Path | None = None) -> pd.DataFrame:
    catalogue_path = root / "Model" / "full_catalog.csv"
    info_path = root / "DataGathering" / "Music Info.csv"
    state_path = root / "AudioModel" / "retraining_runs" / "reddit_evidence" / "pinecone_reembed_state.json"
    for path in (catalogue_path, info_path, state_path):
        if not path.is_file():
            raise FileNotFoundError(path)

    catalogue = pd.read_csv(catalogue_path, low_memory=False)
    info = pd.read_csv(
        info_path,
        usecols=[
            "track_id", "tags", "genre", "year", "danceability", "energy",
            "acousticness", "instrumentalness", "valence", "tempo", "duration_ms",
        ],
        low_memory=False,
    )
    searchable = {
        str(track_id)
        for track_id in json.loads(state_path.read_text(encoding="utf-8")).get("completed_track_ids", [])
    }
    frame = catalogue.merge(info, on="track_id", how="left", suffixes=("", "_info"))
    frame = frame[frame["track_id"].astype(str).isin(searchable)].copy()
    frame["lyrics_clean"] = frame["lyrics"].map(text)
    frame["reddit_clean"] = frame["reddit_text"].map(text)
    frame["has_lyrics"] = frame["lyrics_clean"].str.len() >= 80
    frame["has_reddit"] = frame["reddit_clean"].str.len() >= 40
    frame = frame[frame["has_lyrics"] | frame["has_reddit"]]
    frame["tags_clean"] = frame["tags"].map(tags)
    frame["group"] = frame["tags_clean"].map(group_for)
    frame["catalogue_order"] = range(len(frame))
    frame["year_clean"] = pd.to_numeric(frame["year"], errors="coerce").fillna(0).astype(int)
    frame["quality"] = (
        frame["has_lyrics"].astype(int) * 3
        + frame["has_reddit"].astype(int) * 2
        + frame["tags_clean"].map(lambda value: min(len(value), 8)) * 0.08
        + frame["year_clean"].clip(lower=1980).sub(1980).clip(upper=50) * 0.002
    )
    for optional in ("album", "explicit", "popularity", "catalogue_source"):
        if optional not in frame:
            frame[optional] = None
    frame = frame.sort_values(
        ["group", "quality", "catalogue_order"],
        ascending=[True, False, True],
        kind="stable",
    )
    selected = []
    for group, rows in frame.groupby("group", sort=True):
        selected.append(rows.head(GROUP_CAPS.get(group, 600)))
    frame = pd.concat(selected, ignore_index=True)
    if extras is not None and extras.is_file():
        additions = pd.read_csv(extras, low_memory=False)
        required = {"track_id", "spotify_id", "name", "artist", "lyrics", "tags", "year"}
        missing = required.difference(additions.columns)
        if missing:
            raise ValueError("Extras are missing columns: " + ", ".join(sorted(missing)))
        additions = additions.copy()
        additions["lyrics_clean"] = additions["lyrics"].map(text)
        additions["reddit_clean"] = additions.get("reddit_text", pd.Series("", index=additions.index)).map(text)
        additions["has_lyrics"] = additions["lyrics_clean"].str.len() >= 80
        additions["has_reddit"] = additions["reddit_clean"].str.len() >= 40
        additions = additions[additions["has_lyrics"] | additions["has_reddit"]]
        additions["tags_clean"] = additions["tags"].map(tags)
        additions["group"] = additions["tags_clean"].map(group_for)
        additions["year_clean"] = pd.to_numeric(additions["year"], errors="coerce").fillna(0).astype(int)
        additions["catalogue_order"] = range(-len(additions), 0)
        additions["quality"] = 10.0
        for column in frame.columns:
            if column not in additions:
                additions[column] = None
        with warnings.catch_warnings():
            warnings.filterwarnings(
                "ignore",
                category=FutureWarning,
                message="The behavior of DataFrame concatenation with empty or all-NA entries is deprecated.*",
            )
            frame = pd.concat([additions[frame.columns], frame], ignore_index=True)
    frame = frame.drop_duplicates(subset=["spotify_id"], keep="first")
    return frame.sort_values("catalogue_order", kind="stable").reset_index(drop=True)


def optional_number(row: pd.Series, name: str) -> float | int | None:
    value = row.get(name)
    if value is None or pd.isna(value):
        return None
    number = float(value)
    return int(number) if number.is_integer() else number


def metadata(row: pd.Series, *, evidence: str = "") -> dict[str, Any]:
    value: dict[str, Any] = {
        "track_id": str(row["track_id"]),
        "spotify_id": str(row["spotify_id"]),
        "title": text(row.get("name")) or "Unknown",
        "artist": text(row.get("artist")) or "Unknown",
        "tags": list(row["tags_clean"]),
        "primary_genre": str(row["group"]),
        "has_lyrics": bool(row["has_lyrics"]),
        "has_reddit": bool(row["has_reddit"]),
        "catalogue_version": "curated-v1",
        "catalogue_quality": min(1.0, max(0.0, float(row.get("quality") or 0.0) / 6.0)),
    }
    for name in ("year_clean", "duration_ms", "energy", "valence", "danceability", "acousticness", "instrumentalness", "tempo"):
        number = optional_number(row, name)
        if number is not None:
            value["year" if name == "year_clean" else name] = number
    explicit = row.get("explicit")
    if explicit is not None and not pd.isna(explicit):
        value["explicit"] = bool(explicit)
    popularity = optional_number(row, "popularity")
    if popularity is not None:
        value["popularity"] = int(popularity)
    if evidence:
        value["evidence"] = evidence[:1400]
    return value


def chunks(value: str, *, size: int = 1150, overlap: int = 180, limit: int = 4) -> list[str]:
    clean = text(value)
    if not clean:
        return []
    parts: list[str] = []
    offset = 0
    while offset < len(clean) and len(parts) < limit:
        end = min(len(clean), offset + size)
        if end < len(clean):
            boundary = clean.rfind(" ", offset + size // 2, end)
            if boundary > offset:
                end = boundary
        part = clean[offset:end].strip()
        if part:
            parts.append(part)
        if end >= len(clean):
            break
        offset = max(offset + 1, end - overlap)
    return parts


def evidence_chunks(row: pd.Series) -> list[str]:
    # Reddit discussions trained Model A, but they are not runtime song
    # evidence. Literal topic retrieval uses lyrics only.
    return chunks(str(row["lyrics_clean"]), limit=3)


def load_env(root: Path) -> None:
    path = root / ".env"
    if not path.is_file():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line.strip() or line.lstrip().startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def atomic_state(path: Path, value: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    handle, temporary = tempfile.mkstemp(dir=path.parent, prefix=path.name, suffix=".partial")
    with os.fdopen(handle, "w", encoding="utf-8") as stream:
        json.dump(value, stream, ensure_ascii=False, indent=2)
    os.replace(temporary, path)


def upsert(index, namespace: str, vectors: list[dict[str, Any]]) -> None:
    last: Exception | None = None
    for attempt in range(5):
        try:
            response = index.upsert(namespace=namespace, vectors=vectors)
            count = int(response.get("upserted_count", len(vectors)))
            if count != len(vectors):
                raise RuntimeError(f"Pinecone acknowledged {count}/{len(vectors)} vectors")
            return
        except Exception as error:
            last = error
            if attempt < 4:
                time.sleep(2**attempt)
    raise RuntimeError("Pinecone upsert failed") from last


def batches(values: list[Any], size: int) -> Iterable[list[Any]]:
    for offset in range(0, len(values), size):
        yield values[offset : offset + size]


def commit_audio(index, frame: pd.DataFrame, args: argparse.Namespace) -> int:
    uploaded = 0
    rows = {str(row["track_id"]): row for _, row in frame.iterrows()}
    ids = list(rows)
    for group in batches(ids, 100):
        fetched = None
        for attempt in range(5):
            try:
                fetched = index.fetch(ids=group, namespace=args.audio_source)
                break
            except Exception:
                if attempt == 4:
                    raise
                time.sleep(2**attempt)
        if fetched is None:
            raise RuntimeError("Pinecone fetch returned no response")
        vectors = getattr(fetched, "vectors", None) or fetched.get("vectors", {})
        payload: list[dict[str, Any]] = []
        for track_id in group:
            vector = vectors.get(track_id)
            if vector is None:
                continue
            values = getattr(vector, "values", None) or vector.get("values", [])
            payload.append({"id": track_id, "values": values, "metadata": metadata(rows[track_id])})
        for upload in batches(payload, args.upsert_batch):
            upsert(index, args.audio_target, upload)
            uploaded += len(upload)
        print(json.dumps({"audio_uploaded": uploaded, "audio_total": len(ids)}), flush=True)
    return uploaded


def commit_lyrics(index, frame: pd.DataFrame, args: argparse.Namespace, state_path: Path) -> int:
    all_chunks: list[tuple[str, pd.Series, str, str]] = []
    for _, row in frame.iterrows():
        track_id = str(row["track_id"])
        for index_number, chunk in enumerate(evidence_chunks(row)):
            vector_id = f"{track_id}::e{index_number}"
            document = (
                "Song: "
                + text(row.get("name"))
                + "\nArtist: "
                + text(row.get("artist"))
                + "\nLyrics: "
                + chunk
            )
            all_chunks.append((vector_id, row, document, chunk))

    manifest = hashlib.sha256()
    legacy_manifest = hashlib.sha256()
    manifest.update(str(args.model_dir).encode("utf-8"))
    legacy_manifest.update(str(args.model_dir).encode("utf-8"))
    manifest.update(str(args.model_revision).encode("utf-8"))
    for vector_id, _row, document, _chunk in all_chunks:
        for digest in (manifest, legacy_manifest):
            digest.update(vector_id.encode("utf-8"))
            digest.update(b"\0")
            digest.update(hashlib.sha256(document.encode("utf-8")).digest())
    manifest_hash = manifest.hexdigest()
    accepted_manifest_hashes = {manifest_hash, legacy_manifest.hexdigest()}

    state: dict[str, Any] = {
        "namespace": args.lyrics_target,
        "completed_count": 0,
        "manifest_hash": manifest_hash,
    }
    if state_path.is_file():
        state = json.loads(state_path.read_text(encoding="utf-8"))
        if state.get("namespace") != args.lyrics_target:
            raise ValueError("State belongs to another namespace")
        if state.get("manifest_hash") not in accepted_manifest_hashes:
            raise ValueError("Catalogue changed after this lyrics upload started; use a new namespace and state file")

    completed_count = int(state.get("completed_count", 0))
    if not 0 <= completed_count <= len(all_chunks):
        raise ValueError("Invalid lyrics upload state")
    pending = all_chunks[completed_count:]

    os.environ.setdefault("LYRICS_EMBEDDING_DEVICE", "cuda")
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    from main import LyricsTextEncoder

    encoder = LyricsTextEncoder(str(args.model_dir), revision=args.model_revision)
    uploaded = 0
    for batch in batches(pending, args.embedding_batch):
        vectors = encoder.embed_many([item[2] for item in batch])
        payload = [
            {
                "id": vector_id,
                "values": vector,
                "metadata": metadata(row, evidence=chunk),
            }
            for (vector_id, row, _document, chunk), vector in zip(batch, vectors)
        ]
        for upload in batches(payload, args.upsert_batch):
            upsert(index, args.lyrics_target, upload)
            uploaded += len(upload)
            completed_count += len(upload)
            atomic_state(
                state_path,
                {
                    "namespace": args.lyrics_target,
                    "completed_count": completed_count,
                    "total": len(all_chunks),
                    "manifest_hash": manifest_hash,
                    "last_id": upload[-1]["id"],
                },
            )
        print(json.dumps({"lyrics_uploaded_this_run": uploaded, "lyrics_pending_at_start": len(pending)}), flush=True)
    return uploaded


def main() -> None:
    args = arguments()
    root = args.source_root.resolve()
    if not root.is_dir():
        raise FileNotFoundError(root)
    for namespace in (args.audio_source, args.audio_target, args.lyrics_target):
        if not namespace.strip():
            raise ValueError("Namespaces cannot be empty")
    if args.audio_source == args.audio_target:
        raise ValueError("Audio source and target namespaces must differ")
    extras = args.extras or (root / "Model" / "modern_catalogue.csv")
    frame = load_source(root, extras if extras.is_file() else None)
    if args.limit > 0:
        frame = frame.head(args.limit).copy()
    lyric_vectors = sum(len(evidence_chunks(row)) for _, row in frame.iterrows())
    report = {
        "tracks": len(frame),
        "lyrics_vectors": lyric_vectors,
        "groups": frame["group"].value_counts().sort_index().to_dict(),
        "years": {
            "median": int(frame["year_clean"].median()) if len(frame) else 0,
            "2015_or_newer": int((frame["year_clean"] >= 2015).sum()),
            "2020_or_newer": int((frame["year_clean"] >= 2020).sum()),
        },
        "mode": "commit" if args.commit_audio or args.commit_lyrics else "audit",
    }
    print(json.dumps(report, indent=2), flush=True)
    if not args.commit_audio and not args.commit_lyrics:
        return

    load_env(root)
    key = os.environ.get("PINECONE_API_KEY", "").strip()
    if not key:
        raise RuntimeError("PINECONE_API_KEY is not configured")
    index = Pinecone(api_key=key).Index(args.index)
    if args.commit_audio:
        report["audio_uploaded"] = commit_audio(index, frame, args)
    if args.commit_lyrics:
        state_path = args.state or (root / "AudioModel" / "retraining_runs" / "lyrics_mpnet_upload_state.json")
        report["lyrics_uploaded"] = commit_lyrics(index, frame, args, state_path)
    print(json.dumps(report, indent=2), flush=True)


if __name__ == "__main__":
    main()
