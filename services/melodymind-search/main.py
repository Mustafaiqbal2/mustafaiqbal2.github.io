"""Private CLaMP3 text-search service for the portfolio demo."""

from __future__ import annotations

import asyncio
import base64
from contextlib import asynccontextmanager
from dataclasses import dataclass, field
import hashlib
import hmac
import json
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


class SearchRequest(BaseModel):
    """Backward-compatible one-shot request used during Worker rollouts."""

    query: str = Field(min_length=4, max_length=500)
    clarification: str | None = Field(default=None, max_length=500)
    limit: int = Field(default=10, ge=1, le=20)


class PlanRequest(BaseModel):
    """Initial request or a continuation of a signed search session."""

    query: str | None = Field(default=None, max_length=500)
    clarification: str | None = Field(default=None, max_length=500)
    conversation_token: str | None = Field(default=None, max_length=16384)
    message: str | None = Field(default=None, max_length=500)


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
    fit: int = 2
    confidence: int = 0
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
        else:
            raise ValueError("bad plan payload")

        if version in {1, 2}:
            summary = message
            intent_value = {}
            history_value = [{"role": "user", "content": str(original or "")[:500]}]

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
        return {
            "original": original,
            "search_text": search_text,
            "retrieval_views": validated_views,
            "message": message,
            "summary": summary,
            "intent": intent,
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


def _experiential_order(
    candidates: list[FusedCandidate],
    judgments: dict[int, CandidateJudgment],
    intent: SearchIntent,
) -> list[FusedCandidate]:
    """Blend reliable experiential knowledge without penalizing unknown music."""
    adjustment_by_fit = {
        0: -0.70,
        1: -0.40,
        2: 0.0,
        3: 0.22,
        4: 0.48,
    }
    for index, candidate in enumerate(candidates):
        judgment = judgments.get(index, CandidateJudgment(fit=2, confidence=0))
        candidate.fit = judgment.fit
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
        candidate.final_score = (
            candidate.fusion_score
            + adjustment_by_fit[judgment.fit] * confidence
            + metadata_adjustment
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
    if candidate.fit < 3 or candidate.confidence < 2:
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
    ordered = _experiential_order(candidates, judgments, intent)
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
                        "confidence": candidate.confidence,
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
    return _search_ready_response(current, original, history, decision)


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
