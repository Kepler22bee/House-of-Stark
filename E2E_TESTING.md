# Cairo Casino — E2E Testing Guide

## Prerequisites

- katana 1.7.1+, sozo 1.8.0, sncast 0.51.2, torii 1.7.0
- Node.js 18+ with npm

## Quick Start

```bash
cd starter
bash casino_scripts/dev.sh
```

This starts Katana, deploys all contracts, starts Torii and the Next.js client. Press Ctrl+C to stop everything.

---

## Architecture Overview

| Contract | Type | Deployed By |
|----------|------|-------------|
| casino | `#[dojo::contract]` | sozo migrate |
| coin_toss | `#[dojo::contract]` | sozo migrate |
| event_relayer | `#[dojo::contract]` | sozo migrate |
| FullTokenContract | `#[starknet::contract]` | sncast (via UDC) |
| MinigameRegistryContract | `#[starknet::contract]` | sncast (via UDC) |

---

## What Can Be Tested via CLI (sncast)

### 1. Contract Deployment & Initialization

After `dev.sh` runs, verify all contracts are initialized:

```bash
cd casino_contracts

# Casino view functions
sncast -a katana0 call -u http://localhost:5050/ \
  --contract-address $CASINO_ADDRESS --function "house_balance"

sncast -a katana0 call -u http://localhost:5050/ \
  --contract-address $CASINO_ADDRESS --function "coin_toss_address"

sncast -a katana0 call -u http://localhost:5050/ \
  --contract-address $CASINO_ADDRESS --function "event_relayer_address"
```

Expected: house_balance = 0, coin_toss_address and event_relayer_address match manifest.

### 2. House Deposit

```bash
# Approve ETH spending
sncast --wait -a katana0 invoke -u http://localhost:5050/ \
  --contract-address $FEE_TOKEN_ADDRESS --function "approve" \
  --calldata $CASINO_ADDRESS 0x2386F26FC10000 0

# Deposit 0.01 ETH
sncast --wait -a katana0 invoke -u http://localhost:5050/ \
  --contract-address $CASINO_ADDRESS --function "deposit" \
  --calldata 0x2386F26FC10000 0

# Verify
sncast -a katana0 call -u http://localhost:5050/ \
  --contract-address $CASINO_ADDRESS --function "house_balance"
# Expected: 10000000000000000 (0.01 ETH)
```

### 3. Place Bet

```bash
# Approve 0.001 ETH for the bet
sncast --wait -a katana0 invoke -u http://localhost:5050/ \
  --contract-address $FEE_TOKEN_ADDRESS --function "approve" \
  --calldata $CASINO_ADDRESS 0x38D7EA4C68000 0

# Place bet: choice=0 (heads), player_name=Option::None (1)
sncast --wait -a katana0 invoke -u http://localhost:5050/ \
  --contract-address $CASINO_ADDRESS --function "place_bet" \
  --calldata 0 1

# Verify bet was recorded
sncast -a katana0 call -u http://localhost:5050/ \
  --contract-address $CASINO_ADDRESS --function "bet_amount" --calldata 1
# Expected: 1000000000000000 (0.001 ETH)

# Verify game is not over yet
sncast -a katana0 call -u http://localhost:5050/ \
  --contract-address $COIN_TOSS_ADDRESS --function "game_over" --calldata 1
# Expected: false
```

### 4. Double-Initialize Guard

```bash
# Try to initialize casino again — should fail
sncast --wait -a katana0 invoke -u http://localhost:5050/ \
  --contract-address $CASINO_ADDRESS --function "initialize" \
  --calldata $DEPLOYER_ADDRESS $TOKEN_ADDRESS $FEE_TOKEN $COIN_TOSS $EVENT_RELAYER 1
# Expected: "Already initialized" error
```

### 5. Owner-Only Guards

```bash
# Try to deposit from a non-owner account — should fail
sncast --wait -a katana1 invoke -u http://localhost:5050/ \
  --contract-address $CASINO_ADDRESS --function "deposit" \
  --calldata 0x38D7EA4C68000 0
# Expected: "Only owner" error
```

---

## What CANNOT Be Tested via CLI

