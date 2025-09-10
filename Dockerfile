# Use official Python image as base
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Set working directory inside the container
WORKDIR /app

# Copy project files
COPY main_api.py /app/
COPY backend/ /app/backend/
COPY requirements.txt /app/
COPY cipherlink.db /app/

# Install system dependencies
RUN apt-get update && apt-get install -y gcc libffi-dev libpq-dev && apt-get clean

# Install Python dependencies
RUN pip install --upgrade pip
RUN pip install -r requirements.txt

# Expose port (FastAPI default)
EXPOSE 8000

# Run the FastAPI app
CMD ["uvicorn", "main_api:app", "--host", "0.0.0.0", "--port", "8000"]

