"""Private CLaMP3 text-search service for the portfolio demo."""

from __future__ import annotations

import asyncio
import base64
from contextlib import asynccontextmanager
from dataclasses import dataclass, field
import hashlib
import hmac
import json
import math
import os
from pathlib import Path
import re
import secrets
import time
from typing import Annotated, Any

from fastapi import FastAPI, Header, HTTPException, status
from pydantic import BaseModel, Field
from pinecone import Pinecone
from safetensors.torch import load_file
import torch
from torch import nn
import torch.nn.functional as functional
from transformers import AutoModel, AutoTokenizer

from agent import (
    CandidateJudgment,
    GeminiAgent,
    RETRIEVAL_KINDS,
    RetrievalDraft,
    SearchIntent,
    parse_intent,
)


@dataclass(frozen=True)
class Settings:
    model_dir: Path
    pinecone_api_key: str
    pinecone_index: str
    pinecone_namespace: str
    lyrics_namespace: str
    lyrics_model_dir: str
    service_token: str
    model_version: str

    @classmethod
    def from_environment(cls) -> "Settings":
        required = {
            "PINECONE_API_KEY": os.environ.get("PINECONE_API_KEY", "").strip(),
            "MELODYMIND_SERVICE_TOKEN": os.environ.get(
                "MELODYMIND_SERVICE_TOKEN", ""
            ).strip(),
        }
        missing = [name for name, value in required.items() if not value]
        if missing:
            raise RuntimeError("Missing environment variables: " + ", ".join(missing))
        namespace = os.environ.get(
            "PINECONE_NAMESPACE", "melodymind-audio-curated-v1"
        ).strip()
        if not namespace:
            raise RuntimeError("PINECONE_NAMESPACE cannot be empty")
        index = os.environ.get("PINECONE_INDEX", "melodymind-embeddings").strip()
        if not index:
            raise RuntimeError("PINECONE_INDEX cannot be empty")
        return cls(
            model_dir=Path(os.environ.get("CLAMP3_TEXT_MODEL_DIR", "/model")),
            pinecone_api_key=required["PINECONE_API_KEY"],
            pinecone_index=index,
            pinecone_namespace=namespace,
            lyrics_namespace=os.environ.get(
                "PINECONE_LYRICS_NAMESPACE", "melodymind-lyrics-mpnet-v1"
            ).strip(),
            lyrics_model_dir=os.environ.get(
                "LYRICS_TEXT_MODEL_DIR", "/lyrics-model"
            ).strip(),
            service_token=required["MELODYMIND_SERVICE_TOKEN"],
            model_version=os.environ.get(
                "MELODYMIND_MODEL_VERSION", "melodymind-hybrid-curated-v2"
            ).strip(),
        )


class TasteTrackInput(BaseModel):
    track_id: str = Field(min_length=1, max_length=180)
    spotify_id: str = Field(min_length=8, max_length=64)
    title: str = Field(default="", max_length=220)
    artist: str = Field(min_length=1, max_length=220)
    score: float = Field(default=0, ge=-12, le=12)
    signals: int = Field(default=0, ge=0, le=100_000)


class TasteArtistInput(BaseModel):
    artist: str = Field(min_length=1, max_length=220)
    score: float = Field(default=0, ge=-12, le=12)
    signals: int = Field(default=0, ge=0, le=100_000)


class TasteProfileInput(BaseModel):
    version: int = Field(default=0, ge=0, le=1_000_000_000)
    signal_count: int = Field(default=0, ge=0, le=1_000_000_000)
    positive_tracks: list[TasteTrackInput] = Field(default_factory=list, max_length=18)
    negative_tracks: list[TasteTrackInput] = Field(default_factory=list, max_length=10)
    positive_artists: list[TasteArtistInput] = Field(default_factory=list, max_length=12)
    negative_artists: list[TasteArtistInput] = Field(default_factory=list, max_length=8)


class SearchRequest(BaseModel):
    """Backward-compatible one-shot request used during Worker rollouts."""

    query: str = Field(min_length=4, max_length=500)
    clarification: str | None = Field(default=None, max_length=500)
    limit: int = Field(default=10, ge=1, le=20)
    taste_profile: TasteProfileInput | None = None


class PlanRequest(BaseModel):
    """Initial request or a continuation of a signed search session."""

    query: str | None = Field(default=None, max_length=500)
    clarification: str | None = Field(default=None, max_length=500)
    conversation_token: str | None = Field(default=None, max_length=16384)
    message: str | None = Field(default=None, max_length=500)
    taste_profile: TasteProfileInput | None = None


class ExecuteRequest(BaseModel):
    plan_token: str = Field(min_length=16, max_length=16384)
    limit: int = Field(default=10, ge=1, le=20)


class SearchMatch(BaseModel):
    track_id: str
    spotify_id: str
    title: str
    artist: str
    album: str | None = None
    score: float
    tags: list[str] = Field(default_factory=list, exclude=True)
    year: int = Field(default=0, exclude=True)
    energy: float | None = Field(default=None, exclude=True)
    valence: float | None = Field(default=None, exclude=True)
    instrumentalness: float | None = Field(default=None, exclude=True)
    explicit: bool | None = Field(default=None, exclude=True)
    popularity: int | None = Field(default=None, exclude=True)
    catalogue_quality: float = Field(default=0.0, exclude=True)
    evidence: str = Field(default="", exclude=True)
    channel: str = Field(default="audio", exclude=True)


class ProbeResponse(BaseModel):
    type: str = "probe"
    query: str
    message: str
    conversation_token: str = ""
    model: str


class SearchReadyResponse(BaseModel):
    type: str = "search_ready"
    query: str
    message: str = ""
    summary: str = ""
    plan_token: str
    model: str


class SearchResponse(BaseModel):
    type: str = "results"
    query: str
    message: str = ""
    results: list[SearchMatch]
    total: int
    model: str
    retrieval_queries: int
    conversation_token: str = ""


class ReplyResponse(BaseModel):
    type: str = "reply"
    query: str
    message: str
    conversation_token: str
    model: str


@dataclass(frozen=True)
class QueryView:
    label: str
    text: str
    weight: float
    channel: str = "audio"


@dataclass
class FusedCandidate:
    match: SearchMatch
    fusion_score: float
    source_ranks: dict[str, int] = field(default_factory=dict)
    source_scores: dict[str, float] = field(default_factory=dict)
    fused_rank: int = 0
    hard_pass: bool = True
    situation_fit: int = 2
    trajectory_fit: int = 2
    sound_fit: int = 2
    fit: int = 2
    confidence: int = 0
    taste_adjustment: float = 0.0
    final_score: float = 0.0
    final_rank: int = 0


