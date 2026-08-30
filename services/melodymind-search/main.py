"""Private CLaMP3 text-search service for the portfolio demo."""

from __future__ import annotations

import asyncio
import base64
from contextlib import asynccontextmanager
from dataclasses import dataclass
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

from agent import GeminiAgent


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
    query: str = Field(min_length=4, max_length=500)
    clarification: str | None = Field(default=None, max_length=500)
    limit: int = Field(default=10, ge=1, le=20)


class PlanRequest(BaseModel):
    query: str = Field(min_length=4, max_length=500)
    clarification: str | None = Field(default=None, max_length=500)


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


def _combined_request(query: str, clarification: str | None) -> str:
    if not clarification:
        return query.strip()
    return query.strip() + "\n" + clarification.strip()


def _b64encode(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).decode("ascii").rstrip("=")


def _b64decode(value: str) -> bytes:
    return base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))


def _sign_plan(current: Runtime, payload: dict[str, Any]) -> str:
    encoded = _b64encode(
        json.dumps(payload, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
    )
    signature = hmac.new(
        current.settings.service_token.encode("utf-8"),
        encoded.encode("ascii"),
        hashlib.sha256,
    ).digest()
    return encoded + "." + _b64encode(signature)


def _read_plan(current: Runtime, token: str) -> dict[str, Any]:
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
        if not isinstance(payload, dict) or payload.get("v") != 1:
            raise ValueError("bad payload")
        issued_at = int(payload.get("iat", 0))
        now = int(time.time())
        if issued_at <= 0 or issued_at > now + 30 or now - issued_at > 900:
            raise ValueError("expired plan")
        query = payload.get("q")
        search_text = payload.get("s")
        paraphrases = payload.get("p")
        message = payload.get("m", "")
        if not isinstance(query, str) or not 4 <= len(query) <= 500:
            raise ValueError("bad query")
        if not isinstance(search_text, str) or not 4 <= len(search_text) <= 1100:
            raise ValueError("bad search text")
        if not isinstance(paraphrases, list) or len(paraphrases) > 3:
            raise ValueError("bad paraphrases")
        if not all(isinstance(item, str) and 4 <= len(item) <= 1100 for item in paraphrases):
            raise ValueError("bad paraphrase")
        if not isinstance(message, str) or len(message) > 1000:
            raise ValueError("bad message")
        return payload
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired search plan",
        ) from exc


def _rrf_fuse(result_sets: list[list[SearchMatch]], limit: int) -> list[SearchMatch]:
    """Fuse independent retrieval views using standard reciprocal-rank fusion."""
    if not result_sets:
        return []
    scores: dict[str, float] = {}
    best: dict[str, SearchMatch] = {}
    rrf_k = 60.0
    for results in result_sets:
        for rank, item in enumerate(results, start=1):
            key = item.spotify_id or item.track_id
            scores[key] = scores.get(key, 0.0) + 1.0 / (rrf_k + rank)
            current = best.get(key)
            if current is None or item.score > current.score:
                best[key] = item
    ordered = sorted(
        scores,
        key=lambda key: (scores[key], best[key].score),
        reverse=True,
    )
    return [best[key] for key in ordered[:limit]]


async def _retrieve(
    current: Runtime,
    search_text: str,
    paraphrases: list[str],
    limit: int,
) -> tuple[list[SearchMatch], int]:
    started = time.perf_counter()
    queries = [search_text]
    seen = {search_text.casefold()}
    for variant in paraphrases:
        text = variant.strip()
        key = text.casefold()
        if len(text) >= 4 and key not in seen:
            seen.add(key)
            queries.append(text)
        if len(queries) == 4:
            break

    embed_started = time.perf_counter()
    async with current.inference_lock:
        vectors = await asyncio.to_thread(current.encoder.embed_many, queries)
    embed_ms = round((time.perf_counter() - embed_started) * 1000)

    pinecone_started = time.perf_counter()
    result_sets = await asyncio.gather(
        *[
            asyncio.to_thread(current.catalogue.query, vector, 50)
            for vector in vectors
        ]
    )
    pinecone_ms = round((time.perf_counter() - pinecone_started) * 1000)

    candidates = _rrf_fuse(result_sets, limit=30)
    if not candidates:
        print(
            "MELODYMIND_TIMING "
            + json.dumps(
                {
                    "queries": len(queries),
                    "embed_ms": embed_ms,
                    "pinecone_ms": pinecone_ms,
                    "rerank_ms": 0,
                    "retrieve_total_ms": round((time.perf_counter() - started) * 1000),
                    "candidates": 0,
                }
            ),
            flush=True,
        )
        return [], len(queries)

    rerank_started = time.perf_counter()
    selected_indices = await current.agent.rerank(
        request=search_text,
        candidates=candidates,
        keep=limit,
    )
    rerank_ms = round((time.perf_counter() - rerank_started) * 1000)
    results = [candidates[index] for index in selected_indices if 0 <= index < len(candidates)]

    print(
        "MELODYMIND_TIMING "
        + json.dumps(
            {
                "queries": len(queries),
                "embed_ms": embed_ms,
                "pinecone_ms": pinecone_ms,
                "rerank_ms": rerank_ms,
                "retrieve_total_ms": round((time.perf_counter() - started) * 1000),
                "candidates": len(candidates),
            }
        ),
        flush=True,
    )
    return results[:limit], len(queries)


async def _plan(
    current: Runtime,
    query: str,
    clarification: str | None,
):
    started = time.perf_counter()
    decision = await current.agent.plan(query=query, clarification=clarification)
    print(
        "MELODYMIND_PLAN "
        + json.dumps(
            {
                "action": decision.action,
                "plan_ms": round((time.perf_counter() - started) * 1000),
                "paraphrases": len(decision.paraphrases),
                "has_clarification": bool(clarification),
            }
        ),
        flush=True,
    )
    return decision


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
    query = request.query.strip()
    clarification = request.clarification.strip() if request.clarification else None
    decision = await _plan(current, query, clarification)

    if decision.action == "probe" and not clarification:
        return ProbeResponse(
            query=query,
            message=decision.message,
            model=current.settings.model_version,
        )

    search_text = _combined_request(query, clarification)
    plan_token = _sign_plan(
        current,
        {
            "v": 1,
            "q": query,
            "s": search_text,
            "p": decision.paraphrases[:3],
            "m": decision.message,
            "iat": int(time.time()),
        },
    )
    return SearchReadyResponse(
        query=query,
        message=decision.message,
        plan_token=plan_token,
        model=current.settings.model_version,
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
        search_text=str(payload["s"]),
        paraphrases=list(payload["p"]),
        limit=request.limit,
    )
    return SearchResponse(
        query=str(payload["q"]),
        message=str(payload.get("m", "")),
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
    decision = await _plan(current, query, clarification)

    if decision.action == "probe" and not clarification:
        return ProbeResponse(
            query=query,
            message=decision.message,
            model=current.settings.model_version,
        )

    search_text = _combined_request(query, clarification)
    results, query_count = await _retrieve(
        current=current,
        search_text=search_text,
        paraphrases=decision.paraphrases,
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