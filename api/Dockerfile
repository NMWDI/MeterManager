#
FROM python:3.10

#
WORKDIR .

ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

#
COPY ./requirements.txt .

# Install system dependencies required for WeasyPrint
RUN apt-get update && apt-get install -y \
    libpango-1.0-0 \
    libcairo2 \
    libgdk-pixbuf2.0-0 \
    libffi-dev \
    && apt-get clean

#
RUN pip install --no-cache-dir --upgrade -r requirements.txt

#
COPY . .