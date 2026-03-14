#!/bin/bash
# ── The Innovation Engine — Launch Script ──────────────────────────────────

ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND="$ROOT/backend"
FRONTEND="$ROOT/frontend"
NODE_BIN="$HOME/.nvm/versions/node/v20.20.0/bin"
PYTHON="$BACKEND/venv/bin/python3"

# Kill anything on ports 8000 and 3000 from a previous run
for port in 8000 3000; do
    pid=$(lsof -ti :$port 2>/dev/null)
    if [ -n "$pid" ]; then
        echo "Stopping process on port $port (pid $pid)..."
        echo "$pid" | xargs kill -9 2>/dev/null
    fi
done

# Remove stale Next.js cache to prevent Turbopack corruption
rm -rf "$FRONTEND/.next"

echo ""
echo "🚀  Starting The Innovation Engine..."
echo "    Backend  → http://localhost:8000"
echo "    Frontend → http://localhost:3000"
echo "    Password:  EUREKA"
echo ""

# Start backend in background
cd "$BACKEND"
"$PYTHON" -m uvicorn main:app \
    --port 8000 \
    --reload \
    --reload-exclude ".venv*" \
    &> /tmp/ie_backend.log &
BACKEND_PID=$!

# Wait for backend to be ready
echo "⏳  Waiting for backend..."
for i in $(seq 1 20); do
    if curl -s http://localhost:8000/ > /dev/null 2>&1; then
        echo "✅  Backend ready"
        break
    fi
    sleep 0.5
done

# Start frontend in background
cd "$FRONTEND"
PATH="$NODE_BIN:$PATH" npm run dev &> /tmp/ie_frontend.log &
FRONTEND_PID=$!

echo "⏳  Waiting for frontend..."
for i in $(seq 1 30); do
    if curl -s http://localhost:3000/ > /dev/null 2>&1; then
        echo "✅  Frontend ready"
        break
    fi
    sleep 1
done

echo ""
echo "✨  Both services running. Opening browser..."
open http://localhost:3000

echo ""
echo "📋  Logs: tail -f /tmp/ie_backend.log  |  tail -f /tmp/ie_frontend.log"
echo "🛑  Press Ctrl+C to stop everything."
echo ""

# Wait and clean up on Ctrl+C
trap "echo ''; echo 'Shutting down...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT
wait
