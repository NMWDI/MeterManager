FROM python:3.12.11

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

COPY ./requirements.txt .

# Upgrade pip, setuptools, wheel, Cython
RUN pip install --no-cache-dir --upgrade pip setuptools wheel "Cython==0.29.36"

# Install system dependencies including JDK
RUN apt-get update && apt-get install -y \
    libpango-1.0-0 \
    libcairo2 \
    libgdk-pixbuf2.0-0 \
    libffi-dev \
    openjdk-17-jdk \
    && apt-get clean \
    && export JAVA_PATH=$(dirname $(dirname $(readlink -f $(which javac)))) \
    && echo "JAVA_HOME=$JAVA_PATH" >> /etc/environment \
    && echo "JDK_HOME=$JAVA_PATH" >> /etc/environment

# Preinstall jnius with no-build-isolation (ensures Cython and JAVA_HOME are in place)
RUN export JAVA_PATH=$(dirname $(dirname $(readlink -f $(which javac)))) \
    && export JAVA_HOME=$JAVA_PATH \
    && export JDK_HOME=$JAVA_PATH \
    && pip install --no-cache-dir --no-build-isolation jnius==1.1.0

# Now install the rest of the requirements
RUN pip install --no-cache-dir --upgrade -r requirements.txt

COPY . .

