"use client";
import type { PropsWithChildren } from "react";
import { RPC_URL } from "./config";

// For local dev we bypass starknet-react entirely and use burner accounts directly.
// This wrapper just passes children through.
// For Sepolia/production, see SEPOLIA_DEPLOY.md for the full StarknetConfig setup.
export default function StarknetProvider({ children }: PropsWithChildren) {
  return <>{children}</>;
}

export { RPC_URL };
