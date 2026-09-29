import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

export const dynamic = "force-dynamic";

// Serves the MediaPipe face model from our own domain, so the scan works even where
// storage.googleapis.com is blocked (e.g. some networks). Fetched once server-side, then cached on disk.
const SOURCE = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

function cachePath(): string {
  const settings = process.env.SETTINGS_FILE?.trim() || "/data/settings.json";
  return join(/*turbopackIgnore: true*/ dirname(settings), "cache", "face_landmarker.task");
}

let inflight: Promise<Buffer> | null = null;

async function load(): Promise<Buffer> {
  const file = cachePath();
  try {
    return await readFile(/*turbopackIgnore: true*/ file);
  } catch {
    /* not cached yet */
  }
  const res = await fetch(SOURCE);
  if (!res.ok) throw new Error(`model fetch ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  try {
    await mkdir(/*turbopackIgnore: true*/ dirname(file), { recursive: true });
    await writeFile(/*turbopackIgnore: true*/ `${file}.tmp`, buf);
    await rename(/*turbopackIgnore: true*/ `${file}.tmp`, file);
  } catch {
    /* serving still works without the disk cache */
  }
  return buf;
}

export async function GET() {
  try {
    inflight ??= load().finally(() => {
      inflight = null;
    });
    const buf = await inflight;
    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/octet-stream",
        "Cache-Control": "public, max-age=2592000, immutable",
        "Content-Length": String(buf.length),
      },
    });
  } catch {
    return new Response("model unavailable", { status: 502 });
  }
}
