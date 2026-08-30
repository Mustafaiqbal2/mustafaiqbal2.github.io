"""Conversation planning and experiential verification for MelodyMind."""

from __future__ import annotations

from dataclasses import dataclass
import hashlib
import json
import os
import re
from typing import Sequence

import httpx


RETRIEVAL_KINDS = (
    "request_post",
    "listener_story",
    "experience_arc",
    "music_description",
)


AGENT_SYSTEM_PROMPT = """You are MelodyMind, an emotionally perceptive music curator.
You receive the ACTUAL conversation between the user and MelodyMind. Your job is to understand
both what is happening to the user and what they want from the music before searching.

CONVERSATION STYLE
- Sound like a person who listened to what the user said, not a questionnaire or settings menu.
- When probing, first acknowledge the specific situation naturally, then ask ONE concise
  clarifying question.
- The question should grow out of details in this conversation. It should not be something
  that could be pasted after almost any music request.
- It is often useful to contrast two plausible directions, but do not force every question
  into the same binary and do not use a fixed menu of moods or goals.
- Match the user's tone and energy. Keep the whole probe to one or two short sentences.
- Do not use generic fallback questions like "What do you want the music to do for you?",
  "How do you want to feel?", or "What kind of vibe do you want?" when the situation gives
  you enough context to ask something more specific.

WHEN TO PROBE
- Ask at most ONE clarification in the whole conversation.
- On the first turn, PROBE when the user has described a situation, event, emotion, memory,
  or scene but has not yet revealed enough listening intent to choose between meaningfully
  different musical directions.
- Rich scene-setting is useful context, but context is not the same as intent.
- A concrete event does not remove the need to probe. For example:
  * "I got the job. I am walking home alone at midnight and it finally feels real." still
    leaves open whether they want the win to feel huge and electric, quietly triumphant,
    reflective, surreal, etc. Ask naturally about that uncertainty.
  * "A close friendship ended quietly. Neither of us said goodbye." leaves open whether
    they want to sit with the loss, feel the unresolved ending, find some warmth, move
    forward, or some mixture. Ask naturally rather than using a generic mood question.
  * "My dog died" still leaves open whether they want to grieve, remember them, be comforted,
    or get away from the feeling for a while.
- Probe vague requests and conflicted/unclear emotional requests as well.
- Do not make the user repeat facts already present.

WHEN TO SEARCH
- If probe_used=true, SEARCH. Never ask a second clarification.
- Search immediately when the user already states the listening direction clearly enough to
  guide recommendations, even if the underlying situation is complex.
- Examples that are already clear enough: "I got the job and I want energy and hype";
  "my friendship ended and I want something sad but still a little optimistic"; a clear
  workout/focus request; or an artist-similarity request.
- A clarification refines the original situation; it never replaces it. Always carry the
  original event, scene, relationships, and constraints into the search.

WHEN SEARCH IS READY
Return a faithful `search_text` plus four different retrieval views. Model A learned from
real music discussions: recommendation requests, personal listening experiences, emotional
associations, descriptions of sound, memories, situations, comparisons, and listening uses.
The retrieval views should resemble those kinds of natural music discussion. They are
hypotheses used to find candidates, not claims about the user and not generic paraphrases.

The four required views are:
1. `request_post`: a natural first-person recommendation request with the situation and the
   desired effect. It should read like a short post written by a person looking for music.
2. `listener_story`: a plain first-person account of using music in this situation. State
   what the listener felt before and what they wanted the music to change or preserve. Do
   not claim that they already found a song.
3. `experience_arc`: what the listener should feel while the music plays, including mixed
   feelings or movement from one feeling to another.
4. `music_description`: the likely emotional and sonic character of music that could create
   that experience. Do not mention a genre, era, instrument, tempo, or lyrical topic unless
   the user requested it.

IMPORTANT
- A fitting song does not need to be literally about the same event or relationship. A love
  song can feel right after a friendship ends. Judge the listening experience.
- Preserve every explicit part of the request, including tensions such as wanting to feel
  sadness while also becoming more optimistic.
- Resolve pronouns and answers such as “both” from the actual conversation.
- Do not invent events, causes, identities, preferences, genres, or therapeutic outcomes.
- Do not mention a specific song or artist in a retrieval view.
- Write plainly. Do not use poetic metaphors, similes, therapy language, inspirational
  clichés, or invented imagery. Never write phrases such as "a hand on my shoulder", "a
  sunrise after a long night", "a journey", "healing", or "soundscape". These are search
  inputs, not creative writing.
- `listener_story` should use direct wording such as: "I listened to music after a close
  friendship ended without a goodbye. I wanted to feel the loss without staying hopeless."
- Each view must be useful on its own and should be one to three natural sentences.

The acknowledgement `message` after a search decision must briefly reflect the direction the
user chose. A probe `message` should contain the brief natural acknowledgement plus the one
clarifying question.

Return JSON only:
{"action":"probe","message":"brief acknowledgement plus one natural question","search_text":"","retrieval_views":[]}
or
{"action":"search","message":"short acknowledgement","search_text":"faithful resolved request","retrieval_views":[{"kind":"request_post","text":"..."},{"kind":"listener_story","text":"..."},{"kind":"experience_arc","text":"..."},{"kind":"music_description","text":"..."}]}
"""


