FROM python:3.12.11

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

COPY ./requirements.txt .

# Upgrade pip
RUN pip install --no-cache-dir --upgrade pip

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libpango-1.0-0 \
    libcairo2 \
    libgdk-pixbuf2.0-0 \
    libffi-dev \
    openjdk-17-jdk \
    && apt-get clean

# Set JDK_HOME so pyjnius doesn't crash
ENV JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
ENV JDK_HOME=/usr/lib/jvm/java-17-openjdk-amd64

RUN pip install --no-cache-dir --upgrade -r requirements.txt

COPY . .
