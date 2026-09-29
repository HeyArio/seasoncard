import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { verifyReportToken } from "@/lib/report-token";
import { getSeason, textOn } from "@/lib/seasons";
import { isWithinRefundWindow, refundDeadline } from "@/lib/token";
import { MissingEnvError, optionalEnv } from "@/lib/env";
import { getCaptureStatus } from "@/lib/refund";
import type { Metrics, ReportPayload } from "@/lib/schemas";
import type { Swatch } from "@/lib/seasons";
import { ReportDownloads, BookmarkBar, RefundBlock } from "./ReportClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your full season report",
  robots: { index: false, follow: false, nocache: true },
};

const SCALES: { key: keyof Metrics; title: string; ends: [string, string]; gradient: string }[] = [
  { key: "undertone", title: "Undertone", ends: ["Cool", "Warm"], gradient: "linear-gradient(90deg,#8FA3B8,#C9B9A6,#D9A273)" },
  { key: "depth", title: "Depth", ends: ["Light", "Deep"], gradient: "linear-gradient(90deg,#F1E4D3,#A88A6E,#3F2E23)" },
  { key: "contrast", title: "Contrast", ends: ["Low", "High"], gradient: "linear-gradient(90deg,#DCD0C2,#8C7F72,#211C18)" },
  { key: "chroma", title: "Chroma", ends: ["Soft", "Bright"], gradient: "linear-gradient(90deg,#B7ADA2,#C48A6A,#D2462E)" },
];

function Named({ items, cols = 3 }: { items: Swatch[]; cols?: number }) {
  return (
    <div className="named-swatches" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      {items.map((s) => (
        <div className="named-swatch" key={s.hex + s.name}>
          <div className="chipc" style={{ background: s.hex }} />
          <div className="nm">{s.name}</div>
          <div className="hx">{s.hex.toUpperCase()}</div>
        </div>
      ))}
    </div>
  );
}

function InvalidToken({ reason }: { reason: "invalid" | "unavailable" }) {
  return (
    <main className="page">
      <SiteHeader />
      <div className="card card-lg center" style={{ marginTop: 24 }}>
        <h1 style={{ fontSize: "1.9rem" }}>{reason === "invalid" ? "We can't open this report" : "Reports are briefly unavailable"}</h1>
        <p className="muted" style={{ marginTop: 10 }}>
          {reason === "invalid"
            ? "The link looks incomplete or changed. Check that you copied the whole link, or open it from your bookmark."
            : "Please try again in a few minutes. Your purchase is safe."}
        </p>
        <Link href="/" className="btn btn-primary btn-block" style={{ marginTop: 20 }}>Go to Season Card</Link>
      </div>
      <SiteFooter />
    </main>
  );
}

function Refunded({ payload }: { payload: ReportPayload }) {
  const { season } = getSeason(payload.season);
  return (
    <main className="page">
      <SiteHeader />
      <div className="card card-lg center" style={{ marginTop: 24 }}>
        <span className="chip chip-success">Refunded</span>
        <h1 style={{ fontSize: "1.9rem", marginTop: 12 }}>This order was refunded</h1>
        <p className="muted" style={{ marginTop: 10 }}>
          Your {season.name} report payment was returned to your PayPal account, so this report is closed. Your free result is always
          available with a new scan.
        </p>
        <Link href="/scan" className="btn btn-primary btn-block" style={{ marginTop: 20 }}>Take the free scan</Link>
      </div>
      <SiteFooter />
    </main>
  );
}

