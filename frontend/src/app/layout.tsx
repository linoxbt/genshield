import type { Metadata } from "next";
import "./globals.css";
import AppKitProvider from "@/components/AppKitProvider";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "GenShield — cover settled on policy wording",
  description:
    "DeFi insurance where the policy wording is the settlement logic. The contract fetches its own evidence and adjudicates under GenLayer consensus. No oracle adapter, no resolver key.",
  icons: { icon: "/icon.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col antialiased">
        <AppKitProvider>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </AppKitProvider>
      </body>
    </html>
  );
}
