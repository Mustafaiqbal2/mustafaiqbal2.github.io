"""Lightweight conversational planning and verification for MelodyMind.

The portfolio service deliberately keeps the useful agent behavior from the original
MelodyMind demo while leaving its database/auth/Spotify/web-search stack behind.

The agent sees the actual conversation turns. It may ask at most one clarification.
When it searches, it resolves references in that conversation into one faithful,
self-contained retrieval sentence and a small number of meaning-preserving variants.
It never replaces Model A with an LLM-authored musical interpretation.
"""

from __future__ import annotations

from dataclasses import dataclass
import json
import os
import re
from typing import Sequence

import httpx


AGENT_SYSTEM_PROMPT = """You are MelodyMind, an emotionally intelligent music curator.
You are given the ACTUAL conversation between the user and MelodyMind. Decide whether one
clarification would materially improve the recommendations, or whether the system is ready
to search.

PROBING:
- Ask at most ONE clarification question in the whole conversation.
- Probe when the request leaves materially different musical goals plausible.
- The most useful probe often asks what the user wants the music to do: reflect/match the
  feeling, provide comfort, help release it, help move on, shift the mood, focus, celebrate,
  etc. Do not make the user repeat facts already present.
- A concrete life event does NOT automatically mean the goal is clear. "My dog died" can
  still need one question about what the user wants from the music.
- If probe_used=true, you MUST search. Never ask a second clarification.
- If the user already stated the desired direction/function, search immediately.

SEARCH PREPARATION:
When ready to search, return one `search_text` plus 0 to 2 `paraphrases`.
`search_text` is NOT an interpretation or an ontology. It is a concise, self-contained,
faithful resolution of what the conversation explicitly establishes.

You MAY:
- resolve pronouns and references using the preceding assistant question
- resolve answers such as "both", "the first one", or "more of the latter" using the exact
  alternatives the assistant presented
- combine the original situation with the user's explicit preference into one readable
  sentence

You MUST NOT:
- invent emotions, motivations, causes, consequences, therapeutic goals, genre,
  instrumentation, tempo, lyrical themes, era, or production style
- collapse relationship/subject types: friendship is not romance; pet loss is not partner
  loss; work, family, grief, conflict, celebration, etc. remain distinct when stated
- silently drop one side of a multi-part answer such as "a little bit of both"
- make the situation more dramatic, sentimental, specific, or musical than the conversation
- turn a life event into generic sonic language

PARAPHRASES:
- strictly preserve the meaning of `search_text`
- add no facts or musical attributes
- return fewer or none when a safe alternative is not possible

The acknowledgement `message` must also preserve the user's explicit selected direction. If
someone chose both options, acknowledge both rather than mentioning only one.

Return JSON only in one of these forms:
{"action":"probe","message":"one concise natural clarifying question","search_text":"","paraphrases":[]}
{"action":"search","message":"one short faithful acknowledgement","search_text":"self-contained faithful request","paraphrases":["...","..."]}
"""


RERANK_SYSTEM_PROMPT = """You are a conservative verification layer after an audio-semantic
retriever. Model A produced the candidate pool. Do NOT create a new ranking from scratch.
For each candidate, classify only what you can judge from RELIABLE knowledge of the song,
artist, lyrics/themes, and common listening context.

Allowed labels:
- strong: you reliably know it is a precise fit for the user's stated situation/direction
- credible: you reliably know it is a reasonable broader fit
- mismatch: you reliably know it conflicts with an explicit situation, relationship type,
  subject, mood direction, or activity
- unknown: you do not know enough to make a reliable judgment

Rules:
- preserve explicit relationship and subject types: friendship != romantic breakup; pet loss
  != partner loss; family/work/celebration/grief/conflict remain distinct when stated
- title or album wording alone is NOT evidence of relevance
- fame is NOT evidence of relevance
- unfamiliar/obscure songs MUST be `unknown`, not penalized
- candidate IDs and presentation order carry no quality signal
- use `mismatch` only when you are genuinely confident

Return ONLY one JSON object mapping candidate IDs to labels, for example:
{"c00":"unknown","c01":"strong","c02":"mismatch"}
"""


@dataclass(frozen=True)
class AgentDecision:
    action: str
    message: str
    search_text: str
    paraphrases: list[str]


def _clean_history(history: Sequence[dict[str, str]]) -> list[dict[str, str]]:
    cleaned: list[dict[str, str]] = []
    for item in history:
        role = str(item.get("role", "")).strip().lower()
        content = str(item.get("content", "")).strip()
        if role not in {"user", "assistant"} or not content:
            continue
        cleaned.append({"role": role, "content": content[:1000]})
    return cleaned[-6:]


def _fallback_search_text(history: Sequence[dict[str, str]]) -> str:
    """Preserve exact dialogue when the planner is unavailable; never invent intent."""
    cleaned = _clean_history(history)
    user_messages = [item["content"] for item in cleaned if item["role"] == "user"]
    if len(cleaned) == 1 and user_messages:
        return user_messages[0][:1600]
    transcript = "\n".join(
        ("User" if item["role"] == "user" else "MelodyMind") + ": " + item["content"]
        for item in cleaned
    )
    return transcript[:1600] or (user_messages[-1][:1600] if user_messages else "music request")


def _conversation_prompt(history: Sequence[dict[str, str]], probe_used: bool) -> str:
    cleaned = _clean_history(history)
    transcript = "\n".join(
        ("USER" if item["role"] == "user" else "MELODYMIND") + ": " + item["content"]
        for item in cleaned
    )
    return f"probe_used: {'true' if probe_used else 'false'}\n\nCONVERSATION:\n{transcript}"


