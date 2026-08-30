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
)


@dataclass(frozen=True)
class Settings:
    model_dir: Path
    pinecone_api_key: str
    pinecone_index: str
    pinecone_namespace: str
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
            "PINECONE_NAMESPACE", "clamp3-reddit-evidence-a-v1"
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
            service_token=required["MELODYMIND_SERVICE_TOKEN"],
            model_version=os.environ.get(
                "MELODYMIND_MODEL_VERSION", "clamp3-reddit-evidence-a-v1"
            ).strip(),
        )


class SearchRequest(BaseModel):
    """Backward-compatible one-shot request used during Worker rollouts."""

    query: str = Field(min_length=4, max_length=500)
    clarification: str | None = Field(default=None, max_length=500)
    limit: int = Field(default=10, ge=1, le=20)


class PlanRequest(BaseModel):
    """Initial planning request or a continuation of one signed probe."""

    query: str | None = Field(default=None, max_length=500)
    clarification: str | None = Field(default=None, max_length=500)
    conversation_token: str | None = Field(default=None, max_length=8192)
    message: str | None = Field(default=None, max_length=500)


class ExecuteRequest(BaseModel):
    plan_token: str = Field(min_length=16, max_length=8192)
    limit: int = Field(default=10, ge=1, le=20)


class SearchMatch(BaseModel):
    track_id: str
    spotify_id: str
    title: str
    artist: str
    album: str | None = None
    score: float


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


@dataclass(frozen=True)
class QueryView:
    label: str
    text: str
    weight: float


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
            model_dir, local_files_only=True
        )
        self.model = AutoModel.from_pretrained(model_dir, local_files_only=True)
        hidden_size = int(self.model.config.hidden_size)
        self.projection = nn.Linear(hidden_size, self.dimension)
        self.projection.load_state_dict(load_file(projection_path), strict=True)
        self.model.eval()
        self.projection.eval()

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

        all_input_ids = torch.cat(input_batches, dim=0)
        all_attention = torch.cat(attention_batches, dim=0)
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
            embeddings.append(normalized.tolist())
        return embeddings

    def embed(self, query: str) -> list[float]:
        return self.embed_many([query])[0]


class CatalogueSearch:
    def __init__(self, settings: Settings) -> None:
        self.namespace = settings.pinecone_namespace
        self.index = Pinecone(api_key=settings.pinecone_api_key).Index(
            settings.pinecone_index
        )

    def query(self, vector: list[float], top_k: int) -> list[SearchMatch]:
        response = self.index.query(
            vector=vector,
            top_k=min(max(top_k, 1), 200),
            namespace=self.namespace,
            include_metadata=True,
            include_values=False,
        )
        values: list[SearchMatch] = []
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
            values.append(
                SearchMatch(
                    track_id=str(match_id),
                    spotify_id=spotify_id,
                    title=str(metadata.get("title") or "Unknown"),
                    artist=str(metadata.get("artist") or "Unknown"),
                    album=(
                        str(metadata["album"])
                        if metadata.get("album") is not None
                        else None
                    ),
                    score=float(score),
                )
            )
        return values


@dataclass
class Runtime:
    settings: Settings
    encoder: Clamp3TextEncoder
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


def _read_token(current: Runtime, token: str, max_age_seconds: int = 900) -> dict[str, Any]:
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
    if not isinstance(value, list) or not 1 <= len(value) <= 6:
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
        if not content or len(content) > 1000:
            raise ValueError("bad history content")
        history.append({"role": str(role), "content": content})
    return history


def _read_conversation(current: Runtime, token: str) -> list[dict[str, str]]:
    try:
        payload = _read_token(current, token)
        if payload.get("v") != 2 or payload.get("kind") != "conversation":
            raise ValueError("bad conversation token")
        history = _validate_history(payload.get("h"))
        if not any(item["role"] == "assistant" for item in history):
            raise ValueError("conversation contains no probe")
        return history
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired conversation token",
        ) from exc


