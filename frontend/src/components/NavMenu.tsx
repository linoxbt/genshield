"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MENU_LINKS } from "@/lib/navLinks";
import { Mark } from "./Logo";

/**
 * The menu glyph is not three equal bars: the middle bar runs near full
 * width while the top and bottom are shorter and centred, which gives it a
 * tapered silhouette rather than the usual stack. `dark` recolours the
 * closed-state glyph for when it floats over a dark masthead — the open
 * panel is always dark regardless.
 */
function MenuGlyph({ open, dark }: { open: boolean; dark: boolean }) {
  const barClass = dark ? "fill-white" : "fill-slate-100";
  const lineClass = dark ? "stroke-white" : "stroke-slate-100";
  return (
    <span className="relative block w-[18px] h-[14px]" aria-hidden="true">
      <svg
        viewBox="0 0 22 16"
        className={`absolute inset-0 size-full transition-all duration-300 ${
          open ? "opacity-0 scale-75" : "opacity-100 scale-100"
        }`}
      >
        <rect x="5.33" y="0" width="10.67" height="2.67" rx="1.33" className={barClass} />
        <rect x="1.33" y="6.67" width="18.67" height="2.67" rx="1.33" className={barClass} />
        <rect x="5.33" y="13.33" width="10.67" height="2.67" rx="1.33" className={barClass} />
      </svg>
      <svg
        viewBox="0 0 16 16"
        className={`absolute inset-0 m-auto size-4 transition-all duration-300 ${
          open ? "opacity-100 scale-100" : "opacity-0 scale-75"
        }`}
      >
        <line x1="1" y1="1" x2="15" y2="15" strokeWidth="2" strokeLinecap="round" className={lineClass} />
        <line x1="15" y1="1" x2="1" y2="15" strokeWidth="2" strokeLinecap="round" className={lineClass} />
      </svg>
    </span>
  );
}

/**
 * Toggle plus a full-viewport takeover panel. The panel is glass — a
 * translucent dark fill over a heavy backdrop-blur — so the page behind it
 * reads as a blurred wash rather than disappearing, while the panel's own
 * content stays sharp and centred on both axes.
 *
 * The overlay is portaled to `document.body` rather than rendered inline
 * inside `<header>`. The header's light state uses `backdrop-blur`, and per
 * the CSS spec a `backdrop-filter` ancestor establishes a containing block
 * for `position: fixed` descendants exactly as `transform` does. Since the
 * header shrink-wraps to its 76px bar, an inline overlay's `fixed inset-0`
 * would resolve against that 76px box instead of the viewport. Portaling
 * escapes the ancestor entirely.
 */
export function NavMenu({ dark = false }: { dark?: boolean }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    // `document.body` doesn't exist during SSR, and the server markup must
    // match the client's first render exactly, so the portal only mounts one
    // render later, once this confirms we're on the client.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => setOpen(false), 0);
    return () => window.clearTimeout(t);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    // `overflow: hidden` locks scrolling but never resets the existing scroll
    // offset, which leaves this fixed panel reading as pinned near the top of
    // the *document* rather than centred in the *visible* viewport on a page
    // the user had already scrolled. Pinning body itself at a negative offset
    // removes the ambiguity, and restoring scrollTo on close puts them back
    // exactly where they were.
    const scrollY = window.scrollY;
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      window.scrollTo(0, scrollY);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        className={`flex items-center justify-center size-10 rounded-full border transition-colors shrink-0 ${
          dark ? "border-white/30 hover:border-white" : "border-ink-line hover:border-slate-300"
        }`}
      >
        <MenuGlyph open={open} dark={dark} />
      </button>

      {mounted &&
        createPortal(
          <div
            className={`fixed inset-0 z-50 bg-ink-deep/85 backdrop-blur-2xl transition-opacity duration-300 ${
              open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
            }`}
            aria-hidden={!open}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              tabIndex={open ? 0 : -1}
              className="absolute top-0 right-0 px-5 sm:px-8 h-[76px] flex items-center"
            >
              <span className="flex items-center justify-center size-10 rounded-full border border-white/30 hover:border-white transition-colors">
                <MenuGlyph open dark />
              </span>
            </button>

            <div className="h-full flex flex-col items-center justify-center gap-10 sm:gap-14 px-6">
              <div
                className={`flex items-center gap-3 ${open ? "animate-fade-rise" : ""}`}
                style={open ? { animationFillMode: "backwards" } : undefined}
              >
                <Mark size={36} />
                <span className="text-2xl font-semibold text-white tracking-tight">GenShield</span>
              </div>

              <nav className="flex flex-col items-center gap-1 sm:gap-2">
                {MENU_LINKS.map((item, i) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    tabIndex={open ? 0 : -1}
                    onClick={() => setOpen(false)}
                    className={`font-doc text-4xl sm:text-6xl text-white hover:text-signal-cool transition-colors ${
                      open ? "animate-fade-rise" : ""
                    }`}
                    style={
                      open
                        ? { animationDelay: `${(i + 1) * 60}ms`, animationFillMode: "backwards" }
                        : undefined
                    }
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
