"use client";

import { useState } from "react";
import { renderSeasonCardPng, shareImage, downloadBlob, type CardInput } from "@/lib/card-canvas";
import { IconDownload, IconShare } from "./Icons";

export function ShareButtons({ card, fileBase }: { card: CardInput; fileBase: string }) {
  const [busy, setBusy] = useState<null | "share" | "save">(null);
  const [toast, setToast] = useState<string | null>(null);

  const flash = (m: string) => {
    setToast(m);
    window.setTimeout(() => setToast(null), 2800);
  };

  async function onShare() {
    setBusy("share");
    try {
      const blob = await renderSeasonCardPng(card);
      const r = await shareImage(blob, `${fileBase}.png`, `I'm a ${card.seasonName}. What's yours? seasoncard.app`);
      if (r === "downloaded") flash("Image saved. Add it to your story from your photos.");
    } catch {
      flash("Couldn't create the image. Try again.");
    } finally {
      setBusy(null);
    }
  }

  async function onSave() {
    setBusy("save");
    try {
      downloadBlob(await renderSeasonCardPng(card), `${fileBase}.png`);
      flash("Image saved.");
    } catch {
      flash("Couldn't create the image. Try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <div className="download-grid">
        <button type="button" className="btn btn-secondary btn-block" onClick={onShare} disabled={busy !== null}>
          <IconShare width={18} height={18} /> {busy === "share" ? "Preparing…" : "Share to Stories"}
        </button>
        <button type="button" className="btn btn-ghost btn-block" onClick={onSave} disabled={busy !== null}>
          <IconDownload width={18} height={18} /> {busy === "save" ? "Preparing…" : "Save image"}
        </button>
      </div>
      {toast ? <div className="toast" role="status">{toast}</div> : null}
    </>
  );
}