def _read_plan(current: Runtime, token: str) -> dict[str, Any]:
    try:
        payload = _read_token(current, token)
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
            retrieval_views = payload.get("r")
            message = payload.get("m", "")
        else:
            raise ValueError("bad plan payload")

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
        validated_views: list[dict[str, str]] = []
        for item in retrieval_views:
            if not isinstance(item, dict):
                raise ValueError("bad retrieval view")
            kind = str(item.get("kind", "")).strip().lower()
            text = str(item.get("text", "")).strip()
            if not kind or not 4 <= len(text) <= 700:
                raise ValueError("bad retrieval view")
            if version == 3 and kind not in RETRIEVAL_KINDS:
                raise ValueError("bad retrieval kind")
            validated_views.append({"kind": kind, "text": text})
        if not isinstance(message, str) or len(message) > 1000:
            raise ValueError("bad message")
        return {
            "original": original,
            "search_text": search_text,
            "retrieval_views": validated_views,
            "message": message,
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


def _legacy_history(query: str, clarification: str | None) -> tuple[list[dict[str, str]], bool]:
    history = [{"role": "user", "content": query.strip()}]
    if clarification:
        # Transitional support for an older Worker. New clients use the signed
        # conversation token so the assistant probe is never lost.
        history.append({"role": "user", "content": clarification.strip()})
    return history, bool(clarification)


def _query_views(
    original_text: str,
    resolved_text: str,
    retrieval_views: list[dict[str, str]] | list[RetrievalDraft],
) -> list[QueryView]:
    """Combine the user's words with views shaped like Model A's training text."""
    views: list[QueryView] = []
    seen: set[str] = set()
    weights = {
        "request_post": 1.25,
        "listener_story": 1.15,
        "experience_arc": 1.15,
        "music_description": 1.0,
    }

    def add(label: str, text: str, weight: float) -> None:
        clean = text.strip()
        key = clean.casefold()
        if len(clean) < 4 or key in seen:
            return
        seen.add(key)
        views.append(QueryView(label=label, text=clean, weight=weight))

    add("original", original_text, 0.85)
    add("resolved", resolved_text, 1.0)
    for index, draft in enumerate(retrieval_views[:4], start=1):
        if isinstance(draft, RetrievalDraft):
            kind, text = draft.kind, draft.text
        else:
            kind, text = str(draft.get("kind", "")), str(draft.get("text", ""))
        add(kind or f"legacy_{index}", text, weights.get(kind, 0.75))
    return views


def _normalize(values: dict[str, float]) -> dict[str, float]:
    if not values:
        return {}
    low = min(values.values())
    high = max(values.values())
    if high - low < 1e-9:
        return {key: 1.0 for key in values}
    return {key: (value - low) / (high - low) for key, value in values.items()}


def _hybrid_fuse(
    result_sets: list[tuple[QueryView, list[SearchMatch]]],
    limit: int,
) -> list[FusedCandidate]:
    """Fuse rank, cosine strength, and agreement across independent views."""
    if not result_sets:
        return []

    rrf_scores: dict[str, float] = {}
    similarity_scores: dict[str, float] = {}
    coverage_scores: dict[str, float] = {}
    best: dict[str, SearchMatch] = {}
    ranks: dict[str, dict[str, int]] = {}
    raw_scores: dict[str, dict[str, float]] = {}
    rrf_k = 25.0

    for view, results in result_sets:
        if not results:
            continue
        top_score = max(item.score for item in results)
        floor_score = min(item.score for item in results)
        spread = max(top_score - floor_score, 1e-6)
        for rank, item in enumerate(results, start=1):
            key = item.spotify_id or item.track_id
            relative_score = max(0.0, min(1.0, (item.score - floor_score) / spread))
            rrf_scores[key] = rrf_scores.get(key, 0.0) + view.weight / (rrf_k + rank)
            similarity_scores[key] = (
                similarity_scores.get(key, 0.0) + view.weight * relative_score
            )
            coverage_scores[key] = coverage_scores.get(key, 0.0) + view.weight
            ranks.setdefault(key, {})[view.label] = rank
            raw_scores.setdefault(key, {})[view.label] = item.score
            current = best.get(key)
            if current is None or item.score > current.score:
                best[key] = item

    normalized_rrf = _normalize(rrf_scores)
    normalized_similarity = _normalize(similarity_scores)
    normalized_coverage = _normalize(coverage_scores)
    fusion_scores = {
        key: (
            0.52 * normalized_rrf.get(key, 0.0)
            + 0.38 * normalized_similarity.get(key, 0.0)
            + 0.10 * normalized_coverage.get(key, 0.0)
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
        candidate.final_score = (
            candidate.fusion_score
            + adjustment_by_fit[judgment.fit] * confidence
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


async def _retrieve(
    current: Runtime,
    original_text: str,
    resolved_text: str,
    retrieval_views: list[dict[str, str]] | list[RetrievalDraft],
    limit: int,
) -> tuple[list[SearchMatch], int]:
    started = time.perf_counter()
    views = _query_views(original_text, resolved_text, retrieval_views)
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
    async with current.inference_lock:
        vectors = await asyncio.to_thread(
            current.encoder.embed_many,
            [view.text for view in views],
        )
    embed_ms = round((time.perf_counter() - embed_started) * 1000)

    pinecone_started = time.perf_counter()
    raw_sets = await asyncio.gather(
        *[
            asyncio.to_thread(current.catalogue.query, vector, 100)
            for vector in vectors
        ]
    )
    pinecone_ms = round((time.perf_counter() - pinecone_started) * 1000)
    result_sets = list(zip(views, raw_sets))

    candidates = _hybrid_fuse(result_sets, limit=80)
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
    judgments = await current.agent.judge_candidates(
        request=resolved_text,
        candidates=candidates,
    )
    verifier_ms = round((time.perf_counter() - verifier_started) * 1000)
    ordered = _experiential_order(candidates, judgments)
    results = [candidate.match for candidate in ordered[:limit]]

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


async def _plan(
    current: Runtime,
    history: list[dict[str, str]],
    probe_used: bool,
):
    started = time.perf_counter()
    decision = await current.agent.plan(history=history, probe_used=probe_used)
    print(
        "MELODYMIND_PLAN "
        + json.dumps(
            {
                "action": decision.action,
                "plan_ms": round((time.perf_counter() - started) * 1000),
                "retrieval_views": len(decision.retrieval_views),
                "probe_used": probe_used,
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
) -> ProbeResponse:
    signed_history = history + [{"role": "assistant", "content": message}]
    conversation_token = _sign_token(
        current,
        {
            "v": 2,
            "kind": "conversation",
            "h": signed_history,
            "iat": int(time.time()),
        },
    )
    return ProbeResponse(
        query=query,
        message=message,
        conversation_token=conversation_token,
        model=current.settings.model_version,
    )


def _search_ready_response(
    current: Runtime,
    original: str,
    decision,
) -> SearchReadyResponse:
    plan_token = _sign_token(
        current,
        {
            "v": 3,
            "kind": "search",
            "o": original,
            "s": decision.search_text,
            "r": [
                {"kind": view.kind, "text": view.text}
                for view in decision.retrieval_views[:4]
            ],
            "m": decision.message,
            "iat": int(time.time()),
        },
    )
    return SearchReadyResponse(
        query=original,
        message=decision.message,
        plan_token=plan_token,
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
        "agent_configured": current.agent.configured,
    }


@app.post(
    "/internal/plan",
    response_model=ProbeResponse | SearchReadyResponse,
)
async def plan_search(
    request: PlanRequest,
    authorization: Annotated[str | None, Header()] = None,
) -> ProbeResponse | SearchReadyResponse:
    authorize(authorization)
    current = active_runtime()

    if request.conversation_token:
        message = request.message.strip() if request.message else ""
        if not message:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Continuation message is required",
            )
        history = _read_conversation(current, request.conversation_token)
        history.append({"role": "user", "content": message})
        probe_used = True
    else:
        query = request.query.strip() if request.query else ""
        if len(query) < 4:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Query is too short",
            )
        clarification = request.clarification.strip() if request.clarification else None
        history, probe_used = _legacy_history(query, clarification)

    original = _original_query(history)
    decision = await _plan(current, history, probe_used)

    if decision.action == "probe" and not probe_used:
        return _probe_response(current, history, original, decision.message)
    return _search_ready_response(current, original, decision)


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
        limit=request.limit,
    )
    return SearchResponse(
        query=str(payload["original"]),
        message=str(payload.get("message", "")),
        results=results,
        total=len(results),
        model=current.settings.model_version,
        retrieval_queries=query_count,
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
    history, probe_used = _legacy_history(query, clarification)
    decision = await _plan(current, history, probe_used)

    if decision.action == "probe" and not probe_used:
        return _probe_response(current, history, query, decision.message)

    results, query_count = await _retrieve(
        current=current,
        original_text=query,
        resolved_text=decision.search_text,
        retrieval_views=decision.retrieval_views,
        limit=request.limit,
    )
    return SearchResponse(
        query=query,
        message=decision.message,
        results=results,
        total=len(results),
        model=current.settings.model_version,
        retrieval_queries=query_count,
    )
