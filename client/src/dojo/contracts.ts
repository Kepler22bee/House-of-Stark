import type { DojoProvider } from "@dojoengine/core";
import type { Account, AccountInterface, CairoCustomEnum } from "starknet";

export function setupWorld(provider: DojoProvider) {
  const move = async (
    account: Account | AccountInterface,
    direction: CairoCustomEnum
  ) => {
    return await provider.execute(
      account,
      { contractName: "actions", entrypoint: "move", calldata: [direction] },
      "starter",
      { tip: 0 }
    );
  };

  return { actions: { move } };
}
