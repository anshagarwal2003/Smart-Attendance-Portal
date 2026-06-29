FROM python:3.10-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PORT=7860
ENV DATA_DIR=/app/data
ENV CMAKE_BUILD_PARALLEL_LEVEL=1
ENV CFLAGS="-O2 -g0"
ENV CXXFLAGS="-O2 -g0"
ENV TZ=Asia/Kolkata

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        build-essential \
        cmake \
        libopenblas-dev \
        liblapack-dev \
        libx11-6 \
        libglib2.0-0 \
        tzdata \
    && rm -rf /var/lib/apt/lists/*

# Hugging Face Spaces requires running as a non-root user
RUN useradd -m -u 1000 user

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

COPY . .

# Create data directories and set permissions for the new user
RUN mkdir -p /app/data/proof_images /app/data/student_images /app/data/exports \
    && chown -R user:user /app

USER user

EXPOSE 7860

CMD gunicorn --bind 0.0.0.0:${PORT} --workers 1 --timeout 120 wsgi:app
