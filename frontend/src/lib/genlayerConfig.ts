import { chains } from "genlayer-js";
import type { Address } from "genlayer-js/types";

/**
 * GenShield lives on Studio Network only, so there is no network switcher -
 * one chain, one contract address, configured at build time.
 *
 * Next's bundler only inlines `process.env.NEXT_PUBLIC_*` when it sees a
 * literal member access; a dynamic lookup is invisible to it and silently
 * resolves to undefined in the browser. Reference each var literally.
 */
export const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_GENSHIELD_ADDRESS_STUDIO ||
  "") as Address | "";

export const RPC_URL =
  process.env.NEXT_PUBLIC_GENLAYER_RPC_URL_STUDIO || chains.studionet.rpcUrls.default.http[0];

export const CHAIN = chains.studionet;

/**
 * Not `chains.studionet.blockExplorers.default.url`. That value points at a
 * host that currently returns 503; the Studio explorer actually serving this
 * network is the one below (verified by request, not assumed).
 */
export const EXPLORER_URL = "https://explorer-studio.genlayer.com";

export function isConfigured(): boolean {
  return Boolean(CONTRACT_ADDRESS);
}

export function requireAddress(): Address {
  if (!CONTRACT_ADDRESS) {
    throw new Error(
      "No GenShield contract configured. Set NEXT_PUBLIC_GENSHIELD_ADDRESS_STUDIO."
    );
  }
  return CONTRACT_ADDRESS as Address;
}
