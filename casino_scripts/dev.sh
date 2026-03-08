#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
CONTRACTS_DIR="$ROOT_DIR/casino_contracts"
CLIENT_DIR="$ROOT_DIR/client"
MANIFEST_PATH="$CONTRACTS_DIR/manifest_dev.json"
DEPLOYMENTS_PATH="$CONTRACTS_DIR/deployments_dev.json"

RPC_URL="$(awk -F'"' '/rpc_url/ { print $2; exit }' "$CONTRACTS_DIR/dojo_dev.toml")"
DEPLOYER_ADDRESS="$(awk -F'"' '/account_address/ { print $2; exit }' "$CONTRACTS_DIR/dojo_dev.toml")"
DEPLOYER_PRIVATE_KEY="$(awk -F'"' '/private_key/ { print $2; exit }' "$CONTRACTS_DIR/dojo_dev.toml")"

SNCAST_ACCOUNT_NAME="${SNCAST_ACCOUNT_NAME:-katana0}"
VRF_PROVIDER_ADDRESS="${VRF_PROVIDER_ADDRESS:-0x051fea4450da9d6aee758bdeba88b2f665bcbf549d2c61421aa724e9ac0ced8f}"
FEE_TOKEN_ADDRESS="${FEE_TOKEN_ADDRESS:-0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7}"

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

log() {
  echo ""
  echo "=> $*"
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Error: required command '$1' is not installed."
    exit 1
  fi
}

UDC_ADDRESS="0x041a78e741e5af2fec34b695679bc6891742439f7afb8484ecd7766661ad02bf"

declare_contract() {
  local contract_name="$1"
  local output
  output="$(
    sncast --json --wait -a "$SNCAST_ACCOUNT_NAME" declare \
      -u "$RPC_URL" \
      --contract-name "$contract_name" \
      --package cairo_casino 2>&1
  )"
  # Extract class_hash from JSON lines (filter out warnings/status lines)
  echo "$output" | grep '"class_hash"' | jq -r '.class_hash' | head -1
}

# Deploy via UDC invoke (sncast deploy uses wrong UDC address on Katana)
deploy_via_udc() {
  local class_hash="$1"
  local salt="$2"
  shift 2
  local calldata=("$@")
  local calldata_len=${#calldata[@]}

  local output
  output="$(
    sncast --json --wait -a "$SNCAST_ACCOUNT_NAME" invoke \
      -u "$RPC_URL" \
      --contract-address "$UDC_ADDRESS" \
      --function "deployContract" \
      --calldata "$class_hash" "$salt" 0 "$calldata_len" "${calldata[@]}" 2>&1
  )"

  # Extract tx_hash from JSON lines (filter out message lines)
  local tx_hash
  tx_hash="$(echo "$output" | grep '"transaction_hash"' | grep -v '"message"' | jq -r '.transaction_hash // empty' | head -1)"
  if [ -z "$tx_hash" ]; then
    echo "Error: deploy transaction failed" >&2
    echo "$output" >&2
    return 1
  fi

  curl -s "$RPC_URL" -X POST -H "Content-Type: application/json" -d "{
    \"jsonrpc\": \"2.0\",
    \"method\": \"starknet_getTransactionReceipt\",
    \"params\": {\"transaction_hash\": \"$tx_hash\"},
    \"id\": 1
  }" | python3 -c "
import sys, json
r = json.load(sys.stdin)
for e in r['result']['events']:
    if '0x26b160f10156dea0' in e['keys'][0]:
        print(e['data'][0])
        break
"
}

invoke_contract() {
  local contract_address="$1"
  local function_name="$2"
  shift 2
  sncast --wait -a "$SNCAST_ACCOUNT_NAME" invoke \
    -u "$RPC_URL" \
    --contract-address "$contract_address" \
    --function "$function_name" \
    --calldata "$@" \
    >/dev/null
}

