FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY . .

# Cloud Run provides PORT environment variable, default to 8080 if not set
ENV PORT=8080
EXPOSE $PORT

# Use shell form to access environment variable
# Listen on 0.0.0.0 to accept connections from Cloud Run
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT}