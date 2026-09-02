"use client";

import Link from "next/link";
import { Mark } from "./Logo";
import WalletButton from "./WalletButton";
import { NavMenu } from "./NavMenu";
import { useScrolled } from "@/lib/useScrolled";

/**
 * Permanently fixed, transparent over the masthead and solid once the page
 * has scrolled. No border in either state, so it reads as floating over one
 * continuous surface rather than sitting on top of it.
 *
 * The header carries only the mark and the wallet. Every destination lives
 * in NavMenu's MENU_LINKS at every breakpoint, desktop included — one
 * consistent place to find everything, rather than a top-level link and a
 * menu entry for the same page that have to be kept in sync.
 */
export function Header() {
  const scrolled = useScrolled();
  const dark = !scrolled;

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 transition-colors duration-300 ${
        scrolled ? "bg-ink/90 backdrop-blur" : "bg-transparent"
      }`}
    >
      <div className="max-w-6xl mx-auto px-5 sm:px-8 h-[76px] flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Mark size={30} />
          <span
            className={`text-lg sm:text-2xl font-semibold tracking-tight truncate ${
              dark ? "text-white" : "text-slate-100"
            }`}
          >
            GenShield
          </span>
        </Link>

        <nav className="flex items-center gap-4 sm:gap-6 shrink-0">
          <WalletButton />
          <NavMenu dark={dark} />
        </nav>
      </div>
    </header>
  );
}