class Clamp3TextEncoder:
    """The frozen CLaMP3 text tower and its 768-dimensional projection."""

    def __init__(self, model_dir: Path) -> None:
        metadata_path = model_dir / "clamp3.json"
        projection_path = model_dir / "text_projection.safetensors"
        if not metadata_path.is_file() or not projection_path.is_file():
            raise FileNotFoundError(f"Incomplete CLaMP3 text model in {model_dir}")
        metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
        self.max_tokens = int(metadata["max_tokens"])
        self.dimension = int(metadata["embedding_dimension"])
        if self.dimension != 768:
            raise ValueError(f"Expected 768 dimensions, received {self.dimension}")

        self.tokenizer = AutoTokenizer.from_pretrained(
            model_dir, local_files_only=True, fix_mistral_regex=True
        )
        requested_device = os.environ.get("CLAMP3_DEVICE", "cpu").strip().lower()
        if requested_device == "cuda" and not torch.cuda.is_available():
            raise RuntimeError("CLAMP3_DEVICE=cuda but CUDA is unavailable")
        self.device = torch.device("cuda" if requested_device == "cuda" else "cpu")
        self.model = AutoModel.from_pretrained(model_dir, local_files_only=True)
        hidden_size = int(self.model.config.hidden_size)
        self.projection = nn.Linear(hidden_size, self.dimension)
        self.projection.load_state_dict(load_file(projection_path), strict=True)
        self.model.to(self.device).eval()
        self.projection.to(self.device).eval()

    def _segments(
        self, token_ids: torch.Tensor
    ) -> tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
        chunks = [
            token_ids[offset : offset + self.max_tokens]
            for offset in range(0, len(token_ids), self.max_tokens)
        ]
        remainder = len(token_ids) % self.max_tokens
        if remainder and len(chunks) > 1:
            chunks[-1] = token_ids[-self.max_tokens :]
        weights = [self.max_tokens] * (len(token_ids) // self.max_tokens)
        if remainder:
            weights.append(remainder)
        if not weights:
            weights = [len(token_ids)]

        pad = int(self.tokenizer.pad_token_id)
        input_ids = torch.full(
            (len(chunks), self.max_tokens), pad, dtype=torch.long
        )
        attention = torch.zeros_like(input_ids)
        for index, chunk in enumerate(chunks):
            input_ids[index, : len(chunk)] = chunk
            attention[index, : len(chunk)] = 1
        return input_ids, attention, torch.tensor(weights, dtype=torch.float32)

    def _tokenize(self, query: str) -> torch.Tensor:
        lines = [line.strip() for line in query.splitlines() if line.strip()]
        text = self.tokenizer.sep_token.join(dict.fromkeys(lines)) or query.strip()
        return self.tokenizer(
            text,
            return_tensors="pt",
            truncation=False,
        )["input_ids"][0]

    def embed_many(self, queries: list[str]) -> list[list[float]]:
        """Embed several query views in one XLM-R forward pass."""
        if not queries:
            return []

        input_batches: list[torch.Tensor] = []
        attention_batches: list[torch.Tensor] = []
        weights_by_query: list[torch.Tensor] = []
        counts: list[int] = []
        for query in queries:
            input_ids, attention, weights = self._segments(self._tokenize(query))
            input_batches.append(input_ids)
            attention_batches.append(attention)
            weights_by_query.append(weights)
            counts.append(len(weights))

        all_input_ids = torch.cat(input_batches, dim=0).to(self.device)
        all_attention = torch.cat(attention_batches, dim=0).to(self.device)
        with torch.inference_mode():
            hidden = self.model(
                input_ids=all_input_ids,
                attention_mask=all_attention,
            ).last_hidden_state
            mask = all_attention.unsqueeze(-1)
            pooled = (hidden * mask).sum(dim=1) / mask.sum(dim=1)
            projected = self.projection(pooled)

        embeddings: list[list[float]] = []
        offset = 0
        for count, weights in zip(counts, weights_by_query):
            weights = weights.to(self.device)
            segment_vectors = projected[offset : offset + count]
            offset += count
            combined = (
                segment_vectors * weights.unsqueeze(-1)
            ).sum(dim=0) / weights.sum()
            normalized = functional.normalize(combined, dim=0)
            if normalized.shape != (self.dimension,) or not torch.isfinite(
                normalized
            ).all():
                raise RuntimeError("CLaMP3 produced an invalid query vector")
            embeddings.append(normalized.cpu().tolist())
        return embeddings

    def embed(self, query: str) -> list[float]:
        return self.embed_many([query])[0]


class LyricsTextEncoder:
    """Semantic text encoder for lyrics and other written song evidence."""

    def __init__(self, model_dir: str, dimension: int = 768, revision: str | None = None) -> None:
        self.dimension = dimension
        requested = os.environ.get("LYRICS_EMBEDDING_DEVICE", "cpu").strip().lower()
        self.device = torch.device("cuda" if requested == "cuda" and torch.cuda.is_available() else "cpu")
        self.tokenizer = AutoTokenizer.from_pretrained(model_dir, revision=revision)
        self.model = AutoModel.from_pretrained(model_dir, revision=revision).eval().to(self.device)

    def embed_many(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []
        tokens = self.tokenizer(
            texts,
            padding=True,
            truncation=True,
            max_length=384,
            return_tensors="pt",
        )
        input_ids = tokens["input_ids"].to(self.device)
        attention = tokens["attention_mask"].to(self.device)
        with torch.inference_mode():
            hidden = self.model(input_ids=input_ids, attention_mask=attention).last_hidden_state
            mask = attention.unsqueeze(-1)
            pooled = (hidden * mask).sum(dim=1) / mask.sum(dim=1).clamp(min=1)
            normalized = functional.normalize(pooled, dim=1)
        if normalized.shape[1] != self.dimension or not torch.isfinite(normalized).all():
            raise RuntimeError("Lyrics encoder produced an invalid embedding")
        return normalized.cpu().tolist()


class CatalogueSearch:
    def __init__(self, settings: Settings) -> None:
        self.audio_namespace = settings.pinecone_namespace
        self.lyrics_namespace = settings.lyrics_namespace
        self.index = Pinecone(api_key=settings.pinecone_api_key).Index(
            settings.pinecone_index
        )

    def query(
        self,
        vector: list[float],
        top_k: int,
        *,
        channel: str = "audio",
        metadata_filter: dict[str, Any] | None = None,
    ) -> list[SearchMatch]:
        namespace = self.lyrics_namespace if channel == "lyrics" else self.audio_namespace
        if not namespace:
            return []
        response = self.index.query(
            vector=vector,
            top_k=min(max(top_k, 1), 200),
            namespace=namespace,
            include_metadata=True,
            include_values=False,
            filter=metadata_filter or None,
        )
        # A lyrics namespace can contain several evidence chunks for one track.
        # Keep only its strongest chunk in this retrieval view. Letting every
        # chunk vote independently rewards document length instead of relevance.
        best_by_track: dict[str, SearchMatch] = {}
        matches = getattr(response, "matches", None)
        if matches is None:
            matches = response.get("matches", [])
        for match in matches:
            match_id = getattr(match, "id", None) or match.get("id", "")
            score = getattr(match, "score", None)
            if score is None:
                score = match.get("score", 0.0)
            metadata: dict[str, Any] = (
                getattr(match, "metadata", None) or match.get("metadata", {}) or {}
            )
            spotify_id = str(metadata.get("spotify_id", "")).strip()
            if not spotify_id:
                continue
            raw_tags = metadata.get("tags", [])
            if isinstance(raw_tags, str):
                tags = [item.strip().lower() for item in raw_tags.split(",") if item.strip()]
            elif isinstance(raw_tags, list):
                tags = [str(item).strip().lower() for item in raw_tags if str(item).strip()]
            else:
                tags = []

            def optional_float(name: str) -> float | None:
                try:
                    value = metadata.get(name)
                    return None if value is None else float(value)
                except (TypeError, ValueError):
                    return None

            value = SearchMatch(
                    track_id=str(metadata.get("track_id") or match_id).split("::", 1)[0],
                    spotify_id=spotify_id,
                    title=str(metadata.get("title") or "Unknown"),
                    artist=str(metadata.get("artist") or "Unknown"),
                    album=(
                        str(metadata["album"])
                        if metadata.get("album") is not None
                        else None
                    ),
                    score=float(score),
                    tags=tags,
                    year=int(optional_float("year") or 0),
                    energy=optional_float("energy"),
                    valence=optional_float("valence"),
                    instrumentalness=optional_float("instrumentalness"),
                    explicit=(bool(metadata.get("explicit")) if metadata.get("explicit") is not None else None),
                    popularity=(int(optional_float("popularity")) if optional_float("popularity") is not None else None),
                    catalogue_quality=optional_float("catalogue_quality") or 0.0,
                    evidence=str(metadata.get("evidence") or metadata.get("text") or "")[:1200],
                    channel=channel,
                )
            identity = value.spotify_id or value.track_id
            current = best_by_track.get(identity)
            if current is None or value.score > current.score:
                best_by_track[identity] = value
        return sorted(best_by_track.values(), key=lambda item: item.score, reverse=True)

    def fetch_audio_vectors(self, track_ids: list[str]) -> dict[str, list[float]]:
        ids = list(dict.fromkeys(track_id for track_id in track_ids if track_id))[:80]
        if not ids:
            return {}
        response = self.index.fetch(ids=ids, namespace=self.audio_namespace)
        raw_vectors = getattr(response, "vectors", None)
        if raw_vectors is None and isinstance(response, dict):
            raw_vectors = response.get("vectors", {})
        if raw_vectors is None or not hasattr(raw_vectors, "items"):
            return {}
        vectors: dict[str, list[float]] = {}
        for track_id, value in raw_vectors.items():
            values = getattr(value, "values", None)
            if values is None and isinstance(value, dict):
                values = value.get("values")
            if values is None:
                continue
            vector = [float(item) for item in list(values)]
            if not vector:
                continue
            if all(math.isfinite(item) for item in vector):
                vectors[str(track_id)] = vector
        return vectors


@dataclass
class Runtime:
    settings: Settings
    encoder: Clamp3TextEncoder
    lyrics_encoder: LyricsTextEncoder
    catalogue: CatalogueSearch
    agent: GeminiAgent
    inference_lock: asyncio.Lock


runtime: Runtime | None = None


@asynccontextmanager
async def lifespan(_: FastAPI):
    global runtime
    settings = Settings.from_environment()
    agent = GeminiAgent()
    runtime = Runtime(
        settings=settings,
        encoder=Clamp3TextEncoder(settings.model_dir),
        lyrics_encoder=LyricsTextEncoder(settings.lyrics_model_dir),
        catalogue=CatalogueSearch(settings),
        agent=agent,
        inference_lock=asyncio.Lock(),
    )
    try:
        yield
    finally:
        await agent.close()
        runtime = None


app = FastAPI(
    title="MelodyMind portfolio search",
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
    lifespan=lifespan,
)


def active_runtime() -> Runtime:
    if runtime is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Search service is starting",
        )
    return runtime


def authorize(authorization: str | None) -> None:
    current = active_runtime()
    expected = "Bearer " + current.settings.service_token
    if authorization is None or not secrets.compare_digest(authorization, expected):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized",
        )


