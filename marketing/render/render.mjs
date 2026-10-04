// Renders Season Card carousel slides (1080×1350) to PNG with the site's own fonts and palette.
// Usage: node render.mjs   (outputs ../out/post-XX/slide-YY.png)
import { createRequire } from "node:module";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const APP = process.env.APP || join(here, "..", "..");
const require = createRequire(join(APP, "package.json"));
const { chromium } = require("playwright-core");
const S = JSON.parse(readFileSync(join(APP, "data/seasons.json"), "utf8"));
const ONLY = process.env.ONLY ? process.env.ONLY.split(",").map(Number) : null;
const posts = (await import(join(here, "posts.mjs"))).default(S).filter((p) => !ONLY || ONLY.includes(p.n));

const b64 = (f) => `data:font/woff2;base64,${readFileSync(join(APP, "public/fonts", f)).toString("base64")}`;
const css = `
@font-face{font-family:Fraunces;src:url(${b64('fraunces-latin-opsz-normal.woff2')}) format('woff2');font-weight:100 900}
@font-face{font-family:Fraunces;src:url(${b64('fraunces-latin-opsz-italic.woff2')}) format('woff2');font-style:italic;font-weight:100 900}
@font-face{font-family:Manrope;src:url(${b64('manrope-latin-wght-normal.woff2')}) format('woff2');font-weight:200 800}
*{box-sizing:border-box}body{margin:0}
.s{width:1080px;height:1350px;background:#F5EFE6;color:#211C18;font-family:Manrope;display:flex;flex-direction:column;padding:96px 90px 70px;position:relative;overflow:hidden}
.k{font-size:26px;font-weight:800;letter-spacing:4px;text-transform:uppercase;color:#9A4A24;margin-bottom:26px}
.h{font-family:Fraunces;font-weight:600;letter-spacing:-2px;line-height:1.02;margin:0}
.hook{font-size:108px}.h2{font-size:70px;line-height:1.08;letter-spacing:-1px}
.p{font-size:36px;line-height:1.45;color:#5E544B;margin:26px 0 0}
.b{font-weight:800;color:#211C18}
.vis{flex:1;display:flex;align-items:center;justify-content:center;width:100%}
.foot{display:flex;justify-content:space-between;align-items:center;font-size:24px;color:#5E544B;font-weight:600}
.brand{display:flex;align-items:center;gap:12px;font-family:Fraunces;font-size:30px;color:#211C18;font-weight:600}
.dots{display:flex}.dots i{width:22px;height:22px;border-radius:11px;display:block;margin-left:-7px}.dots i:first-child{margin-left:0}
.sw{border-radius:28px}
.lbl{font-size:24px;color:#5E544B;font-weight:700;margin-top:12px;text-align:center}
.card{background:#FFFDF9;border:2px solid #E3D8CA;border-radius:36px;padding:44px}
`;

const esc = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;");
const rich = (t) => esc(t).replace(/\*\*(.+?)\*\*/g, '<span class="b">$1</span>');

