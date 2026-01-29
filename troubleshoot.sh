#!/bin/bash

echo "=== EduTrack Troubleshooting ==="
echo ""

echo "1. Checking if containers are running..."
podman ps --filter pod=EduTreak_Pod
echo ""

echo "2. Checking backend logs..."
echo "--- Backend Logs ---"
podman logs backend --tail 20
echo ""

echo "3. Checking frontend logs..."
echo "--- Frontend Logs ---"
podman logs frontend --tail 20
echo ""

echo "4. Testing database connection..."
podman exec -it database psql -U postgres -d edutrack -c "SELECT COUNT(*) FROM \"user\";" 2>&1
echo ""

echo "5. Checking if backend is accessible..."
curl -s http://localhost:8000/ || echo "Backend not accessible on port 8000"
echo ""

echo "6. Checking if tables exist..."
podman exec -it database psql -U postgres -d edutrack -c "\dt" 2>&1
echo ""

echo "=== Troubleshooting Complete ==="
echo ""
echo "Common issues:"
echo "- Backend not running: podman exec -it backend /bin/sh -c 'cd /app && uvicorn main:app --host 0.0.0.0 --port 8000 --reload'"
echo "- Database schema not applied: podman exec -i database psql -U postgres -d edutrack < database/schema.sql"
echo "- Check browser console for CORS or network errors"
