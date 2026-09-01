"""Conversation planning and evidence-aware ranking for MelodyMind."""

from __future__ import annotations

from dataclasses import dataclass
import hashlib
import json
import os
import re
from typing import Any, Sequence

import httpx


RETRIEVAL_KINDS = ("lyrics", "audio")
VOCAL_MODES = ("any", "vocal", "instrumental")
EXPLICIT_MODES = ("any", "avoid", "require")
FAMILIARITY_MODES = ("any", "recognizable", "discovery")


AGENT_SYSTEM_PROMPT = r"""You are MelodyMind, a conversational music search agent.

The user is looking for existing songs. Understand the full conversation before deciding
whether to ask a question, search, or answer without searching.

HOW A TURN WORKS
- PROBE only when one answer would materially change the recommendations. Ask one concise,
  specific question. Do not ask for information the user already supplied. The message must
  be one sentence, end with a question mark, and contain no apology, empathy preamble,
  explanation of why you are asking, or list of examples.
- SEARCH when the request is clear enough. A follow-up after results changes the previous
  request unless the user clearly starts a new request. "More upbeat", "less sad", "keep the
  first one", and similar replies must use the previous request and result list.
- REPLY when the user asks about the existing recommendations, asks what you understood, or
  asks for something outside recommendation search. Explain briefly and do not fabricate.
  If asked why a result was chosen, use only the result evidence in the conversation. Never
  invent lyrical themes, instruments, samples, popularity, or production details.
- This is a search tool for existing music. Do not refuse, moralize, or lecture because a
  situation is explicit, illegal, embarrassing, angry, or absurd. If the intended listening
  direction is unclear, ask what the user wants the music to express. Do not invent or endorse
  the event; simply find music for the requested reaction to it.
- `probes_used` is the number of clarifications already asked in this recommendation cycle.
  Usually ask at most one. A second is allowed only when the first answer still leaves a
  specific ambiguity that would materially change retrieval. Never ask more than two. A
  later refinement after results starts a new cycle.

SEARCH INTENT
Separate the request into:
1. Hard constraints: explicit requirements. Examples are "political rap", a language, an
   era, no metal, instrumental only, or lyrics about work. Do not convert these into mood.
2. Soft preferences: desirable qualities that may bend to produce a better song. Examples
   are familiar music, a certain energy level, warmth, forward motion, or soul samples.
3. Exclusions: anything the user said they do not want.

Only put a genre in `required_tags` when the user explicitly requires it. Use broad lowercase
tags such as rap, hip hop, pop, rock, punk, metal, rnb, soul, jazz, electronic, country,
folk, reggae, classical, or soundtrack. Put explicit unwanted genres in `excluded_tags`.
Treat "modern", "recent", and "current" as music released from 2015 onward unless the user
gives a different period. Put that boundary in `year_min` so older songs cannot leak through.

RETRIEVAL ROUTING
- Lyrics retrieval answers questions about subject, situation, perspective, wording, social
  or political content, relationships, and emotional movement.
- Audio retrieval answers questions about sound, energy, pace, atmosphere, production,
  instrumentation, and how the recording feels.
- Most situational searches use both. Change the weights based on the request instead of
  using the same recipe every time.
- Political or topic-specific rap: lyrics should dominate; genre is a hard filter; audio can
  check energy and production.
- Focus, running, instrumental, or production-led requests: audio should dominate.
- Loss, betrayal, work dread, leaving home, and similar situations: lyrics should carry the
  event and desired direction while audio checks the requested emotional/energy character.
- Do not retrieve four paraphrases of the same idea. Return one lyrics query and one audio
  query. Either may have weight 0 when it genuinely adds no value.

QUERY WRITING
- `lyrics` should describe the situation, perspective, lyrical subject, and emotional
  direction in direct language. Do not require literal event matching unless the user did.
  Do not put energy, pace, catchiness, hooks, delivery, instruments, production, or samples
  in the lyrics query; those belong only in the audio query.
- `audio` should describe only sound and listening experience. Do not invent genres,
  instruments, eras, or production traits.
- Do not translate an emotion word into a genre stereotype. In particular, ordinary work
  dread means weary, reluctant, or drained unless the user explicitly asks for aggressive,
  extreme, heavy, or bleak music.
- Preserve mixed directions exactly. Sad but optimistic is not generic bittersweet. Ordinary
  work dread is not aggression. Moving on after a quiet friendship ending is not static
  despair. Excited forward motion is not ambient reflection.
- A romantic song may still feel right after a friendship ends. Experiential fit matters,
  but explicit lyrical constraints remain hard constraints.

USER-FACING TEXT
- `message` is a short natural acknowledgement.
- `summary` is one plain sentence saying what you are about to look for. It is shown while
  search runs. It must mention important hard constraints and the requested direction.
- Do not use therapy language, poetic filler, headings such as "Direction 1", or generic
  phrases such as "a journey", "healing", "soundscape", or "what you need right now".

Return JSON only with every field shown below.

For a probe:
{"action":"probe","message":"...","summary":"","resolved_request":"","intent":{"situation":"","desired_effect":"","hard_constraints":[],"soft_preferences":[],"exclusions":[],"required_tags":[],"excluded_tags":[],"lyric_topics":[],"year_min":0,"year_max":0,"vocal_mode":"any","explicit_mode":"any","familiarity":"any","energy_min":-1,"energy_max":-1,"lyrics_weight":0,"audio_weight":0},"retrieval_views":[]}

For a search:
{"action":"search","message":"...","summary":"I’ll look for ...","resolved_request":"...","intent":{"situation":"...","desired_effect":"...","hard_constraints":["..."],"soft_preferences":["..."],"exclusions":["..."],"required_tags":["rap"],"excluded_tags":["metal"],"lyric_topics":["political and social commentary"],"year_min":0,"year_max":0,"vocal_mode":"vocal","explicit_mode":"any","familiarity":"recognizable","energy_min":0.55,"energy_max":1,"lyrics_weight":0.75,"audio_weight":0.25},"retrieval_views":[{"kind":"lyrics","text":"...","weight":0.75},{"kind":"audio","text":"...","weight":0.25}]}

For a reply:
{"action":"reply","message":"...","summary":"","resolved_request":"","intent":{"situation":"","desired_effect":"","hard_constraints":[],"soft_preferences":[],"exclusions":[],"required_tags":[],"excluded_tags":[],"lyric_topics":[],"year_min":0,"year_max":0,"vocal_mode":"any","explicit_mode":"any","familiarity":"any","energy_min":-1,"energy_max":-1,"lyrics_weight":0,"audio_weight":0},"retrieval_views":[]}
"""


