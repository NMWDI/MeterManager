FROM python:3.12.11

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Install system dependencies (trixie) + JDK (default is 21) + PostgreSQL client
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      libpango-1.0-0 \
      libcairo2 \
      libgdk-pixbuf-2.0-0 \
      libffi-dev \
      default-jdk-headless \
      postgresql-client \
 && rm -rf /var/lib/apt/lists/*

# Make Java headers discoverable by builds
ENV JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64
ENV JDK_HOME=$JAVA_HOME
ENV PATH="${JAVA_HOME}/bin:${PATH}"
ENV PYTHONPATH=/app

# Now install the rest of the requirements
COPY ./requirements.txt .
RUN pip install --no-cache-dir --upgrade pip setuptools wheel \
 && pip install --no-cache-dir -r requirements.txt

COPY . /app/api

