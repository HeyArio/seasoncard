import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { SeasonCard } from "@/components/SeasonCard";
import { IconBolt, IconLock, IconRuler, IconCheck } from "@/components/Icons";
import { SELLER } from "@/lib/site";

const FAQ: { q: string; a: string }[] = [
  {
    q: "Is the scan really free?",
    a: "Yes. You get your season, your four-colour Season Card and your four measurements for free, with no account. The full report is an optional $9.99 purchase.",
  },
  {
    q: "Do you upload my photo?",
    a: "No. The analysis runs inside your browser on your own device. Your photo is never sent to our servers and we don't store it.",
  },
  {
    q: "How is my season worked out?",
    a: "We measure the colour of your skin, eyes and hair from the photo, correct for the light, and score four things: undertone, depth, contrast and chroma. Those scores map to one of 12 seasons. The same photo always gives the same result.",
  },
  {
    q: "How reliable is it?",
    a: "Colour depends on light, so the photo matters most. Soft daylight from a window, no filter and no strong makeup give the best reading. It's style guidance, not a verdict. If the result doesn't feel like you, retake for free, or refund the report within 7 days.",
  },
  {
    q: "What's in the $9.99 report?",
    a: "Your 36-colour palette, best neutrals, colours to avoid and why, lip, blush, eye and hair shades, gold vs silver, styling tips, an HD Season Card, a palette phone wallpaper and a printable PDF. You can add a 30-piece Capsule Wardrobe for $4.99.",
  },
  {
    q: "How do refunds work?",
    a: "Your report page has a refund button. Within 7 days of purchase, one click refunds you in full through PayPal. No forms, no questions.",
  },
  {
    q: "Who runs Season Card?",
    a: `${SELLER.legalName}, a company registered in ${SELLER.shortAddress}. Payments are handled by PayPal.`,
  },
];

const EXAMPLE_METRICS = {
  undertone: { score: 0.66, label: "Warm-neutral" as const },
  depth: { score: 0.5, label: "Medium" as const },
  contrast: { score: 0.14, label: "Low" as const },
  chroma: { score: 0.14, label: "Soft" as const },
};

export default function Home() {
  return (
    <main className="page">
      <SiteHeader right={<Link href="/scan" className="header-link">Free scan</Link>} />

      <section className="hero">
        <span className="eyebrow">Personal colour analysis</span>
        <h1>Find the colours that make your face glow.</h1>
        <p className="lede">One selfie by a window. Your colour season, measured in seconds.</p>
        <div className="hero-cta">
          <Link href="/scan" className="btn btn-primary btn-block">Take the free scan</Link>
          <p className="fineprint">Full report $9.99 · 7-day refund, one click</p>
        </div>
      </section>

      <section className="section" aria-label="Example result">
        <SeasonCard
          name="Soft Autumn"
          tagline="Warm, soft, medium depth."
          swatches={["#B5705A", "#8A8F5E", "#C9A27E", "#5F7F82"]}
          metrics={EXAMPLE_METRICS}
          badge={<span className="chip">Example</span>}
        />
      </section>

      <section className="section">
        <div className="trust">
          <div className="card card-flat trust-item">
            <div className="trust-icon"><IconRuler /></div>
            <div>
              <h3>Measured, not guessed</h3>
              <p className="muted small">We measure your skin, eyes and hair. Same photo, same result.</p>
            </div>
          </div>
          <div className="card card-flat trust-item">
            <div className="trust-icon"><IconBolt /></div>
            <div>
              <h3>Instant</h3>
              <p className="muted small">Your season appears in seconds. No account, no waiting.</p>
            </div>
          </div>
          <div className="card card-flat trust-item">
            <div className="trust-icon"><IconLock /></div>
            <div>
              <h3>Private</h3>
              <p className="muted small">The scan runs on your device. Your photo is never uploaded.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <h2 className="section-title">How it works</h2>
        <ol className="steps">
          <li><div><strong>Stand by a window.</strong> <span className="muted">Daylight on your face, no filter.</span></div></li>
          <li><div><strong>Take one selfie.</strong> <span className="muted">Or upload a photo you already have.</span></div></li>
          <li><div><strong>Get your free Season Card.</strong> <span className="muted">Share it, or unlock the full report.</span></div></li>
        </ol>
      </section>

      <section className="section">
        <div className="card card-lg">
          <h2 className="section-title">The full report</h2>
          <ul className="tips-list">
            {[
              "Your 36-colour palette",
              "Best neutrals, and colours to avoid (with why)",
              "Lip, blush, eye and hair shades",
              "Gold or silver",
              "Styling tips for your season",
              "HD Season Card, phone wallpaper and PDF",
              "Optional 30-piece Capsule Wardrobe (+$4.99)",
            ].map((t) => (
              <li key={t}><IconCheck width={20} height={20} />{t}</li>
            ))}
          </ul>
          <div style={{ marginTop: 20 }}>
            <Link href="/scan" className="btn btn-primary btn-block">Take the free scan</Link>
          </div>
        </div>
      </section>

      <section className="section faq" id="faq">
        <h2 className="section-title">Questions</h2>
        {FAQ.map((f) => (
          <details key={f.q}>
            <summary>{f.q}</summary>
            <p>{f.a}</p>
          </details>
        ))}
      </section>

      <SiteFooter />
    </main>
  );
}