RERANK_SYSTEM_PROMPT = r"""You are the final evidence-based judge for MelodyMind.

You receive the resolved request and candidates with available metadata, lyric evidence,
audio retrieval evidence, and source ranks. Judge whether each song is likely to work for
the complete request.

- A hard constraint is mandatory when the evidence can verify it. A known contradiction is
  fit 0 or 1. Do not reward a song for matching only the mood while missing an explicit topic
  or genre.
- Soft preferences may trade off. Judge the complete listening experience.
- Literal lyrical subject matching is optional unless the user explicitly required it.
- Do not infer lyrics from a title. Do not assume obscure means bad or famous means good.
- When evidence is missing, remain neutral. Lack of model knowledge is not negative evidence.
- Use a supplied lyric excerpt only as evidence for this request. Do not quote it.

Return two integers per candidate:
- fit: 4 exceptional, 3 good, 2 plausible or uncertain, 1 weak, 0 clear conflict
- confidence: 3 strong evidence, 2 reliable evidence, 1 limited evidence, 0 unknown
- Use confidence 3 only when the supplied evidence or firmly known song information supports
  the complete fit. A plausible title or one matching attribute is not enough.
"""


@dataclass(frozen=True)
class RetrievalDraft:
    kind: str
    text: str
    weight: float = 0.5