def _b64encode(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).decode("ascii").rstrip("=")


def _b64decode(value: str) -> bytes:
    return base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))


def _sign_token(current: Runtime, payload: dict[str, Any]) -> str:
    encoded = _b64encode(
        json.dumps(payload, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
    )
    signature = hmac.new(
        current.settings.service_token.encode("utf-8"),
        encoded.encode("ascii"),
        hashlib.sha256,
    ).digest()
    return encoded + "." + _b64encode(signature)


def _read_token(current: Runtime, token: str, max_age_seconds: int = 7200) -> dict[str, Any]:
    try:
        encoded, signature_text = token.split(".", 1)
        supplied = _b64decode(signature_text)
        expected = hmac.new(
            current.settings.service_token.encode("utf-8"),
            encoded.encode("ascii"),
            hashlib.sha256,
        ).digest()
        if not hmac.compare_digest(supplied, expected):
            raise ValueError("bad signature")
        payload = json.loads(_b64decode(encoded).decode("utf-8"))
        if not isinstance(payload, dict):
            raise ValueError("bad payload")
        issued_at = int(payload.get("iat", 0))
        now = int(time.time())
        if issued_at <= 0 or issued_at > now + 30 or now - issued_at > max_age_seconds:
            raise ValueError("expired token")
        return payload
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired MelodyMind token",
        ) from exc


def _compact_taste(profile: TasteProfileInput | None) -> dict[str, Any] | None:
    if profile is None or profile.signal_count < 1:
        return None
    return {
        "v": profile.version,
        "c": profile.signal_count,
        "p": [[item.track_id, item.spotify_id, item.artist, item.score, item.signals] for item in profile.positive_tracks],
        "n": [[item.track_id, item.spotify_id, item.artist, item.score, item.signals] for item in profile.negative_tracks],
        "pa": [[item.artist, item.score, item.signals] for item in profile.positive_artists],
        "na": [[item.artist, item.score, item.signals] for item in profile.negative_artists],
    }


def _taste_from_token(value: object) -> TasteProfileInput | None:
    if not isinstance(value, dict):
        return None

    def tracks(key: str, limit: int) -> list[dict[str, Any]]:
        rows = value.get(key)
        if not isinstance(rows, list):
            return []
        result: list[dict[str, Any]] = []
        for row in rows[:limit]:
            if not isinstance(row, list) or len(row) != 5:
                continue
            result.append({
                "track_id": row[0],
                "spotify_id": row[1],
                "title": "",
                "artist": row[2],
                "score": row[3],
                "signals": row[4],
            })
        return result

    def artists(key: str, limit: int) -> list[dict[str, Any]]:
        rows = value.get(key)
        if not isinstance(rows, list):
            return []
        return [
            {"artist": row[0], "score": row[1], "signals": row[2]}
            for row in rows[:limit]
            if isinstance(row, list) and len(row) == 3
        ]

    try:
        return TasteProfileInput.model_validate({
            "version": value.get("v", 0),
            "signal_count": value.get("c", 0),
            "positive_tracks": tracks("p", 18),
            "negative_tracks": tracks("n", 10),
            "positive_artists": artists("pa", 12),
            "negative_artists": artists("na", 8),
        })
    except Exception:
        return None


