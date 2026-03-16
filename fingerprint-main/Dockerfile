FROM python:3.10-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    libglib2.0-0 \
    libgomp1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements-railway.txt .
RUN pip install --no-cache-dir -r requirements-railway.txt

COPY . .

ENV PORT=5000
ENV MODEL_PATH=/app/model_blood_group_detection_resnet.h5

EXPOSE 5000

WORKDIR /app/src

CMD gunicorn --bind 0.0.0.0:$PORT --workers 1 --timeout 120 app:app