@dataclass(frozen=True)
class SearchIntent:
    situation: str = ""
    desired_effect: str = ""
    hard_constraints: tuple[str, ...] = ()
    soft_preferences: tuple[str, ...] = ()
    exclusions: tuple[str, ...] = ()
    required_tags: tuple[str, ...] = ()
    excluded_tags: tuple[str, ...] = ()
    lyric_topics: tuple[str, ...] = ()
    year_min: int = 0
    year_max: int = 0
    vocal_mode: str = "any"
    explicit_mode: str = "any"
    familiarity: str = "any"
    energy_min: float = -1.0
    energy_max: float = -1.0
    lyrics_weight: float = 0.5
    audio_weight: float = 0.5

    def payload(self) -> dict[str, Any]:
        return {
            "situation": self.situation,
            "desired_effect": self.desired_effect,
            "hard_constraints": list(self.hard_constraints),
            "soft_preferences": list(self.soft_preferences),
            "exclusions": list(self.exclusions),
            "required_tags": list(self.required_tags),
            "excluded_tags": list(self.excluded_tags),
            "lyric_topics": list(self.lyric_topics),
            "year_min": self.year_min,
            "year_max": self.year_max,
            "vocal_mode": self.vocal_mode,
            "explicit_mode": self.explicit_mode,
            "familiarity": self.familiarity,
            "energy_min": self.energy_min,
            "energy_max": self.energy_max,
            "lyrics_weight": self.lyrics_weight,
            "audio_weight": self.audio_weight,
        }


EMPTY_INTENT = SearchIntent(lyrics_weight=0.0, audio_weight=0.0)


@dataclass(frozen=True)
class AgentDecision:
    action: str
    message: str
    summary: str
    search_text: str
    intent: SearchIntent
    retrieval_views: list[RetrievalDraft]


@dataclass(frozen=True)
class CandidateJudgment:
    fit: int
    confidence: int


def _bounded_text(value: object, limit: int) -> str:
    return str(value or "").strip()[:limit]


def _direct_reply(history: Sequence[dict[str, str]]) -> AgentDecision | None:
    """Handle requests that are unambiguously outside catalogue search."""
    cleaned = _clean_history(history)
    if not cleaned or cleaned[-1]["role"] != "user":
        return None
    message = cleaned[-1]["content"].casefold()
    asks_to_create = re.search(
        r"\b(?:write|compose|create)\b.{0,80}\b(?:song|lyrics|verse|chorus)\b",
        message,
    )
    if asks_to_create and not re.search(
        r"\b(?:playlist|list|recommend|find|search)\b", message
    ):
        return AgentDecision(
            "reply",
            "I search existing songs. Tell me what it should be about or feel like, and Iâ€™ll find matches.",
            "",
            "",
            EMPTY_INTENT,
            [],
        )
    return None


def _concise_probe(message: str) -> str:
    """Keep the planner's useful question and discard conversational preambles."""
    questions = re.findall(r"[^?]*\?", " ".join(message.split()))
    if questions:
        message = questions[-1].strip()
    message = re.sub(r"^(?:for example|for instance),?\s*", "", message, flags=re.I)
    words = message.split()
    if len(words) > 24:
        message = " ".join(words[:24]).rstrip(" ,.;:") + "?"
    return message


def _string_list(value: object, *, limit: int = 8, item_limit: int = 120) -> tuple[str, ...]:
    if not isinstance(value, list):
        return ()
    result: list[str] = []
    seen: set[str] = set()
    for raw in value:
        text = _bounded_text(raw, item_limit)
        key = text.casefold()
        if not text or key in seen:
            continue
        seen.add(key)
        result.append(text)
        if len(result) >= limit:
            break
    return tuple(result)