write_client_env() {
  local world_address="$1"
  local coin_toss_address="$2"
  local event_relayer_address="$3"
  local token_address="$4"
  local casino_address="$5"

  cat > "$CLIENT_DIR/.env.local" <<EOF
NEXT_PUBLIC_RPC_URL=$RPC_URL
NEXT_PUBLIC_TORII_URL=http://localhost:8080
NEXT_PUBLIC_WORLD_ADDRESS=$world_address
NEXT_PUBLIC_COIN_TOSS_ADDRESS=$coin_toss_address
NEXT_PUBLIC_EVENT_RELAYER_ADDRESS=$event_relayer_address
NEXT_PUBLIC_TOKEN_ADDRESS=$token_address
NEXT_PUBLIC_CASINO_ADDRESS=$casino_address
NEXT_PUBLIC_VRF_PROVIDER_ADDRESS=$VRF_PROVIDER_ADDRESS
NEXT_PUBLIC_FEE_TOKEN_ADDRESS=$FEE_TOKEN_ADDRESS
EOF
}

write_deployments_file() {
  local world_address="$1"
  local coin_toss_address="$2"
  local event_relayer_address="$3"
  local token_address="$4"
  local casino_address="$5"

  cat > "$DEPLOYMENTS_PATH" <<EOF
{
  "rpc_url": "$RPC_URL",
  "world_address": "$world_address",
  "coin_toss_address": "$coin_toss_address",
  "event_relayer_address": "$event_relayer_address",
  "token_address": "$token_address",
  "casino_address": "$casino_address",
  "vrf_provider_address": "$VRF_PROVIDER_ADDRESS",
  "fee_token_address": "$FEE_TOKEN_ADDRESS"
}
EOF
}

echo "=== Cairo Casino — EGS Dev Environment ==="

require_cmd scarb
require_cmd sozo
require_cmd katana
require_cmd torii
require_cmd sncast
require_cmd jq
require_cmd npm

cd "$CONTRACTS_DIR"

log "Building casino contracts..."
scarb build >/dev/null

log "Importing Katana account for sncast..."
sncast account import \
  --name "$SNCAST_ACCOUNT_NAME" \
  --address "$DEPLOYER_ADDRESS" \
  --type open-zeppelin \
  --private-key "$DEPLOYER_PRIVATE_KEY" \
  --url "$RPC_URL" \
  --silent \
  >/dev/null 2>&1 || true

log "Starting Katana..."
katana --config "$CONTRACTS_DIR/katana.toml" >/dev/null 2>&1 &
KATANA_PID=$!

for i in $(seq 1 30); do
  if curl -s "$RPC_URL" >/dev/null 2>&1; then
    break
  fi
  if ! kill -0 "$KATANA_PID" 2>/dev/null; then
    echo "Error: Katana failed to start."
    exit 1
  fi
  sleep 1
done

if ! curl -s "$RPC_URL" >/dev/null 2>&1; then
  echo "Error: Katana timed out."
  exit 1
fi

log "Migrating Dojo world..."
sozo migrate --manifest-path "$CONTRACTS_DIR/Scarb.toml" --profile dev >/dev/null 2>&1 || sozo migrate --dev >/dev/null

if [ ! -f "$MANIFEST_PATH" ]; then
  echo "Error: manifest_dev.json not found after migration."
  exit 1
fi

WORLD_ADDRESS="$(jq -r '.world.address' "$MANIFEST_PATH")"
COIN_TOSS_ADDRESS="$(jq -r '.contracts[] | select(.tag == "cairo_casino-coin_toss") | .address' "$MANIFEST_PATH")"
EVENT_RELAYER_ADDRESS="$(jq -r '.contracts[] | select(.tag == "cairo_casino-event_relayer") | .address' "$MANIFEST_PATH")"
CASINO_ADDRESS="$(jq -r '.contracts[] | select(.tag == "cairo_casino-casino") | .address' "$MANIFEST_PATH")"

log "Declaring and deploying EGS token contracts..."

