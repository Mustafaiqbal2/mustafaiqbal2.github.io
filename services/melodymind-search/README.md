# MelodyMind demo search service

This is the private model service used by the portfolio's Cloudflare Worker. It
contains no song-ingestion code and does not depend on the original MelodyMind
backend.

The Docker build extracts only the frozen CLaMP3 text tower from the official
SAAS checkpoint. At runtime it creates a unit-length 768-dimensional query and
searches:

```text
index: melodymind-embeddings
namespace: clamp3-reddit-evidence-a-v1
metric: cosine
```

## Required runtime secrets

```text
PINECONE_API_KEY
MELODYMIND_SERVICE_TOKEN
```

The same random `MELODYMIND_SERVICE_TOKEN` must be stored in the Cloudflare
Worker. The index, namespace, and model label already have the correct defaults
in the Docker image and can be overridden with environment variables.

Deploy this directory as the service root on a container host with at least 2 GB
of memory. The first Docker build downloads the official 2.57 GB checkpoint,
but the final image contains only the text model and projection.