def _number(value: object, default: float, low: float, high: float) -> float:
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return default
    return max(low, min(high, parsed))


def parse_intent(value: object) -> SearchIntent:
    if not isinstance(value, dict):
        return EMPTY_INTENT
    vocal_mode = _bounded_text(value.get("vocal_mode"), 20).lower()
    explicit_mode = _bounded_text(value.get("explicit_mode"), 20).lower()
    familiarity = _bounded_text(value.get("familiarity"), 20).lower()
    year_min = int(_number(value.get("year_min"), 0, 0, 2100))
    year_max = int(_number(value.get("year_max"), 0, 0, 2100))
    if year_min and year_max and year_min > year_max:
        year_min, year_max = year_max, year_min
    lyrics_weight = _number(value.get("lyrics_weight"), 0.5, 0, 1)
    audio_weight = _number(value.get("audio_weight"), 0.5, 0, 1)
    total = lyrics_weight + audio_weight
    if total <= 0:
        lyrics_weight = audio_weight = 0.5
    else:
        lyrics_weight /= total
        audio_weight /= total
    return SearchIntent(
        situation=_bounded_text(value.get("situation"), 500),
        desired_effect=_bounded_text(value.get("desired_effect"), 500),
        hard_constraints=_string_list(value.get("hard_constraints")),
        soft_preferences=_string_list(value.get("soft_preferences")),
        exclusions=_string_list(value.get("exclusions")),
        required_tags=tuple(item.lower() for item in _string_list(value.get("required_tags"), limit=6, item_limit=40)),
        excluded_tags=tuple(item.lower() for item in _string_list(value.get("excluded_tags"), limit=6, item_limit=40)),
        lyric_topics=_string_list(value.get("lyric_topics"), limit=6),
        year_min=year_min,
        year_max=year_max,
        vocal_mode=vocal_mode if vocal_mode in VOCAL_MODES else "any",
        explicit_mode=explicit_mode if explicit_mode in EXPLICIT_MODES else "any",
        familiarity=familiarity if familiarity in FAMILIARITY_MODES else "any",
        energy_min=_number(value.get("energy_min"), -1, -1, 1),
        energy_max=_number(value.get("energy_max"), -1, -1, 1),
        lyrics_weight=round(lyrics_weight, 4),
        audio_weight=round(audio_weight, 4),
    )


def parse_decision(raw: object, history: Sequence[dict[str, str]], probes_used: int) -> AgentDecision:
    if not isinstance(raw, dict):
        raise ValueError("Planner response was not an object")
    action = _bounded_text(raw.get("action"), 20).lower()
    message = _bounded_text(raw.get("message"), 1000)
    if action == "probe":
        if not message:
            raise ValueError("Planner returned an invalid probe")
        if probes_used >= 2:
            search_text = _fallback_search_text(history)
            intent = SearchIntent()
            return AgentDecision(
                "search",
                "",
                "I’ll search using the details already in the conversation.",
                search_text,
                intent,
                _fallback_views(search_text, intent),
            )
        return AgentDecision("probe", _concise_probe(message), "", "", EMPTY_INTENT, [])
    if action == "reply":
        if not message:
            raise ValueError("Planner returned an empty reply")
        return AgentDecision("reply", message, "", "", EMPTY_INTENT, [])
    if action != "search":
        raise ValueError("Planner returned an invalid action")

    search_text = _bounded_text(raw.get("resolved_request"), 1600)
    if len(search_text) < 4:
        search_text = _fallback_search_text(history)
    summary = _bounded_text(raw.get("summary"), 500)
    if not summary:
        summary = "I’ll search for songs that fit the full situation and direction you described."
    intent = parse_intent(raw.get("intent"))
    parsed: dict[str, RetrievalDraft] = {}
    raw_views = raw.get("retrieval_views")
    if isinstance(raw_views, list):
        for item in raw_views:
            if not isinstance(item, dict):
                continue
            kind = _bounded_text(item.get("kind"), 20).lower()
            text = _bounded_text(item.get("text"), 900)
            if kind not in RETRIEVAL_KINDS or len(text) < 12 or kind in parsed:
                continue
            default_weight = intent.lyrics_weight if kind == "lyrics" else intent.audio_weight
            weight = _number(item.get("weight"), default_weight, 0, 1)
            if weight > 0:
                parsed[kind] = RetrievalDraft(kind, text, weight)
    fallbacks = {item.kind: item for item in _fallback_views(search_text, intent)}
    views = [parsed.get(kind, fallbacks[kind]) for kind in RETRIEVAL_KINDS]
    return AgentDecision("search", message, summary, search_text, intent, [view for view in views if view.weight > 0])


