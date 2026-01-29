#!/bin/bash

# Script to create Podman pod with 3 containers: PostgreSQL, FastAPI Backend, and React Frontend

POD_NAME="EduTreak_Pod"

# Check if podman is installed
if ! command -v podman &> /dev/null; then
    echo "Error: podman is not installed. Please install podman first."
    exit 1
fi

# Remove existing pod if it exists
if podman pod exists ${POD_NAME}; then
    echo "Pod ${POD_NAME} already exists. Removing it..."
    podman pod stop ${POD_NAME} 2>/dev/null
    podman pod rm ${POD_NAME} 2>/dev/null
fi

# Create the pod with port mappings
echo "Creating pod ${POD_NAME}..."
podman pod create \
    --name ${POD_NAME} \
    -p 5432:5432 \
    -p 8000:8000 \
    -p 3000:3000

# Create volume for PostgreSQL data
echo "Creating volume for PostgreSQL data..."
podman volume create postgres-data 2>/dev/null || true

# Start PostgreSQL Database Container
echo "Starting database container..."
podman run -d \
    --pod ${POD_NAME} \
    --name database \
    -e POSTGRES_DB=edutrack \
    -e POSTGRES_USER=postgres \
    -e POSTGRES_PASSWORD=postgres \
    -v postgres-data:/var/lib/postgresql/data \
    --memory=512m \
    --cpus=0.5 \
    postgres:15-alpine

# Start FastAPI Backend Container
echo "Starting backend container..."
podman run -d \
    --pod ${POD_NAME} \
    --name backend \
    -e DATABASE_URL=postgresql://postgres:postgres@localhost:5432/edutrack \
    -e PYTHONUNBUFFERED=1 \
    -v $(pwd)/backend:/app:Z \
    --workdir /app \
    --memory=512m \
    --cpus=0.5 \
    python:3.11-slim \
    /bin/sh -c "pip install -r requirments.txt && uvicorn main:app --host 0.0.0.0 --port 8000 || tail -f /dev/null"

# Start React Frontend Container
echo "Starting frontend container..."
podman run -d \
    --pod ${POD_NAME} \
    --name frontend \
    -e REACT_APP_API_URL=http://localhost:8000 \
    -e CHOKIDAR_USEPOLLING=true \
    -v $(pwd)/frontend:/app:Z \
    --workdir /app \
    --memory=512m \
    --cpus=0.5 \
    node:18-alpine \
    /bin/sh -c "npm install && npm start || tail -f /dev/null"

echo ""
echo "Pod ${POD_NAME} created successfully!"
echo ""
echo "Pod status:"
podman pod ps --filter name=${POD_NAME}

echo ""
echo "Container status:"
podman ps --filter pod=${POD_NAME}

echo ""
echo "Useful commands:"
echo "  View pod details:     podman pod inspect ${POD_NAME}"
echo "  View pod logs:        podman pod logs ${POD_NAME}"
echo "  Stop pod:             podman pod stop ${POD_NAME}"
echo "  Start pod:            podman pod start ${POD_NAME}"
echo "  Remove pod:           podman pod rm -f ${POD_NAME}"
echo ""
echo "  View container logs:"
echo "    Database:           podman logs database"
echo "    Backend:            podman logs backend"
echo "    Frontend:           podman logs frontend"
echo ""
echo "  Access containers:"
echo "    Database:           podman exec -it database /bin/sh"
echo "    Backend:            podman exec -it backend /bin/sh"
echo "    Frontend:           podman exec -it frontend /bin/sh"