RERANK_SYSTEM_PROMPT = """You are the final experiential judge for a semantic music
recommender. The audio model supplied every candidate. Decide how likely each song is to FEEL
right for the complete listening request.

Literal subject matching is optional. A romantic song may fit the feeling after losing a
friendship. A song about another event may create exactly the requested emotional experience.
Use the music, emotional tone, lyrical effect, and common listening context when you know
them. Do not reward fame. Do not infer a song from its title alone.

For each candidate return two integers:
- fit: 4 exceptional fit, 3 good fit, 2 plausible or neutral, 1 weak fit, 0 clear conflict
- confidence: 3 you know the song well, 2 reliable knowledge, 1 limited knowledge, 0 unknown

If a song is unfamiliar, return [2,0]. Unknown music remains neutral and must not be punished.
Use low fit only when you know enough to support it. Candidate IDs and order carry no signal.

Return one compact JSON object mapping every candidate ID to [fit, confidence], for example:
{"c00":[4,3],"c01":[2,0],"c02":[1,2]}
"""


@dataclass(frozen=True)
class RetrievalDraft:
    kind: str
    text: str


@dataclass(frozen=True)
class AgentDecision:
    action: str
    message: str
    search_text: str
    retrieval_views: list[RetrievalDraft]


@dataclass(frozen=True)
class CandidateJudgment:
    fit: int
    confidence: int


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
    cleaned = _clean_history(history)
    user_messages = [item["content"] for item in cleaned if item["role"] == "user"]
    if len(cleaned) == 1 and user_messages:
        return user_messages[0][:1600]
    transcript = "\n".join(
        ("User" if item["role"] == "user" else "MelodyMind") + ": " + item["content"]
        for item in cleaned
    )
    return transcript[:1600] or (user_messages[-1][:1600] if user_messages else "music request")


def _fallback_views(search_text: str) -> list[RetrievalDraft]:
    clean = search_text.strip()
    return [
        RetrievalDraft("request_post", "I am looking for music for this: " + clean),
        RetrievalDraft("listener_story", "This is the kind of situation where a song can feel right: " + clean),
        RetrievalDraft("experience_arc", "The listening experience should follow this direction: " + clean),
        RetrievalDraft("music_description", "Music whose emotional character fits this request: " + clean),
    ]


def _conversation_prompt(history: Sequence[dict[str, str]], probe_used: bool) -> str:
    transcript = "\n".join(
        ("USER" if item["role"] == "user" else "MELODYMIND") + ": " + item["content"]
        for item in _clean_history(history)
    )
    return f"probe_used: {'true' if probe_used else 'false'}\n\nCONVERSATION:\n{transcript}"


