/**
 * Every destination in the app. This list is the *only* place any of them
 * is reachable from the header, at every breakpoint including desktop — the
 * header itself carries just the mark and the wallet, so there is one
 * consistent place to find everything rather than a top-level link and a
 * menu entry that have to be kept in sync. The footer reads the same list.
 */
export const MENU_LINKS = [
  { href: "/products", label: "Products" },
  { href: "/claims", label: "Claims" },
  { href: "/underwrite", label: "Underwrite" },
  { href: "/how-it-works", label: "How it works" },
];
