import { createDojoConfig } from "@dojoengine/core";
import manifest from "./manifest_dev.json";

export const dojoConfig = createDojoConfig({ manifest });

export const RPC_URL =
  import.meta.env.VITE_RPC_URL ?? dojoConfig.rpcUrl;

export const TORII_URL =
  import.meta.env.VITE_TORII_URL ?? dojoConfig.toriiUrl;