export default async function ReportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  let payload: ReportPayload | null;
  try {
    payload = verifyReportToken(decodeURIComponent(token));
  } catch (e) {
    if (e instanceof MissingEnvError) return <InvalidToken reason="unavailable" />;
    payload = null;
  }
  if (!payload) return <InvalidToken reason="invalid" />;

  // Refunded or reversed orders close the report. Fail open if PayPal can't be reached.
  if (optionalEnv("PAYPAL_CLIENT_ID") && optionalEnv("PAYPAL_CLIENT_SECRET")) {
    const st = await getCaptureStatus(payload.captureId);
    if (st === "REFUNDED" || st === "REVERSED") return <Refunded payload={payload} />;
  }

  const { season, complete } = getSeason(payload.season);
  const sw = season.cardSwatches;
  const refundOpen = isWithinRefundWindow(payload.paidAt);
  const deadline = refundDeadline(payload.paidAt).toISOString();

  return (
    <main className="page">
      <SiteHeader />

      <div className="no-print" style={{ marginTop: 8 }}>
        <BookmarkBar />
      </div>

      <section
        className="report-hero"
        style={{
          marginTop: 16,
          background: `linear-gradient(160deg, rgba(33,28,24,0.62), rgba(33,28,24,0.28)), linear-gradient(135deg, ${sw[0]}, ${sw[3] ?? sw[1]})`,
        }}
      >
        <span className="eyebrow" style={{ color: "rgba(255,255,255,0.85)" }}>Your full season report</span>
        <h1 style={{ marginTop: 10, color: "#fff" }}>{season.name}</h1>
        {season.tagline ? <p style={{ marginTop: 8, fontSize: "1.05rem", color: "rgba(255,255,255,0.92)" }}>{season.tagline}</p> : null}
        <div className="band" aria-hidden>
          {sw.map((h, i) => <span key={i} style={{ background: h }} />)}
        </div>
      </section>

      {season.description ? <p style={{ marginTop: 16, fontSize: "1.05rem" }}>{season.description}</p> : null}

      {!complete ? (
        <div className="alert alert-info" style={{ marginTop: 16 }}>
          Your detailed {season.name} palette is being finalised. Please check this page again soon. If you&apos;d rather not wait, you can refund in one
          click below.
        </div>
      ) : null}

      <section className="section card">
        <h2 className="section-title">What we measured</h2>
        {SCALES.map((s) => {
          const m = payload.metrics[s.key];
          return (
            <div className="scale" key={s.key}>
              <div className="scale-head">
                <span>{s.title}</span>
                <span style={{ color: "var(--accent)" }}>{m.label}</span>
              </div>
              <div className="scale-track" style={{ background: s.gradient }} role="img" aria-label={`${s.title}: ${m.label}, ${Math.round(m.score * 100)} out of 100`}>
                <span className="scale-dot" style={{ left: `${Math.min(97, Math.max(3, m.score * 100))}%` }} />
              </div>
              <div className="scale-ends"><span>{s.ends[0]}</span><span>{s.ends[1]}</span></div>
            </div>
          );
        })}
        <div style={{ marginTop: 20 }}>
          <p className="small muted" style={{ marginBottom: 8 }}>Colours sampled from your photo (light-corrected)</p>
          <div className="named-swatches">
            {(["skin", "eyes", "hair"] as const).map((k) => (
              <div className="named-swatch" key={k}>
                <div className="chipc" style={{ background: payload.samples[k] }} />
                <div className="nm" style={{ textTransform: "capitalize" }}>{k}</div>
                <div className="hx">{payload.samples[k].toUpperCase()}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {complete ? (
        <>
          <section className="section">
            <h2 className="section-title">Your 36 colours</h2>
            <p className="muted small" style={{ marginTop: -8, marginBottom: 14 }}>Wear these near your face. Screenshot or download the wallpaper to shop with it.</p>
            <div className="palette-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
              {season.palette.map((p) => (
                <div key={p.hex + p.name} className="named-swatch">
                  <div className="palette-cell" style={{ background: p.hex }} />
                  <div className="nm">{p.name}</div>
                  <div className="hx">{p.hex.toUpperCase()}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="section card">
            <h2 className="section-title">Your neutrals</h2>
            <p className="muted small" style={{ marginTop: -8, marginBottom: 14 }}>Base colours for coats, trousers, bags and shoes.</p>
            <Named items={season.neutrals} />
          </section>

          <section className="section card">
            <h2 className="section-title">Colours to avoid</h2>
            <div className="avoid-list">
              {season.avoid.map((a) => (
                <div className="avoid-item" key={a.hex + a.name}>
                  <div className="sw" style={{ background: a.hex }} />
                  <div>
                    <strong>{a.name}</strong>
                    <p className="muted small">{a.why}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="section card">
            <h2 className="section-title">Makeup and hair</h2>
            {([["Lips", season.lips], ["Blush", season.blush], ["Eyes", season.eyes], ["Hair colour", season.hair]] as const).map(([t, items]) => (
              <div key={t} style={{ marginTop: 14 }}>
                <h3 style={{ marginBottom: 10 }}>{t}</h3>
                <Named items={[...items]} />
              </div>
            ))}
          </section>

          <section className="section card">
            <h2 className="section-title">Gold or silver?</h2>
            <div className="metals">
              <div><div className="k">Best</div><div className="v">{season.metals.best}</div></div>
              <div><div className="k">Good</div><div className="v">{season.metals.good}</div></div>
              <div><div className="k">Skip</div><div className="v">{season.metals.skip}</div></div>
            </div>
          </section>

          {season.celebrities.length ? (
            <section className="section card">
              <h2 className="section-title">Often typed as {season.name}</h2>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {season.celebrities.map((c) => <span className="chip" key={c}>{c}</span>)}
              </div>
              <p className="muted xsmall" style={{ marginTop: 10 }}>Commonly cited examples from colour-analysis circles, not our measurements.</p>
            </section>
          ) : null}

          <section className="section card">
            <h2 className="section-title">Styling tips</h2>
            <ol className="tips">
              {season.stylingTips.map((t) => <li key={t}>{t}</li>)}
            </ol>
          </section>

          {payload.capsule && season.capsule.length ? (
            <section className="section card">
              <h2 className="section-title">Your capsule wardrobe</h2>
              <p className="muted small" style={{ marginTop: -8, marginBottom: 10 }}>30 pieces that all work together in your colours.</p>
              <ul className="capsule-list">
                {season.capsule.map((c, i) => (
                  <li key={c.item + i}>
                    <span className="dot" style={{ background: c.hex, color: textOn(c.hex) }} />
                    <div style={{ flex: 1 }}>
                      <a href={`https://www.google.com/search?tbm=shop&q=${encodeURIComponent(c.search)}`} target="_blank" rel="noopener noreferrer nofollow">
                        {c.item}
                      </a>
                      <div className="muted xsmall">{c.colorName}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      ) : null}

      <section className="section card no-print">
        <h2 className="section-title">Downloads</h2>
        <ReportDownloads
          seasonId={payload.season}
          seasonName={season.name}
          tagline={season.tagline}
          swatches={sw}
          palette={season.palette.map((p) => p.hex)}
          metrics={payload.metrics}
        />
      </section>

      <section className="section no-print">
        <RefundBlock token={decodeURIComponent(token)} open={refundOpen} deadline={deadline} amount={payload.amount} />
      </section>

      <p className="xsmall muted" style={{ marginTop: 24 }}>
        Order {payload.orderId} · Paid ${payload.amount} USD · {new Date(payload.paidAt).toUTCString().slice(5, 16)}. Style guidance for fun, not medical advice.
      </p>
      <SiteFooter />
    </main>
  );
}
