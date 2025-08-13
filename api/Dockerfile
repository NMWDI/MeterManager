FROM python:3.12.11

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

COPY ./requirements.txt .

# Upgrade pip, setuptools, wheel, Cython
RUN pip install --no-cache-dir --upgrade pip setuptools wheel "Cython==0.29.36"

# Install system dependencies (trixie) + JDK (default is 21)
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      libpango-1.0-0 \
      libcairo2 \
      libgdk-pixbuf-2.0-0 \
      libffi-dev \
      default-jdk-headless \
 && rm -rf /var/lib/apt/lists/*

# Preinstall jnius (derive JAVA_HOME dynamically for this layer)
RUN export JAVA_PATH="$(dirname "$(dirname "$(readlink -f "$(which javac)")")")" \
 && export JAVA_HOME="$JAVA_PATH" JDK_HOME="$JAVA_PATH" \
 && pip install --no-cache-dir --no-build-isolation jnius==1.1.0

# Now install the rest of the requirements
RUN pip install --no-cache-dir --upgrade -r requirements.txt

COPY . .