class GeminiAgent:
    """Small Gemini REST client used only for planning and bounded verification."""

    def __init__(self) -> None:
        self.api_key = os.environ.get("GEMINI_API_KEY", "").strip()
        self.plan_model = os.environ.get(
            "MELODYMIND_PLAN_MODEL", "gemini-2.5-flash-lite"
        ).strip()
        self.rerank_model = os.environ.get(
            "MELODYMIND_RERANK_MODEL", "gemini-2.5-flash"
        ).strip()
        self._client: httpx.AsyncClient | None = None

    @property
    def configured(self) -> bool:
        return bool(self.api_key)

    async def close(self) -> None:
        if self._client is not None:
            await self._client.aclose()
            self._client = None

    async def _generate_json(
        self,
        *,
        model: str,
        system_prompt: str,
        user_prompt: str,
        temperature: float,
        max_tokens: int,
    ) -> object:
        if not self.api_key:
            raise RuntimeError("GEMINI_API_KEY is not configured")
        if self._client is None:
            self._client = httpx.AsyncClient(timeout=httpx.Timeout(20.0, connect=5.0))

        url = (
            "https://generativelanguage.googleapis.com/v1beta/models/"
            + model
            + ":generateContent"
        )
        generation_config: dict[str, object] = {
            "temperature": temperature,
            "maxOutputTokens": max_tokens,
            "responseMimeType": "application/json",
        }
        if model.startswith("gemini-2.5"):
            generation_config["thinkingConfig"] = {"thinkingBudget": 0}

        response = await self._client.post(
            url,
            params={"key": self.api_key},
            json={
                "system_instruction": {"parts": [{"text": system_prompt}]},
                "contents": [{"role": "user", "parts": [{"text": user_prompt}]}],
                "generationConfig": generation_config,
            },
        )
        response.raise_for_status()
        payload = response.json()
        candidates = payload.get("candidates") or []
        if not candidates:
            raise RuntimeError("Gemini returned no candidates")
        parts = candidates[0].get("content", {}).get("parts", [])
        text = "".join(str(part.get("text", "")) for part in parts).strip()
        if not text:
            raise RuntimeError("Gemini returned an empty response")
        text = re.sub(r"^```(?:json)?\s*|\s*```$", "", text, flags=re.IGNORECASE).strip()
        return json.loads(text)

    async def plan(
        self,
        history: Sequence[dict[str, str]],
        probe_used: bool = False,
    ) -> AgentDecision:
        """Return either one probe question or a faithful search plan."""
        fallback_text = _fallback_search_text(history)
        if not self.configured:
            return AgentDecision(
                action="search",
                message="",
                search_text=fallback_text,
                paraphrases=[],
            )

        try:
            raw = await self._generate_json(
                model=self.plan_model,
                system_prompt=AGENT_SYSTEM_PROMPT,
                user_prompt=_conversation_prompt(history, probe_used),
                temperature=0.1,
                max_tokens=520,
            )
            if not isinstance(raw, dict):
                raise ValueError("Agent response was not an object")

            action = str(raw.get("action", "search")).strip().lower()
            message = str(raw.get("message", "")).strip()[:1000]
            if probe_used:
                action = "search"
            if action == "probe" and not probe_used and message:
                return AgentDecision(
                    action="probe",
                    message=message,
                    search_text="",
                    paraphrases=[],
                )

            search_text = str(raw.get("search_text", "")).strip()
            if len(search_text) < 4 or len(search_text) > 1600:
                search_text = fallback_text

            variants: list[str] = []
            seen = {search_text.casefold()}
            for item in _clean_history(history):
                seen.add(item["content"].casefold())
            raw_variants = raw.get("paraphrases", [])
            if isinstance(raw_variants, list):
                for item in raw_variants:
                    if not isinstance(item, str):
                        continue
                    text = item.strip()
                    key = text.casefold()
                    if not 4 <= len(text) <= 1600 or key in seen:
                        continue
                    seen.add(key)
                    variants.append(text)
                    if len(variants) == 2:
                        break

            return AgentDecision(
                action="search",
                message=message,
                search_text=search_text,
                paraphrases=variants,
            )
        except Exception:
            return AgentDecision(
                action="search",
                message="",
                search_text=fallback_text,
                paraphrases=[],
            )

    async def judge_candidates(
        self,
        request: str,
        candidates: Sequence[object],
    ) -> dict[int, str]:
        """Classify candidates; unknown/missing judgments leave retrieval untouched."""
        if not self.configured or not candidates:
            return {}

        lines: list[str] = []
        for index, candidate in enumerate(candidates):
            title = str(getattr(candidate, "title", "Unknown"))
            artist = str(getattr(candidate, "artist", "Unknown"))
            album = getattr(candidate, "album", None)
            suffix = f" — {album}" if album else ""
            lines.append(f"c{index:02d}: {title} — {artist}{suffix}")

        prompt = (
            "USER REQUEST:\n"
            + request.strip()
            + "\n\nCANDIDATES:\n"
            + "\n".join(lines)
            + "\n\nClassify every candidate you can judge reliably. Use unknown when uncertain."
        )
        try:
            raw = await self._generate_json(
                model=self.rerank_model,
                system_prompt=RERANK_SYSTEM_PROMPT,
                user_prompt=prompt,
                temperature=0.0,
                max_tokens=760,
            )
            if not isinstance(raw, dict):
                raise ValueError("Verifier response was not an object")

            allowed = {"strong", "credible", "mismatch", "unknown"}
            judgments: dict[int, str] = {}
            for key, value in raw.items():
                match = re.fullmatch(r"c(\d{1,3})", str(key).strip(), re.IGNORECASE)
                label = str(value).strip().lower()
                if not match or label not in allowed:
                    continue
                index = int(match.group(1))
                if 0 <= index < len(candidates):
                    judgments[index] = label
            return judgments
        except Exception:
            return {}