def _clean_history(history: Sequence[dict[str, str]]) -> list[dict[str, str]]:
    cleaned: list[dict[str, str]] = []
    for item in history:
        role = str(item.get("role", "")).strip().lower()
        content = str(item.get("content", "")).strip()
        if role not in {"user", "assistant"} or not content:
            continue
        cleaned.append({"role": role, "content": content[:1400]})
    return cleaned[-12:]


def _fallback_search_text(history: Sequence[dict[str, str]]) -> str:
    cleaned = _clean_history(history)
    transcript = "\n".join(
        ("User" if item["role"] == "user" else "MelodyMind") + ": " + item["content"]
        for item in cleaned
    )
    return transcript[-1600:] or "music recommendation"


def _fallback_views(search_text: str, intent: SearchIntent | None = None) -> list[RetrievalDraft]:
    selected = intent or SearchIntent()
    return [
        RetrievalDraft("lyrics", "Songs whose lyrics and emotional direction fit this request: " + search_text, selected.lyrics_weight),
        RetrievalDraft("audio", "Music whose sound, pace, energy, and atmosphere fit this request: " + search_text, selected.audio_weight),
    ]


def _conversation_prompt(history: Sequence[dict[str, str]], probes_used: int) -> str:
    transcript = "\n".join(
        ("USER" if item["role"] == "user" else "MELODYMIND") + ": " + item["content"]
        for item in _clean_history(history)
    )
    return f"probes_used: {max(0, min(2, int(probes_used)))}\n\nCONVERSATION:\n{transcript}"


def _candidate_prompt(request: str, candidates: Sequence[object]) -> str:
    indexed: list[tuple[int, object]] = list(enumerate(candidates))

    def shuffle_key(item: tuple[int, object]) -> bytes:
        index, candidate = item
        match = getattr(candidate, "match", candidate)
        identity = str(getattr(match, "spotify_id", "") or getattr(match, "track_id", "") or index)
        return hashlib.sha256((request + "\0" + identity).encode("utf-8")).digest()

    indexed.sort(key=shuffle_key)
    lines: list[str] = []
    for original_index, candidate in indexed:
        match = getattr(candidate, "match", candidate)
        fields = [f"c{original_index:02d}: {getattr(match, 'title', 'Unknown')} — {getattr(match, 'artist', 'Unknown')}"]
        album = getattr(match, "album", None)
        if album:
            fields.append("album=" + str(album)[:100])
        tags = getattr(match, "tags", ()) or ()
        if tags:
            fields.append("tags=" + ", ".join(str(tag) for tag in list(tags)[:10]))
        year = getattr(match, "year", 0)
        if year:
            fields.append("year=" + str(year))
        for field_name in ("energy", "valence", "instrumentalness", "popularity"):
            value = getattr(match, field_name, None)
            if value is not None:
                fields.append(f"{field_name}={round(float(value), 3)}")
        evidence = str(getattr(match, "evidence", "") or "").strip()
        if evidence:
            fields.append("evidence=" + evidence[:700].replace("\n", " "))
        source_ranks = getattr(candidate, "source_ranks", {}) or {}
        if source_ranks:
            fields.append("retrieval=" + json.dumps(source_ranks, separators=(",", ":")))
        source_scores = getattr(candidate, "source_scores", {}) or {}
        if source_scores:
            fields.append(
                "similarity="
                + json.dumps(
                    {key: round(float(value), 4) for key, value in source_scores.items()},
                    separators=(",", ":"),
                )
            )
        lines.append(" | ".join(fields))
    return "COMPLETE REQUEST AND SEARCH RULES:\n" + request.strip() + "\n\nCANDIDATES:\n" + "\n".join(lines) + "\n\nJudge every candidate."


