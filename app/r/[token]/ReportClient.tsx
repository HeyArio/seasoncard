"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { downloadBlob, renderSeasonCardPng, renderWallpaperPng } from "@/lib/card-canvas";
import { rememberReport } from "@/lib/result-store";
import type { Metrics } from "@/lib/schemas";
import { IconDownload, IconLink } from "@/components/Icons";

export function BookmarkBar() {
  const [copied, setCopied] = useState(false);
  useEffect(() => rememberReport(window.location.pathname), []);
  async function copy() {
    try {
      await navigator.clipboard.writeText(window.location.href);
    } catch {
      const t = document.createElement("textarea");
      t.value = window.location.href;
      document.body.appendChild(t);
      t.select();
      document.execCommand("copy");
      t.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2200);
  }
  return (
    <div className="bookmark-bar">
      <p className="small"><strong>Bookmark this page.</strong> <span className="muted">This link is your report.</span></p>
      <button type="button" className="btn btn-secondary btn-sm" onClick={copy} style={{ flex: "0 0 auto" }}>
        <IconLink width={16} height={16} /> {copied ? "Copied" : "Copy link"}
      </button>
    </div>
  );
}

export function ReportDownloads(props: {
  seasonId: string;
  seasonName: string;
  tagline: string;
  swatches: string[];
  palette: string[];
  metrics: Metrics;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  async function run(kind: "card" | "wallpaper") {
    setBusy(kind);
    try {
      if (kind === "card") {
        const blob = await renderSeasonCardPng({ seasonName: props.seasonName, tagline: props.tagline, swatches: props.swatches, metrics: props.metrics });
        downloadBlob(blob, `season-card-${props.seasonId}-hd.png`);
      } else {
        const palette = props.palette.length ? props.palette : props.swatches;
        const blob = await renderWallpaperPng({ seasonName: props.seasonName, palette, swatches: props.swatches });
        downloadBlob(blob, `season-card-${props.seasonId}-wallpaper.png`);
      }
    } finally {
      setBusy(null);
    }
  }
  return (
    <div className="download-grid">
      <button type="button" className="btn btn-secondary btn-block" onClick={() => run("card")} disabled={busy !== null}>
        <IconDownload width={18} height={18} /> {busy === "card" ? "Preparing…" : "HD Season Card"}
      </button>
      <button type="button" className="btn btn-secondary btn-block" onClick={() => run("wallpaper")} disabled={busy !== null}>
        <IconDownload width={18} height={18} /> {busy === "wallpaper" ? "Preparing…" : "Phone wallpaper"}
      </button>
      <button type="button" className="btn btn-ghost btn-block" onClick={() => window.print()}>
        Save as PDF
      </button>
    </div>
  );
}

type RefundState = "idle" | "confirm" | "working" | "done" | "error";

export function RefundBlock({ token, open, deadline, amount }: { token: string; open: boolean; deadline: string; amount: string }) {
  const [state, setState] = useState<RefundState>("idle");
  const [msg, setMsg] = useState<string | null>(null);
  const deadlineText = new Date(deadline).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });

  async function refund() {
    setState("working");
    setMsg(null);
    try {
      const res = await fetch("/api/refund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(data.error === "REFUND_WINDOW_CLOSED" ? "The 7-day refund window has closed." : "The refund didn't go through. Please try again in a minute.");
        setState("error");
        return;
      }
      setMsg(data.status === "PENDING" ? "Your refund is on its way. PayPal is processing it and will email you." : "Refund sent. PayPal will email you a receipt.");
      setState("done");
    } catch {
      setMsg("We couldn't reach the server. Check your connection and try again.");
      setState("error");
    }
  }

  return (
    <div className="card card-lg">
      <h2 style={{ fontSize: "1.3rem" }}>Doesn&apos;t feel like you?</h2>
      <p className="muted" style={{ marginTop: 6 }}>
        Retake free or refund in one click within 7 days.
      </p>
      <div style={{ marginTop: 16 }} className="download-grid">
        <Link href="/scan" className="btn btn-secondary btn-block">Retake free</Link>

        {state === "done" ? (
          <div className="alert alert-info" role="status">{msg}</div>
        ) : !open ? (
          <p className="small muted center">The refund window closed on {deadlineText}.</p>
        ) : state === "confirm" || state === "working" ? (
          <div className="alert" role="alertdialog" aria-label="Confirm refund">
            <strong>Refund ${amount} to your PayPal?</strong>
            <p className="small" style={{ marginTop: 4 }}>This closes your report. It can&apos;t be undone.</p>
            <div className="btn-row" style={{ marginTop: 12 }}>
              <button type="button" className="btn btn-primary btn-sm" onClick={refund} disabled={state === "working"}>
                {state === "working" ? "Refunding…" : "Yes, refund me"}
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setState("idle")} disabled={state === "working"}>
                Keep report
              </button>
            </div>
          </div>
        ) : (
          <button type="button" className="btn btn-quiet" onClick={() => setState("confirm")}>
            Refund my ${amount}
          </button>
        )}
        {state === "error" && msg ? (
          <div className="alert" role="alert">
            {msg}
            {open ? <button type="button" className="btn btn-secondary btn-sm btn-block" style={{ marginTop: 10 }} onClick={refund}>Try again</button> : null}
          </div>
        ) : null}
        {open && state !== "done" ? <p className="xsmall muted center">Refunds are available until {deadlineText}.</p> : null}
      </div>
    </div>
  );
}
