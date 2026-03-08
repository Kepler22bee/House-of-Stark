export const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL ?? "http://localhost:5050";
export const TORII_URL = process.env.NEXT_PUBLIC_TORII_URL ?? "http://localhost:8080";

// From manifest_dev.json — update after each sozo migrate
export const COIN_TOSS_ADDRESS =
  process.env.NEXT_PUBLIC_COIN_TOSS_ADDRESS ??
  "0x4c622d07d621394e2238c075abbeecb5d0ae16174a843b08e268383b590538";

// Cartridge VRF Provider — same address on mainnet, sepolia, and local Katana (with paymaster=true)
export const VRF_PROVIDER_ADDRESS =
  process.env.NEXT_PUBLIC_VRF_PROVIDER_ADDRESS ??
  "0x051fea4450da9d6aee758bdeba88b2f665bcbf549d2c61421aa724e9ac0ced8f";

// Casino contract — deployed via sozo migrate (dojo contract)
export const CASINO_ADDRESS =
  process.env.NEXT_PUBLIC_CASINO_ADDRESS ?? "0x0";

// Fee token (ETH on Katana)
export const FEE_TOKEN_ADDRESS =
  process.env.NEXT_PUBLIC_FEE_TOKEN_ADDRESS ??
  "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7";
