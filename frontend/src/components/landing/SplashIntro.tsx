"use client";

import { useEffect, useState } from "react";
import { Mark } from "@/components/Logo";

const SESSION_KEY = "genshield-splash-seen";

/**
 * A once-per-session intro, gated by sessionStorage so it plays on first
 * landing and never again for the rest of that browser session — coming
 * back to "/" from the claims list doesn't replay it.
 *
 * Two distinct motion beats rather than one shared fade: the mark enters
 * large (blur, rotation and scale settling into place), the line follows it
 * in, and on the way out the mark leaves first — scaling past full size and
 * blurring away — before the backdrop dims behind it.
 */
export function SplashIntro() {
  const [visible, setVisible] = useState(false);
  const [lineVisible, setLineVisible] = useState(false);
  const [markExiting, setMarkExiting] = useState(false);
  const [backdropExiting, setBackdropExiting] = useState(false);

  useEffect(() => {
    let alreadySeen = true;
    try {
      alreadySeen = sessionStorage.getItem(SESSION_KEY) === "1";
    } catch {
      alreadySeen = true; // storage unavailable — skip rather than risk a stuck overlay
    }
    if (alreadySeen) return;

    try {
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      // ignore — worst case it plays again next load
    }

    const timers = [
      window.setTimeout(() => setVisible(true), 0),
      window.setTimeout(() => setLineVisible(true), 900),
      window.setTimeout(() => setMarkExiting(true), 2000),
      window.setTimeout(() => setBackdropExiting(true), 2450),
      window.setTimeout(() => setVisible(false), 3150),
    ];
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center gap-8 bg-[radial-gradient(120%_90%_at_50%_0%,_var(--ink-blue)_0%,_var(--ink-deep)_45%,_var(--ink)_100%)] transition-opacity duration-700 ${
        backdropExiting ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      aria-hidden="true"
    >
      <div className={markExiting ? "animate-splash-mark-out" : "animate-splash-mark-in"}>
        <Mark size={220} />
      </div>
      <p
        className={`font-doc text-white/70 text-lg sm:text-xl tracking-wide transition-opacity duration-500 ${
          lineVisible && !markExiting ? "opacity-100" : "opacity-0"
        }`}
      >
        &ldquo;The wording is the settlement logic.&rdquo;
      </p>
    </div>
  );
}
