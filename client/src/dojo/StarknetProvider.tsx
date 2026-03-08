"use client";
import type { PropsWithChildren } from "react";
import { useState, useEffect } from "react";
import { Chain } from "@starknet-react/chains";
import { jsonRpcProvider, StarknetConfig, cartridge } from "@starknet-react/core";
import type { Connector } from "@starknet-react/core";
import { RPC_URL, COIN_TOSS_ADDRESS, VRF_PROVIDER_ADDRESS, CASINO_ADDRESS, FEE_TOKEN_ADDRESS } from "./config";

const KATANA_CHAIN_ID = "0x4b4154414e41";

const katana: Chain = {
  id: BigInt(KATANA_CHAIN_ID),
  name: "Katana",
  network: "katana",
  testnet: true,
  nativeCurrency: {
    address: "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
    name: "Stark",
    symbol: "STRK",
    decimals: 18,
  },
  rpcUrls: {
    default: { http: [RPC_URL] },
    public: { http: [RPC_URL] },
  },
  paymasterRpcUrls: {
    avnu: { http: [RPC_URL] },
  },
};

const provider = jsonRpcProvider({
  rpc: () => ({ nodeUrl: RPC_URL }),
});

export default function StarknetProvider({ children }: PropsWithChildren) {
  const [connectors, setConnectors] = useState<Connector[]>([]);

  useEffect(() => {
    // Only import ControllerConnector on the client to avoid SSR issues
    import("@cartridge/connector").then(({ ControllerConnector }) => {
      const connector = new ControllerConnector({
        chains: [{ rpcUrl: RPC_URL }],
        defaultChainId: KATANA_CHAIN_ID,
        signupOptions: ["google", "discord", "webauthn"],
        policies: {
          contracts: {
            [COIN_TOSS_ADDRESS]: {
              methods: [
                {
                  name: "Flip Coin",
                  entrypoint: "flip",
                  description: "Flip the coin - heads or tails",
                },
              ],
            },
            [VRF_PROVIDER_ADDRESS]: {
              methods: [
                {
                  name: "Request Random",
                  entrypoint: "request_random",
                  description: "Request VRF randomness for coin toss",
                },
              ],
            },
            [CASINO_ADDRESS]: {
              methods: [
                {
                  name: "Place Bet",
                  entrypoint: "place_bet",
                  description: "Place a bet on coin toss",
                },
                {
                  name: "Settle Bet",
                  entrypoint: "settle",
                  description: "Settle the bet and collect winnings",
                },
              ],
            },
            [FEE_TOKEN_ADDRESS]: {
              methods: [
                {
                  name: "Approve",
                  entrypoint: "approve",
                  description: "Approve token spending for bets",
                },
              ],
            },
          },
        },
      });
      setConnectors([connector as unknown as Connector]);
    });
  }, []);

  return (
    <StarknetConfig
      chains={[katana]}
      provider={provider}
      connectors={connectors}
      explorer={cartridge}
      defaultChainId={katana.id}
      autoConnect
    >
      {children}
    </StarknetConfig>
  );
}
