# MelodyMind demo search service

This is the private model service used by the portfolio's Cloudflare Worker. It
contains no song-ingestion code and does not depend on the original MelodyMind
backend's database, auth, persistence, voice, stem-separation, or Spotify account
stack.

The service uses the frozen CLaMP3 text tower to search Model A in:

```text
index: melodymind-embeddings
namespace: clamp3-reddit-evidence-a-v1
metric: cosine
```

The query encoder must remain CLaMP3 for this namespace. Do not replace it with
Nomic or another text model unless the catalogue is re-embedded into a matching
space.

## Lightweight agent layer

The useful conversational/retrieval behavior from the original MelodyMind agent
has been ported into this service without its backend baggage.

The request flow is now:

```text
user situation
  -> MelodyMind probe/search decision (one clarification maximum)
  -> original wording is always preserved as retrieval query #1
  -> 0-3 strict meaning-preserving paraphrases
  -> one batched CLaMP3 text-encoder pass
  -> independent Pinecone retrieval for each query view
  -> reciprocal-rank fusion
  -> larger candidate pool
  -> LLM reranking using song/artist knowledge
  -> final results
```

The query planner is explicitly forbidden from inventing emotions, causes,
genres, instrumentation, lyrical themes, or other interpretations that the user
did not provide. The generated paraphrases supplement the original query; they
never replace it.

If `GEMINI_API_KEY` is missing, the service deliberately falls back to the old
single-query Model A search path rather than taking search offline. `/health`
reports `agent_configured: true|false` so the deployment can be checked directly.

## Modal deployment

Modal is the primary runtime for this service. `modal_app.py` reuses the existing
Dockerfile and FastAPI app, but gives the model enough memory to load without the
OOM restart loop seen on small Railway containers.

The Modal function requests 2 GiB of memory, permits a 6 GiB startup ceiling,
keeps at most one model container alive, and scales back to zero after idle time.

### 1. Install and authenticate Modal

From the repository root:

```powershell
python -m pip install "modal>=1.3,<2"
modal setup
```

### 2. Create/update the service secret

In the Modal dashboard, create or edit the secret named:

```text
melodymind-search
```

It should contain:

```text
PINECONE_API_KEY
MELODYMIND_SERVICE_TOKEN
GEMINI_API_KEY
```

Use the same `MELODYMIND_SERVICE_TOKEN` that is stored in the Cloudflare Worker.
`GEMINI_API_KEY` enables probing, strict paraphrase generation, and reranking.
Do not commit any of these values to this repository.

Optional:

```text
MELODYMIND_AGENT_MODEL=gemini-2.5-flash
```

The index, namespace, and model label already have the correct defaults in the
image:

```text
PINECONE_INDEX=melodymind-embeddings
PINECONE_NAMESPACE=clamp3-reddit-evidence-a-v1
MELODYMIND_MODEL_VERSION=clamp3-reddit-evidence-a-v1
```

### 3. Deploy

From the repository root:

```powershell
modal deploy services/melodymind-search/modal_app.py
```

Modal prints the public HTTPS endpoint for the `api` web function. Verify it:

```text
GET <modal-url>/health
```

A healthy agent-enabled deployment returns the model label, dimension `768`,
index, namespace, and:

```json
{"agent_configured": true}
```

### 4. Deploy the Cloudflare Worker

The Worker already knows the Modal URL and service token. The agent contract adds
the optional clarification field and the `probe | results` response type, so the
Worker code must be redeployed after pulling this version:

```powershell
npm run worker:deploy
```

The browser still talks only to the Cloudflare Worker. No model or Pinecone
credentials are exposed to the static site.

## Local/container behavior

`Dockerfile` builds the standalone service image. Its build stage downloads the
official CLaMP3 SAAS checkpoint, exports only the frozen text tower and
projection, then discards the original multimodal checkpoint from the final
runtime image.

Required runtime secrets for basic search:

```text
PINECONE_API_KEY
MELODYMIND_SERVICE_TOKEN
```

Agent-enabled search additionally uses:

```text
GEMINI_API_KEY
```

`railway.json` is retained only as a fallback deployment configuration; Modal is
the intended runtime for the portfolio demo.
