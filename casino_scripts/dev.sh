#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# Cairo Casino — Development Script
#
# Assumptions:
# - .tool-versions pins: scarb 2.13.1, sozo 1.8.0, katana 1.7.1, torii 1.7.0
# - Katana predeployed account #0 is used as deployer/owner
# - Casino is a #[starknet::contract] — NOT deployed by sozo migrate
#   (requires separate sncast declare+deploy — TODO)
# - coin_toss needs manual initialization with token_address after
#   FullTokenContract is deployed (TODO)
# =============================================================================

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
CONTRACTS_DIR="$ROOT_DIR/contracts"
CLIENT_DIR="$ROOT_DIR/client"

KATANA_PID=""
TORII_PID=""
CLIENT_PID=""

cleanup() {
  echo ""
  echo "Shutting down..."
  [ -n "$CLIENT_PID" ] && kill "$CLIENT_PID" 2>/dev/null || true
  [ -n "$TORII_PID" ] && kill "$TORII_PID" 2>/dev/null || true
  [ -n "$KATANA_PID" ] && kill "$KATANA_PID" 2>/dev/null || true
  wait 2>/dev/null || true
  echo "Done."
}
trap cleanup EXIT INT TERM

log() { echo ""; echo "=> $*"; }

cd "$CONTRACTS_DIR"

echo "=== Cairo Casino — Dev Environment ==="

# --- Build ---
log "Building contracts..."
scarb build >/dev/null 2>&1

# --- Start Katana ---
log "Starting Katana..."
katana --config katana.toml >/dev/null 2>&1 &
KATANA_PID=$!

for i in $(seq 1 30); do
  if curl -s http://localhost:5050 >/dev/null 2>&1; then break; fi
  if ! kill -0 "$KATANA_PID" 2>/dev/null; then echo "Error: Katana failed to start."; exit 1; fi
  sleep 1
done
if ! curl -s http://localhost:5050 >/dev/null 2>&1; then echo "Error: Katana timed out."; exit 1; fi
log "Katana running on http://localhost:5050"

# --- Migrate Dojo world ---
log "Migrating Dojo world..."
sozo migrate --dev >/dev/null 2>&1

MANIFEST="manifest_dev.json"
if [ ! -f "$MANIFEST" ]; then echo "Error: manifest_dev.json not found."; exit 1; fi

WORLD_ADDRESS=$(jq -r '.world.address' "$MANIFEST")
COIN_TOSS=$(jq -r '.contracts[] | select(.tag == "cairo_casino-coin_toss") | .address' "$MANIFEST")
EVENT_RELAYER=$(jq -r '.contracts[] | select(.tag == "cairo_casino-event_relayer") | .address' "$MANIFEST")

# --- Copy manifest to client ---
if [ -d "$CLIENT_DIR/src/dojo" ]; then
  cp "$MANIFEST" "$CLIENT_DIR/src/dojo/manifest_dev.json"
fi

# --- Start Torii ---
log "Starting Torii..."
torii --config torii.toml --world "$WORLD_ADDRESS" >/dev/null 2>&1 &
TORII_PID=$!
sleep 2
if ! kill -0 "$TORII_PID" 2>/dev/null; then echo "Error: Torii failed to start."; exit 1; fi

# --- Start frontend if it exists ---
if [ -d "$CLIENT_DIR" ] && [ -f "$CLIENT_DIR/package.json" ]; then
  cat > "$CLIENT_DIR/.env" <<EOF
VITE_RPC_URL=http://localhost:5050
VITE_TORII_URL=http://localhost:8080
VITE_WORLD_ADDRESS=$WORLD_ADDRESS
VITE_COIN_TOSS_ADDRESS=$COIN_TOSS
EOF
  cd "$CLIENT_DIR"
  pnpm install --frozen-lockfile >/dev/null 2>&1 || true
  pnpm dev >/dev/null 2>&1 &
  CLIENT_PID=$!
  cd "$CONTRACTS_DIR"
fi

echo ""
echo "=== Dev environment running ==="
echo ""
echo "Katana RPC:      http://localhost:5050"
echo "Torii HTTP:      http://localhost:8080"
echo "World:           $WORLD_ADDRESS"
echo "Coin Toss:       $COIN_TOSS"
echo "Event Relayer:   $EVENT_RELAYER"
if [ -n "$CLIENT_PID" ]; then
  echo "Client:          https://localhost:5173"
fi
echo ""
echo "Press Ctrl+C to stop."

wait
