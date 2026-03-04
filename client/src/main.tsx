import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { init } from "@dojoengine/sdk";
import { DojoSdkProvider } from "@dojoengine/sdk/react";
import { dojoConfig, TORII_URL } from "./dojo/config";
import { type SchemaType } from "./dojo/models";
import { setupWorld } from "./dojo/contracts";
import StarknetProvider from "./starknet-provider";
import App from "./App";

async function main() {
  const sdk = await init<SchemaType>({
    client: {
      worldAddress: dojoConfig.manifest.world.address,
      toriiUrl: TORII_URL,
    },
    domain: {
      name: "starter",
      version: "1.0",
      chainId: "KATANA",
      revision: "1",
    },
  });

  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <DojoSdkProvider
        sdk={sdk}
        dojoConfig={dojoConfig}
        clientFn={setupWorld}
      >
        <StarknetProvider>
          <App />
        </StarknetProvider>
      </DojoSdkProvider>
    </StrictMode>
  );
}

main();
