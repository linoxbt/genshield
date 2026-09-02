import Link from "next/link";
import { SplashIntro } from "@/components/landing/SplashIntro";
import { Hero } from "@/components/landing/Hero";
import { ConsensusReveal } from "@/components/landing/ConsensusReveal";
import { RoundsSequence } from "@/components/landing/RoundsSequence";
import { ProductSequence } from "@/components/landing/ProductSequence";
import { LiveStatBar } from "@/components/landing/LiveStatBar";

const STEPS = [
  "The holder files, citing reporting from hosts the underwriter fixed in advance and any transaction hashes on the insured chain.",
  "The contract pulls those receipts itself and freezes a canonical snapshot onto the claim.",
  "Validators read the wording against the evidence, independently. Agreement needs the same verdict and the same severity decile.",
  "Settlement is arithmetic: the agreed decile's midpoint, capped by the sum insured and by what the pool holds.",
];

export default function Home() {
  return (
    <>
      <SplashIntro />
      <Hero />
      <ConsensusReveal />
      <RoundsSequence />
      <ProductSequence />

      <section  className="bg-ink-deep">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-16 sm:py-24">
          <div className="grid lg:grid-cols-[1fr_1.4fr] gap-x-12 gap-y-8 items-start">
            <div>
              <span className="font-mono text-xs uppercase tracking-wider text-signal-cool block mb-2">
                A claim, end to end
              </span>
              <h2 className="font-doc text-white text-2xl sm:text-3xl max-w-xs">
                Four steps, none of them a decision anyone makes.
              </h2>
            </div>
            <ol className="grid sm:grid-cols-2 gap-4">
              {STEPS.map((text, i) => (
                <li key={text} className="border border-ink-line p-4">
                  <span className="font-mono text-xs text-signal-cool">{i + 1}</span>
                  <p className="text-[13px] mt-2 text-white/60 leading-relaxed">{text}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <LiveStatBar />

      <section  className="bg-ink">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-14 sm:py-20 flex flex-wrap items-center justify-between gap-6">
          <h2 className="font-doc text-white text-2xl sm:text-3xl max-w-md">
            Read a wording. Decide whether it would pay you.
          </h2>
          <Link
            href="/products"
            className="font-mono text-xs uppercase tracking-wider rounded-lg px-5 py-3 bg-signal-cool text-ink hover:opacity-90 transition-opacity shrink-0"
          >
            Browse products →
          </Link>
        </div>
      </section>
    </>
  );
}
