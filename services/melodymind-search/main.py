"""Private CLaMP3 text-search service for the portfolio demo."""

from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager
from dataclasses import dataclass
import json
import os
from pathlib import Path
import secrets
from typing import Annotated, Any

from fastapi import FastAPI, Header, HTTPException, status
from pydantic import BaseModel, Field
from pinecone import Pinecone
from safetensors.torch import load_file
import torch
from torch import nn
import torch.nn.functional as functional
from transformers import AutoModel, AutoTokenizer


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
    limit: int = Field(default=10, ge=1, le=20)


class SearchMatch(BaseModel):
    track_id: str
    spotify_id: str
    title: str
    artist: str
    album: str | None = None
    score: float


class SearchResponse(BaseModel):
    query: str
    results: list[SearchMatch]
    total: int
    model: str


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
            # CLaMP3 uses a full final window and weights it by the remainder.
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

    def embed(self, query: str) -> list[float]:
        lines = [line.strip() for line in query.splitlines() if line.strip()]
        text = self.tokenizer.sep_token.join(dict.fromkeys(lines)) or query.strip()
        token_ids = self.tokenizer(
            text,
            return_tensors="pt",
            truncation=False,
        )["input_ids"][0]
        input_ids, attention, segment_weights = self._segments(token_ids)

        with torch.inference_mode():
            hidden = self.model(
                input_ids=input_ids,
                attention_mask=attention,
            ).last_hidden_state
            mask = attention.unsqueeze(-1)
            pooled = (hidden * mask).sum(dim=1) / mask.sum(dim=1)
            projected = self.projection(pooled)
            combined = (
                projected * segment_weights.unsqueeze(-1)
            ).sum(dim=0) / segment_weights.sum()
            normalized = functional.normalize(combined, dim=0)
        if normalized.shape != (self.dimension,) or not torch.isfinite(
            normalized
        ).all():
            raise RuntimeError("CLaMP3 produced an invalid query vector")
        return normalized.tolist()


class CatalogueSearch:
    def __init__(self, settings: Settings) -> None:
        self.namespace = settings.pinecone_namespace
        self.index = Pinecone(api_key=settings.pinecone_api_key).Index(
            settings.pinecone_index
        )

    def query(self, vector: list[float], limit: int) -> list[SearchMatch]:
        response = self.index.query(
            vector=vector,
            top_k=min(limit * 2, 40),
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
            if len(values) == limit:
                break
        return values


@dataclass
class Runtime:
    settings: Settings
    encoder: Clamp3TextEncoder
    catalogue: CatalogueSearch
    inference_lock: asyncio.Lock


runtime: Runtime | None = None


@asynccontextmanager
async def lifespan(_: FastAPI):
    global runtime
    settings = Settings.from_environment()
    runtime = Runtime(
        settings=settings,
        encoder=Clamp3TextEncoder(settings.model_dir),
        catalogue=CatalogueSearch(settings),
        inference_lock=asyncio.Lock(),
    )
    yield
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


@app.get("/health")
async def health() -> dict[str, object]:
    current = active_runtime()
    return {
        "status": "ok",
        "model": current.settings.model_version,
        "dimension": current.encoder.dimension,
        "index": current.settings.pinecone_index,
        "namespace": current.settings.pinecone_namespace,
    }


@app.post(
    "/internal/search",
    response_model=SearchResponse,
)
async def search(
    request: SearchRequest,
    authorization: Annotated[str | None, Header()] = None,
) -> SearchResponse:
    authorize(authorization)
    current = active_runtime()
    query = request.query.strip()
    if len(query) < 4:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Query is too short",
        )
    async with current.inference_lock:
        vector = await asyncio.to_thread(current.encoder.embed, query)
    results = await asyncio.to_thread(
        current.catalogue.query, vector, request.limit
    )
    return SearchResponse(
        query=query,
        results=results,
        total=len(results),
        model=current.settings.model_version,
    )
