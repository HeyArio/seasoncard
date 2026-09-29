"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { analyze, initEngine, type AnalysisResult, type QualityIssue } from "@/lib/engine";
import { saveResult } from "@/lib/result-store";
import { IconCamera, IconCheck, IconImage, IconLock } from "@/components/Icons";

type Phase = "idle" | "starting" | "live" | "analyzing" | "retake" | "error";

const ISSUE_COPY: Record<QualityIssue, { title: string; tip: string }> = {
  face_not_found: { title: "We couldn't find a face", tip: "Look straight at the camera and fill the oval. Make sure your whole face is visible." },
  multiple_faces: { title: "More than one face", tip: "Take the photo on your own so we measure just you." },
  face_too_small: { title: "Come a little closer", tip: "Your face should fill most of the oval." },
  low_light: { title: "It's a bit dark", tip: "Face a window in daytime so soft light falls on your face. Avoid lamps behind you." },
  overexposed: { title: "Too much light", tip: "Step out of direct sun. Bright, indirect daylight works best." },
  color_cast: { title: "The light is tinted", tip: "Warm bulbs or coloured light skew your colours. Switch off indoor lights and use daylight." },
  blurry: { title: "The photo is blurry", tip: "Hold still, or rest your phone on something, and tap once to focus." },
};

