# ── SignSpeak AI · inference service (FastAPI + TensorFlow) ──
# NOTE: TF + mediapipe make this image LARGE (~2 GB). Build once,
# push to a registry, pull on deploy. The model dir is a volume so
# a retrained model ships without rebuilding the image.
FROM python:3.11-slim

WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    AI_HOST=0.0.0.0 \
    AI_PORT=8000

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

# Trained artifact + label map (also mounted at runtime).
COPY models ./models

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health', timeout=3)"

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]