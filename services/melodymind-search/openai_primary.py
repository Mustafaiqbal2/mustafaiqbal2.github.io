"""OpenAI-primary LLM adapter for MelodyMind.

Keeps the existing Gemini implementation as a provider fallback, but never
falls through to the old generic/no-LLM search path. If both providers fail,
MelodyMind returns an error instead of silently lowering recommendation quality.
"""

from __future__ import annotations

from contextvars import ContextVar
import hashlib
import json
import os
import re
from typing import Any, Sequence

import httpx


OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses"
_REASONING_LEVELS = {"none", "low", "medium", "high", "xhigh", "max"}


def _reasoning_env(name: str, default: str = "low") -> str:
    value = os.environ.get(name, default).strip().lower()
    return value if value in _REASONING_LEVELS else default


def _error_label(error: Exception) -> str:
    # Never include response/request URLs here: Gemini currently puts its API
    # key in a query parameter, and httpx exception strings can include URLs.
    if isinstance(error, httpx.HTTPStatusError):
        return f"{type(error).__name__}:{error.response.status_code}"
    return type(error).__name__


def install_openai_primary(search_main) -> None:
    """Replace ``main.GeminiAgent`` before FastAPI's lifespan instantiates it."""
    if getattr(search_main, "_openai_primary_installed", False):
        return

    import agent as agent_module

    class OpenAIPrimaryAgent(agent_module.GeminiAgent):
        def __init__(self) -> None:
            super().__init__()
            # ``self.api_key`` remains the existing Gemini key used by the
            # parent implementation when OpenAI needs a fallback.
            self.openai_api_key = os.environ.get("OPENAI_API_KEY", "").strip()
            self.openai_plan_model = os.environ.get(
                "MELODYMIND_OPENAI_PLAN_MODEL", "gpt-5.6-luna"
            ).strip()
            self.openai_rerank_model = os.environ.get(
                "MELODYMIND_OPENAI_RERANK_MODEL", "gpt-5.6-luna"
            ).strip()
            self.openai_plan_reasoning = _reasoning_env(
                "MELODYMIND_OPENAI_PLAN_REASONING", "low"
            )
            self.openai_rerank_reasoning = _reasoning_env(
                "MELODYMIND_OPENAI_RERANK_REASONING", "low"
            )
            self.gemini_plan_model = self.plan_model
            self.gemini_rerank_model = self.rerank_model
            self._openai_client: httpx.AsyncClient | None = None
            self._provider_state: ContextVar[tuple[str, str]] = ContextVar(
                f"melodymind_llm_provider_{id(self)}", default=("", "")
            )

        @property
        def configured(self) -> bool:
            return bool(self.openai_api_key or self.api_key)

        async def close(self) -> None:
            await super().close()
            if self._openai_client is not None:
                await self._openai_client.aclose()
                self._openai_client = None

        def _mark_provider(self, stage: str, provider: str) -> None:
            plan, rerank = self._provider_state.get()
            if stage == "plan":
                plan = provider
            else:
                rerank = provider
            self._provider_state.set((plan, rerank))

        def provider_snapshot(self) -> dict[str, str]:
            plan, rerank = self._provider_state.get()
            return {
                "plan": plan,
                "rerank": rerank,
                "openai_plan_model": self.openai_plan_model,
                "openai_rerank_model": self.openai_rerank_model,
            }

        async def _openai_json(
            self,
            *,
            stage: str,
            model: str,
            system_prompt: str,
            user_prompt: str,
            schema_name: str,
            schema: dict[str, Any],
            reasoning_effort: str,
            max_tokens: int,
        ) -> object:
            if not self.openai_api_key:
                raise RuntimeError("OPENAI_API_KEY is not configured")
            if self._openai_client is None:
                self._openai_client = httpx.AsyncClient(
                    timeout=httpx.Timeout(25.0, connect=5.0),
                    limits=httpx.Limits(max_connections=32, max_keepalive_connections=16),
                )

            response = await self._openai_client.post(
                OPENAI_RESPONSES_URL,
                headers={
                    "Authorization": "Bearer " + self.openai_api_key,
                    "Content-Type": "application/json",
                },
                json={
                    "model": model,
                    "instructions": system_prompt,
                    "input": user_prompt,
                    "reasoning": {"effort": reasoning_effort},
                    "text": {
                        "verbosity": "low",
                        "format": {
                            "type": "json_schema",
                            "name": schema_name,
                            "strict": True,
                            "schema": schema,
                        },
                    },
                    "max_output_tokens": max_tokens,
                    "store": False,
                },
            )
            response.raise_for_status()
            payload = response.json()
            if payload.get("status") != "completed":
                raise RuntimeError("OpenAI response did not complete")

            pieces: list[str] = []
            for item in payload.get("output") or []:
                if not isinstance(item, dict) or item.get("type") != "message":
                    continue
                for part in item.get("content") or []:
                    if isinstance(part, dict) and part.get("type") == "output_text":
                        pieces.append(str(part.get("text", "")))
            text = "".join(pieces).strip()
            if not text:
                raise RuntimeError("OpenAI returned an empty structured response")

            usage = payload.get("usage") if isinstance(payload.get("usage"), dict) else {}
            details = (
                usage.get("input_tokens_details")
                if isinstance(usage.get("input_tokens_details"), dict)
                else {}
            )
            print(
                "MELODYMIND_LLM "
                + json.dumps(
                    {
                        "stage": stage,
                        "provider": "openai",
                        "model": model,
                        "reasoning": reasoning_effort,
                        "input_tokens": usage.get("input_tokens", 0),
                        "cached_tokens": details.get("cached_tokens", 0),
                        "output_tokens": usage.get("output_tokens", 0),
                    }
                ),
                flush=True,
            )
            return json.loads(text)

        async def _gemini_json(
            self,
            *,
            stage: str,
            model: str,
            system_prompt: str,
            user_prompt: str,
            temperature: float,
            max_tokens: int,
        ) -> object:
            if not self.api_key:
                raise RuntimeError("GEMINI_API_KEY is not configured")
            raw = await agent_module.GeminiAgent._generate_json(
                self,
                model=model,
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                temperature=temperature,
                max_tokens=max_tokens,
            )
            print(
                "MELODYMIND_LLM "
                + json.dumps(
                    {"stage": stage, "provider": "gemini_fallback", "model": model}
                ),
                flush=True,
            )
            return raw

        def _parse_plan(
            self,
            raw: object,
            *,
            history: Sequence[dict[str, str]],
            probe_used: bool,
        ):
            if not isinstance(raw, dict):
                raise ValueError("Planner response was not an object")

            action = str(raw.get("action", "")).strip().lower()
            message = str(raw.get("message", "")).strip()[:1000]
            if probe_used and action == "probe":
                # A second probe is not allowed. Treat it as a provider failure
                # instead of coercing an incomplete probe payload into search.
                raise ValueError("Planner attempted a second probe")
            if action == "probe":
                if not message:
                    raise ValueError("Planner returned an empty probe")
                return agent_module.AgentDecision("probe", message, "", [])
            if action != "search":
                raise ValueError("Planner returned an invalid action")

            search_text = str(raw.get("search_text", "")).strip()
            if not 4 <= len(search_text) <= 1600:
                raise ValueError("Planner returned invalid search_text")

            parsed: dict[str, Any] = {}
            raw_views = raw.get("retrieval_views")
            if not isinstance(raw_views, list):
                raise ValueError("Planner returned invalid retrieval_views")
            for item in raw_views:
                if not isinstance(item, dict):
                    continue
                kind = str(item.get("kind", "")).strip().lower()
                text = str(item.get("text", "")).strip()
                if (
                    kind in agent_module.RETRIEVAL_KINDS
                    and 12 <= len(text) <= 700
                    and kind not in parsed
                ):
                    parsed[kind] = agent_module.RetrievalDraft(kind, text)
            if set(parsed) != set(agent_module.RETRIEVAL_KINDS):
                raise ValueError("Planner did not return all retrieval views")

            views = [parsed[kind] for kind in agent_module.RETRIEVAL_KINDS]
            return agent_module.AgentDecision("search", message, search_text, views)

        async def plan(
            self,
            history: Sequence[dict[str, str]],
            probe_used: bool = False,
        ):
            if not self.configured:
                raise RuntimeError("No MelodyMind LLM provider is configured")

            prompt = agent_module._conversation_prompt(history, probe_used)
            schema = {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "action": {"type": "string", "enum": ["probe", "search"]},
                    "message": {"type": "string"},
                    "search_text": {"type": "string"},
                    "retrieval_views": {
                        "type": "array",
                        "maxItems": 4,
                        "items": {
                            "type": "object",
                            "additionalProperties": False,
                            "properties": {
                                "kind": {
                                    "type": "string",
                                    "enum": list(agent_module.RETRIEVAL_KINDS),
                                },
                                "text": {"type": "string"},
                            },
                            "required": ["kind", "text"],
                        },
                    },
                },
                "required": ["action", "message", "search_text", "retrieval_views"],
            }

            openai_error: Exception | None = None
            if self.openai_api_key:
                try:
                    raw = await self._openai_json(
                        stage="plan",
                        model=self.openai_plan_model,
                        system_prompt=agent_module.AGENT_SYSTEM_PROMPT,
                        user_prompt=prompt,
                        schema_name="melodymind_plan",
                        schema=schema,
                        reasoning_effort=self.openai_plan_reasoning,
                        max_tokens=2200,
                    )
                    decision = self._parse_plan(
                        raw, history=history, probe_used=probe_used
                    )
                    self._mark_provider("plan", "openai")
                    return decision
                except Exception as error:
                    openai_error = error
                    print(
                        "MELODYMIND_LLM_FALLBACK "
                        + json.dumps(
                            {"stage": "plan", "from": "openai", "error": _error_label(error)}
                        ),
                        flush=True,
                    )

            if self.api_key:
                try:
                    raw = await self._gemini_json(
                        stage="plan",
                        model=self.gemini_plan_model,
                        system_prompt=agent_module.AGENT_SYSTEM_PROMPT,
                        user_prompt=prompt,
                        temperature=0.1,
                        max_tokens=1100,
                    )
                    decision = self._parse_plan(
                        raw, history=history, probe_used=probe_used
                    )
                    self._mark_provider("plan", "gemini_fallback")
                    return decision
                except Exception as error:
                    print(
                        "MELODYMIND_LLM_FAILURE "
                        + json.dumps(
                            {"stage": "plan", "provider": "gemini", "error": _error_label(error)}
                        ),
                        flush=True,
                    )
                    raise RuntimeError("MelodyMind planning providers failed") from error

            raise RuntimeError("OpenAI planning failed and Gemini fallback is unavailable") from openai_error

        def _candidate_prompt(self, request: str, candidates: Sequence[object]):
            indexed: list[tuple[int, object]] = list(enumerate(candidates))

            def shuffle_key(item: tuple[int, object]) -> bytes:
                _, candidate = item
                match = getattr(candidate, "match", candidate)
                identity = str(
                    getattr(match, "spotify_id", "")
                    or getattr(match, "track_id", "")
                    or item[0]
                )
                return hashlib.sha256(
                    (request + "\0" + identity).encode("utf-8")
                ).digest()

            indexed.sort(key=shuffle_key)
            lines: list[str] = []
            for original_index, candidate in indexed:
                match = getattr(candidate, "match", candidate)
                title = str(getattr(match, "title", "Unknown"))
                artist = str(getattr(match, "artist", "Unknown"))
                album = getattr(match, "album", None)
                suffix = f" — {album}" if album else ""
                lines.append(f"c{original_index:02d}: {title} — {artist}{suffix}")
            return (
                "COMPLETE LISTENING REQUEST:\n"
                + request.strip()
                + "\n\nCANDIDATES:\n"
                + "\n".join(lines)
                + "\n\nReturn a judgment for every candidate."
            )

        def _parse_openai_judgments(
            self, raw: object, candidate_count: int
        ) -> dict[int, Any]:
            if not isinstance(raw, dict) or not isinstance(raw.get("judgments"), list):
                raise ValueError("OpenAI reranker returned invalid judgments")
            values = raw["judgments"]
            if len(values) != candidate_count:
                raise ValueError("OpenAI reranker returned incomplete judgments")

            judgments: dict[int, Any] = {}
            for item in values:
                if not isinstance(item, dict):
                    raise ValueError("OpenAI reranker returned invalid judgment item")
                match = re.fullmatch(r"c(\d{1,3})", str(item.get("id", "")), re.I)
                if not match:
                    raise ValueError("OpenAI reranker returned invalid candidate id")
                index = int(match.group(1))
                fit = item.get("fit")
                confidence = item.get("confidence")
                if (
                    index in judgments
                    or not 0 <= index < candidate_count
                    or not isinstance(fit, int)
                    or not 0 <= fit <= 4
                    or not isinstance(confidence, int)
                    or not 0 <= confidence <= 3
                ):
                    raise ValueError("OpenAI reranker returned invalid candidate judgment")
                judgments[index] = agent_module.CandidateJudgment(fit, confidence)
            if len(judgments) != candidate_count:
                raise ValueError("OpenAI reranker omitted candidates")
            return judgments

        def _parse_gemini_judgments(
            self, raw: object, candidate_count: int
        ) -> dict[int, Any]:
            if not isinstance(raw, dict):
                raise ValueError("Gemini reranker response was not an object")
            judgments: dict[int, Any] = {}
            for key, value in raw.items():
                match = re.fullmatch(r"c(\d{1,3})", str(key).strip(), re.I)
                if not match or not isinstance(value, list) or len(value) != 2:
                    continue
                try:
                    fit = int(value[0])
                    confidence = int(value[1])
                except (TypeError, ValueError):
                    continue
                index = int(match.group(1))
                if 0 <= index < candidate_count and 0 <= fit <= 4 and 0 <= confidence <= 3:
                    judgments[index] = agent_module.CandidateJudgment(fit, confidence)
            if len(judgments) != candidate_count:
                raise ValueError("Gemini reranker returned incomplete judgments")
            return judgments

        async def judge_candidates(
            self,
            request: str,
            candidates: Sequence[object],
        ) -> dict[int, Any]:
            if not candidates:
                return {}
            if not self.configured:
                raise RuntimeError("No MelodyMind LLM provider is configured")

            prompt = self._candidate_prompt(request, candidates)
            schema = {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "judgments": {
                        "type": "array",
                        "minItems": len(candidates),
                        "maxItems": len(candidates),
                        "items": {
                            "type": "object",
                            "additionalProperties": False,
                            "properties": {
                                "id": {"type": "string"},
                                "fit": {"type": "integer", "enum": [0, 1, 2, 3, 4]},
                                "confidence": {"type": "integer", "enum": [0, 1, 2, 3]},
                            },
                            "required": ["id", "fit", "confidence"],
                        },
                    }
                },
                "required": ["judgments"],
            }
            openai_system = (
                agent_module.RERANK_SYSTEM_PROMPT
                + "\n\nFor this OpenAI structured-output call, return an object with a `judgments` "
                "array. Each item must be {\"id\":\"cNN\",\"fit\":N,\"confidence\":N}. "
                "Include every candidate exactly once."
            )

            openai_error: Exception | None = None
            if self.openai_api_key:
                try:
                    raw = await self._openai_json(
                        stage="rerank",
                        model=self.openai_rerank_model,
                        system_prompt=openai_system,
                        user_prompt=prompt,
                        schema_name="melodymind_rerank",
                        schema=schema,
                        reasoning_effort=self.openai_rerank_reasoning,
                        max_tokens=5000,
                    )
                    judgments = self._parse_openai_judgments(raw, len(candidates))
                    self._mark_provider("rerank", "openai")
                    return judgments
                except Exception as error:
                    openai_error = error
                    print(
                        "MELODYMIND_LLM_FALLBACK "
                        + json.dumps(
                            {"stage": "rerank", "from": "openai", "error": _error_label(error)}
                        ),
                        flush=True,
                    )

            if self.api_key:
                try:
                    raw = await self._gemini_json(
                        stage="rerank",
                        model=self.gemini_rerank_model,
                        system_prompt=agent_module.RERANK_SYSTEM_PROMPT,
                        user_prompt=(
                            prompt
                            + "\n\nReturn one compact JSON object mapping every candidate ID "
                            "to [fit, confidence]."
                        ),
                        temperature=0.0,
                        max_tokens=2200,
                    )
                    judgments = self._parse_gemini_judgments(raw, len(candidates))
                    self._mark_provider("rerank", "gemini_fallback")
                    return judgments
                except Exception as error:
                    print(
                        "MELODYMIND_LLM_FAILURE "
                        + json.dumps(
                            {"stage": "rerank", "provider": "gemini", "error": _error_label(error)}
                        ),
                        flush=True,
                    )
                    raise RuntimeError("MelodyMind reranking providers failed") from error

            raise RuntimeError("OpenAI reranking failed and Gemini fallback is unavailable") from openai_error

    search_main.GeminiAgent = OpenAIPrimaryAgent
    search_main._openai_primary_installed = True
