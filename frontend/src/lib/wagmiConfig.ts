import { cookieStorage, createStorage } from "wagmi";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import type { AppKitNetwork } from "@reown/appkit/networks";
import { genlayerStudioNetwork } from "./chains";

export const REOWN_PROJECT_ID = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID ?? "";

export const networks: [AppKitNetwork, ...AppKitNetwork[]] = [genlayerStudioNetwork];

export const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({ storage: cookieStorage }),
  ssr: true,
  projectId: REOWN_PROJECT_ID,
  networks,
});

export const wagmiConfig = wagmiAdapter.wagmiConfig;
