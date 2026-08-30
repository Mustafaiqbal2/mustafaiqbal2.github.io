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


AGENT_SYSTEM_PROMPT = """You are MelodyMind, an emotionally intelligent music curator.
You receive the ACTUAL conversation between the user and MelodyMind. Decide whether one
clarification would materially improve the recommendations, or whether search can begin.

PROBING
- A probe is optional, not a required onboarding step. Search by default when the user's
  situation is already expressive enough to produce meaningful recommendations.
- Ask at most ONE clarification in the whole conversation.
- Probe only when there is a SPECIFIC unresolved ambiguity in this conversation and the
  answer would materially change the candidate songs.
- Before probing, consider whether two meaningfully different playlists could both satisfy
  everything the user has already said. If not, search.
- The question must target that specific ambiguity. It should make sense because of details
  in THIS conversation, rather than being a question that could be asked after almost any
  music request.
- Rich scene-setting is useful semantic information. Do not probe merely because the user
  did not explicitly provide a mood, energy level, genre, or "what the music should do".
- Do not default to generic questions such as "What do you want the music to do for you?",
  "How do you want to feel?", "What kind of vibe do you want?", or equivalents.
- If you cannot formulate a genuinely context-specific question whose answer would change
  the recommendations, search immediately.
- Do not make the user repeat information already present.
- If probe_used=true, search. Never ask a second question.
- If the user has already said what they want from the music, search immediately.

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
- A clarification refines the original situation; it never replaces or outweighs the rest
  of the conversation.
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

The acknowledgement `message` must briefly reflect the direction the user chose.

Return JSON only:
{"action":"probe","message":"one natural question","search_text":"","retrieval_views":[]}
or
{"action":"search","message":"short acknowledgement","search_text":"faithful resolved request","retrieval_views":[{"kind":"request_post","text":"..."},{"kind":"listener_story","text":"..."},{"kind":"experience_arc","text":"..."},{"kind":"music_description","text":"..."}]}
"""


PROBE_REPAIR_SUFFIX = """
A previous proposed clarification was rejected because it was generic. Decide again from
the conversation itself. Either SEARCH NOW, or ask a clarification whose uncertainty comes
from concrete details in this particular request. The question should not make sense as a
generic follow-up to an unrelated music request. Do not ask what the user wants the music
to do, how they want to feel, what mood they want, or what vibe they want in generic terms.
If there is no such specific ambiguity, search.
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


def _conversation_prompt(
    history: Sequence[dict[str, str]],
    probe_used: bool,
    rejected_probe: str | None = None,
) -> str:
    transcript = "\n".join(
        ("USER" if item["role"] == "user" else "MELODYMIND") + ": " + item["content"]
        for item in _clean_history(history)
    )
    prompt = f"probe_used: {'true' if probe_used else 'false'}\n\nCONVERSATION:\n{transcript}"
    if rejected_probe:
        prompt += "\n\nREJECTED_GENERIC_PROBE:\n" + rejected_probe
    return prompt


def _probe_is_generic(message: str) -> bool:
    """Catch generic fallback questions that should never reach the user."""
    normalized = re.sub(r"\s+", " ", message.casefold()).strip(" ?.!:,;")
    generic_fragments = (
        "what do you want the music to do",
        "what would you like the music to do",
        "what are you looking for from the music",
        "what kind of music are you looking for",
        "what kind of vibe do you want",
        "what vibe are you looking for",
        "how do you want the music to make you feel",
        "how do you want to feel",
        "what mood are you looking for",
    )
    return any(fragment in normalized for fragment in generic_fragments)


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

            if action == "probe" and not probe_used and message and _probe_is_generic(message):
                raw = await self._generate_json(
                    model=self.plan_model,
                    system_prompt=AGENT_SYSTEM_PROMPT + PROBE_REPAIR_SUFFIX,
                    user_prompt=_conversation_prompt(
                        history,
                        probe_used,
                        rejected_probe=message,
                    ),
                    temperature=0.1,
                    max_tokens=1100,
                )
                if not isinstance(raw, dict):
                    raise ValueError("Agent repair response was not an object")
                action = str(raw.get("action", "search")).strip().lower()
                message = str(raw.get("message", "")).strip()[:1000]

            if action == "probe" and not probe_used and message:
                if _probe_is_generic(message):
                    return AgentDecision(
                        action="search",
                        message="",
                        search_text=fallback_text,
                        retrieval_views=_fallback_views(fallback_text),
                    )
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
