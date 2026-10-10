# apps/ai/Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies needed for psycopg2 / network
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY apps/ai/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source
COPY apps/ai/ .

EXPOSE 8000

ENV PORT=8000
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT}"]
