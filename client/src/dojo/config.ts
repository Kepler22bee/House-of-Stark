export const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL ?? "https://api.cartridge.gg/x/starknet/sepolia";
export const TORII_URL = process.env.NEXT_PUBLIC_TORII_URL ?? "http://localhost:8080";

// From manifest_sepolia.json — deployed to Starknet Sepolia
export const COIN_TOSS_ADDRESS =
  process.env.NEXT_PUBLIC_COIN_TOSS_ADDRESS ??
  "0x1e33735d5188d75d2079345e96fe7800a47a3196ff95298f35dd07e4285869d";

// Cartridge VRF Provider — same address on mainnet, sepolia, and local Katana (with paymaster=true)
export const VRF_PROVIDER_ADDRESS =
  process.env.NEXT_PUBLIC_VRF_PROVIDER_ADDRESS ??
  "0x051fea4450da9d6aee758bdeba88b2f665bcbf549d2c61421aa724e9ac0ced8f";

// Casino contract — deployed via sozo migrate (dojo contract)
export const CASINO_ADDRESS =
  process.env.NEXT_PUBLIC_CASINO_ADDRESS ?? "0x21cc1d7a52b01cc9307218dada1babcec2eceaba22fc767160540801ebfc674";

// Fee token (ETH on Katana)
export const FEE_TOKEN_ADDRESS =
  process.env.NEXT_PUBLIC_FEE_TOKEN_ADDRESS ??
  "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7";

// Legacy burner (kept for reference, not used with Cartridge Controller)
export const BURNER_ADDRESS =
  process.env.NEXT_PUBLIC_BURNER_ADDRESS ?? "0x0";
export const BURNER_PRIVATE_KEY =
  process.env.NEXT_PUBLIC_BURNER_PRIVATE_KEY ?? "0x0";
