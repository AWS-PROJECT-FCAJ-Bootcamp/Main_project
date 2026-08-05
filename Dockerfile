FROM ghcr.io/astral-sh/uv:0.11.2 AS uv
FROM python:3.12-slim

COPY --from=uv /uv /uvx /bin/

WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_LINK_MODE=copy \
    PATH="/app/.venv/bin:$PATH"

COPY pyproject.toml uv.lock README.md ./
RUN uv sync --frozen --no-dev

COPY src ./src
COPY scripts ./scripts
COPY data_source_ingestion ./data_source_ingestion
COPY universe ./universe
COPY reports/raw ./reports/raw

# Create data directories
RUN mkdir -p /app/data/raw/financial_reports /app/data/curated/ohlcv /app/data/models

EXPOSE 8000

# Entrypoint: seed admin then start server
CMD ["sh", "-c", "python scripts/seed_admin.py && uvicorn src.api.main:app --host 0.0.0.0 --port 8000"]
