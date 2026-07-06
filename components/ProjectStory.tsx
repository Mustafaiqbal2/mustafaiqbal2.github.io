type Stage = { key: string; label: string; readout: string };

type StoryConfig = {
  eyebrow: string;
  headline: string;
  stages: Stage[];
  gateIndex?: number;
  queue?: {
    total: string;
    skipped: string;
    kept: string;
    note: string;
    rules: string[];
  };
  benchmark?: {
    label: string;
    beforeValue: string;
    afterValue: string;
  };
};

const stories: Record<string, StoryConfig> = {
  "revvy-review-automation": {
    eyebrow: "Live trace · review pipeline",
    headline: "The important work happens before the model call.",
    stages: [
      { key: "SYNC", label: "Sync", readout: "batch upsert" },
      { key: "FILTER", label: "Filter", readout: "−30–50% cost" },
      { key: "DRAFT", label: "Draft", readout: "parallel batches" },
      { key: "APPROVE", label: "Approve", readout: "human-in-loop" },
      { key: "PUBLISH", label: "Publish", readout: "50–200ms cached" }
    ],
    queue: {
      total: "1000 reviews",
      skipped: "skipped before the model",
      kept: "sent to draft",
      note: "Each skip maps to a real rule — owner already replied, below the rating threshold, or already drafted.",
      rules: ["owner replied", "below positiveMinStars", "already drafted"]
    },
    benchmark: {
      label: "2000-review workflow",
      beforeValue: "60–120 min",
      afterValue: "10–20 min"
    }
  },
  "emmy-email-categorization": {
    eyebrow: "Live trace · classification loop",
    headline: "Rules first. The model only sees genuine ambiguity.",
    stages: [
      { key: "SYNC", label: "Sync", readout: "Gmail OAuth" },
      { key: "RULES", label: "Rules", readout: "known senders route free" },
      { key: "CLASSIFY", label: "Classify", readout: "thread-aware AI" },
      { key: "LABEL", label: "Label", readout: "structured JSON log" },
      { key: "CORRECT", label: "Correct", readout: "moves become training data" }
    ]
  },
  "cad-understanding-core": {
    eyebrow: "Live trace · safety contract",
    headline: "AI interprets the evidence. It never draws the building.",
    gateIndex: 4,
    stages: [
      { key: "EXTRACT", label: "Extract", readout: "exact DXF geometry" },
      { key: "EXPAND", label: "Expand", readout: "nested blocks → world space" },
      { key: "ISOLATE", label: "Isolate", readout: "28 drawing contexts" },
      { key: "EVIDENCE", label: "Evidence", readout: "283 groups · 51 hypotheses" },
      { key: "GATE", label: "AI gate", readout: "external AI OFF by default" }
    ]
  },
  melodymind: {
    eyebrow: "Live trace · model to product",
    headline: "One system, from embedding alignment to a shipped app.",
    stages: [
      { key: "DATA", label: "Data", readout: "audio + emotion text" },
      { key: "CLAP", label: "CLAP", readout: "frozen audio encoder" },
      { key: "ALIGN", label: "Align", readout: "InfoNCE · 17 epochs" },
      { key: "RETRIEVE", label: "Retrieve", readout: "Pinecone search" },
      { key: "APP", label: "App", readout: "React Native / Expo" }
    ]
  },
  "recruitment-rag-platform": {
    eyebrow: "Live trace · recruitment workflow",
    headline: "A workflow, not a chatbot — led end to end.",
    stages: [
      { key: "INGEST", label: "Ingest", readout: "CV · GitHub · web" },
      { key: "EMBED", label: "Embed", readout: "Nomic vectors" },
      { key: "RETRIEVE", label: "Retrieve", readout: "Weaviate matching" },
      { key: "INTERVIEW", label: "Interview", readout: "<5s target" },
      { key: "DEPLOY", label: "Deploy", readout: "FastAPI + Docker" }
    ]
  },
  "simplabots-agentic-saas": {
    eyebrow: "Live trace · platform assembly",
    headline: "Agents share one spine instead of shipping as separate apps.",
    stages: [
      { key: "SURFACE", label: "Surface", readout: "dashboard · agents · admin" },
      { key: "CONTROL", label: "Control", readout: "accounts · profiles · access" },
      { key: "COMMERCE", label: "Commerce", readout: "Stripe · credits · usage" },
      { key: "AIDATA", label: "AI + data", readout: "Pinecone · assets" },
      { key: "EXTERNAL", label: "External", readout: "S3 · SES · SQS · Google" }
    ]
  }
};