class GeminiAgent:
    def __init__(self) -> None:
        self.api_key = os.environ.get("GEMINI_API_KEY", "").strip()
        self.plan_model = os.environ.get("MELODYMIND_PLAN_MODEL", "gemini-2.5-flash-lite").strip()
        self.rerank_model = os.environ.get("MELODYMIND_RERANK_MODEL", "gemini-2.5-flash").strip()
        self._client: httpx.AsyncClient | None = None

    @property
    def configured(self) -> bool:
        return bool(self.api_key)

    async def close(self) -> None:
        if self._client is not None:
            await self._client.aclose()
            self._client = None

    async def _generate_json(self, *, model: str, system_prompt: str, user_prompt: str, temperature: float, max_tokens: int) -> object:
        if not self.api_key:
            raise RuntimeError("GEMINI_API_KEY is not configured")
        if self._client is None:
            self._client = httpx.AsyncClient(timeout=httpx.Timeout(35.0, connect=5.0))
        generation_config: dict[str, object] = {
            "temperature": temperature,
            "maxOutputTokens": max_tokens,
            "responseMimeType": "application/json",
        }
        if model.startswith("gemini-2.5"):
            generation_config["thinkingConfig"] = {"thinkingBudget": 0}
        response = await self._client.post(
            "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent",
            headers={"x-goog-api-key": self.api_key},
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

    async def plan(self, history: Sequence[dict[str, str]], probes_used: int = 0) -> AgentDecision:
        direct = _direct_reply(history)
        if direct is not None:
            return direct
        if not self.configured:
            raise RuntimeError("GEMINI_API_KEY is not configured")
        try:
            raw = await self._generate_json(
                model=self.plan_model,
                system_prompt=AGENT_SYSTEM_PROMPT,
                user_prompt=_conversation_prompt(history, probes_used),
                temperature=0.1,
                max_tokens=2400,
            )
            return parse_decision(raw, history, probes_used)
        except Exception as exc:
            raise RuntimeError("MelodyMind planning failed") from exc

    async def judge_candidates(self, request: str, candidates: Sequence[object]) -> dict[int, CandidateJudgment]:
        if not self.configured or not candidates:
            return {}
        try:
            raw = await self._generate_json(
                model=self.rerank_model,
                system_prompt=RERANK_SYSTEM_PROMPT,
                user_prompt=_candidate_prompt(request, candidates) + "\nReturn a JSON object mapping cNN to [fit, confidence].",
                temperature=0.0,
                max_tokens=2200,
            )
            if not isinstance(raw, dict):
                return {}
            judgments: dict[int, CandidateJudgment] = {}
            for key, value in raw.items():
                match = re.fullmatch(r"c(\d{1,3})", str(key), re.IGNORECASE)
                if not match or not isinstance(value, list) or len(value) != 2:
                    continue
                try:
                    fit, confidence = int(value[0]), int(value[1])
                except (TypeError, ValueError):
                    continue
                index = int(match.group(1))
                if 0 <= index < len(candidates) and 0 <= fit <= 4 and 0 <= confidence <= 3:
                    judgments[index] = CandidateJudgment(fit, confidence)
            return judgments
        except Exception:
            return {}
