# MelodyMind search service

This is the private recommendation service behind the portfolio demo. It is
separate from the original MelodyMind backend.

## Search flow

```text
conversation
  -> agent decides: clarify, search, or reply
  -> agent separates hard constraints, soft preferences, and exclusions
  -> one plain search summary is shown to the user
  -> hard metadata filters run before semantic retrieval
  -> written situations/topics search the lyrics and evidence namespace
  -> sound/energy/atmosphere searches Model A's audio namespace
  -> the two candidate lists are fused without duplicate chunk voting
  -> an LLM checks the complete request against the available evidence
  -> weak or uncertain candidates are removed instead of padding the list
  -> songs that passed those checks can be reordered using the visitor's playback history
  -> a signed session token lets the user refine or discuss the results
```

The agent usually asks at most one useful question before a recommendation. It
may ask a second when the first answer still leaves a specific retrieval choice
unresolved. A follow-up after results starts a new cycle, so the conversation
does not stop after the first playlist.

The portfolio uses one Spotify embed for every result. Starts, longer listens,
replays, quick switches, and explicit Spotify opens update an anonymous profile
in Cloudflare D1. Ranking uses the nearest previously enjoyed tracks and artist
signals after the request-fit gate; it does not average a listener's whole taste
into one vector.

## Search data

Both namespaces use the Pinecone index `melodymind-embeddings` with 768
dimensions and cosine similarity.

- `melodymind-audio-curated-v1`: a smaller, genre-balanced subset of Model A.
  Audio queries use the frozen CLaMP3 text encoder because Model A preserved
  that text space.
- `melodymind-lyrics-mpnet-v1`: lyric chunks embedded with
  `sentence-transformers/all-mpnet-base-v2`. The same local model embeds the
  written query at search time.

The old namespaces remain untouched.

## Catalogue maintenance

Audit the selected catalogue without writing:

```powershell
python services/melodymind-search/build_catalogue.py `
  --source-root C:\path\to\melodymind-backend
```

Add current Spotify tracks and exact LRCLIB matches to the external catalogue:

```powershell
python services/melodymind-search/modernize_catalogue.py `
  --source-root C:\path\to\melodymind-backend `
  --start-year 2020 `
  --end-year 2026
```

Build the two production namespaces explicitly:

```powershell
python services/melodymind-search/build_catalogue.py `
  --source-root C:\path\to\melodymind-backend `
  --commit-audio

python services/melodymind-search/build_catalogue.py `
  --source-root C:\path\to\melodymind-backend `
  --commit-lyrics
```

The commands are resumable and never delete the source namespaces.

## Modal deployment

Modal uses two secrets:

- `melodymind-search`: `PINECONE_API_KEY`, `MELODYMIND_SERVICE_TOKEN`, and
  `GEMINI_API_KEY`
- `melodymind-openai`: `OPENAI_API_KEY`

Deploy the model service and then the Worker:

```powershell
modal deploy services/melodymind-search/modal_app.py
npm run worker:deploy
```

The browser talks only to the Cloudflare Worker. It never receives model,
Pinecone, Gemini, OpenAI, or Spotify credentials.
