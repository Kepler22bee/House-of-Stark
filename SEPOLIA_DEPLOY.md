# Sepolia Deployment Guide

## Current Blocker

`sozo migrate` fails with **"Mismatch compiled class hash"** when declaring classes on Sepolia.
The local CASM compiler (Cairo 2.13.1 / scarb 2.13.1 / sozo 1.8.0) is out of sync with the Sepolia sequencer's expected CASM compiler.

sozo 1.8.6 still bundles Cairo 2.13.1 — same compiler, same mismatch. The fix likely requires a newer Cairo version or a sozo flag to skip local CASM computation.

## What Needs to Change

### 1. Upgrade sozo + Cairo compiler

Current: `sozo 1.8.6` (scarb 2.13.1, cairo 2.13.1, sierra 1.7.0)
Needed: A version where the CASM compiler matches the Sepolia sequencer.

sozo 1.8.6 was installed via asdf (required patching the asdf sozo plugin — see below).
The CASM mismatch persists, meaning a Cairo compiler upgrade beyond 2.13.1 is needed.

**asdf sozo plugin patch** (applied to `~/.asdf/plugins/sozo/lib/utils.bash`):
- `download_release()`: handle `sozo/v*` tag format in URL
- `get_binary_name()`: use `sozo_` prefix instead of `dojo_` for sozo-only releases

### 2. Verify scarb compatibility

After finding the right sozo/Cairo version, check if Scarb.toml needs updates:
- `cairo-version` field
- `starknet` dependency version
- `dojo` dependency version
- `cairo_test` / `dojo_snf_test` / `snforge_std` dev-dependency versions

### 3. Deploy to Sepolia

Already created:
- **Sepolia account**: `0x07b969fcbc4f02f0058651afb28eefa5b09bb6fa0498f1de5463d1e0af8f633d`
- **Funded with**: 100 STRK
- **Account deployed**: tx `0x1d99778f326a0b3f3cc873a5d8ed6d8690b11fe5862b1a8d12f675d0476c5b4`
- **sncast account name**: `sepolia_deployer`
- **Dojo profile**: `casino_contracts/dojo_sepolia.toml`
- **Scarb profile**: `[profile.sepolia]` in `casino_contracts/Scarb.toml`
- **World deployed** (empty, no contracts yet): `0x02a230724e23980f9cfb20011301f8b1c50d8dbef2543f8150d5f89617bb57d4`

After upgrading sozo, run:
```bash
cd casino_contracts
scarb clean
sozo build --profile sepolia
sozo migrate --profile sepolia
```

### 4. Declare & deploy EGS token contracts (post-migrate)

Same flow as `dev.sh` but using Sepolia RPC and `sepolia_deployer` account:

```bash
RPC_URL="https://api.cartridge.gg/x/starknet/sepolia"
SNCAST_ACCOUNT=sepolia_deployer
DEPLOYER_ADDRESS="0x07b969fcbc4f02f0058651afb28eefa5b09bb6fa0498f1de5463d1e0af8f633d"
VRF_PROVIDER_ADDRESS="0x051fea4450da9d6aee758bdeba88b2f665bcbf549d2c61421aa724e9ac0ced8f"
FEE_TOKEN_ADDRESS="0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7"

# Declare MinigameRegistryContract & FullTokenContract
# Deploy via UDC
# Initialize coin_toss, casino (same calldata as dev.sh)
```

### 5. Update client config

After deployment, update `client/.env.local` or `client/src/dojo/config.ts` with:
- `NEXT_PUBLIC_RPC_URL=https://api.cartridge.gg/x/starknet/sepolia`
- `NEXT_PUBLIC_COIN_TOSS_ADDRESS=<from manifest_sepolia.json>`
- `NEXT_PUBLIC_CASINO_ADDRESS=<from manifest_sepolia.json>`
- Other contract addresses from the deployment

Already done in `StarknetProvider.tsx`:
- Chain switched from custom katana to `sepolia` from `@starknet-react/chains`
- Cartridge Controller `defaultChainId` set to `0x534e5f5345504f4c4941` (SN_SEPOLIA)
- RPC URL reads from config (defaults to Sepolia)

## Files Modified So Far

| File | Change |
|------|--------|
| `casino_contracts/Scarb.toml` | Added `[profile.sepolia]` |
| `casino_contracts/dojo_sepolia.toml` | New — Sepolia dojo profile with account/RPC |
| `client/src/dojo/config.ts` | RPC default → Cartridge Sepolia RPC |
| `client/src/dojo/StarknetProvider.tsx` | Chain → sepolia, defaultChainId → SN_SEPOLIA |
