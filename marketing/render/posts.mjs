// Slide content for posts 1–3 (from posts.md), using real palettes from seasons.json.
export default (S) => {
  const hex = (id, name) => S[id].palette.find((c) => c.name.toLowerCase().includes(name))?.hex;
  const cta = (title, hl) => ({ title, cta: true, v: { t: "mock", id: "soft-autumn", hl } });
  return [
    {
      n: 1,
      caption:
        "I'm a painter. When I mix a portrait, I don't think \"autumn\". I think temperature, value, contrast and saturation.\nSeasonal colour analysis is the same four questions. Season Card measures all four from a selfie, right in your browser. 🎨\nWhich one do you think is your strongest trait? 👇\n\nFree scan at seasoncard.app Save this to explain seasons to a friend.",
      tags: "#coloranalysis #colouranalysis #seasonalcoloranalysis #colortheory #colorseason",
      slides: [
        { hook: true, title: "Your colour season isn't a vibe. It's 4 measurements.", v: { t: "numbered" } },
        { kicker: "1 · Undertone", title: "Does your skin lean warm (golden) or cool (pink / blue)?", v: { t: "gradient", pos: 64 } },
        { kicker: "2 · Depth", title: "How light or deep are your skin, hair and eyes together?", v: { t: "value" } },
        { kicker: "3 · Contrast", title: "How different are they from each other?", v: { t: "heads" } },
        { kicker: "4 · Chroma", title: "Do clear, bright colours suit you, or soft, muted ones?", v: { t: "chroma" } },
        { kicker: "Mix all 4", title: "…and you land in 1 of 12 seasons.", body: "A painter calls it value, temperature and saturation.", v: { t: "grid12" } },
        cta("Get your 4 numbers free."),
      ],
    },
    {
      n: 2,
      caption:
        "\"Is this why I always look tired in black?\" Maybe, maybe not. Black is simply the deepest, highest-contrast neutral there is.\nIf your colouring is softer, a near-black often does the same job with less shadow. Which swap are you trying? 🖤\n\nFind out if black is your colour. Free scan at seasoncard.app",
      tags: "#coloranalysis #colorseason #wintercolors #softautumn #styletips",
      slides: [
        { hook: true, title: "Is black really “bad” on you?", v: { t: "black" } },
        { title: "Short answer: black isn't bad. It's **very deep + very high contrast.**", v: { t: "black", tags: ["Depth: max", "Contrast: max"] } },
        { title: "In seasonal theory, pure black lives mostly in the **Winter** palettes.", v: { t: "rows", ids: ["deep-winter", "true-winter", "bright-winter"] } },
        { title: "With **softer or lighter** colouring, black can cast shadows near the face.", v: { t: "shadow" } },
        { kicker: "Autumns, swap it for", title: "Espresso · dark chocolate · deep olive", v: { t: "swatches", list: [["#4B2E20", "Espresso"], ["#3B2A20", "Dark chocolate"], ["#4A4A2A", "Deep olive"]] } },
        { kicker: "Summers, swap it for", title: "Charcoal · deep navy · slate", v: { t: "swatches", list: [["#3A3D42", "Charcoal"], ["#1F2A44", "Deep navy"], ["#5A6573", "Slate"]] } },
        { kicker: "Springs, swap it for", title: "Warm navy · chocolate · dark teal", v: { t: "swatches", list: [["#26355E", "Warm navy"], ["#5A3A28", "Chocolate"], ["#1F5C5C", "Dark teal"]] } },
        cta("Still love black? Wear it away from your face. Find your “black” →"),
      ],
    },
    {
      n: 3,
      caption:
        "Soft and True Autumn wear the same family of colours: rust, olive, camel, teal. True Autumn wears them rich. Soft Autumn wears them as if a little grey was mixed in.\n(Painter tip: that \"grey mixed in\" is literally how I'd mix a Soft Autumn palette.) Save for shopping 🍂\n\nSave this. Free scan at seasoncard.app to see your chroma score.",
      tags: "#softautumn #trueautumn #coloranalysis #autumnpalette #colorseason",
      slides: [
        { hook: true, title: "Soft Autumn or True Autumn? The one difference.", v: { t: "fans", a: "soft-autumn", b: "true-autumn" } },
        { title: "Both are **warm.** The difference is **chroma**: how saturated the colour is.", v: { t: "chroma", a: "#C0632A", b: "#B08A70", la: "Rich", lb: "Muted" } },
        { kicker: "Soft Autumn", title: "Warm-neutral, medium, low contrast, **muted**", v: { t: "swatches", list: S["soft-autumn"].cardSwatches.map((c, i) => [c, ["Clay", "Honey", "Sage", "Soft teal"][i]]) } },
        { kicker: "True Autumn", title: "Warm, medium-deep, **rich and earthy**", v: { t: "swatches", list: S["true-autumn"].cardSwatches.map((c, i) => [c, ["Rust", "Mustard", "Olive", "Teal"][i]]) } },
        { kicker: "Same colour, two versions", title: "Orange", v: { t: "pair", a: ["#C98B6B", "Soft Autumn"], b: ["#D2691E", "True Autumn"] } },
        { kicker: "Same colour, two versions", title: "Green", v: { t: "pair", a: ["#9FA37E", "Soft Autumn"], b: ["#6D6A2F", "True Autumn"] } },
        cta("Not sure which you are? Your chroma score tells you.", "Chroma"),
      ],
    },
      {
      n: 5,
      caption: "The \"sage green everything\" trend isn't for everyone, and that's fine. Every season has *a* green. Which one have you been reaching for? 🌿\n\nFind your green. Free scan at seasoncard.app",
      tags: "#sagegreen #coloranalysis #softsummer #softautumn #colorseason",
      slides: [
        { hook: true, title: "Sage green looks grey on some people. Here's why.", v: { t: "single", c: "#9CAF88" } },
        { title: "Sage is **soft** (low chroma), **light-medium**, and slightly **warm-neutral.**", v: { t: "chroma", a: "#9CAF88", b: "#5FA36A", la: "Sage (soft)", lb: "Clear green" } },
        { kicker: "Best on", title: "Soft Autumn and Soft Summer", v: { t: "palettes", ids: ["soft-autumn", "soft-summer"] } },
        { kicker: "Good on", title: "Light Summer and Light Spring, in a lighter tint", v: { t: "pair", a: ["#9CAF88", "Sage"], b: ["#C5D1B8", "Light sage"] } },
        { kicker: "Tricky for", title: "Bright Winter and Bright Spring. It can look dusty next to clear colouring.", v: { t: "palettes", ids: ["bright-winter", "bright-spring"] } },
        { kicker: "Their green instead", title: "Bright seasons → mint or jade. Deep seasons → deep olive or forest.", v: { t: "swatches", list: [["#98E0C2", "Mint"], ["#00A36C", "Jade"], ["#4A5D23", "Deep olive"], ["#2F4F2F", "Forest"]] } },
        cta("Which green is yours? Your 36-colour palette is in the full report."),
      ],
    },
    {
      n: 6,
      caption: "This is a big reason people get different seasons from different quizzes, apps, even analysts working from photos. Light changes everything. Get the light right and the result gets more consistent. 💡\n\nSave the checklist. Try the free scan by a window at seasoncard.app",
      tags: "#undertone #coloranalysis #skinundertone #colorseason #lighting",
      slides: [
        { hook: true, title: "Warm in one photo, cool in the next? Your skin didn't change.", v: { t: "faces", tints: [["rgba(255,170,90,.35)", "Warm bulb"], ["rgba(110,150,210,.35)", "Shade"]] } },
        { title: "**Warm bulbs** push skin yellow-orange, so everyone looks warm.", v: { t: "faces", tints: [["rgba(255,160,70,.45)", "illustration"]] } },
        { title: "**Shade and overcast** push skin blue, so everyone looks cool.", v: { t: "faces", tints: [["rgba(100,140,210,.45)", "illustration"]] } },
        { title: "**Phone cameras auto-correct** white balance, and beauty filters change skin.", v: { t: "bigtext", text: "WB · AUTO", sub: "Your camera guesses the light, and often guesses wrong." } },
        { title: "Screens differ too. The same photo looks different on two phones.", v: { t: "pair", a: ["#C98B6B", "Phone A"], b: ["#C6977F", "Phone B"] } },
        { kicker: "Best light", title: "Indirect daylight, facing a window, no direct sun.", v: { t: "bigtext", text: "☀︎ → 🪟 → you", sub: "Window in front of you, not behind." } },
        { kicker: "Checklist", title: "Before any colour analysis:", v: { t: "checklist", items: ["No filter", "No (or light) makeup", "Hair visible", "Facing a window"] } },
        cta("Season Card checks your light first, then it measures."),
      ],
    },
    {
      n: 7,
      caption: "\"Find her best pink\" videos keep going viral because the right pink changes everything. No faces needed: just figure out which family you're in. A, B, C or D? 👇\n\nComment your letter. Free scan at seasoncard.app to check.",
      tags: "#pink #coloranalysis #colorseason #springcolors #summercolors",
      slides: [
        { hook: true, title: "One of these pinks is yours. 🌸", v: { t: "letters", list: [["#FF8C7A", "A"], ["#C4A0A0", "B"], ["#C08081", "C"], ["#E0218A", "D"]] } },
        { title: "Myth: \"warm undertones can't wear pink.\" Truth: **every season has a pink.**", v: { t: "bigtext", text: "✕", sub: "\"Warm skin can't wear pink\"" } },
        { kicker: "A · Springs", title: "Warm coral-pink, peach-pink", v: { t: "swatches", list: [["#F4A2A0", "Peach-pink"], ["#FF8C7A", "Coral-pink"]] } },
        { kicker: "B · Summers", title: "Cool rose, soft raspberry, powder pink", v: { t: "swatches", list: [["#EBC3CC", "Powder"], ["#C4A0A0", "Cool rose"], ["#B03A5B", "Raspberry"]] } },
        { kicker: "C · Autumns", title: "Dusty rose-brown, terracotta pink", v: { t: "swatches", list: [["#C08081", "Dusty rose"], ["#B5705A", "Terracotta pink"]] } },
        { kicker: "D · Winters", title: "Icy pink or vivid fuchsia", v: { t: "swatches", list: [["#F4D7E3", "Icy pink"], ["#E0218A", "Fuchsia"]] } },
        cta("Guess your letter in the comments 👇 then check it free."),
      ],
    },
    {
      n: 8,
      caption: "Palette-only edition of \"guess her season\". How many did you get? Drop your score /4 👇 (No peeking at slide 6.)\n\nComment your score. Free Season Card at seasoncard.app",
      tags: "#guesstheseason #coloranalysis #colorseason #colorpalette #colouranalysis",
      slides: [
        { hook: true, title: "Guess the season from the palette alone. 🤔", v: { t: "bigtext", text: "?", sub: "4 palettes · answers on slide 6" } },
        { kicker: "Palette 1", title: "Guess!", v: { t: "letters", list: [["#F7C59F", ""], ["#9ED9CC", ""], ["#F5E1A4", ""], ["#F4A2A0", ""]] } },
        { kicker: "Palette 2", title: "Guess!", v: { t: "letters", list: [["#6D0F2B", ""], ["#000000", ""], ["#009B77", ""], ["#1B2A4A", ""]] } },
        { kicker: "Palette 3", title: "Guess!", v: { t: "letters", list: [["#7D8FA3", ""], ["#A28CA0", ""], ["#C4A0A0", ""], ["#9C8F87", ""]] } },
        { kicker: "Palette 4", title: "Guess!", v: { t: "letters", list: [["#B7410E", ""], ["#D4A017", ""], ["#708238", ""], ["#1F6F6B", ""]] } },
        { kicker: "Answers", title: "How many did you get?", v: { t: "answers", list: [[["#F7C59F", "#9ED9CC", "#F5E1A4", "#F4A2A0"], "Light Spring"], [["#6D0F2B", "#000000", "#009B77", "#1B2A4A"], "Deep Winter"], [["#7D8FA3", "#A28CA0", "#C4A0A0", "#9C8F87"], "Soft Summer"], [["#B7410E", "#D4A017", "#708238", "#1F6F6B"], "True Autumn"]] } },
        cta("Now get your own 4-colour card."),
      ],
    },
  ];
};