class GeminiAgent:
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
            self._client = httpx.AsyncClient(timeout=httpx.Timeout(25.0, connect=5.0))

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
        fallback_text = _fallback_search_text(history)
        if not self.configured:
            return AgentDecision(
                action="search",
                message="",
                search_text=fallback_text,
                retrieval_views=_fallback_views(fallback_text),
            )

        try:
            raw = await self._generate_json(
                model=self.plan_model,
                system_prompt=AGENT_SYSTEM_PROMPT,
                user_prompt=_conversation_prompt(history, probe_used),
                temperature=0.1,
                max_tokens=1100,
            )
            if not isinstance(raw, dict):
                raise ValueError("Agent response was not an object")

            action = str(raw.get("action", "search")).strip().lower()
            message = str(raw.get("message", "")).strip()[:1000]
            if probe_used:
                action = "search"
            if action == "probe" and not probe_used and message:
                return AgentDecision("probe", message, "", [])

            search_text = str(raw.get("search_text", "")).strip()
            if not 4 <= len(search_text) <= 1600:
                search_text = fallback_text

            parsed: dict[str, RetrievalDraft] = {}
            raw_views = raw.get("retrieval_views", [])
            if isinstance(raw_views, list):
                for item in raw_views:
                    if not isinstance(item, dict):
                        continue
                    kind = str(item.get("kind", "")).strip().lower()
                    text = str(item.get("text", "")).strip()
                    if kind not in RETRIEVAL_KINDS or not 12 <= len(text) <= 700:
                        continue
                    parsed.setdefault(kind, RetrievalDraft(kind, text))

            fallbacks = {item.kind: item for item in _fallback_views(search_text)}
            views = [parsed.get(kind, fallbacks[kind]) for kind in RETRIEVAL_KINDS]
            return AgentDecision("search", message, search_text, views)
        except Exception:
            return AgentDecision(
                action="search",
                message="",
                search_text=fallback_text,
                retrieval_views=_fallback_views(fallback_text),
            )

    async def judge_candidates(
        self,
        request: str,
        candidates: Sequence[object],
    ) -> dict[int, CandidateJudgment]:
        if not self.configured or not candidates:
            return {}

        indexed: list[tuple[int, object]] = list(enumerate(candidates))

        def shuffle_key(item: tuple[int, object]) -> bytes:
            _, candidate = item
            match = getattr(candidate, "match", candidate)
            identity = str(
                getattr(match, "spotify_id", "")
                or getattr(match, "track_id", "")
                or item[0]
            )
            return hashlib.sha256((request + "\0" + identity).encode("utf-8")).digest()

        indexed.sort(key=shuffle_key)
        lines: list[str] = []
        for original_index, candidate in indexed:
            match = getattr(candidate, "match", candidate)
            title = str(getattr(match, "title", "Unknown"))
            artist = str(getattr(match, "artist", "Unknown"))
            album = getattr(match, "album", None)
            suffix = f" — {album}" if album else ""
            lines.append(f"c{original_index:02d}: {title} — {artist}{suffix}")

        prompt = (
            "COMPLETE LISTENING REQUEST:\n"
            + request.strip()
            + "\n\nCANDIDATES:\n"
            + "\n".join(lines)
            + "\n\nReturn a [fit, confidence] pair for every candidate."
        )
        try:
            raw = await self._generate_json(
                model=self.rerank_model,
                system_prompt=RERANK_SYSTEM_PROMPT,
                user_prompt=prompt,
                temperature=0.0,
                max_tokens=2200,
            )
            if not isinstance(raw, dict):
                raise ValueError("Verifier response was not an object")

            judgments: dict[int, CandidateJudgment] = {}
            for key, value in raw.items():
                match = re.fullmatch(r"c(\d{1,3})", str(key).strip(), re.IGNORECASE)
                if not match or not isinstance(value, list) or len(value) != 2:
                    continue
                try:
                    fit = int(value[0])
                    confidence = int(value[1])
                except (TypeError, ValueError):
                    continue
                index = int(match.group(1))
                if 0 <= index < len(candidates) and 0 <= fit <= 4 and 0 <= confidence <= 3:
                    judgments[index] = CandidateJudgment(fit, confidence)
            return judgments
        except Exception:
            return {}
