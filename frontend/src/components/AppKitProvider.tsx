"use client";

import { createAppKit } from "@reown/appkit/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { WagmiProvider } from "wagmi";
import { REOWN_PROJECT_ID, networks, wagmiAdapter } from "@/lib/wagmiConfig";

if (REOWN_PROJECT_ID) {
  createAppKit({
    adapters: [wagmiAdapter],
    networks,
    defaultNetwork: networks[0],
    projectId: REOWN_PROJECT_ID,
    metadata: {
      name: "GenShield",
      description: "DeFi cover settled on policy wording, adjudicated by GenLayer consensus.",
      url: "https://genshield-728.netlify.app",
      icons: ["https://genshield-728.netlify.app/icon.svg"],
    },
    features: { analytics: false, email: false, socials: [] },
  });
}

export default function AppKitProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
