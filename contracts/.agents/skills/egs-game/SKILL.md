---
name: egs-game
description: Build games compatible with the Provable Games Embeddable Game Standard (EGS). Use when implementing IMinigameTokenData, integrating with MinigameToken, building platforms, or working with denshokan-sdk frontend.
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, WebFetch
---

# Embeddable Game Standard (EGS)

Build composable, provable on-chain games on Starknet using the Provable Games Embeddable Game Standard.

Reference: https://docs.provable.games/embeddable-game-standard

## When to Use This Skill

- "Make my game EGS-compatible"
- "Implement IMinigameTokenData"
- "Add EGS score tracking"
- "Integrate with MinigameToken"
- "Build an EGS platform / metagame"
- "Set up denshokan-sdk frontend"

## Architecture Overview

EGS has three contract roles communicating through SRC5-discoverable interfaces:

1. **MinigameToken** — Shared ERC721 contract. Each token = one game session. Token ID is a packed `felt252` encoding game data (game ID, settings, timestamps, flags).
2. **Minigame** — Your game logic. Implements `IMinigameTokenData` to expose score and game-over status.
3. **Metagame** — Platform contract. Mints tokens, optionally receives callbacks (`on_game_action`, `on_game_over`, `on_objective_complete`).

Supporting contracts:
- **Registry** — Maps game contracts to metadata, manages creator NFTs for royalties.
- **DefaultRenderer** — Token SVG rendering.

## Building a Game — Minimum Requirements

### 1. Implement `IMinigameTokenData`

Expose `score()` and `game_over()` keyed by token ID (not player address).

### 2. Register `IMINIGAME_ID` via SRC5

Enables token contract discovery.

### 3. Register with the game Registry

For platform visibility.

### 4. Call `pre_action` and `post_action`

Wrap all player-facing actions with these hooks.

### Token-Keyed Storage Pattern

EGS keys storage by **token ID**, not player address. This enables:
- Multiple concurrent game sessions per player
- Token transferability

Use `assert_token_ownership(token_id)` to verify caller owns the token before any action.

### Dependencies (Scarb.toml)

```toml
[dependencies]
starknet = "2.15.1"
game_components_embeddable_game_standard = { git = "https://github.com/Provable-Games/game-components", tag = "v1.1.0" }
game_components_interfaces = { git = "https://github.com/Provable-Games/game-components", tag = "v1.1.0" }
openzeppelin_introspection = { git = "https://github.com/OpenZeppelin/cairo-contracts.git", tag = "v3.0.0" }

[dev-dependencies]
snforge_std = { git = "https://github.com/foundry-rs/starknet-foundry", tag = "v0.55.0" }
```

### Minimal Game Contract

```cairo
#[starknet::contract]
mod MyGame {
    use starknet::ContractAddress;
    use game_components_embeddable_game_standard::minigame::MinigameComponent;
    use openzeppelin_introspection::src5::SRC5Component;
    use game_components_interfaces::egs::{IMinigameTokenData, IMINIGAME_ID};

    component!(path: MinigameComponent, storage: minigame, event: MinigameEvent);
    component!(path: SRC5Component, storage: src5, event: SRC5Event);

    #[abi(embed_v0)]
    impl MinigameImpl = MinigameComponent::MinigameImpl<ContractState>;
    impl MinigameInternalImpl = MinigameComponent::InternalImpl<ContractState>;

    #[storage]
    struct Storage {
        #[substorage(v0)]
        minigame: MinigameComponent::Storage,
        #[substorage(v0)]
        src5: SRC5Component::Storage,
        scores: LegacyMap<u256, u32>,
        game_overs: LegacyMap<u256, bool>,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        #[flat]
        MinigameEvent: MinigameComponent::Event,
        #[flat]
        SRC5Event: SRC5Component::Event,
    }

    #[constructor]
    fn constructor(ref self: ContractState, token_address: ContractAddress) {
        self.minigame.initializer(token_address);
        self.src5.register_interface(IMINIGAME_ID);
    }

    #[abi(embed_v0)]
    impl MinigameTokenDataImpl of IMinigameTokenData<ContractState> {
        fn score(self: @ContractState, token_id: u256) -> u32 {
            self.scores.read(token_id)
        }

        fn game_over(self: @ContractState, token_id: u256) -> bool {
            self.game_overs.read(token_id)
        }

        fn score_batch(self: @ContractState, token_ids: Span<u256>) -> Array<u32> {
            let mut scores = ArrayTrait::new();
            let mut i = 0;
            loop {
                if i >= token_ids.len() { break; }
                scores.append(self.scores.read(*token_ids.at(i)));
                i += 1;
            };
            scores
        }

        fn game_over_batch(self: @ContractState, token_ids: Span<u256>) -> Array<bool> {
            let mut results = ArrayTrait::new();
            let mut i = 0;
            loop {
                if i >= token_ids.len() { break; }
                results.append(self.game_overs.read(*token_ids.at(i)));
                i += 1;
            };
            results
        }
    }

    // Game action with pre/post hooks
    #[external(v0)]
    fn play(ref self: ContractState, token_id: u256) {
        self.minigame.assert_token_ownership(token_id);
        self.minigame.pre_action(token_id);

        // --- your game logic here ---
        let new_score = self.scores.read(token_id) + 10;
        self.scores.write(token_id, new_score);

        self.minigame.post_action(token_id);
    }
}
```