# Deploy MinigameRegistryContract (required by FullTokenContract)
REGISTRY_CLASS_HASH="$(declare_contract MinigameRegistryContract)"
# Constructor: name, symbol, base_uri, event_relayer_address: Option::None
# ByteArray("GameCreatorToken"): 0, 0x47616d6543726561746f72546f6b656e, 0x10
# ByteArray("GCT"): 0, 0x474354, 0x3
# ByteArray(""): 0, 0, 0
# Option::None: 1
REGISTRY_ADDRESS="$(deploy_via_udc "$REGISTRY_CLASS_HASH" 0xAA \
  0 0x47616d6543726561746f72546f6b656e 0x10 \
  0 0x474354 0x3 \
  0 0 0 \
  1)"

# Deploy FullTokenContract
FULL_TOKEN_CLASS_HASH="$(declare_contract FullTokenContract)"
# Constructor: name, symbol, base_uri, royalty_receiver, royalty_fraction,
#              game_registry_address: Some(REGISTRY), event_relayer_address: None
# ByteArray("Cairo Casino Session"): 0, 0x436169726f20436173696e6f2053657373696f6e, 0x14
# ByteArray("CCS"): 0, 0x434353, 0x3
# ByteArray(""): 0, 0, 0
# Option::Some(addr): 0, addr   Option::None: 1
TOKEN_ADDRESS="$(deploy_via_udc "$FULL_TOKEN_CLASS_HASH" 0xBB \
  0 0x436169726f20436173696e6f2053657373696f6e 0x14 \
  0 0x434353 0x3 \
  0 0 0 \
  "$DEPLOYER_ADDRESS" \
  0 \
  0 "$REGISTRY_ADDRESS" \
  1)"

log "Initializing the coin toss minigame..."
invoke_contract \
  "$COIN_TOSS_ADDRESS" \
  "initialize" \
  "$DEPLOYER_ADDRESS" "$TOKEN_ADDRESS" "$VRF_PROVIDER_ADDRESS"

log "Initializing the casino metagame..."
invoke_contract \
  "$CASINO_ADDRESS" \
  "initialize" \
  "$DEPLOYER_ADDRESS" "$TOKEN_ADDRESS" "$FEE_TOKEN_ADDRESS" "$COIN_TOSS_ADDRESS" "$EVENT_RELAYER_ADDRESS" 1

if [ -d "$CLIENT_DIR/src/dojo" ]; then
  cp "$MANIFEST_PATH" "$CLIENT_DIR/src/dojo/manifest_dev.json"
fi

write_client_env \
  "$WORLD_ADDRESS" \
  "$COIN_TOSS_ADDRESS" \
  "$EVENT_RELAYER_ADDRESS" \
  "$TOKEN_ADDRESS" \
  "$CASINO_ADDRESS"

write_deployments_file \
  "$WORLD_ADDRESS" \
  "$COIN_TOSS_ADDRESS" \
  "$EVENT_RELAYER_ADDRESS" \
  "$TOKEN_ADDRESS" \
  "$CASINO_ADDRESS"

log "Starting Torii..."
torii --config "$CONTRACTS_DIR/torii.toml" --world "$WORLD_ADDRESS" >/dev/null 2>&1 &
TORII_PID=$!
sleep 2
if ! kill -0 "$TORII_PID" 2>/dev/null; then
  echo "Error: Torii failed to start."
  exit 1
fi

log "Installing client dependencies..."
cd "$CLIENT_DIR"
npm install --legacy-peer-deps >/dev/null

log "Starting Next.js client..."
npm run dev >/dev/null 2>&1 &
CLIENT_PID=$!

for i in $(seq 1 30); do
  if curl -s http://localhost:3000 >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

echo ""
echo "=== Dev environment running ==="
echo ""
echo "Katana RPC:      $RPC_URL"
echo "Torii HTTP:      http://localhost:8080"
echo "World:           $WORLD_ADDRESS"
echo "Coin Toss:       $COIN_TOSS_ADDRESS"
echo "Event Relayer:   $EVENT_RELAYER_ADDRESS"
echo "Token:           $TOKEN_ADDRESS"
echo "Casino:          $CASINO_ADDRESS"
echo "Client:          http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop."

wait
