#!/bin/bash

# Script to create Podman pod with 3 containers: PostgreSQL, FastAPI Backend, and React Frontend
# Ports and URLs can be customized via environment variables (defaults provided)

POD_NAME="EduTrack_Pod"

# Port configuration (can be overridden via environment variables)
DB_PORT=${DB_PORT:-5432}
BACKEND_PORT=${BACKEND_PORT:-8000}
FRONTEND_PORT=${FRONTEND_PORT:-3000}

# Database configuration (can be overridden via environment variables)
POSTGRES_DB=${POSTGRES_DB:-edutrack}
POSTGRES_USER=${POSTGRES_USER:-postgres}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-postgres}

# Backend configuration
DATABASE_URL=${DATABASE_URL:-postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:${DB_PORT}/${POSTGRES_DB}}
REACT_APP_API_URL=${REACT_APP_API_URL:-http://localhost:${BACKEND_PORT}}

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
    -p ${DB_PORT}:5432 \
    -p ${BACKEND_PORT}:8000 \
    -p ${FRONTEND_PORT}:3000

# Create volume for PostgreSQL data
echo "Creating volume for PostgreSQL data..."
podman volume create postgres-data 2>/dev/null || true

# Start PostgreSQL Database Container
echo "Starting database container..."
podman run -d \
    --pod ${POD_NAME} \
    --name database \
    -e POSTGRES_DB=${POSTGRES_DB} \
    -e POSTGRES_USER=${POSTGRES_USER} \
    -e POSTGRES_PASSWORD=${POSTGRES_PASSWORD} \
    -v postgres-data:/var/lib/postgresql/data \
    --memory=512m \
    --cpus=0.5 \
    postgres:15-alpine

# Start FastAPI Backend Container
echo "Starting backend container..."
podman run -d \
    --pod ${POD_NAME} \
    --name backend \
    -e DATABASE_URL=${DATABASE_URL} \
    -e PYTHONUNBUFFERED=1 \
    -v $(pwd)/backend:/app:Z \
    --workdir /app \
    --memory=512m \
    --cpus=0.5 \
    python:3.11-slim \
    /bin/sh -c "tail -f /dev/null"

# Start React Frontend Container
echo "Starting frontend container..."
podman run -d \
    --pod ${POD_NAME} \
    --name frontend \
    -e REACT_APP_API_URL=${REACT_APP_API_URL} \
    -e CHOKIDAR_USEPOLLING=true \
    -e WATCHPACK_POLLING=true \
    -e FAST_REFRESH=true \
    -e CHOKIDAR_INTERVAL=1000 \
    -e WATCHPACK_POLLING_INTERVAL=1000 \
    -v $(pwd)/frontend:/app:Z \
    --workdir /app \
    --memory=2g \
    --cpus=1 \
    node:18-alpine \
    /bin/sh -c "tail -f /dev/null"

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
