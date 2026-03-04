import type { PropsWithChildren } from "react";
import { usePredeployedAccounts } from "@dojoengine/predeployed-connector/react";
import { mainnet } from "@starknet-react/chains";
import { jsonRpcProvider, StarknetConfig, voyager } from "@starknet-react/core";
import { RPC_URL } from "./dojo/config";

export default function StarknetProvider({ children }: PropsWithChildren) {
  const { connectors } = usePredeployedAccounts({
    rpc: RPC_URL,
    id: "katana",
    name: "Katana",
  });
  const visibleConnectors = connectors.slice(0, 1);

  const provider = jsonRpcProvider({
    rpc: () => ({ nodeUrl: RPC_URL }),
  });

  return (
    <StarknetConfig
      chains={[mainnet]}
      provider={provider}
      connectors={visibleConnectors}
      explorer={voyager}
      autoConnect
    >
      {children}
    </StarknetConfig>
  );
}
