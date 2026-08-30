# MelodyMind demo search service

This is the private model service used by the portfolio's Cloudflare Worker. It
contains no song-ingestion code and does not depend on the original MelodyMind
backend.

The service uses the frozen CLaMP3 text tower to create a unit-length
768-dimensional query and searches:

```text
index: melodymind-embeddings
namespace: clamp3-reddit-evidence-a-v1
metric: cosine
```

The query encoder must remain CLaMP3 for this namespace. Do not replace it with
Nomic or another text model unless the catalogue is re-embedded into a matching
space.

## Modal deployment

Modal is the primary runtime for this service. `modal_app.py` reuses the existing
Dockerfile and FastAPI app, but gives the model enough memory to load without the
OOM restart loop seen on small Railway containers.

The Modal function requests 2 GiB of memory, permits a 6 GiB startup ceiling,
keeps at most one model container alive, and scales back to zero after idle time.
The search implementation itself is unchanged.

### 1. Install and authenticate Modal

From the repository root:

```powershell
python -m pip install "modal>=1.3,<2"
modal setup
```

### 2. Create the service secret

In the Modal dashboard, create a secret named:

```text
melodymind-search
```

It must contain exactly the runtime credentials used by the current service:

```text
PINECONE_API_KEY
MELODYMIND_SERVICE_TOKEN
```

Use the same `MELODYMIND_SERVICE_TOKEN` that is stored in the Cloudflare Worker.
Do not commit either value to this repository.

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

Modal prints the public HTTPS endpoint for the `api` web function. Verify it
before changing the Worker:

```text
GET <modal-url>/health
```

A healthy deployment returns the model label, dimension `768`, index
`melodymind-embeddings`, and namespace `clamp3-reddit-evidence-a-v1`.

### 4. Point the Cloudflare Worker at Modal

Replace the Worker's `MELODYMIND_SEARCH_URL` secret with the Modal URL. Wrangler
will prompt for the value without putting it in the repository:

```powershell
npx wrangler secret put MELODYMIND_SEARCH_URL --config worker/wrangler.toml
npm run worker:deploy
```

The Worker continues to call:

```text
POST <MELODYMIND_SEARCH_URL>/internal/search
Authorization: Bearer <MELODYMIND_SERVICE_TOKEN>
```

No frontend API contract changes are required. The static site still talks only
to the Cloudflare Worker.

## Local/container behavior

`Dockerfile` still builds the same standalone service image. Its build stage
downloads the official CLaMP3 SAAS checkpoint, exports only the frozen text tower
and projection, then discards the original multimodal checkpoint from the final
runtime image.

Required runtime secrets remain:

```text
PINECONE_API_KEY
MELODYMIND_SERVICE_TOKEN
```

`railway.json` is retained only as a fallback deployment configuration; Modal is
the intended runtime for the portfolio demo.