def _validate_history(value: object) -> list[dict[str, str]]:
    if not isinstance(value, list) or not 1 <= len(value) <= 12:
        raise ValueError("bad history")
    history: list[dict[str, str]] = []
    for item in value:
        if not isinstance(item, dict):
            raise ValueError("bad history item")
        role = item.get("role")
        content = item.get("content")
        if role not in {"user", "assistant"} or not isinstance(content, str):
            raise ValueError("bad history item")
        content = content.strip()
        if not content or len(content) > 1400:
            raise ValueError("bad history content")
        history.append({"role": str(role), "content": content})
    return history


def _read_conversation(current: Runtime, token: str) -> tuple[list[dict[str, str]], int]:
    try:
        payload = _read_token(current, token)
        version = payload.get("v")
        if payload.get("kind") not in {"conversation", "session"}:
            raise ValueError("bad conversation token")
        history = _validate_history(payload.get("h"))
        if version == 2:
            if not any(item["role"] == "assistant" for item in history):
                raise ValueError("conversation contains no probe")
            return history, 1
        if version != 4 or payload.get("kind") != "session":
            raise ValueError("bad conversation version")
        raw_count = payload.get("u", 0)
        probes_used = int(raw_count) if isinstance(raw_count, (bool, int)) else -1
        if not 0 <= probes_used <= 2:
            raise ValueError("bad probe count")
        return history, probes_used
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired conversation token",
        ) from exc


def _read_plan(current: Runtime, token: str) -> dict[str, Any]:
    try:
        payload = _read_token(current, token, max_age_seconds=900)
        version = payload.get("v")
        if version == 1:
            # Accept plans minted by the immediately previous deployment so
            # in-flight searches survive a Modal rollout.
            original = payload.get("q")
            search_text = payload.get("s")
            paraphrases = payload.get("p")
            retrieval_views = [
                {"kind": f"legacy_{index}", "text": text}
                for index, text in enumerate(paraphrases or [], start=1)
            ]
            message = payload.get("m", "")
        elif version == 2 and payload.get("kind") == "search":
            original = payload.get("o")
            search_text = payload.get("s")
            paraphrases = payload.get("p")
            retrieval_views = [
                {"kind": f"legacy_{index}", "text": text}
                for index, text in enumerate(paraphrases or [], start=1)
            ]
            message = payload.get("m", "")
        elif version == 3 and payload.get("kind") == "search":
            original = payload.get("o")
            search_text = payload.get("s")
            paraphrases = []
            retrieval_views = [
                {"kind": "audio", "text": item.get("text", ""), "weight": 1.0}
                for item in (payload.get("r") or [])
                if isinstance(item, dict)
            ]
            message = payload.get("m", "")
            summary = message
            intent_value: object = {}
            history_value: object = [{"role": "user", "content": str(original or "")[:500]}]
        elif version == 4 and payload.get("kind") == "search":
            original = payload.get("o")
            search_text = payload.get("s")
            paraphrases = []
            retrieval_views = payload.get("r")
            message = payload.get("m", "")
            summary = payload.get("y", "")
            intent_value = payload.get("n")
            history_value = payload.get("h")
            taste_value = payload.get("t")
        else:
            raise ValueError("bad plan payload")

        if version in {1, 2}:
            summary = message
            intent_value = {}
            history_value = [{"role": "user", "content": str(original or "")[:500]}]
            taste_value = None
        elif version == 3:
            taste_value = None

        if not isinstance(original, str) or not 4 <= len(original) <= 500:
            raise ValueError("bad original query")
        if not isinstance(search_text, str) or not 4 <= len(search_text) <= 1600:
            raise ValueError("bad search text")
        if not isinstance(paraphrases, list) or len(paraphrases) > 3:
            raise ValueError("bad paraphrases")
        if not all(isinstance(item, str) and 4 <= len(item) <= 1600 for item in paraphrases):
            raise ValueError("bad paraphrase")
        if not isinstance(retrieval_views, list) or len(retrieval_views) > 4:
            raise ValueError("bad retrieval views")
        validated_views: list[dict[str, str | float]] = []
        for item in retrieval_views:
            if not isinstance(item, dict):
                raise ValueError("bad retrieval view")
            kind = str(item.get("kind", "")).strip().lower()
            text = str(item.get("text", "")).strip()
            try:
                weight = float(item.get("weight", 1.0))
            except (TypeError, ValueError):
                raise ValueError("bad retrieval weight")
            if not kind or not 4 <= len(text) <= 900 or not 0 < weight <= 1:
                raise ValueError("bad retrieval view")
            if version in {3, 4} and kind not in RETRIEVAL_KINDS:
                raise ValueError("bad retrieval kind")
            validated_views.append({"kind": kind, "text": text, "weight": weight})
        if not isinstance(message, str) or len(message) > 1000:
            raise ValueError("bad message")
        if not isinstance(summary, str) or len(summary) > 500:
            raise ValueError("bad summary")
        history = _validate_history(history_value)
        intent = parse_intent(intent_value)
        taste_profile = _taste_from_token(taste_value)
        return {
            "original": original,
            "search_text": search_text,
            "retrieval_views": validated_views,
            "message": message,
            "summary": summary,
            "intent": intent,
            "taste_profile": taste_profile,
            "history": history,
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired search plan",
        ) from exc


def _original_query(history: list[dict[str, str]]) -> str:
    for item in history:
        if item["role"] == "user":
            return item["content"][:500]
    raise HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        detail="Conversation contains no user request",
    )


def _legacy_history(query: str, clarification: str | None) -> tuple[list[dict[str, str]], int]:
    history = [{"role": "user", "content": query.strip()}]
    if clarification:
        # Transitional support for an older Worker. New clients use the signed
        # conversation token so the assistant probe is never lost.
        history.append({"role": "user", "content": clarification.strip()})
    return history, 1 if clarification else 0


def _query_views(
    original_text: str,
    resolved_text: str,
    retrieval_views: list[dict[str, Any]] | list[RetrievalDraft],
    intent: SearchIntent | None = None,
) -> list[QueryView]:
    """Build at most one purposeful query per retrieval channel."""
    views: list[QueryView] = []
    seen: set[str] = set()

    def add(channel: str, text: str, weight: float) -> None:
        clean = text.strip()
        key = clean.casefold()
        if len(clean) < 4 or key in seen or channel in {view.channel for view in views}:
            return
        seen.add(key)
        views.append(QueryView(label=channel, text=clean, weight=max(0.05, min(1.0, weight)), channel=channel))

    for index, draft in enumerate(retrieval_views[:4], start=1):
        if isinstance(draft, RetrievalDraft):
            kind, text, weight = draft.kind, draft.text, draft.weight
        else:
            kind, text = str(draft.get("kind", "")), str(draft.get("text", ""))
            try:
                weight = float(draft.get("weight", 0.5))
            except (TypeError, ValueError):
                weight = 0.5
        channel = kind if kind in RETRIEVAL_KINDS else "audio"
        if channel == "lyrics" and intent and intent.lyric_topics:
            # The planner chooses the topics; the service writes the retrieval
            # text so sound/production requests cannot pollute lyric search.
            text = "Lyrics about: " + "; ".join(intent.lyric_topics)
        add(channel, text, weight)
    if not views:
        add("audio", resolved_text or original_text, 1.0)
    return views


