#!/bin/bash

# Start Frontend Server
cd "$(dirname "$0")/frontend"
echo "Starting frontend server..."
echo "Frontend will be available at http://localhost:3000"
npm start
