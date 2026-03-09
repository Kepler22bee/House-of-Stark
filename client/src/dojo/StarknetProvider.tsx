"use client";
import type { PropsWithChildren } from "react";
import { sepolia } from "@starknet-react/chains";
import {
  StarknetConfig,
  jsonRpcProvider,
  cartridge,
} from "@starknet-react/core";
import { ControllerConnector } from "@cartridge/connector";
import type { Chain } from "@starknet-react/chains";
import {
  CASINO_ADDRESS,
  FEE_TOKEN_ADDRESS,
  VRF_PROVIDER_ADDRESS,
  COIN_TOSS_ADDRESS,
} from "./config";

// Session policies — allow the controller to auto-approve these calls
const policies = {
  contracts: {
    [FEE_TOKEN_ADDRESS]: {
      methods: [
        {
          name: "approve",
          entrypoint: "approve",
        },
      ],
    },
    [CASINO_ADDRESS]: {
      methods: [
        { name: "place_bet", entrypoint: "place_bet" },
        { name: "settle", entrypoint: "settle" },
      ],
    },
    [COIN_TOSS_ADDRESS]: {
      methods: [
        { name: "flip", entrypoint: "flip" },
      ],
    },
    [VRF_PROVIDER_ADDRESS]: {
      methods: [
        { name: "request_random", entrypoint: "request_random" },
      ],
    },
  },
};

// Must be created outside React components
const connector = new ControllerConnector({
  policies,
  url: "https://api.cartridge.gg/x/starknet/sepolia",
});

const provider = jsonRpcProvider({
  rpc: (_chain: Chain) => {
    return { nodeUrl: "https://api.cartridge.gg/x/starknet/sepolia" };
  },
});

export default function StarknetProvider({ children }: PropsWithChildren) {
  return (
    <StarknetConfig
      autoConnect
      defaultChainId={sepolia.id}
      chains={[sepolia]}
      provider={provider}
      connectors={[connector]}
      explorer={cartridge}
    >
      {children}
    </StarknetConfig>
  );
}
