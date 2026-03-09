#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
CONTRACTS_DIR="$ROOT_DIR/casino_contracts"
CLIENT_DIR="$ROOT_DIR/client"
MANIFEST_PATH="$CONTRACTS_DIR/manifest_sepolia.json"

RPC_URL="$(awk -F'"' '/rpc_url/ { print $2; exit }' "$CONTRACTS_DIR/dojo_sepolia.toml")"
DEPLOYER_ADDRESS="$(awk -F'"' '/account_address/ { print $2; exit }' "$CONTRACTS_DIR/dojo_sepolia.toml")"
DEPLOYER_PRIVATE_KEY="$(awk -F'"' '/private_key/ { print $2; exit }' "$CONTRACTS_DIR/dojo_sepolia.toml")"

SNCAST_ACCOUNT_NAME="sepolia_deployer"
VRF_PROVIDER_ADDRESS="0x051fea4450da9d6aee758bdeba88b2f665bcbf549d2c61421aa724e9ac0ced8f"
# STRK on Starknet Sepolia
FEE_TOKEN_ADDRESS="0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d"
# House bankroll deposit (10 STRK)
HOUSE_DEPOSIT="0x8AC7230489E80000"

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

require_cmd scarb
require_cmd sozo
require_cmd sncast
require_cmd jq

cd "$CONTRACTS_DIR"

log "Building contracts..."
scarb build

log "Importing Sepolia account for sncast..."
sncast account import \
  --name "$SNCAST_ACCOUNT_NAME" \
  --address "$DEPLOYER_ADDRESS" \
  --type open-zeppelin \
  --private-key "$DEPLOYER_PRIVATE_KEY" \
  --url "$RPC_URL" \
  --silent \
  >/dev/null 2>&1 || true

log "Migrating Dojo world to Sepolia..."
sozo migrate --profile sepolia

if [ ! -f "$MANIFEST_PATH" ]; then
  echo "Error: manifest_sepolia.json not found after migration."
  exit 1
fi

WORLD_ADDRESS="$(jq -r '.world.address' "$MANIFEST_PATH")"
COIN_TOSS_ADDRESS="$(jq -r '.contracts[] | select(.tag == "cairo_casino-coin_toss") | .address' "$MANIFEST_PATH")"
EVENT_RELAYER_ADDRESS="$(jq -r '.contracts[] | select(.tag == "cairo_casino-event_relayer") | .address' "$MANIFEST_PATH")"
CASINO_ADDRESS="$(jq -r '.contracts[] | select(.tag == "cairo_casino-casino") | .address' "$MANIFEST_PATH")"

echo "World:          $WORLD_ADDRESS"
echo "Coin Toss:      $COIN_TOSS_ADDRESS"
echo "Event Relayer:  $EVENT_RELAYER_ADDRESS"
echo "Casino:         $CASINO_ADDRESS"

declare_contract() {
  local contract_name="$1"
  local output
  output="$(
    sncast --json --wait -a "$SNCAST_ACCOUNT_NAME" declare \
      -u "$RPC_URL" \
      --contract-name "$contract_name" \
      --package cairo_casino 2>&1
  )" || true
  # Handle already-declared case
  local class_hash
  class_hash="$(echo "$output" | grep '"class_hash"' | jq -r '.class_hash // empty' | head -1)"
  if [ -z "$class_hash" ]; then
    # Try extracting from error message (already declared)
    class_hash="$(echo "$output" | grep -o '0x[0-9a-f]*' | head -1)"
  fi
  echo "$class_hash"
}

log "Declaring EGS token contracts..."
REGISTRY_CLASS_HASH="$(declare_contract MinigameRegistryContract)"
echo "MinigameRegistryContract class hash: $REGISTRY_CLASS_HASH"

FULL_TOKEN_CLASS_HASH="$(declare_contract FullTokenContract)"
echo "FullTokenContract class hash: $FULL_TOKEN_CLASS_HASH"

log "Deploying MinigameRegistryContract..."
REGISTRY_ADDRESS="$(
  sncast --json --wait -a "$SNCAST_ACCOUNT_NAME" deploy \
    -u "$RPC_URL" \
    --class-hash "$REGISTRY_CLASS_HASH" \
    --constructor-calldata \
      0 0x47616d6543726561746f72546f6b656e 0x10 \
      0 0x474354 0x3 \
      0 0 0 \
      1 2>&1 | grep '"contract_address"' | jq -r '.contract_address' | head -1
)"
echo "Registry: $REGISTRY_ADDRESS"

