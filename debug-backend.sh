#!/bin/bash

echo "=== Backend Debugging ==="
echo ""

echo "1. Checking if backend container exists and is running..."
podman ps -a --filter name=backend
echo ""

echo "2. Checking backend logs (last 30 lines)..."
podman logs backend --tail 30
echo ""

echo "3. Testing Python imports..."
podman exec -it backend /bin/sh -c "cd /app && python -c 'import sys; print(sys.path)'" 2>&1
echo ""

echo "4. Testing database connection..."
podman exec -it backend /bin/sh -c "cd /app && python -c 'from database import engine; print(\"Engine created\"); conn = engine.connect(); print(\"Connected!\"); conn.close()'" 2>&1
echo ""

echo "5. Testing model imports..."
podman exec -it backend /bin/sh -c "cd /app && python -c 'from models import User; print(\"Models OK\")'" 2>&1
echo ""

echo "6. Testing main.py imports..."
podman exec -it backend /bin/sh -c "cd /app && python -c 'import main; print(\"Main imports OK\")'" 2>&1
echo ""

echo "7. Checking if port 8000 is accessible..."
podman exec -it backend /bin/sh -c "netstat -tuln 2>/dev/null | grep 8000 || ss -tuln 2>/dev/null | grep 8000 || echo 'netstat/ss not available'" 2>&1
echo ""

echo "8. Testing if uvicorn can start (dry run)..."
podman exec -it backend /bin/sh -c "cd /app && python -m uvicorn --help | head -5" 2>&1
echo ""

echo "=== Debug Complete ==="
echo ""
echo "If you see errors above, fix them before starting the server."
echo "To start the server, run: ./start-backend.sh"
