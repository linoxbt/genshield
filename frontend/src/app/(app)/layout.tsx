/**
 * Everything except the landing page renders inside a fixed-width column.
 * The landing page is full-bleed by design, so it sits outside this group
 * rather than fighting a container it would have to break out of.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-6xl px-6 pt-[100px] pb-8">{children}</div>;
}