def _hybrid_fuse(
    result_sets: list[tuple[QueryView, list[SearchMatch]]],
    limit: int,
) -> list[FusedCandidate]:
    """Fuse independent evidence channels without per-query min-max inflation."""
    if not result_sets:
        return []

    rank_scores: dict[str, float] = {}
    similarity_scores: dict[str, float] = {}
    support: dict[str, set[str]] = {}
    best: dict[str, SearchMatch] = {}
    ranks: dict[str, dict[str, int]] = {}
    raw_scores: dict[str, dict[str, float]] = {}
    rrf_k = 12.0
    total_weight = sum(view.weight for view, results in result_sets if results) or 1.0

    for view, results in result_sets:
        if not results:
            continue
        for rank, item in enumerate(results, start=1):
            key = item.spotify_id or item.track_id
            # Preserve absolute weakness instead of promoting every query's
            # winner to 1.0. The audio and written-evidence encoders have
            # different cosine ranges and must not share a calibration curve.
            if view.channel == "lyrics":
                calibrated = max(0.0, min(1.0, (float(item.score) - 0.35) / 0.50))
            else:
                calibrated = max(0.0, min(1.0, (float(item.score) - 0.12) / 0.24))
            rank_scores[key] = rank_scores.get(key, 0.0) + view.weight / (rrf_k + rank)
            similarity_scores[key] = similarity_scores.get(key, 0.0) + view.weight * calibrated
            support.setdefault(key, set()).add(view.channel)
            ranks.setdefault(key, {})[view.label] = rank
            raw_scores.setdefault(key, {})[view.label] = item.score
            current = best.get(key)
            if current is None:
                best[key] = item
            elif item.channel == "lyrics" and current.channel != "lyrics":
                best[key] = item
            elif item.channel == current.channel and item.score > current.score:
                best[key] = item
            elif item.channel == "lyrics" and item.evidence:
                current.evidence = item.evidence
                current.tags = item.tags
                current.year = item.year

    rank_ceiling = total_weight / (rrf_k + 1.0)
    fusion_scores = {
        key: (
            0.58 * min(1.0, rank_scores.get(key, 0.0) / rank_ceiling)
            + 0.37 * min(1.0, similarity_scores.get(key, 0.0) / total_weight)
            + 0.05 * (1.0 if len(support.get(key, set())) > 1 else 0.0)
        )
        for key in best
    }
    ordered_keys = sorted(
        fusion_scores,
        key=lambda key: (fusion_scores[key], best[key].score),
        reverse=True,
    )[:limit]
    candidates: list[FusedCandidate] = []
    for rank, key in enumerate(ordered_keys, start=1):
        candidates.append(
            FusedCandidate(
                match=best[key],
                fusion_score=fusion_scores[key],
                source_ranks=ranks.get(key, {}),
                source_scores=raw_scores.get(key, {}),
                fused_rank=rank,
                final_score=fusion_scores[key],
            )
        )
    return candidates


def _cosine(left: list[float], right: list[float]) -> float:
    if len(left) != len(right) or not left:
        return 0.0
    left_norm = math.sqrt(sum(value * value for value in left))
    right_norm = math.sqrt(sum(value * value for value in right))
    if left_norm <= 0 or right_norm <= 0:
        return 0.0
    return sum(a * b for a, b in zip(left, right)) / (left_norm * right_norm)


def _artist_parts(value: str) -> set[str]:
    parts = re.split(r"\s*(?:,|&|\bfeat\.?\b|\bft\.?\b|\bwith\b)\s*", value.casefold())
    return {re.sub(r"\s+", " ", part).strip() for part in parts if part.strip()}


def _taste_adjustments(
    candidates: list[FusedCandidate],
    profile: TasteProfileInput | None,
    vectors: dict[str, list[float]],
) -> dict[str, float]:
    if profile is None or profile.signal_count < 2:
        return {}

    positive_tracks = {item.track_id: item for item in profile.positive_tracks}
    negative_tracks = {item.track_id: item for item in profile.negative_tracks}
    positive_artist_scores: dict[str, float] = {}
    negative_artist_scores: dict[str, float] = {}
    for item in profile.positive_artists:
        for key in _artist_parts(item.artist):
            positive_artist_scores[key] = max(positive_artist_scores.get(key, 0.0), item.score)
    for item in profile.negative_artists:
        for key in _artist_parts(item.artist):
            negative_artist_scores[key] = min(negative_artist_scores.get(key, 0.0), item.score)

    positive_vectors = [
        vectors[item.track_id]
        for item in profile.positive_tracks
        if item.track_id in vectors
    ]
    negative_vectors = [
        vectors[item.track_id]
        for item in profile.negative_tracks
        if item.track_id in vectors
    ]
    strength = min(1.0, math.log1p(profile.signal_count) / math.log(18.0))
    adjustments: dict[str, float] = {}

    for candidate in candidates:
        match = candidate.match
        score = 0.0
        positive = positive_tracks.get(match.track_id)
        negative = negative_tracks.get(match.track_id)
        if positive:
            score += min(0.2, max(0.0, positive.score) * 0.04)
        if negative:
            score -= min(0.25, abs(min(0.0, negative.score)) * 0.05)

        for artist_key in _artist_parts(match.artist):
            score += min(0.1, max(0.0, positive_artist_scores.get(artist_key, 0.0)) * 0.025)
            score -= min(0.12, abs(min(0.0, negative_artist_scores.get(artist_key, 0.0))) * 0.03)

        candidate_vector = vectors.get(match.track_id)
        if candidate_vector and positive_vectors:
            nearest_positive = max(_cosine(candidate_vector, anchor) for anchor in positive_vectors)
            if nearest_positive >= 0.35:
                score += min(0.14, 0.03 + (nearest_positive - 0.35) * 0.35)
        if candidate_vector and negative_vectors:
            nearest_negative = max(_cosine(candidate_vector, anchor) for anchor in negative_vectors)
            if nearest_negative >= 0.45:
                score -= min(0.16, 0.03 + (nearest_negative - 0.45) * 0.4)

        adjustments[match.track_id] = max(-0.25, min(0.22, score * strength))
    return adjustments


