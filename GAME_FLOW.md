# Cairo Casino — Architecture & Migration Plan

## Current State

| Contract | Current Type | Deployed By |
|----------|-------------|-------------|
| casino | `#[starknet::contract]` | Manual (separate from sozo) |
| coin_toss | `#[dojo::contract]` | sozo migrate |
| event_relayer | `#[dojo::contract]` | sozo migrate |
| FullTokenContract | `#[starknet::contract]` | Manual (EGS external contract) |

**Problem:** Casino is a plain starknet contract. It needs manual deployment with constructor args, cannot use Dojo world storage, and its address isn't in the sozo manifest. This makes deployment fragile and inconsistent with the rest of the stack.

---

## Target State: Everything Dojo

| Contract | Target Type | Deployed By |
|----------|-------------|-------------|
| casino | `#[dojo::contract]` | sozo migrate |
| coin_toss | `#[dojo::contract]` | sozo migrate |
| event_relayer | `#[dojo::contract]` | sozo migrate |
| FullTokenContract | `#[starknet::contract]` | Manual (EGS — cannot change, external dependency) |

**What changes:**
- Casino becomes `#[dojo::contract]` — deployed by sozo, address in manifest
- Constructor replaced by `initialize()` function (called post-deploy)
- Casino added to dojo_dev.toml writers
- All contract addresses come from a single `manifest_dev.json`

**What stays the same:**
- FullTokenContract remains starknet (it's an EGS dependency, not ours to change)
- Casino still embeds MetagameComponent + SRC5Component (starknet components work in dojo contracts)
- Casino still uses storage Maps for bets, bet_player, settled, house_balance
- All game logic, ERC20 handling, settlement — unchanged

---

## Changes Required

### 1. casino.cairo

**Remove:**
- `#[starknet::contract]` → replace with `#[dojo::contract]`
- `#[constructor]` function

**Add:**
- `initialize()` function in the ICasino trait and impl
- `initialized: bool` storage guard (same pattern as coin_toss)
- `fn initialize(ref self, owner, token_address, fee_token, coin_toss, context_address)`

**Keep unchanged:**
- All storage Maps (bets, bet_player, settled, house_balance)
- MetagameComponent + SRC5Component embedding
- place_bet, settle, deposit, withdraw logic
- ERC20 dispatcher calls
- Event relayer integration

### 2. dojo_dev.toml

**Add casino to writers:**
```
"cairo_casino" = ["cairo_casino-coin_toss", "cairo_casino-event_relayer", "cairo_casino-casino"]
```

### 3. Client config (config.ts)

**Change:** CASINO_ADDRESS comes from manifest_dev.json now (not manual deploy)

### 4. EGS.md / GAME_FLOW.md

**Update:** Deployment docs to reflect casino is sozo-deployed

---

## Deployment Flow (after migration)

1. `sozo build` — compiles all contracts including casino
2. `sozo migrate` — deploys world + coin_toss + event_relayer + casino
3. Read addresses from `manifest_dev.json`
4. Deploy FullTokenContract manually (starknet-declare + deploy with constructor)
5. Call `coin_toss.initialize(creator, token_address, vrf_provider_address)`
6. Call `casino.initialize(owner, token_address, fee_token, coin_toss_address, context)`
7. Fund house: approve ETH then call `casino.deposit(amount)`

---

## Transaction Flow (unchanged for players)

### Tx 1: Approve ERC20
- Player approves casino contract to spend 0.001 ETH

### Tx 2: Place Bet
- Player calls `casino.place_bet(choice, player_name)`
- Casino transfers ERC20, mints EGS token via MetagameComponent
- Returns token_id (read from ERC721 Transfer event in receipt)

### Tx 3: VRF + Flip (multicall)
- First: `vrf_provider.request_random(coin_toss_address, Source::Nonce(coin_toss_address))`
- Then: `coin_toss.flip(token_id, choice)`
- Cartridge Paymaster wraps with submit_random + assert_consumed

### Tx 4: Settle
- `casino.settle(token_id)`
- Score 2 → player won → 2x payout
- Score 0 → player lost → house keeps bet

---

## Cartridge VRF Integration

**Provider address:** `0x051fea4450da9d6aee758bdeba88b2f665bcbf549d2c61421aa724e9ac0ced8f`
(Same on mainnet, sepolia, and local Katana with `paymaster = true`)

**How it works:**
- `request_random` must be the FIRST call in the multicall
- Cartridge Paymaster detects it and wraps the multicall with `submit_random` / `assert_consumed`
- coin_toss calls `consume_random(Source::Nonce(get_contract_address()))` to get the random felt252
- No mock needed — Katana with `paymaster = true` deploys the real VRF at genesis

**Source serialization (client):**
- Source::Nonce(address) → calldata: `["0", address]` (variant tag 0 + address)

**Controller policy needed:**
```
VRF_PROVIDER_ADDRESS: { methods: [{ entrypoint: "request_random" }] }
```

---

## Reading Results

### Option A: Torii (recommended)
- Torii indexes Dojo world automatically
- Subscribe to `CoinTossGame` model changes by token_id
- Get `won`, `score`, `result`, `choice` in real-time

### Option B: Direct RPC
- Call `coin_toss.score(token_id)` and `coin_toss.game_over(token_id)` as view functions

### Option C: Events
- event_relayer emits `BetPlaced` and `BetSettled` dojo events
- Torii indexes these too

---

## Building Future Games

### The Pattern
Every new casino game follows the same architecture:

1. **Create a `#[dojo::contract]`** — embed MinigameComponent + SRC5Component
2. **Define a Dojo model** — keyed by token_id, stores game state
3. **Implement IMinigameTokenData** — `score()` and `game_over()`
4. **Implement IMinigameDetails** — `token_name()`, `token_description()`, `game_details()`
5. **Use lifecycle hooks** — `pre_action` → game logic → `post_action`
6. **Use Cartridge VRF** if randomness needed
7. **Add to dojo_dev.toml writers**
8. **Add client overlay** — same 4-tx flow, same controller policies

### What the casino metagame gives for free
- ERC20 bet handling (approve/transfer/payout)
- EGS token minting (metagame.mint)
- Settlement (reads score from ANY game, pays out accordingly)
- House bankroll management
- Event relaying for Torii

### Example: Adding a Dice Roll game
- `dice_roll.cairo` as `#[dojo::contract]`
- Model: `DiceRollGame { token_id, bet_number, result, won, score }`
- VRF for randomness, same Source::Nonce pattern
- Score: bet_number multiplier (e.g., guess exact = 6x, over/under = 2x)
- Register with casino — same place_bet/settle flow
- Frontend: DiceRollOverlay with number picker

### Example: Adding a Price Prediction game
- `price_prediction.cairo` as `#[dojo::contract]`
- Model: `PricePrediction { token_id, asset, direction, entry_price, exit_price, won, score }`
- Uses oracle price feed instead of VRF
- Score: 2 if direction correct, 0 if wrong
- Same casino integration — place_bet, settle

### Adding to casino contract
The casino contract's `place_bet` already takes a `game_address` via the MetagameComponent mint. To support multiple games:
- Option A: Add a `game_address` parameter to `place_bet` (most flexible)
- Option B: Create separate `place_dice_bet`, `place_prediction_bet` functions
- Option C: One generic `place_bet` that routes based on a `game_type` enum
