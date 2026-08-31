"""Short-horizon quality hardening for the live MelodyMind recommender.

This patch keeps the existing CLaMP3/Pinecone retrieval architecture intact while
making the LLM judge stricter and less able to overpower semantic retrieval.
"""

from __future__ import annotations

import os


_PLANNER_RULES = r"""

LIVE QUALITY RULES
- Preserve every explicit user constraint in `search_text`: requested genre, lyrical/topic
  content, production traits, energy, relationship/context, emotional direction, and every
  explicit exclusion such as "not uplifting" or "do not make me look back". Do not silently
  turn a conjunction into a looser vibe.
- Treat short probe answers in the context of the question that preceded them. Answers such
  as "2nd", "first", "forward", and "both" must resolve the exact offered direction.
- If the user asks for BOTH or explicitly asks for multiple distinct directions, do not blend
  those directions into one compromise mood. In `search_text`, enumerate the directions
  clearly as Direction 1 and Direction 2. Keep both directions explicit in every retrieval
  view so either kind of song can be discovered.
- A requested lyrical/topic constraint such as political, socially conscious, friendship,
  work dread, or fear of being hurt is not interchangeable with a generic matching mood.
"""


_RERANK_RULES = r"""

LIVE QUALITY RULES — WHOLE REQUEST BEFORE VIBE
Before judging candidates, silently separate the request into explicit must-haves, strong
preferences, exclusions, and (when present) multiple requested directions.

Scoring discipline:
- `fit=4` is rare. Use it only when you know the song well enough to believe it satisfies the
  complete request, including every explicit must-have that is relevant to the song.
- If you KNOW a song violates an explicit must-have (genre, lyrical/topic requirement,
  production trait, relationship/context, requested emotional direction, or explicit
  exclusion), use fit 0 or 1 even when some other aspect matches strongly.
- If an explicit must-have is central to the request but you do not know whether the song
  satisfies it, do not guess from the title or artist. Use fit at most 2 with appropriately
  low confidence.
- Do not collapse nuanced situations into a single dominant adjective. Dread is not the same
  as aggression or extremity; loneliness is not automatically despair; forward momentum is
  not merely high energy; guarded attraction is not generic sadness.
- For requests containing two explicit directions, a song can score highly by strongly
  serving either direction. Do not prefer a weak compromise just because it averages both.
- Confidence means confidence in the evidence relevant to THIS request, not mere familiarity
  with the artist or song.
- Never infer lyrical subject matter from a title alone.
"""


def install_quality_patch(search_main) -> None:
    """Harden planning/reranking without rebuilding the retrieval index."""
    if getattr(search_main, "_live_quality_patch_installed", False):
        return

    import agent as agent_module

    if "LIVE QUALITY RULES" not in agent_module.AGENT_SYSTEM_PROMPT:
        agent_module.AGENT_SYSTEM_PROMPT += _PLANNER_RULES
    if "LIVE QUALITY RULES — WHOLE REQUEST BEFORE VIBE" not in agent_module.RERANK_SYSTEM_PROMPT:
        agent_module.RERANK_SYSTEM_PROMPT += _RERANK_RULES

    # The OpenAI adapter class has already replaced search_main.GeminiAgent when this
    # installer runs. Give the final judge more reasoning by default while allowing an
    # explicit environment setting to keep full control.
    agent_class = search_main.GeminiAgent
    original_init = agent_class.__init__

    def quality_init(self, *args, **kwargs):
        original_init(self, *args, **kwargs)
        if (
            hasattr(self, "openai_rerank_reasoning")
            and "MELODYMIND_OPENAI_RERANK_REASONING" not in os.environ
        ):
            self.openai_rerank_reasoning = "medium"

    agent_class.__init__ = quality_init

    # Reranking 80 mostly weak candidates was both slow and gave the LLM too many chances
    # to resurrect a low-retrieval song from memory. Keep a broad semantic pool, but only
    # send the best 32 fused candidates to the expensive experiential judge.
    original_hybrid_fuse = search_main._hybrid_fuse

    def quality_hybrid_fuse(result_sets, limit):
        return original_hybrid_fuse(result_sets, min(int(limit), 32))

    search_main._hybrid_fuse = quality_hybrid_fuse

    # The previous +0.48 boost for a confident fit=4 could move fused rank 40-50 into the
    # top ten. Make the LLM primarily a verifier/veto layer: strong knowledge can refine
    # retrieval, but semantic evidence remains the backbone of the ranking.
    def quality_experiential_order(candidates, judgments):
        adjustment_by_fit = {
            0: -0.42,
            1: -0.24,
            2: 0.0,
            3: 0.065,
            4: 0.145,
        }

        for index, candidate in enumerate(candidates):
            judgment = judgments.get(
                index,
                agent_module.CandidateJudgment(fit=2, confidence=0),
            )
            candidate.fit = judgment.fit
            candidate.confidence = judgment.confidence
            confidence = judgment.confidence / 3.0
            adjustment = adjustment_by_fit[judgment.fit] * confidence

            # Positive LLM promotion should be strongest when semantic retrieval itself
            # found the track through several independent views. One-view matches can still
            # rise, but not leapfrog the whole pool on model memory alone.
            if adjustment > 0:
                view_support = min(1.0, len(candidate.source_ranks) / 3.0)
                adjustment *= 0.55 + 0.45 * view_support

            candidate.final_score = candidate.fusion_score + adjustment

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

    search_main._experiential_order = quality_experiential_order
    search_main._live_quality_patch_installed = True
