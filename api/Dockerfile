FROM python:3.12.11

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Install system dependencies (trixie) + JDK (default is 21) + PostgreSQL client
# Install base dependencies needed to add the PostgreSQL repository
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      ca-certificates \
      curl \
      libpango-1.0-0 \
      libcairo2 \
      libgdk-pixbuf-2.0-0 \
      libffi-dev \
      default-jdk-headless \
 && install -d /usr/share/postgresql-common/pgdg \
 && curl -fsSL \
      https://www.postgresql.org/media/keys/ACCC4CF8.asc \
      -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc \
 && echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] https://apt.postgresql.org/pub/repos/apt trixie-pgdg main" \
      > /etc/apt/sources.list.d/pgdg.list \
 && apt-get update \
 && apt-get install -y --no-install-recommends \
      postgresql-client-18 \
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

