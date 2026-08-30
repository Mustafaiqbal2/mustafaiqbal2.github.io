"""Lightweight MelodyMind agent for the portfolio search service.

This keeps the useful conversational behavior from the original MelodyMind
backend without importing its database/auth/Spotify/web-search stack.

The agent has two jobs only:
1. Decide whether one clarification is genuinely needed before searching.
2. When ready, produce a few strictly meaning-preserving paraphrases for
   multi-query CLaMP3 retrieval.

The original user wording is never replaced by an LLM-generated query.
"""

from __future__ import annotations

from dataclasses import dataclass
import json
import os
import re
from typing import Sequence

import httpx


AGENT_SYSTEM_PROMPT = """You are MelodyMind, an emotionally intelligent music curator.
Your job is to decide whether the user's situation is already specific enough to search,
or whether ONE useful clarification would materially improve the recommendation.

PROBE FIRST when:
- the request is vague (for example: "I need music", "play something", "I'm bored")
- the user gives an emotion with no useful context and different musical directions are plausible
- the situation is ambiguous about what the user wants the music to do

SEARCH IMMEDIATELY when:
- the user gives a concrete situation, event, activity, genre, artist reference, or clear request
- the user explicitly asks for recommendations and there is enough information to search
- a clarification has already been supplied

GOLDEN RULE: at most one clarification question. If clarification_text is present, you MUST search.

When searching, create 0 to 3 alternate phrasings that are STRICTLY semantically equivalent
to the user's own wording. They are retrieval views, not interpretations.

PARAPHRASE RULES:
- preserve every explicit person/entity, relationship, event, negation, time, and constraint
- do not invent emotions, motivations, causes, consequences, genre, instrumentation, tempo,
  lyrical themes, or desired mood unless the user explicitly said them
- do not translate a life situation into generic musical language
- do not make the request more dramatic, therapeutic, sentimental, or specific than it is
- if a safe alternate phrasing is not possible, return fewer paraphrases or none
- never return the original wording itself as a paraphrase

Return JSON only in one of these forms:
{"action":"probe","message":"one concise natural clarifying question","paraphrases":[]}
{"action":"search","message":"one short natural acknowledgement","paraphrases":["...","..."]}
"""


RERANK_SYSTEM_PROMPT = """You are the second-stage curator in a semantic music retrieval system.
The audio model produced the candidate pool. Use your own reliable knowledge of songs,
artists, themes, lyrics, and common listening context to improve the ordering.

Rules:
- prioritize the user's actual situation and constraints, not generic popularity
- do not prefer a song merely because it is famous
- if you do not know a song well enough, do not penalize it; preserve its relative retrieval order
- remove or demote clear thematic/mood/activity mismatches when you are confident
- prefer precise fits over generic songs that merely share a broad emotion
- select exactly the requested number when possible

Return ONLY a JSON array of candidate IDs in best-first order, e.g. ["c03","c11","c01"].
"""


@dataclass(frozen=True)
class AgentDecision:
    action: str
    message: str
    paraphrases: list[str]


class GeminiAgent:
    """Small Gemini REST client used only for planning and reranking."""

    def __init__(self) -> None:
        self.api_key = os.environ.get("GEMINI_API_KEY", "").strip()
        self.model = os.environ.get("MELODYMIND_AGENT_MODEL", "gemini-2.5-flash").strip()
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
        system_prompt: str,
        user_prompt: str,
        temperature: float,
        max_tokens: int,
    ) -> object:
        if not self.api_key:
            raise RuntimeError("GEMINI_API_KEY is not configured")
        if self._client is None:
            self._client = httpx.AsyncClient(timeout=30.0)

        url = (
            "https://generativelanguage.googleapis.com/v1beta/models/"
            + self.model
            + ":generateContent"
        )
        response = await self._client.post(
            url,
            params={"key": self.api_key},
            json={
                "system_instruction": {"parts": [{"text": system_prompt}]},
                "contents": [
                    {
                        "role": "user",
                        "parts": [{"text": user_prompt}],
                    }
                ],
                "generationConfig": {
                    "temperature": temperature,
                    "maxOutputTokens": max_tokens,
                    "responseMimeType": "application/json",
                },
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
        query: str,
        clarification: str | None = None,
    ) -> AgentDecision:
        """Return either one probe question or a search plan."""
        if not self.configured:
            return AgentDecision(action="search", message="", paraphrases=[])

        prompt = (
            "original_request:\n"
            + query.strip()
            + "\n\nclarification_text:\n"
            + (clarification.strip() if clarification else "<none>")
        )
        try:
            raw = await self._generate_json(
                system_prompt=AGENT_SYSTEM_PROMPT,
                user_prompt=prompt,
                temperature=0.15,
                max_tokens=900,
            )
            if not isinstance(raw, dict):
                raise ValueError("Agent response was not an object")
            action = str(raw.get("action", "search")).strip().lower()
            message = str(raw.get("message", "")).strip()
            if clarification:
                action = "search"
            if action == "probe" and not clarification and message:
                return AgentDecision(action="probe", message=message, paraphrases=[])

            variants: list[str] = []
            seen = {query.strip().casefold()}
            if clarification:
                seen.add(clarification.strip().casefold())
            raw_variants = raw.get("paraphrases", [])
            if isinstance(raw_variants, list):
                for item in raw_variants:
                    if not isinstance(item, str):
                        continue
                    text = item.strip()
                    key = text.casefold()
                    if len(text) < 4 or key in seen:
                        continue
                    seen.add(key)
                    variants.append(text)
                    if len(variants) == 3:
                        break
            return AgentDecision(action="search", message=message, paraphrases=variants)
        except Exception:
            # Search must remain available even if the planning model is down.
            return AgentDecision(action="search", message="", paraphrases=[])

    async def rerank(
        self,
        request: str,
        candidates: Sequence[object],
        keep: int,
    ) -> list[int]:
        """Return candidate indices in preferred order, falling back safely."""
        fallback = list(range(min(keep, len(candidates))))
        if not self.configured or len(candidates) <= keep:
            return fallback

        lines: list[str] = []
        for index, candidate in enumerate(candidates):
            title = str(getattr(candidate, "title", "Unknown"))
            artist = str(getattr(candidate, "artist", "Unknown"))
            album = getattr(candidate, "album", None)
            suffix = f" — {album}" if album else ""
            lines.append(f'c{index:02d}: {title} — {artist}{suffix}')

        prompt = (
            "USER REQUEST:\n"
            + request.strip()
            + "\n\nCANDIDATES (current order is the audio-retrieval order):\n"
            + "\n".join(lines)
            + f"\n\nSelect the best {keep}."
        )
        try:
            raw = await self._generate_json(
                system_prompt=RERANK_SYSTEM_PROMPT,
                user_prompt=prompt,
                temperature=0.1,
                max_tokens=1200,
            )
            if not isinstance(raw, list):
                raise ValueError("Reranker response was not an array")
            selected: list[int] = []
            seen: set[int] = set()
            for item in raw:
                match = re.fullmatch(r"c(\d{1,3})", str(item).strip(), re.IGNORECASE)
                if not match:
                    continue
                index = int(match.group(1))
                if 0 <= index < len(candidates) and index not in seen:
                    seen.add(index)
                    selected.append(index)
                if len(selected) == keep:
                    break
            # If the model returns fewer than requested, preserve retrieval order
            # for the remaining slots rather than hallucinating a penalty.
            for index in range(len(candidates)):
                if index not in seen:
                    selected.append(index)
                if len(selected) == keep:
                    break
            return selected[:keep]
        except Exception:
            return fallback
