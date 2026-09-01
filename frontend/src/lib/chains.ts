import { defineChain } from "@reown/appkit/networks";
import { CHAIN, RPC_URL } from "./genlayerConfig";

/**
 * Uses AppKit's own `defineChain` rather than viem's: it fills in the CAIP
 * fields (`caipNetworkId`, `chainNamespace`) AppKit needs to recognise a
 * custom EVM chain as configured. Without them it does not reliably match a
 * connected wallet's chain to this network.
 */
export const genlayerStudioNetwork = defineChain({
  id: CHAIN.id,
  caipNetworkId: `eip155:${CHAIN.id}`,
  chainNamespace: "eip155",
  name: CHAIN.name,
  nativeCurrency: CHAIN.nativeCurrency,
  rpcUrls: { default: { http: [RPC_URL] } },
  blockExplorers: CHAIN.blockExplorers,
  testnet: true,
});