def _experiential_order(
    candidates: list[FusedCandidate],
    judgments: dict[int, CandidateJudgment],
    intent: SearchIntent,
    taste_adjustments: dict[str, float] | None = None,
) -> list[FusedCandidate]:
    """Blend reliable experiential knowledge without penalizing unknown music."""
    adjustment_by_fit = {
        0: -0.70,
        1: -0.40,
        2: 0.0,
        3: 0.22,
        4: 0.48,
    }
    direction_required = bool(
        intent.desired_destination or intent.trajectory or intent.avoid_state
    )
    for index, candidate in enumerate(candidates):
        judgment = judgments.get(
            index,
            CandidateJudgment(
                hard_pass=True,
                situation_fit=2,
                trajectory_fit=2,
                sound_fit=2,
                confidence=0,
            ),
        )
        candidate.hard_pass = judgment.hard_pass
        candidate.situation_fit = judgment.situation_fit
        candidate.trajectory_fit = judgment.trajectory_fit
        candidate.sound_fit = judgment.sound_fit
        required_scores = [judgment.situation_fit]
        if direction_required:
            required_scores.append(judgment.trajectory_fit)
        if intent.audio_weight >= 0.25:
            required_scores.append(judgment.sound_fit)
        candidate.fit = min(required_scores)
        candidate.confidence = judgment.confidence
        confidence = judgment.confidence / 3.0
        match = candidate.match
        metadata_adjustment = min(0.04, max(0.0, match.catalogue_quality) * 0.04)
        if intent.energy_min >= 0 and match.energy is not None:
            metadata_adjustment += 0.025 if match.energy >= intent.energy_min else -0.08 * (intent.energy_min - match.energy)
        if intent.energy_max >= 0 and match.energy is not None:
            metadata_adjustment += 0.025 if match.energy <= intent.energy_max else -0.08 * (match.energy - intent.energy_max)
        if intent.familiarity == "recognizable" and match.popularity is not None:
            metadata_adjustment += max(-0.05, min(0.06, (match.popularity - 45) / 500))
        candidate.taste_adjustment = 0.0
        relevance_pass = (
            judgment.hard_pass
            and judgment.situation_fit >= 3
            and (not direction_required or judgment.trajectory_fit >= 3)
        )
        if relevance_pass and taste_adjustments:
            candidate.taste_adjustment = taste_adjustments.get(match.track_id, 0.0)
        candidate.final_score = (
            candidate.fusion_score
            + adjustment_by_fit[candidate.fit] * confidence
            + metadata_adjustment
            + candidate.taste_adjustment
        )

    ordered = sorted(
        candidates,
        key=lambda candidate: (
            candidate.final_score,
            candidate.fusion_score,
            -candidate.fused_rank,
        ),
        reverse=True,
    )
    for rank, candidate in enumerate(ordered, start=1):
        candidate.final_rank = rank
    return ordered


TAG_ALIASES: dict[str, set[str]] = {
    "rap": {"rap", "hip hop", "hip-hop", "hip_hop"},
    "hip hop": {"rap", "hip hop", "hip-hop", "hip_hop"},
    "rnb": {"rnb", "r&b", "rhythm and blues", "soul"},
    "electronic": {"electronic", "electronica", "dance", "edm", "house", "techno"},
    "punk": {"punk", "punk rock", "pop punk"},
    "metal": {"metal", "heavy metal", "death metal", "doom metal", "black metal"},
}


def _expanded_tags(values: tuple[str, ...]) -> list[str]:
    expanded: set[str] = set()
    for value in values:
        clean = value.strip().lower()
        expanded.update(TAG_ALIASES.get(clean, {clean}))
    return sorted(item for item in expanded if item)


def _metadata_filter(intent: SearchIntent) -> dict[str, Any] | None:
    clauses: list[dict[str, Any]] = []
    required_tags = _expanded_tags(intent.required_tags)
    excluded_tags = _expanded_tags(intent.excluded_tags)
    if required_tags:
        clauses.append({"tags": {"$in": required_tags}})
    if excluded_tags:
        clauses.append({"tags": {"$nin": excluded_tags}})
    if intent.year_min:
        clauses.append({"year": {"$gte": intent.year_min}})
    if intent.year_max:
        clauses.append({"year": {"$lte": intent.year_max}})
    if intent.vocal_mode == "instrumental":
        clauses.append({"instrumentalness": {"$gte": 0.7}})
    elif intent.vocal_mode == "vocal":
        clauses.append({"instrumentalness": {"$lte": 0.5}})
    if not clauses:
        return None
    return clauses[0] if len(clauses) == 1 else {"$and": clauses}


def _hard_match(match: SearchMatch, intent: SearchIntent, strict_metadata: bool) -> bool:
    required_tags = set(_expanded_tags(intent.required_tags))
    excluded_tags = set(_expanded_tags(intent.excluded_tags))
    tags = {tag.lower() for tag in match.tags}
    if required_tags and strict_metadata and not tags.intersection(required_tags):
        return False
    if excluded_tags and tags.intersection(excluded_tags):
        return False
    if (intent.year_min or intent.year_max) and strict_metadata and not match.year:
        return False
    if intent.year_min and match.year and match.year < intent.year_min:
        return False
    if intent.year_max and match.year and match.year > intent.year_max:
        return False
    if intent.vocal_mode == "instrumental" and match.instrumentalness is not None and match.instrumentalness < 0.7:
        return False
    if intent.vocal_mode == "vocal" and match.instrumentalness is not None and match.instrumentalness > 0.5:
        return False
    if intent.explicit_mode != "any":
        if strict_metadata and match.explicit is None:
            return False
        if intent.explicit_mode == "avoid" and match.explicit is True:
            return False
        if intent.explicit_mode == "require" and match.explicit is False:
            return False
    return True


def _trusted(candidate: FusedCandidate, intent: SearchIntent) -> bool:
    """Only release candidates supported by retrieval and the verifier."""
    if not candidate.hard_pass or candidate.situation_fit < 3 or candidate.confidence < 2:
        return False
    if (
        intent.desired_destination or intent.trajectory or intent.avoid_state
    ) and candidate.trajectory_fit < 3:
        return False
    if intent.audio_weight >= 0.4 and candidate.sound_fit < 2:
        return False
    if intent.lyric_topics and intent.lyrics_weight >= 0.5:
        # A strong audio match cannot prove that a song covers a requested
        # situation or subject. Require direct support from the lyrics index.
        if candidate.source_scores.get("lyrics", -1.0) < 0.27:
            return False
    supported = any(
        (label == "lyrics" and score >= 0.43)
        or (label == "audio" and score >= 0.17)
        for label, score in candidate.source_scores.items()
    )
    if not supported:
        return False
    if candidate.fit == 3:
        return candidate.confidence == 3 and candidate.fusion_score >= 0.22
    return candidate.fusion_score >= 0.16


def _diverse_results(
    candidates: list[FusedCandidate], limit: int, intent: SearchIntent
) -> list[SearchMatch]:
    selected: list[SearchMatch] = []
    artist_counts: dict[str, int] = {}
    seen_tracks: set[str] = set()
    seen_recordings: set[tuple[str, str]] = set()
    for candidate in candidates:
        if not _trusted(candidate, intent):
            continue
        match = candidate.match
        identity = match.spotify_id or match.track_id
        artist_key = match.artist.casefold().strip()
        recording_key = (
            re.sub(r"[^a-z0-9]+", " ", match.title.casefold()).strip(),
            re.sub(r"[^a-z0-9]+", " ", artist_key).strip(),
        )
        if (
            identity in seen_tracks
            or recording_key in seen_recordings
            or artist_counts.get(artist_key, 0) >= 2
        ):
            continue
        seen_tracks.add(identity)
        seen_recordings.add(recording_key)
        artist_counts[artist_key] = artist_counts.get(artist_key, 0) + 1
        selected.append(match)
        if len(selected) >= limit:
            break
    return selected


