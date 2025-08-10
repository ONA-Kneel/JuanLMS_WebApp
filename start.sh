#!/bin/bash

echo "========================================"
echo "    Juan LMS - Starting System..."
echo "========================================"
echo

echo "Installing dependencies..."
npm run install-all

echo
echo "Starting development servers..."
echo "Backend: http://localhost:5000"
echo "Frontend: http://localhost:5173"
echo "Socket.io: Integrated with backend"
echo

npm run dev 