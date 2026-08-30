FROM python:3.12-slim AS model-export

ENV PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PYTHONDONTWRITEBYTECODE=1

RUN pip install --no-cache-dir \
    --index-url https://download.pytorch.org/whl/cpu \
    "torch==2.6.0"
RUN pip install --no-cache-dir \
    "huggingface-hub>=0.34,<1" \
    "safetensors>=0.6,<1" \
    "transformers>=4.55,<5"

WORKDIR /export
COPY export_clamp3_text.py .
RUN python export_clamp3_text.py --output /model


FROM python:3.12-slim

ENV PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    CLAMP3_TEXT_MODEL_DIR=/model \
    PINECONE_INDEX=melodymind-embeddings \
    PINECONE_NAMESPACE=clamp3-reddit-evidence-a-v1 \
    MELODYMIND_MODEL_VERSION=clamp3-reddit-evidence-a-v1

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir \
    --index-url https://download.pytorch.org/whl/cpu \
    "torch==2.6.0"
RUN pip install --no-cache-dir -r requirements.txt
COPY --from=model-export /model /model
COPY main.py agent.py openai_primary.py ./

CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