async def _retrieve(
    current: Runtime,
    original_text: str,
    resolved_text: str,
    retrieval_views: list[dict[str, Any]] | list[RetrievalDraft],
    intent: SearchIntent,
    taste_profile: TasteProfileInput | None,
    limit: int,
) -> tuple[list[SearchMatch], int]:
    started = time.perf_counter()
    views = _query_views(original_text, resolved_text, retrieval_views, intent)
    if not views:
        return [], 0

    print(
        "MELODYMIND_QUERY_PLAN "
        + json.dumps(
            {
                "views": [
                    {"label": view.label, "weight": view.weight, "text": view.text}
                    for view in views
                ]
            },
            ensure_ascii=False,
        ),
        flush=True,
    )

    embed_started = time.perf_counter()
    vectors: list[list[float] | None] = [None] * len(views)
    audio_indexes = [index for index, view in enumerate(views) if view.channel == "audio"]
    lyrics_indexes = [index for index, view in enumerate(views) if view.channel == "lyrics"]
    if audio_indexes:
        async with current.inference_lock:
            audio_vectors = await asyncio.to_thread(
                current.encoder.embed_many,
                [views[index].text for index in audio_indexes],
            )
        for index, vector in zip(audio_indexes, audio_vectors):
            vectors[index] = vector
    if lyrics_indexes:
        async with current.inference_lock:
            lyrics_vectors = await asyncio.to_thread(
                current.lyrics_encoder.embed_many,
                [views[index].text for index in lyrics_indexes],
            )
        for index, vector in zip(lyrics_indexes, lyrics_vectors):
            vectors[index] = vector
    if any(vector is None for vector in vectors):
        raise RuntimeError("MelodyMind failed to encode every retrieval view")
    embed_ms = round((time.perf_counter() - embed_started) * 1000)

    pinecone_started = time.perf_counter()
    metadata_filter = _metadata_filter(intent)
    raw_sets = await asyncio.gather(*[
        asyncio.to_thread(
            current.catalogue.query,
            vector,
            160 if view.channel == "lyrics" else 120,
            channel=view.channel,
            metadata_filter=metadata_filter,
        )
        for view, vector in zip(views, vectors)
    ])
    pinecone_ms = round((time.perf_counter() - pinecone_started) * 1000)
    result_sets = list(zip(views, raw_sets))

    strict_metadata = any(match.tags for _, results in result_sets for match in results)
    candidates = [
        candidate
            for candidate in _hybrid_fuse(result_sets, limit=32)
        if _hard_match(candidate.match, intent, strict_metadata)
        and not (
            strict_metadata
            and intent.lyrics_weight >= 0.5
            and intent.lyric_topics
            and not candidate.match.evidence
        )
    ]
    if not candidates:
        print(
            "MELODYMIND_TIMING "
            + json.dumps(
                {
                    "queries": len(views),
                    "embed_ms": embed_ms,
                    "pinecone_ms": pinecone_ms,
                    "verifier_ms": 0,
                    "retrieve_total_ms": round((time.perf_counter() - started) * 1000),
                    "candidates": 0,
                }
            ),
            flush=True,
        )
        return [], len(views)

    verifier_started = time.perf_counter()
    rerank_request = resolved_text + "\n\nSTRUCTURED SEARCH INTENT:\n" + json.dumps(intent.payload(), ensure_ascii=False)
    judgments = await current.agent.judge_candidates(
        request=rerank_request,
        candidates=candidates,
    )
    verifier_ms = round((time.perf_counter() - verifier_started) * 1000)
    taste_vectors: dict[str, list[float]] = {}
    if taste_profile and taste_profile.signal_count >= 2:
        taste_track_ids = [item.track_id for item in taste_profile.positive_tracks]
        taste_track_ids.extend(item.track_id for item in taste_profile.negative_tracks)
        taste_track_ids.extend(candidate.match.track_id for candidate in candidates)
        taste_vectors = await asyncio.to_thread(
            current.catalogue.fetch_audio_vectors,
            taste_track_ids,
        )
    taste_adjustments = _taste_adjustments(candidates, taste_profile, taste_vectors)
    ordered = _experiential_order(candidates, judgments, intent, taste_adjustments)
    results = _diverse_results(ordered, limit, intent)

    print(
        "MELODYMIND_RANKING "
        + json.dumps(
            {
                "candidates": [
                    {
                        "title": candidate.match.title,
                        "artist": candidate.match.artist,
                        "fused_rank": candidate.fused_rank,
                        "final_rank": candidate.final_rank,
                        "fit": candidate.fit,
                        "hard_pass": candidate.hard_pass,
                        "situation_fit": candidate.situation_fit,
                        "trajectory_fit": candidate.trajectory_fit,
                        "sound_fit": candidate.sound_fit,
                        "confidence": candidate.confidence,
                        "taste_adjustment": round(candidate.taste_adjustment, 6),
                        "source_ranks": candidate.source_ranks,
                        "source_scores": {
                            label: round(score, 5)
                            for label, score in candidate.source_scores.items()
                        },
                        "fusion": round(candidate.fusion_score, 6),
                        "final_score": round(candidate.final_score, 6),
                    }
                    for candidate in candidates
                ]
            },
            ensure_ascii=False,
        ),
        flush=True,
    )
    print(
        "MELODYMIND_TIMING "
        + json.dumps(
            {
                "queries": len(views),
                "embed_ms": embed_ms,
                "pinecone_ms": pinecone_ms,
                "verifier_ms": verifier_ms,
                "retrieve_total_ms": round((time.perf_counter() - started) * 1000),
                "candidates": len(candidates),
            }
        ),
        flush=True,
    )
    return results, len(views)


def _result_message(count: int) -> str:
    if count == 0:
        return "I couldn’t find a strong enough match for that. Change one detail and I’ll try again."
    if count == 1:
        return "I found one song that matched closely enough to recommend."
    return f"I found {count} songs that matched closely enough to recommend."


async def _plan(
    current: Runtime,
    history: list[dict[str, str]],
    probes_used: int,
):
    started = time.perf_counter()
    decision = await current.agent.plan(history=history, probes_used=probes_used)
    print(
        "MELODYMIND_PLAN "
        + json.dumps(
            {
                "action": decision.action,
                "plan_ms": round((time.perf_counter() - started) * 1000),
                "retrieval_views": len(decision.retrieval_views),
                "probes_used": probes_used,
                "turns": len(history),
                "search_text": decision.search_text if decision.action == "search" else "",
            },
            ensure_ascii=False,
        ),
        flush=True,
    )
    return decision