### VRF + Flip (Step 3 of game flow)

The coin flip requires Cartridge VRF randomness. On local Katana, VRF is **not an on-chain contract** — it's handled at the RPC/paymaster level. The Cartridge paymaster intercepts `request_random` calls and wraps them with real VRF data, but **only when transactions go through the Cartridge Controller**.

Direct `sncast` calls bypass the paymaster, so `request_random` and `consume_random` fail with "contract not deployed".

### Settlement (Step 4 of game flow)

Since flip can't complete via CLI, settle can't be tested either. The settle function requires `game_over(token_id) == true`, which only happens after a successful flip.

---

## Full E2E Testing via Frontend

The complete game flow can only be tested through the frontend with the Cartridge Controller:

1. Open http://localhost:3000
2. Connect with Cartridge Controller
3. Walk up to the coin toss table in the game
4. Click to start — this triggers the 4-transaction flow:

| Step | Transaction | What Happens |
|------|------------|--------------|
| 1 | ERC20.approve | Player approves casino to spend 0.001 ETH |
| 2 | casino.place_bet | Casino transfers ETH, mints EGS token, returns token_id |
| 3 | vrf.request_random + coin_toss.flip | Paymaster wraps with VRF, coin is flipped, result written to Dojo model |
| 4 | casino.settle | Casino reads score from coin_toss, pays out winner |

### Verifying Results After Frontend Play

After a game completes through the frontend, verify on-chain state via CLI:

```bash
# Check if game is over
sncast -a katana0 call -u http://localhost:5050/ \
  --contract-address $COIN_TOSS_ADDRESS --function "game_over" --calldata $TOKEN_ID
# Expected: true

# Check score (2 = won, 0 = lost)
sncast -a katana0 call -u http://localhost:5050/ \
  --contract-address $COIN_TOSS_ADDRESS --function "score" --calldata $TOKEN_ID

# Check house balance changed
sncast -a katana0 call -u http://localhost:5050/ \
  --contract-address $CASINO_ADDRESS --function "house_balance"
```

### Verifying via Torii

Torii indexes all Dojo models automatically:

```bash
# Query CoinTossGame model for a specific token_id
curl -s http://localhost:8080/grpc/query \
  -H "Content-Type: application/json" \
  -d '{"model": "cairo_casino-CoinTossGame", "keys": ["0x1"]}'
```

---

## Unit Tests (snforge)

The existing unit tests bypass VRF entirely by writing game state directly:

```bash
cd casino_contracts
sozo test
```

These test:
- CoinTossGame model read/write
- IMinigameTokenData (score, game_over)
- IMinigameDetails (token_name, description, game_details)
- Event relayer emissions

They do NOT test the actual flip or VRF integration.

---

## Contract Addresses

All addresses come from `manifest_dev.json` after `sozo migrate`, except FullTokenContract and MinigameRegistryContract which are deployed via UDC.

The `dev.sh` script writes all addresses to:
- `casino_contracts/deployments_dev.json` — machine-readable
- `client/.env.local` — frontend config

---

## Key Environment Variables

| Variable | Default |
|----------|---------|
| VRF_PROVIDER_ADDRESS | 0x051fea4450da9d6aee758bdeba88b2f665bcbf549d2c61421aa724e9ac0ced8f |
| FEE_TOKEN_ADDRESS | 0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7 |
| RPC_URL | http://localhost:5050/ |
| TORII_URL | http://localhost:8080 |

---

## Troubleshooting

### "Contract not found" on VRF calls
VRF only works through the Cartridge Controller (frontend). Direct CLI calls will always fail for VRF-dependent operations.

### "Already initialized"
Contracts can only be initialized once. Restart Katana for a fresh state.

### sncast "Failed to parse to felt"
Make sure you're running sncast from the `casino_contracts/` directory where `.tool-versions` is visible.

### npm install peer dependency errors
Use `npm install --legacy-peer-deps` (already configured in dev.sh).

### UDC deploy fails with sncast
dev.sh uses direct UDC invoke instead of `sncast deploy` because sncast 0.51.2 uses a different UDC address than what Katana deploys. This is a known compatibility issue.
