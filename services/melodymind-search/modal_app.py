"""Modal deployment wrapper for the MelodyMind CLaMP3 search service.

The search implementation stays in ``main.py``. This module gives the existing
FastAPI app a serverless Modal runtime and adds a private telemetry execute route
used by the portfolio Worker. The browser never receives retrieval telemetry.
"""

from contextvars import ContextVar
from pathlib import Path
import sys
import time
from typing import Annotated

import modal


SERVICE_DIR = Path(__file__).resolve().parent

image = modal.Image.from_dockerfile(
    SERVICE_DIR / "Dockerfile",
    context_dir=SERVICE_DIR,
)

app = modal.App("melodymind-search")
service_secret = modal.Secret.from_name(
    "melodymind-search",
    required_keys=["PINECONE_API_KEY", "MELODYMIND_SERVICE_TOKEN"],
)
openai_secret = modal.Secret.from_name(
    "melodymind-openai",
    required_keys=["OPENAI_API_KEY"],
)


def install_telemetry(search_main) -> None:
    """Install one ContextVar-backed telemetry route without cross-request state."""
    if getattr(search_main, "_portfolio_telemetry_installed", False):
        return

    telemetry_context: ContextVar[dict | None] = ContextVar(
        "melodymind_retrieval_telemetry", default=None
    )

    original_query_views = search_main._query_views
    original_hybrid_fuse = search_main._hybrid_fuse
    original_experiential_order = search_main._experiential_order

    def query_views(*args, **kwargs):
        views = original_query_views(*args, **kwargs)
        telemetry = telemetry_context.get()
        if telemetry is not None:
            telemetry["views"] = [
                {
                    "label": view.label,
                    "weight": round(float(view.weight), 3),
                    "text": str(view.text)[:300],
                }
                for view in views
            ]
        return views

    def hybrid_fuse(*args, **kwargs):
        candidates = original_hybrid_fuse(*args, **kwargs)
        telemetry = telemetry_context.get()
        if telemetry is not None:
            telemetry["candidate_count"] = len(candidates)
        return candidates

    def experiential_order(candidates, judgments, intent, taste_adjustments=None):
        ordered = original_experiential_order(
            candidates,
            judgments,
            intent,
            taste_adjustments,
        )
        telemetry = telemetry_context.get()
        if telemetry is not None:
            diagnostic = [
                candidate
                for candidate in candidates
                if candidate.fused_rank <= 5 or candidate.final_rank <= 10
            ]
            diagnostic.sort(key=lambda candidate: candidate.final_rank)
            telemetry["ranking"] = [
                {
                    "track_id": candidate.match.track_id,
                    "spotify_id": candidate.match.spotify_id,
                    "title": str(candidate.match.title)[:120],
                    "artist": str(candidate.match.artist)[:120],
                    "fused_rank": candidate.fused_rank,
                    "final_rank": candidate.final_rank,
                    "fit": candidate.fit,
                    "hard_pass": candidate.hard_pass,
                    "situation_fit": candidate.situation_fit,
                    "trajectory_fit": candidate.trajectory_fit,
                    "sound_fit": candidate.sound_fit,
                    "confidence": candidate.confidence,
                    "listenability_adjustment": round(float(candidate.listenability_adjustment), 6),
                    "taste_adjustment": round(float(candidate.taste_adjustment), 6),
                    "fusion": round(float(candidate.fusion_score), 6),
                    "final_score": round(float(candidate.final_score), 6),
                    "source_ranks": candidate.source_ranks,
                    "source_scores": {
                        label: round(float(score), 5)
                        for label, score in candidate.source_scores.items()
                    },
                }
                for candidate in diagnostic
            ]
        return ordered

    search_main._query_views = query_views
    search_main._hybrid_fuse = hybrid_fuse
    search_main._experiential_order = experiential_order

    from fastapi import Header

    @search_main.app.post("/internal/execute-telemetry")
    async def execute_with_telemetry(
        request: search_main.ExecuteRequest,
        authorization: Annotated[str | None, Header()] = None,
        x_analytics_search: Annotated[str | None, Header()] = None,
    ) -> dict:
        search_main.authorize(authorization)
        current = search_main.active_runtime()
        payload = search_main._read_plan(current, request.plan_token)
        telemetry: dict = {
            "resolved_request": str(payload["search_text"])[:700],
        }
        token = telemetry_context.set(telemetry)
        started = time.perf_counter()
        try:
            results, query_count = await search_main._retrieve(
                current=current,
                original_text=str(payload["original"]),
                resolved_text=str(payload["search_text"]),
                retrieval_views=list(payload["retrieval_views"]),
                intent=payload["intent"],
                taste_profile=payload.get("taste_profile"),
                limit=request.limit,
            )
            telemetry["retrieve_total_ms"] = round(
                (time.perf_counter() - started) * 1000
            )
            provider_snapshot = getattr(current.agent, "provider_snapshot", None)
            if callable(provider_snapshot):
                telemetry["llm"] = provider_snapshot()
        finally:
            telemetry_context.reset(token)

        if x_analytics_search:
            print(
                "MELODYMIND_SEARCH_ID "
                + str(x_analytics_search)[:96]
                + " candidates="
                + str(telemetry.get("candidate_count", 0)),
                flush=True,
            )

        dumped_results = [
            result.model_dump() if hasattr(result, "model_dump") else result.dict()
            for result in results
        ]
        return {
            "type": "results",
            "query": str(payload["original"]),
            "message": search_main._result_message(len(results)),
            "results": dumped_results,
            "total": len(results),
            "model": current.settings.model_version,
            "retrieval_queries": query_count,
            "conversation_token": search_main._result_session_token(
                current, payload, results
            ),
            "telemetry": telemetry,
        }

    search_main._portfolio_telemetry_installed = True


@app.function(
    image=image,
    secrets=[service_secret, openai_secret],
    cpu=2.0,
    memory=(2048, 6144),
    max_containers=5,
    buffer_containers=1,
    scaledown_window=1200,
    timeout=300,
    startup_timeout=180,
)
@modal.concurrent(target_inputs=2, max_inputs=4)
@modal.asgi_app()
def api():
    if "/app" not in sys.path:
        sys.path.insert(0, "/app")

    import main as search_main
    from openai_primary import install_openai_primary

    install_openai_primary(search_main)
    install_telemetry(search_main)
    return search_main.app
