"""Modal deployment wrapper for the MelodyMind CLaMP3 search service.

The search implementation stays in ``main.py``. This module only gives the
existing FastAPI app a serverless Modal runtime with enough memory for the
frozen XLM-R/CLaMP3 text tower.
"""

from pathlib import Path
import sys

import modal


SERVICE_DIR = Path(__file__).resolve().parent

# Reuse the same multi-stage image already used by Railway. The final image
# contains only the frozen CLaMP3 text tower/projection, not the 2.57 GB source
# checkpoint used during the export stage.
image = modal.Image.from_dockerfile(
    SERVICE_DIR / "Dockerfile",
    context_dir=SERVICE_DIR,
)

app = modal.App("melodymind-search")
service_secret = modal.Secret.from_name(
    "melodymind-search",
    required_keys=["PINECONE_API_KEY", "MELODYMIND_SERVICE_TOKEN"],
)


@app.function(
    image=image,
    secrets=[service_secret],
    # Two CPUs keeps the portfolio search comfortably within the free-credit
    # use case while making XLM-R startup/inference a little less sluggish.
    cpu=2.0,
    # Request 2 GiB for normal operation but allow a larger startup peak while
    # Transformers materializes the model. This avoids the Railway OOM loop
    # without paying for a permanently reserved 6 GiB container.
    memory=(2048, 6144),
    max_containers=1,
    # Keep the large text tower warm for the full Modal idle window. This costs
    # more than the old five-minute window, but avoids repeated model cold starts
    # while someone is actively trying several MelodyMind searches.
    scaledown_window=1200,
    timeout=300,
    startup_timeout=180,
)
@modal.concurrent(max_inputs=4)
@modal.asgi_app()
def api():
    # The Dockerfile places main.py and the exported model under /app and
    # /model. Modal adds this wrapper separately, so make /app importable and
    # return the existing FastAPI application unchanged.
    if "/app" not in sys.path:
        sys.path.insert(0, "/app")

    from main import app as fastapi_app

    return fastapi_app
