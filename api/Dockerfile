FROM python:3.10

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

COPY ./requirements.txt .

# Upgrade pip and install Cython
RUN pip install --no-cache-dir --upgrade pip Cython

# Install system dependencies required for WeasyPrint
RUN apt-get update && apt-get install -y \
    libpango-1.0-0 \
    libcairo2 \
    libgdk-pixbuf2.0-0 \
    libffi-dev \
    && apt-get clean

RUN pip install --no-cache-dir --upgrade -r requirements.txt

COPY . .
