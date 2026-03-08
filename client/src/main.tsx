// -- Entry Point --
// Dojo SDK disabled — casino-only mode.

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
// import { init } from "@dojoengine/sdk";
// import { DojoSdkProvider } from "@dojoengine/sdk/react";
// import { predeployedAccounts } from "@dojoengine/predeployed-connector";
// import { dojoConfig, RPC_URL, TORII_URL } from "./dojo/config";
// import { type SchemaType } from "./dojo/models";
// import { setupWorld } from "./dojo/contracts";
// import StarknetProvider from "./starknet";
// import App from "./App";
import Casino from "./Casino";

// const isE2E = import.meta.env.VITE_E2E_TEST === "true";

// async function main() {
//   const sdk = await init<SchemaType>({
//     client: {
//       worldAddress: dojoConfig.manifest.world.address,
//       toriiUrl: TORII_URL,
//     },
//     domain: {
//       name: "starter",
//       version: "1.0",
//       chainId: "KATANA",
//       revision: "1",
//     },
//   });
//
//   const e2eConnectors = isE2E
//     ? await predeployedAccounts({ id: "katana", name: "Katana", rpc: RPC_URL })
//     : undefined;
//
//   createRoot(document.getElementById("root")!).render(
//     <StrictMode>
//       <DojoSdkProvider
//         sdk={sdk}
//         dojoConfig={dojoConfig}
//         clientFn={setupWorld}
//       >
//         <StarknetProvider connectors={e2eConnectors}>
//           <App />
//         </StarknetProvider>
//       </DojoSdkProvider>
//     </StrictMode>
//   );
// }
//
// main();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Casino onClose={() => window.location.reload()} />
  </StrictMode>
);