const V = {
  numbered: () => `<div style="display:flex;gap:28px">${[1, 2, 3, 4].map((n) => `<div class="sw" style="width:190px;height:260px;background:#FFFDF9;border:3px dashed #C9B9A4;display:flex;align-items:center;justify-content:center;font-family:Fraunces;font-size:120px;color:#9A4A24;font-style:italic">${n}</div>`).join("")}</div>`,
  gradient: ({ pos = 62, lo = "Cool", hi = "Warm" }) => `<div style="width:100%"><div style="height:120px;border-radius:60px;background:linear-gradient(90deg,#6F8FB0,#B7A9B8,#D9B99A,#C98B4E)"></div><div style="position:relative;height:0"><div style="position:absolute;left:${pos}%;top:-150px;width:44px;height:180px;border-radius:22px;border:6px solid #211C18;margin-left:-22px"></div></div><div style="display:flex;justify-content:space-between;font-size:32px;font-weight:700;margin-top:30px"><span>${lo}</span><span>${hi}</span></div></div>`,
  value: () => { const st = ["#F4E8DA", "#E0C7AC", "#C49C78", "#9C7153", "#74513A", "#4E3526", "#2E1F17"]; return `<div style="width:100%"><div style="display:flex;gap:14px">${st.map((c) => `<div class="sw" style="flex:1;height:320px;background:${c}"></div>`).join("")}</div><div style="display:flex;justify-content:space-between;font-size:32px;font-weight:700;margin-top:24px"><span>Light</span><span>Deep</span></div></div>`; },
  heads: () => { const head = (skin, hair, t) => `<div style="display:flex;flex-direction:column;align-items:center;gap:18px"><svg width="330" height="380" viewBox="0 0 330 380"><path d="M165 40c-70 0-110 50-110 130 0 20 4 40 10 58-4-90 30-140 100-140s104 50 100 140c6-18 10-38 10-58 0-80-40-130-110-130z" fill="${hair}"/><ellipse cx="165" cy="200" rx="92" ry="118" fill="${skin}"/><path d="M50 380c10-60 60-80 115-80s105 20 115 80z" fill="${skin}"/><path d="M73 170c10-80 50-110 92-110s82 30 92 110c-20-40-50-60-92-60s-72 20-92 60z" fill="${hair}"/></svg><div class="lbl" style="font-size:30px;color:#211C18">${t}</div></div>`; return `<div style="display:flex;gap:80px;align-items:flex-end">${head("#D9B99A", "#B08A64", "Low contrast")}${head("#F1DCCB", "#1E1612", "High contrast")}</div>`; },
  chroma: ({ a = "#C0632A", b = "#A98672", la = "Clear", lb = "Soft" }) => `<div style="display:flex;gap:40px">${[[a, la], [b, lb]].map(([c, l]) => `<div><div class="sw" style="width:400px;height:420px;background:${c}"></div><div class="lbl" style="font-size:32px;color:#211C18">${l}</div></div>`).join("")}</div>`,
  grid12: () => { const ids = Object.keys(S); return `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:22px 30px;width:100%">${ids.map((id) => `<div style="display:flex;flex-direction:column;gap:8px"><div style="display:flex;gap:6px">${S[id].cardSwatches.map((c) => `<div style="flex:1;height:64px;border-radius:14px;background:${c}"></div>`).join("")}</div><div style="font-size:22px;font-weight:700">${S[id].name}</div></div>`).join("")}</div>`; },
  mock: ({ id = "soft-autumn", hl, note }) => { const s = S[id]; const m = [["Undertone", s.traits.undertone], ["Depth", s.traits.depth], ["Contrast", s.traits.contrast], ["Chroma", s.traits.chroma]]; return `<div class="card" style="width:720px;display:flex;flex-direction:column;gap:24px;transform:rotate(-2deg);box-shadow:0 30px 60px rgba(33,28,24,.12)"><div style="display:flex;justify-content:space-between;font-size:20px;font-weight:800;letter-spacing:3px;color:#5E544B"><span>SEASON CARD</span><span style="letter-spacing:0">seasoncard.app</span></div><div class="h" style="font-size:72px">${s.name}</div><div style="display:flex;gap:14px">${s.cardSwatches.map((c) => `<div style="flex:1;height:120px;border-radius:24px;background:${c}"></div>`).join("")}</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">${m.map(([k, v]) => `<div style="padding:16px 20px;border-radius:18px;background:${hl === k ? "#E9D3C6" : "#F5EFE6"};${hl === k ? "outline:4px solid #9A4A24" : ""}"><div style="font-size:18px;font-weight:700;color:#5E544B">${k.toUpperCase()}</div><div style="font-size:30px;font-weight:800">${v}</div></div>`).join("")}</div>${note ? `<div style="padding:16px 20px;border-radius:18px;background:#E9D3C6;outline:4px solid #9A4A24;font-size:26px;font-weight:800">${esc(note)}</div>` : ""}</div>`; },
  swatches: ({ list }) => `<div style="display:flex;gap:20px;width:100%">${list.map(([c, n]) => `<div style="flex:1"><div class="sw" style="height:420px;background:${c};${c.toUpperCase() === "#FFFFFF" ? "border:2px solid #E3D8CA" : ""}"></div><div class="lbl" style="font-size:26px;color:#211C18">${n}</div></div>`).join("")}</div>`,
  pair: ({ a, b }) => `<div style="display:flex;gap:40px">${[a, b].map(([c, n]) => `<div><div class="sw" style="width:400px;height:440px;background:${c}"></div><div class="lbl" style="font-size:32px;color:#211C18">${n}</div></div>`).join("")}</div>`,
  black: ({ tags = [] }) => `<div style="display:flex;align-items:center;gap:50px"><div class="sw" style="width:460px;height:560px;background:#111;display:flex;align-items:center;justify-content:center;font-family:Fraunces;font-size:260px;color:#F5EFE6">?</div>${tags.length ? `<div style="display:flex;flex-direction:column;gap:20px">${tags.map((t) => `<div style="font-size:34px;font-weight:800;padding:18px 26px;border-radius:20px;background:#FFFDF9;border:2px solid #E3D8CA">${t}</div>`).join("")}</div>` : ""}</div>`,
  rows: ({ ids }) => `<div style="display:flex;flex-direction:column;gap:30px;width:100%">${ids.map((id) => `<div><div style="font-size:30px;font-weight:800;margin-bottom:10px">${S[id].name}</div><div style="display:flex;gap:10px">${[...S[id].neutrals.slice(0, 2), ...S[id].palette.filter((c) => !S[id].neutrals.some((n) => n.hex === c.hex)).slice(0, 5)].map((c) => `<div style="flex:1;height:110px;border-radius:18px;background:${c.hex}"></div>`).join("")}<div style="flex:1;height:110px;border-radius:18px;background:#111"></div></div></div>`).join("")}</div>`,
  shadow: () => `<div style="display:flex;flex-direction:column;align-items:center;gap:14px"><svg width="420" height="460" viewBox="0 0 420 460"><rect x="0" y="330" width="420" height="130" rx="20" fill="#111"/><ellipse cx="210" cy="190" rx="120" ry="150" fill="#D9B99A"/><path d="M150 205q25 18 50 0M220 205q25 18 50 0" stroke="#8C7B6E" stroke-width="7" fill="none" opacity=".7"/><path d="M140 250q70 50 140 0" stroke="#A8927F" stroke-width="5" fill="none" opacity=".5"/></svg><div class="lbl">illustration</div></div>`,
  single: ({ c, label }) => `<div style="display:flex;flex-direction:column;align-items:center"><div class="sw" style="width:620px;height:620px;background:${c}"></div>${label ? `<div class="lbl" style="font-size:32px;color:#211C18">${label}</div>` : ""}</div>`,
  palettes: ({ ids, note }) => `<div style="display:flex;flex-direction:column;gap:28px;width:100%">${ids.map((id) => `<div><div style="font-size:30px;font-weight:800;margin-bottom:10px">${S[id].name}${note && note[id] ? ` <span style="font-weight:600;color:#9A4A24">· ${note[id]}</span>` : ""}</div><div style="display:flex;gap:10px">${S[id].palette.filter((c) => !S[id].neutrals.some((n) => n.hex === c.hex)).filter((_, i) => i % 3 === 0).slice(0, 8).map((c) => `<div style="flex:1;height:110px;border-radius:18px;background:${c.hex}"></div>`).join("")}</div></div>`).join("")}</div>`,
  faces: ({ tints }) => `<div style="display:flex;gap:50px;align-items:flex-end">${tints.map(([tint, lab]) => `<div style="display:flex;flex-direction:column;align-items:center;gap:14px"><div style="position:relative;width:340px;height:400px"><svg width="340" height="400" viewBox="0 0 340 400" style="position:absolute;inset:0"><ellipse cx="170" cy="190" rx="110" ry="140" fill="#D6B49A"/><path d="M60 400c10-60 55-78 110-78s100 18 110 78z" fill="#D6B49A"/><path d="M62 170c8-90 50-128 108-128s100 38 108 128c-22-46-58-70-108-70s-86 24-108 70z" fill="#5A4535"/></svg><div style="position:absolute;inset:0;background:${tint};mix-blend-mode:multiply;border-radius:40px"></div></div><div class="lbl" style="font-size:28px;color:#211C18">${lab}</div></div>`).join("")}</div>`,
  checklist: ({ items }) => `<div class="card" style="width:100%;display:flex;flex-direction:column;gap:26px">${items.map((t) => `<div style="display:flex;gap:22px;align-items:center;font-size:40px;font-weight:700"><svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#3F4A2B" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" fill="#E4E7DA" stroke="none"/><path d="M7 12.5l3.2 3.2L17 9"/></svg>${t}</div>`).join("")}</div>`,
  bigtext: ({ text, sub }) => `<div style="display:flex;flex-direction:column;align-items:center;gap:20px;text-align:center"><div style="font-family:Fraunces;font-size:150px;font-weight:600;color:#9A4A24;line-height:1">${text}</div>${sub ? `<div style="font-size:36px;font-weight:700;color:#5E544B;max-width:760px">${sub}</div>` : ""}</div>`,
  letters: ({ list }) => `<div style="display:flex;gap:20px;width:100%">${list.map(([c, l]) => `<div style="flex:1;display:flex;flex-direction:column;align-items:center"><div class="sw" style="width:100%;height:460px;background:${c}"></div><div style="font-family:Fraunces;font-size:64px;font-weight:600;margin-top:12px">${l}</div></div>`).join("")}</div>`,
  answers: ({ list }) => `<div style="display:flex;flex-direction:column;gap:26px;width:100%">${list.map(([cols, name], i) => `<div style="display:flex;align-items:center;gap:24px"><div style="font-family:Fraunces;font-size:54px;font-weight:600;width:50px">${i + 1}</div><div style="display:flex;gap:10px;flex:1">${cols.map((c) => `<div style="flex:1;height:100px;border-radius:18px;background:${c}"></div>`).join("")}</div><div style="font-size:32px;font-weight:800;width:250px">${name}</div></div>`).join("")}</div>`,
  table: ({ rows }) => `<div class="card" style="width:100%;display:flex;flex-direction:column;gap:22px">${rows.map(([sw, k, v]) => `<div style="display:flex;gap:22px;align-items:center"><div style="width:84px;height:84px;border-radius:20px;flex:none;background:${sw}"></div><div><div style="font-size:24px;font-weight:800;color:#5E544B;letter-spacing:2px;text-transform:uppercase">${esc(k)}</div><div style="font-size:36px;font-weight:800">${esc(v)}</div></div></div>`).join("")}</div>`,
  fans: ({ a, b }) => `<div style="display:flex;gap:60px">${[a, b].map((id) => `<div style="display:flex;flex-direction:column;align-items:center;gap:16px"><div style="position:relative;width:380px;height:420px">${S[id].cardSwatches.concat(S[id].palette.slice(8, 10).map((c) => c.hex)).map((c, i, arr) => `<div style="position:absolute;left:150px;top:20px;width:90px;height:380px;border-radius:22px;background:${c};transform-origin:45px 360px;transform:rotate(${(i - (arr.length - 1) / 2) * 13}deg);box-shadow:0 4px 12px rgba(0,0,0,.08)"></div>`).join("")}</div><div style="font-size:34px;font-weight:800">${S[id].name}</div></div>`).join("")}</div>`,
};

function slide(p, s, i, n) {
  const title = `<h1 class="h ${s.hook ? "hook" : "h2"}">${rich(s.title)}</h1>`;
  return `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body><div class="s">
${s.kicker ? `<div class="k">${esc(s.kicker)}</div>` : ""}${title}${s.body ? `<p class="p">${rich(s.body)}</p>` : ""}
<div class="vis">${s.v ? V[s.v.t](s.v) : ""}</div>
<div class="foot"><div class="brand"><span class="dots"><i style="background:#B5705A"></i><i style="background:#8A8F5E"></i><i style="background:#5F7F82"></i></span>Season Card</div><span>${s.cta ? "Free scan: seasoncard.app · Personal review: comment REVIEW" : `${i + 1} / ${n}`}</span></div>
</div></body></html>`;
}

const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const page = await browser.newPage({ viewport: { width: 1080, height: 1350 } });
for (const p of posts) {
  const dir = join(here, "..", "out", `post-${String(p.n).padStart(2, "0")}`);
  mkdirSync(dir, { recursive: true });
  for (let i = 0; i < p.slides.length; i++) {
    await page.setContent(slide(p, p.slides[i], i, p.slides.length), { waitUntil: "load" });
    await page.evaluate(async () => { await document.fonts.load("600 40px Fraunces"); await document.fonts.load("italic 40px Fraunces"); await document.fonts.load("700 40px Manrope"); await document.fonts.ready; });
    await page.screenshot({ path: join(dir, `slide-${String(i + 1).padStart(2, "0")}.png`) });
  }
  writeFileSync(join(dir, "caption.txt"), `${p.caption}\n\n${p.tags}\n`);
  console.log(`post ${p.n}: ${p.slides.length} slides`);
}
await browser.close();