### Optional Interfaces

- `IMinigameTokenSettings` — Expose configurable game settings (difficulty, mode, etc.)
- `IMinigameTokenObjectives` — Define win conditions and objectives
- `IMinigameDetails` — Provide game metadata (name, description, image)

## Building a Platform

Platforms mint game tokens and validate results.

### Minting Tokens

Call `mint()` on MinigameToken with `MintParams`:

| Field | Description |
|-------|-------------|
| `game_address` | Target game contract |
| `player_name` | Optional display name |
| `settings_id` | Game difficulty config |
| `start` / `end` | Playability windows (seconds) |
| `objective_id` | Objective tracking |
| `context` | Platform-specific data |
| `client_url` | Custom game client URL |
| `renderer_address` | Token renderer |
| `skills_address` | AI agent skills provider |
| `to` | Token recipient address |
| `soulbound` | Transfer restriction flag |
| `paymaster` | Gas sponsorship toggle |
| `salt` | Uniqueness parameter |
| `metadata` | Game-specific bits |

### Validating Results

```cairo
// Single token
let score = token.score(token_id);
let done = token.game_over(token_id);

// Batch (gas-efficient)
let scores = token.score_batch(token_ids);
let dones = token.game_over_batch(token_ids);
```

### Callbacks (Optional)

Implement `IMetagameCallback` + register via SRC5 to receive:
- `on_game_action(token_id, score)` — every `update_game()` call
- `on_game_over(token_id, final_score)` — game completion
- `on_objective_complete(token_id)` — objective achieved

## Packed Token IDs

Token IDs encode 13 fields into a single `felt252` (251 bits):

**Low u128 (bits 0-127):**
| Bits | Field | Size | Range |
|------|-------|------|-------|
| 0-29 | `game_id` | 30 bits | ~1B games |
| 30-69 | `minted_by` | 40 bits | ~1T minters (truncated) |
| 70-99 | `settings_id` | 30 bits | ~1B settings |
| 100-124 | `start_delay` | 25 bits | ~388 days |
| 125 | `soulbound` | 1 bit | bool |
| 126 | `has_context` | 1 bit | bool |
| 127 | `paymaster` | 1 bit | bool |

**High u128 (bits 128-250):**
| Bits | Field | Size | Range |
|------|-------|------|-------|
| 128-162 | `minted_at` | 35 bits | Unix seconds until ~3058 |
| 163-187 | `end_delay` | 25 bits | ~388 days |
| 188-217 | `objective_id` | 30 bits | ~1B objectives |
| 218-227 | `tx_hash` | 10 bits | uniqueness |
| 228-237 | `salt` | 10 bits | uniqueness |
| 238-250 | `metadata` | 13 bits | game-specific |

## Frontend — denshokan-sdk

### Install

```bash
npm install @provable-games/denshokan-sdk
```

Peer deps: React >= 18.0.0, Starknet >= 9.0.0

### Vanilla TypeScript

```typescript
import { DenshokanClient } from "@provable-games/denshokan-sdk";

const client = new DenshokanClient({ chain: "mainnet" });
const games = await client.getGames();
const token = await client.getToken("0x123...");
const decoded = client.decodeTokenId("0x123...");
```

### React

```typescript
import { DenshokanProvider, useGames, useToken } from "@provable-games/denshokan-sdk/react";
```

### Data Sources

| Source | Speed | Freshness | Purpose |
|--------|-------|-----------|---------|
| REST API | Fast | Indexed | Lists, search, aggregation |
| WebSocket | Real-time | Live | Score updates, mints |
| RPC | Slower | On-chain | ERC721 methods, writes |

Fallback chain: API -> RPC -> Error. Configure with `primarySource: "api"` or `"rpc"`.

### WebSocket Subscriptions

```typescript
const { lastEvent, events, isConnected } = useScoreUpdates({
  gameIds: [1],
  bufferSize: 50,
});
```

## game-components Packages

| Package | Description |
|---------|-------------|
| `game_components_interfaces` | All trait definitions, structs, interface IDs |
| `game_components_embeddable_game_standard` | Token, Minigame, Metagame, Registry components |
| `game_components_metagame` | Leaderboard, registration, entry gating, fees, prizes |
| `game_components_economy` | Tokenomics: buyback (Ekubo TWAMM), stream token |
| `game_components_utilities` | Math, distribution, encoding, SVG rendering |
| `game_components_presets` | Ready-to-deploy contracts |

## Key Links

- Docs: https://docs.provable.games/embeddable-game-standard
- game-components: https://github.com/Provable-Games/game-components
- Denshokan: https://github.com/Provable-Games/denshokan
- denshokan-sdk: https://github.com/Provable-Games/denshokan-sdk
