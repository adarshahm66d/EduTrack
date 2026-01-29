#!/bin/bash

echo "Starting EduTrack Backend..."
echo ""

# Check if backend container exists
if ! podman ps -a --format "{{.Names}}" | grep -q "^backend$"; then
    echo "Error: Backend container not found!"
    echo "Please run ./creat-pod.sh first"
    exit 1
fi

# Check if container is running
if ! podman ps --format "{{.Names}}" | grep -q "^backend$"; then
    echo "Starting backend container..."
    podman start backend
    sleep 2
fi

echo "Installing/updating dependencies..."
podman exec -it backend /bin/sh -c "cd /app && pip install -r requirments.txt"

echo ""
echo "Checking database connection..."
podman exec -it backend /bin/sh -c "cd /app && python -c 'from database import engine; conn = engine.connect(); print(\"Database connection: OK\"); conn.close()'" 2>&1

echo ""
echo "Starting FastAPI server..."
echo "Server will be available at http://localhost:8000"
echo "API docs at http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Start uvicorn in foreground so we can see errors
podman exec -it backend /bin/sh -c "cd /app && uvicorn main:app --host 0.0.0.0 --port 8000 --reload"