def _probe_response(
    current: Runtime,
    history: list[dict[str, str]],
    query: str,
    message: str,
    probes_used: int,
) -> ProbeResponse:
    signed_history = history + [{"role": "assistant", "content": message}]
    conversation_token = _session_token(current, signed_history, probes_used=min(2, probes_used + 1))
    return ProbeResponse(
        query=query,
        message=message,
        conversation_token=conversation_token,
        model=current.settings.model_version,
    )


def _search_ready_response(
    current: Runtime,
    original: str,
    history: list[dict[str, str]],
    decision,
    taste_profile: TasteProfileInput | None,
) -> SearchReadyResponse:
    plan_token = _sign_token(
        current,
        {
            "v": 4,
            "kind": "search",
            "o": original,
            "s": decision.search_text,
            "r": [
                {"kind": view.kind, "text": view.text, "weight": view.weight}
                for view in decision.retrieval_views[:2]
            ],
            "m": decision.message,
            "y": decision.summary,
            "n": decision.intent.payload(),
            "t": _compact_taste(taste_profile),
            "h": _compact_history(history),
            "iat": int(time.time()),
        },
    )
    return SearchReadyResponse(
        query=original,
        message=decision.message,
        summary=decision.summary,
        plan_token=plan_token,
        model=current.settings.model_version,
    )


def _session_token(
    current: Runtime,
    history: list[dict[str, str]],
    *,
    probes_used: int,
) -> str:
    return _sign_token(
        current,
        {
            "v": 4,
            "kind": "session",
            "h": _compact_history(history),
            "u": max(0, min(2, int(probes_used))),
            "iat": int(time.time()),
        },
    )


def _compact_history(history: list[dict[str, str]]) -> list[dict[str, str]]:
    return [
        {"role": item["role"], "content": item["content"][:1300]}
        for item in history[-8:]
    ]


def _result_session_token(
    current: Runtime,
    payload: dict[str, Any],
    results: list[SearchMatch],
) -> str:
    history = list(payload.get("history") or [])
    result_lines: list[str] = []
    for index, match in enumerate(results[:10], start=1):
        details: list[str] = []
        if match.year:
            details.append(f"year {match.year}")
        if match.tags:
            details.append("tags " + ", ".join(match.tags[:4]))
        evidence = " ".join(match.evidence.split())[:120]
        if evidence:
            details.append("lyric evidence: " + evidence)
        suffix = " | " + " | ".join(details) if details else ""
        result_lines.append(f"{index}. {match.title} — {match.artist}{suffix}")
    assistant_content = str(payload.get("summary") or payload.get("message") or "Search complete.")
    resolved = str(payload.get("search_text") or "").strip()
    if resolved:
        assistant_content += "\nPrevious search: " + resolved[:650]
    if result_lines:
        assistant_content += "\nResults:\n" + "\n".join(result_lines)
    history.append({"role": "assistant", "content": assistant_content[:1400]})
    # A completed result set starts a new recommendation cycle. A later ambiguous
    # refinement may ask one fresh question.
    return _session_token(current, history, probes_used=0)


def _reply_response(
    current: Runtime,
    history: list[dict[str, str]],
    original: str,
    message: str,
) -> ReplyResponse:
    continued = history + [{"role": "assistant", "content": message}]
    return ReplyResponse(
        query=original,
        message=message,
        conversation_token=_session_token(current, continued, probes_used=0),
        model=current.settings.model_version,
    )


@app.get("/health")
async def health() -> dict[str, object]:
    current = active_runtime()
    return {
        "status": "ok",
        "model": current.settings.model_version,
        "dimension": current.encoder.dimension,
        "index": current.settings.pinecone_index,
        "namespace": current.settings.pinecone_namespace,
        "lyrics_namespace": current.settings.lyrics_namespace,
        "lyrics_embedding_model": "all-mpnet-base-v2",
        "agent_configured": current.agent.configured,
    }


@app.post(
    "/internal/plan",
    response_model=ProbeResponse | SearchReadyResponse | ReplyResponse,
)
async def plan_search(
    request: PlanRequest,
    authorization: Annotated[str | None, Header()] = None,
) -> ProbeResponse | SearchReadyResponse | ReplyResponse:
    authorize(authorization)
    current = active_runtime()

    if request.conversation_token:
        message = request.message.strip() if request.message else ""
        if not message:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Continuation message is required",
            )
        history, probes_used = _read_conversation(current, request.conversation_token)
        history.append({"role": "user", "content": message})
    else:
        query = request.query.strip() if request.query else ""
        if len(query) < 4:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Query is too short",
            )
        clarification = request.clarification.strip() if request.clarification else None
        history, probes_used = _legacy_history(query, clarification)

    original = _original_query(history)
    decision = await _plan(current, history, probes_used)

    if decision.action == "probe" and probes_used < 2:
        return _probe_response(current, history, original, decision.message, probes_used)
    if decision.action == "reply":
        return _reply_response(current, history, original, decision.message)
    return _search_ready_response(
        current,
        original,
        history,
        decision,
        request.taste_profile,
    )


@app.post("/internal/execute", response_model=SearchResponse)
async def execute_search(
    request: ExecuteRequest,
    authorization: Annotated[str | None, Header()] = None,
) -> SearchResponse:
    authorize(authorization)
    current = active_runtime()
    payload = _read_plan(current, request.plan_token)
    results, query_count = await _retrieve(
        current=current,
        original_text=str(payload["original"]),
        resolved_text=str(payload["search_text"]),
        retrieval_views=list(payload["retrieval_views"]),
        intent=payload["intent"],
        taste_profile=payload.get("taste_profile"),
        limit=request.limit,
    )
    return SearchResponse(
        query=str(payload["original"]),
        message=_result_message(len(results)),
        results=results,
        total=len(results),
        model=current.settings.model_version,
        retrieval_queries=query_count,
        conversation_token=_result_session_token(current, payload, results),
    )


@app.post(
    "/internal/search",
    response_model=ProbeResponse | SearchResponse,
)
async def search(
    request: SearchRequest,
    authorization: Annotated[str | None, Header()] = None,
) -> ProbeResponse | SearchResponse:
    """Backward-compatible one-shot endpoint for older Worker deployments."""
    authorize(authorization)
    current = active_runtime()
    query = request.query.strip()
    clarification = request.clarification.strip() if request.clarification else None
    history, probes_used = _legacy_history(query, clarification)
    decision = await _plan(current, history, probes_used)

    if decision.action == "probe" and probes_used < 2:
        return _probe_response(current, history, query, decision.message, probes_used)

    results, query_count = await _retrieve(
        current=current,
        original_text=query,
        resolved_text=decision.search_text,
        retrieval_views=decision.retrieval_views,
        intent=decision.intent,
        taste_profile=request.taste_profile,
        limit=request.limit,
    )
    return SearchResponse(
        query=query,
        message=_result_message(len(results)),
        results=results,
        total=len(results),
        model=current.settings.model_version,
        retrieval_queries=query_count,
        conversation_token=_session_token(
            current,
            history + [{"role": "assistant", "content": decision.summary or decision.message or "Search complete."}],
            probes_used=0,
        ),
    )