export function ProjectStory({ slug }: { slug: string }) {
  const story = stories[slug];
  if (!story) {
    return null;
  }

  // ~61% of reviews skip the model — a deterministic pattern, not random telemetry.
  const skipIndices = new Set([0, 2, 3, 5, 6, 8, 9, 11, 12, 14, 15, 17, 18, 20, 21, 23, 24, 26, 27, 29, 30]);
  const chips = story.queue
    ? Array.from({ length: 34 }, (_, index) => ({ index, isSkip: skipIndices.has(index) }))
    : [];

  return (
    <section className="project-story" data-story aria-label="Pipeline walkthrough">
      <div className="section-inner">
        <div className="story-head">
          <p className="eyebrow">{story.eyebrow}</p>
          <h2>{story.headline}</h2>
          <p className="story-readout-line">
            <span className="story-readout-label">stage</span>
            <span className="story-readout" data-story-readout suppressHydrationWarning>
              {story.stages[0].readout}
            </span>
          </p>
        </div>

        <div className="story-rail" role="list">
          <span className="story-line" aria-hidden="true">
            <span className="story-line-fill" data-story-packet />
          </span>
          {story.stages.map((stage, index) => (
            <div
              className="story-stage"
              data-story-stage
              data-readout={stage.readout}
              data-gate={story.gateIndex === index ? "true" : undefined}
              role="listitem"
              key={stage.key}
            >
              <span className="story-node" aria-hidden="true">
                {story.gateIndex === index ? <span className="story-lock">▲</span> : <i />}
              </span>
              <span className="story-stage-label">{stage.label}</span>
              <span className="story-stage-readout">{stage.readout}</span>
            </div>
          ))}
        </div>

        {story.queue ? (
          <div className="story-queue">
            <div className="story-queue-head">
              <span className="story-queue-title">{story.queue.total} in</span>
              <span className="story-queue-tally">
                <b className="story-tally-skip">{story.queue.skipped}</b>
                <b className="story-tally-keep">{story.queue.kept}</b>
              </span>
            </div>
            <div className="story-chips" aria-hidden="true">
              {chips.map((chip) => (
                <span
                  className="story-chip"
                  data-story-chip
                  data-skip={chip.isSkip ? "true" : "false"}
                  data-at={(0.35 + (chip.index % 7) * 0.03).toFixed(2)}
                  key={chip.index}
                />
              ))}
            </div>
            <p className="story-queue-note">{story.queue.note}</p>
            <div className="story-rules">
              {story.queue.rules.map((rule) => (
                <span key={rule}>✕ {rule}</span>
              ))}
            </div>
          </div>
        ) : null}

        {story.benchmark ? (
          <div className="story-bench" data-story-bench>
            <span className="story-bench-title">{story.benchmark.label}</span>
            <div className="story-bench-row story-bench-before">
              <span className="story-bench-tag">before</span>
              <span className="story-bench-bar" aria-hidden="true" />
              <span className="story-bench-val">{story.benchmark.beforeValue}</span>
            </div>
            <div className="story-bench-row story-bench-after">
              <span className="story-bench-tag">after</span>
              <span className="story-bench-bar" aria-hidden="true" />
              <span className="story-bench-val">{story.benchmark.afterValue}</span>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
