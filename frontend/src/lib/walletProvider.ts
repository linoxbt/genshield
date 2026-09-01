import { getAccount } from "@wagmi/core";
import { wagmiConfig } from "./wagmiConfig";

export type EIP1193Provider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

/**
 * genlayer-js write calls need an explicit `account` as well as a provider:
 * passing only a provider leaves it with no sender to sign with.
 */
export async function connectedSigner(): Promise<{
  provider: EIP1193Provider;
  account: `0x${string}`;
}> {
  const account = getAccount(wagmiConfig);
  if (!account.isConnected || !account.connector || !account.address) {
    throw new Error("Connect a wallet first.");
  }
  const provider = (await account.connector.getProvider()) as EIP1193Provider;
  return { provider, account: account.address };
}

export function connectedAddress(): `0x${string}` | undefined {
  return getAccount(wagmiConfig).address;
}
