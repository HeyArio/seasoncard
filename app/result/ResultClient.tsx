"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { loadResult, lastReport } from "@/lib/result-store";
import type { StoredResult } from "@/lib/schemas";
import { getSeason, seasonName } from "@/lib/seasons";
import { SeasonCard } from "@/components/SeasonCard";
import { ShareButtons } from "@/components/ShareButtons";
import { IconLock } from "@/components/Icons";

const LOCKED = [
  "Your 36-colour palette",
  "Best neutrals for everyday",
  "Colours to avoid, and why",
  "Lip, blush, eye and hair shades",
  "Gold or silver",
  "Celebrities often typed as your season",
  "Styling tips",
  "HD card, phone wallpaper and PDF",
];

export default function ResultClient() {
  const [result, setResult] = useState<StoredResult | null | undefined>(undefined);
  const [report, setReport] = useState<string | null>(null);

  useEffect(() => {
    setResult(loadResult());
    setReport(lastReport());
  }, []);

  if (result === undefined) return <div style={{ minHeight: "60vh" }} aria-busy="true" />;

  if (result === null) {
    return (
      <div className="card card-lg center" style={{ marginTop: 24 }}>
        <h1 style={{ fontSize: "1.9rem" }}>No scan yet</h1>
        <p className="muted" style={{ marginTop: 10 }}>Your result lives only in this browser tab. Take the free scan to see your season.</p>
        <Link href="/scan" className="btn btn-primary btn-block" style={{ marginTop: 20 }}>Take the free scan</Link>
        {report ? <Link href={report} className="btn btn-quiet" style={{ marginTop: 8 }}>Open my full report</Link> : null}
      </div>
    );
  }

  const { season, complete } = getSeason(result.season);
  // Preview six colourful shades spread across the palette (the first rows are neutrals).
  const PEEK_AT = [6, 11, 16, 21, 26, 31];
  const peek = complete ? PEEK_AT.map((i) => season.palette[i]).filter(Boolean) : [];
  const hidden = complete ? season.palette.filter((_, i) => !PEEK_AT.includes(i)) : [];
  const avoid = complete ? season.avoid[0] : undefined;
  const name = season.name || seasonName(result.season);

  return (
    <div>
      <p className="eyebrow" style={{ marginTop: 12 }}>Your result</p>
      <h1 style={{ marginTop: 8 }}>You&apos;re a {name}.</h1>
      {season.description ? <p className="muted" style={{ marginTop: 12 }}>{season.description}</p> : null}

      <div className="section" style={{ marginTop: 24 }}>
        <SeasonCard name={name} tagline={season.tagline} swatches={season.cardSwatches} metrics={result.metrics} />
      </div>

      <div style={{ marginTop: 14 }}>
        <ShareButtons
          fileBase={`season-card-${result.season}`}
          card={{ seasonName: name, tagline: season.tagline, swatches: season.cardSwatches, metrics: result.metrics }}
        />
      </div>

      <section className="section">
        <div className="card card-lg">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
            <h2>Your full report</h2>
            <span className="price-tag">$9.99</span>
          </div>
          {peek.length > 0 ? (
            <div className="peek" aria-label="Preview of your full report">
              <p className="small muted">A peek at your {season.palette.length}-colour palette</p>
              <div className="peek-grid">
                {peek.map((c) => (
                  <div key={c.hex} className="peek-cell">
                    <span className="peek-swatch" style={{ background: c.hex }} />
                    <span className="peek-name">{c.name}</span>
                  </div>
                ))}
              </div>
              {hidden.length > 0 ? (
                <div className="peek-hidden" aria-hidden="true">
                  {hidden.map((c, i) => (
                    <span key={`${c.hex}-${i}`} className="peek-dot" style={{ background: c.hex }} />
                  ))}
                  <span className="peek-more"><IconLock width={16} height={16} /> +{hidden.length} more in your report</span>
                </div>
              ) : null}
              {avoid ? (
                <p className="peek-avoid small">
                  <span className="peek-dot peek-dot-inline" style={{ background: avoid.hex }} />
                  <span><strong>One to skip: {avoid.name}.</strong> {avoid.why}</span>
                </p>
              ) : null}
            </div>
          ) : null}
          <ul className="locked-list" style={{ marginTop: 12 }}>
            {LOCKED.map((l) => (
              <li key={l}><IconLock width={18} height={18} />{l}</li>
            ))}
          </ul>
          <Link href="/checkout" className="btn btn-primary btn-block" style={{ marginTop: 18 }}>
            Unlock full report · $9.99
          </Link>
          <p className="fineprint">7-day refund, one click. Paid securely with PayPal.</p>
        </div>
      </section>

      <p className="center small muted" style={{ marginTop: 20 }}>
        Doesn&apos;t feel like you? <Link href="/scan">Retake for free</Link> in daylight.
      </p>
    </div>
  );
}