log "Deploying FullTokenContract..."
TOKEN_ADDRESS="$(
  sncast --json --wait -a "$SNCAST_ACCOUNT_NAME" deploy \
    -u "$RPC_URL" \
    --class-hash "$FULL_TOKEN_CLASS_HASH" \
    --constructor-calldata \
      0 0x436169726f20436173696e6f2053657373696f6e 0x14 \
      0 0x434353 0x3 \
      0 0 0 \
      "$DEPLOYER_ADDRESS" \
      0 \
      0 "$REGISTRY_ADDRESS" \
      1 2>&1 | grep '"contract_address"' | jq -r '.contract_address' | head -1
)"
echo "Token: $TOKEN_ADDRESS"

log "Initializing coin_toss..."
sncast --wait -a "$SNCAST_ACCOUNT_NAME" invoke \
  -u "$RPC_URL" \
  --contract-address "$COIN_TOSS_ADDRESS" \
  --function "initialize" \
  --calldata "$DEPLOYER_ADDRESS" "$TOKEN_ADDRESS" "$VRF_PROVIDER_ADDRESS"

log "Initializing casino with STRK as fee token..."
sncast --wait -a "$SNCAST_ACCOUNT_NAME" invoke \
  -u "$RPC_URL" \
  --contract-address "$CASINO_ADDRESS" \
  --function "initialize" \
  --calldata "$DEPLOYER_ADDRESS" "$TOKEN_ADDRESS" "$FEE_TOKEN_ADDRESS" "$COIN_TOSS_ADDRESS" "$EVENT_RELAYER_ADDRESS" 1

log "Approving STRK for house deposit..."
sncast --wait -a "$SNCAST_ACCOUNT_NAME" invoke \
  -u "$RPC_URL" \
  --contract-address "$FEE_TOKEN_ADDRESS" \
  --function "approve" \
  --calldata "$CASINO_ADDRESS" "$HOUSE_DEPOSIT" 0

log "Depositing STRK into house bankroll..."
sncast --wait -a "$SNCAST_ACCOUNT_NAME" invoke \
  -u "$RPC_URL" \
  --contract-address "$CASINO_ADDRESS" \
  --function "deposit" \
  --calldata "$HOUSE_DEPOSIT" 0

log "Updating client config..."
# Update .env
sed -i '' \
  -e "s|NEXT_PUBLIC_WORLD_ADDRESS=.*|NEXT_PUBLIC_WORLD_ADDRESS=$WORLD_ADDRESS|" \
  -e "s|NEXT_PUBLIC_COIN_TOSS_ADDRESS=.*|NEXT_PUBLIC_COIN_TOSS_ADDRESS=$COIN_TOSS_ADDRESS|" \
  -e "s|NEXT_PUBLIC_CASINO_ADDRESS=.*|NEXT_PUBLIC_CASINO_ADDRESS=$CASINO_ADDRESS|" \
  -e "s|NEXT_PUBLIC_EVENT_RELAYER_ADDRESS=.*|NEXT_PUBLIC_EVENT_RELAYER_ADDRESS=$EVENT_RELAYER_ADDRESS|" \
  -e "s|NEXT_PUBLIC_FEE_TOKEN_ADDRESS=.*|NEXT_PUBLIC_FEE_TOKEN_ADDRESS=$FEE_TOKEN_ADDRESS|" \
  "$CLIENT_DIR/.env"

# Update env-vercel.txt
sed -i '' \
  -e "s|NEXT_PUBLIC_WORLD_ADDRESS=.*|NEXT_PUBLIC_WORLD_ADDRESS=$WORLD_ADDRESS|" \
  -e "s|NEXT_PUBLIC_COIN_TOSS_ADDRESS=.*|NEXT_PUBLIC_COIN_TOSS_ADDRESS=$COIN_TOSS_ADDRESS|" \
  -e "s|NEXT_PUBLIC_CASINO_ADDRESS=.*|NEXT_PUBLIC_CASINO_ADDRESS=$CASINO_ADDRESS|" \
  -e "s|NEXT_PUBLIC_EVENT_RELAYER_ADDRESS=.*|NEXT_PUBLIC_EVENT_RELAYER_ADDRESS=$EVENT_RELAYER_ADDRESS|" \
  -e "s|NEXT_PUBLIC_FEE_TOKEN_ADDRESS=.*|NEXT_PUBLIC_FEE_TOKEN_ADDRESS=$FEE_TOKEN_ADDRESS|" \
  "$CLIENT_DIR/env-vercel.txt"

# Copy updated manifest to client
cp "$MANIFEST_PATH" "$CLIENT_DIR/src/dojo/manifest_sepolia.json" 2>/dev/null || true

echo ""
echo "=== Sepolia Deployment Complete ==="
echo ""
echo "World:          $WORLD_ADDRESS"
echo "Coin Toss:      $COIN_TOSS_ADDRESS"
echo "Casino:         $CASINO_ADDRESS"
echo "Fee Token:      $FEE_TOKEN_ADDRESS (STRK)"
echo "House deposit:  10 STRK"
echo ""
echo "Update these in Vercel environment variables!"