const ROTATING_TIPS = ["Face the window, light on your face", "No filter, no beauty mode", "Hair away from your face", "Fill the oval with your face"];
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export default function ScanClient() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [issues, setIssues] = useState<QualityIssue[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [tip, setTip] = useState<{ text: string; warn: boolean }>({ text: ROTATING_TIPS[0], warn: false });
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const engineReady = useRef<Promise<void> | null>(null);

  useEffect(() => {
    engineReady.current = initEngine().catch(() => undefined);
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const startCamera = useCallback(async () => {
    setError(null);
    setIssues([]);
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("This browser can't open the camera here. You can upload a photo instead.");
      setPhase("error");
      return;
    }
    setPhase("starting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 960 } },
        audio: false,
      });
      streamRef.current = stream;
      setPhase("live");
    } catch (e) {
      const name = e instanceof DOMException ? e.name : "";
      setError(
        name === "NotAllowedError"
          ? "Camera access was blocked. Allow the camera in your browser settings, or upload a photo instead."
          : name === "NotFoundError"
            ? "We couldn't find a camera on this device. Upload a photo instead."
            : "The camera couldn't start. Upload a photo instead.",
      );
      setPhase("error");
    }
  }, []);

  // Attach the stream once the <video> is mounted.
  useEffect(() => {
    if (phase !== "live" || !videoRef.current || !streamRef.current) return;
    const v = videoRef.current;
    v.srcObject = streamRef.current;
    v.play().catch(() => undefined);
  }, [phase]);

  // Live tips: rotate advice and check brightness from the video feed (locally).
  useEffect(() => {
    if (phase !== "live") return;
    let i = 0;
    let tick = 0;
    const c = document.createElement("canvas");
    c.width = 24;
    c.height = 24;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    const id = window.setInterval(() => {
      tick++;
      const v = videoRef.current;
      let luma = 128;
      if (ctx && v && v.videoWidth) {
        ctx.drawImage(v, v.videoWidth * 0.25, v.videoHeight * 0.2, v.videoWidth * 0.5, v.videoHeight * 0.6, 0, 0, 24, 24);
        const d = ctx.getImageData(0, 0, 24, 24).data;
        let s = 0;
        for (let p = 0; p < d.length; p += 4) s += 0.2126 * d[p] + 0.7152 * d[p + 1] + 0.0722 * d[p + 2];
        luma = s / (d.length / 4);
      }
      if (luma < 70) setTip({ text: "A bit dark. Face the window", warn: true });
      else if (luma > 215) setTip({ text: "Too bright. Step out of direct sun", warn: true });
      else {
        if (tick % 5 === 0) i = (i + 1) % ROTATING_TIPS.length;
        setTip({ text: ROTATING_TIPS[i], warn: false });
      }
    }, 600);
    return () => window.clearInterval(id);
  }, [phase]);

  const runAnalysis = useCallback(
    async (source: HTMLCanvasElement) => {
      setPhase("analyzing");
      try {
        await (engineReady.current ?? initEngine());
        const result: AnalysisResult = await analyze(source);
        if (!result.quality.ok) {
          setIssues(result.quality.issues.length ? result.quality.issues : ["face_not_found"]);
          setPhase("retake");
          return;
        }
        saveResult(result);
        router.push("/result");
      } catch {
        setError("We couldn't read that photo. Try another one, taken in daylight.");
        setPhase("error");
      }
    },
    [router],
  );

  const capture = useCallback(() => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const c = document.createElement("canvas");
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    c.getContext("2d")!.drawImage(v, 0, 0);
    stopCamera();
    void runAnalysis(c);
  }, [runAnalysis, stopCamera]);

  const onFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;
      stopCamera();
      setIssues([]);
      if (!file.type.startsWith("image/")) {
        setError("That file isn't an image. Choose a photo (JPG, PNG or HEIC).");
        setPhase("error");
        return;
      }
      if (file.size > MAX_UPLOAD_BYTES) {
        setError("That photo is very large. Choose one under 25 MB.");
        setPhase("error");
        return;
      }
      setPhase("analyzing");
      try {
        let bitmap: ImageBitmap | HTMLImageElement;
        try {
          bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
        } catch {
          bitmap = await new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image();
            const url = URL.createObjectURL(file);
            img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
            img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("decode")); };
            img.src = url;
          });
        }
        const w = "naturalWidth" in bitmap ? bitmap.naturalWidth : bitmap.width;
        const h = "naturalHeight" in bitmap ? bitmap.naturalHeight : bitmap.height;
        const scale = Math.min(1, 1600 / Math.max(w, h));
        const c = document.createElement("canvas");
        c.width = Math.round(w * scale);
        c.height = Math.round(h * scale);
        c.getContext("2d")!.drawImage(bitmap, 0, 0, c.width, c.height);
        if ("close" in bitmap) bitmap.close();
        await runAnalysis(c);
      } catch {
        setError("We couldn't open that photo. Try a JPG or PNG.");
        setPhase("error");
      }
    },
    [runAnalysis, stopCamera],
  );

  const uploadButton = (variant: "primary" | "secondary") => (
    <>
      <input ref={fileRef} id="photo-upload" type="file" accept="image/*" className="visually-hidden" onChange={onFile} />
      <label htmlFor="photo-upload" className={`btn btn-${variant} btn-block`} role="button" tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileRef.current?.click(); } }}>
        <IconImage width={20} height={20} /> Upload a photo
      </label>
    </>
  );

  return (
    <div>
      <h1 style={{ fontSize: "2.1rem", marginTop: 12 }}>
        {phase === "retake" ? "Let's try that again" : "Your free scan"}
      </h1>
      <p className="muted" style={{ marginTop: 8 }}>
        {phase === "retake" ? "A small change to the light usually fixes it." : "One selfie by a window. Takes about ten seconds."}
      </p>

      <div style={{ marginTop: 20 }}>
        {phase === "live" || phase === "starting" ? (
          <div className="scan-stage">
            <video ref={videoRef} playsInline muted autoPlay aria-label="Camera preview" />
            <svg className="oval" viewBox="0 0 300 400" preserveAspectRatio="xMidYMid slice" aria-hidden>
              <defs>
                <mask id="oval-cut">
                  <rect width="300" height="400" fill="white" />
                  <ellipse cx="150" cy="190" rx="96" ry="130" fill="black" />
                </mask>
              </defs>
              <rect width="300" height="400" fill="rgba(33,28,24,0.45)" mask="url(#oval-cut)" />
              <ellipse cx="150" cy="190" rx="96" ry="130" fill="none" stroke="#FFFDF9" strokeWidth="2.5" strokeDasharray="7 7" />
            </svg>
            {phase === "live" ? (
              <div className={`scan-tip${tip.warn ? " warn" : ""}`} role="status" aria-live="polite">{tip.text}</div>
            ) : (
              <div className="scan-tip">Starting camera…</div>
            )}
          </div>
        ) : phase === "analyzing" ? (
          <div className="scan-placeholder" role="status" aria-live="polite">
            <div>
              <div className="spinner" />
              <p style={{ marginTop: 16, fontWeight: 700 }}>Measuring your colours…</p>
              <p className="muted small" style={{ marginTop: 4 }}>This happens on your device.</p>
            </div>
          </div>
        ) : phase === "retake" ? (
          <div>
            {issues.map((iss) => (
              <div className="issue-card" key={iss} role="alert">
                <h3>{ISSUE_COPY[iss]?.title ?? "Let's retake that"}</h3>
                <p style={{ marginTop: 4 }}>{ISSUE_COPY[iss]?.tip ?? "Try again in soft daylight, facing the camera."}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="scan-placeholder">
            <div>
              <svg width="96" height="124" viewBox="0 0 96 124" aria-hidden style={{ margin: "0 auto" }}>
                <ellipse cx="48" cy="62" rx="44" ry="58" fill="#F5EFE6" stroke="#9A4A24" strokeWidth="2" strokeDasharray="6 6" />
                <g transform="translate(36 50)" fill="none" stroke="#5E544B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
                  <circle cx="12" cy="13.5" r="3.5" />
                </g>
              </svg>
              <p style={{ marginTop: 14, fontWeight: 700 }}>Stand facing a window</p>
              <p className="muted small" style={{ marginTop: 4, maxWidth: 260 }}>
                Daylight on your face works best. We&apos;ll guide you with an oval.
              </p>
            </div>
          </div>
        )}
      </div>

      {error ? <div className="alert" role="alert" style={{ marginTop: 16 }}>{error}</div> : null}

      <div style={{ marginTop: 18 }}>
        {phase === "live" ? (
          <>
            <button type="button" className="btn btn-primary btn-block" onClick={capture}>
              <IconCamera width={20} height={20} /> Take photo
            </button>
            <div className="or-divider">or</div>
            {uploadButton("secondary")}
          </>
        ) : phase === "analyzing" || phase === "starting" ? null : (
          <>
            <button type="button" className="btn btn-primary btn-block" onClick={startCamera}>
              <IconCamera width={20} height={20} /> {phase === "retake" ? "Retake with camera" : phase === "error" ? "Try the camera again" : "Start camera"}
            </button>
            <div className="or-divider">or</div>
            {uploadButton("secondary")}
          </>
        )}
      </div>

      <section className="card card-flat" style={{ marginTop: 24 }}>
        <h3 style={{ marginBottom: 12 }}>For the truest result</h3>
        <ul className="tips-list">
          <li><IconCheck width={20} height={20} />Face a window in daytime, no lamps behind you</li>
          <li><IconCheck width={20} height={20} />No filter, no beauty mode</li>
          <li><IconCheck width={20} height={20} />Bare face or light makeup, hair off your face</li>
          <li><IconCheck width={20} height={20} />Glasses off if you can</li>
        </ul>
      </section>

      <p className="muted small center" style={{ marginTop: 18, display: "flex", gap: 8, justifyContent: "center", alignItems: "center" }}>
        <IconLock width={16} height={16} /> Your photo stays on this device. <Link href="/privacy">Privacy</Link>
      </p>
    </div>
  );
}
