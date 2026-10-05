/** Evergreen how-to guides. Answer first, short sections, FAQ at the end (used for FAQ structured data). */
export interface Guide {
  slug: string;
  title: string;
  description: string;
  answer: string;
  sections: { h: string; p: string[]; list?: string[] }[];
  faq: { q: string; a: string }[];
  related: string[]; // season ids
}

export const GUIDES: Guide[] = [
  {
    slug: "what-colour-season-am-i",
    title: "What colour season am I? How the 12 seasons are worked out",
    description:
      "Your colour season comes from four measurements: undertone, depth, contrast and chroma. Here's how each one works and how to find yours.",
    answer:
      "Your colour season is the combination of four things about your natural colouring: undertone (warm or cool), depth (light or deep), contrast (how different your skin, hair and eyes are) and chroma (whether clear or muted colours suit you). Those four together place you in one of 12 seasons.",
    sections: [
      {
        h: "The four measurements",
        p: ["Painters describe colour with the same four questions. Seasonal colour analysis simply applies them to your face."],
        list: [
          "Undertone: does your skin lean golden (warm) or pink-blue (cool)?",
          "Depth: how light or deep are your skin, hair and eyes taken together?",
          "Contrast: how different are they from each other?",
          "Chroma: do clear, bright colours suit you, or soft, muted ones?",
        ],
      },
      {
        h: "From four answers to twelve seasons",
        p: [
          "The four families are Spring (warm, clear), Summer (cool, soft), Autumn (warm, muted) and Winter (cool, clear). Each family splits into three, depending on which trait is strongest: Light, True, Bright, Soft or Deep.",
          "A Soft Autumn, for example, is warm-neutral, medium depth, low contrast and muted. A Bright Winter is cool-neutral, medium depth, high contrast and very clear.",
        ],
      },
      {
        h: "How to get a fair result",
        p: ["Light matters more than anything else. Use soft daylight from a window in front of you, no filter and little or no makeup, with your hair visible."],
      },
    ],
    faq: [
      { q: "How many colour seasons are there?", a: "The most common system uses 12 seasons: three each for Spring, Summer, Autumn and Winter." },
      { q: "Can my colour season change?", a: "Your natural colouring is fairly stable, but dyed hair, a tan or ageing can shift which colours look best. Re-check in daylight if your colouring changes." },
      { q: "Is a photo enough to find my season?", a: "A good daylight photo with no filter gives a useful starting point. Treat any result as guidance and check it against how colours look on you in real light." },
    ],
    related: ["soft-autumn", "true-winter", "light-spring"],
  },
  {
    slug: "how-to-find-your-undertone",
    title: "How to find your undertone (and why it changes in photos)",
    description: "Warm, cool or neutral? The reliable at-home undertone tests, why the vein test misleads, and why photos make you look warmer or cooler.",
    answer:
      "To find your undertone, look at your bare skin in indirect daylight and compare how warm (golden, peachy) and cool (pink, blue-red) colours make it look. If warm colours make your skin look even and glowing, you likely have a warm undertone; if cool colours do, a cool one; if both work, you may be neutral.",
    sections: [
      {
        h: "Why your undertone looks different in every photo",
        p: [
          "Warm light bulbs push skin yellow-orange, so everyone looks warm. Shade and overcast light push skin blue, so everyone looks cool. Phone cameras also auto-correct white balance, and beauty filters change skin tone.",
          "That's a big reason people get different answers from different quizzes. Fix the light and results get more consistent.",
        ],
      },
      {
        h: "Tests that work",
        p: ["Do these facing a window, with no direct sun and no makeup."],
        list: [
          "Metal test: hold gold and silver (or foil) under your chin. Whichever makes your skin look more even points to your undertone.",
          "Fabric test: compare a warm colour (camel, peach) with a cool one (grey-blue, rose) next to your face.",
          "White test: pure white versus cream. Cool undertones usually suit pure white; warm undertones often look better in cream.",
        ],
      },
      {
        h: "Why the vein test is unreliable",
        p: ["Vein colour depends on lighting, skin thickness and the room you're in, so it often gives the wrong answer. Use the metal or fabric test instead."],
      },
    ],
    faq: [
      { q: "What is a neutral undertone?", a: "A neutral undertone sits between warm and cool, so both gold and silver can look fine. Neutral-leaning seasons include Soft Autumn and Soft Summer." },
      { q: "Is undertone the same as skin tone?", a: "No. Skin tone is how light or deep your skin is. Undertone is the warm or cool cast underneath, and any skin tone can have any undertone." },
    ],
    related: ["soft-summer", "soft-autumn", "true-spring"],
  },
  {
    slug: "gold-or-silver-jewellery",
    title: "Gold or silver? The jewellery test that actually works",
    description: "How to tell whether gold or silver suits you, what it means if both work, and the best metal for each colour season.",
    answer:
      "Hold real gold and silver (or kitchen foil) under your chin in indirect daylight, one at a time, and look at your skin rather than the metal. If gold makes your skin look even and glowing, you likely suit warm metals; if silver does, cool metals; if both look fine, you're probably neutral and rose gold or brushed metals will suit you.",
    sections: [
      {
        h: "How to run the test",
        list: ["Daylight, no direct sun", "No filter, bare skin", "One metal at a time", "Look at your skin, not the metal"],
        p: [],
      },
      {
        h: "What the result means",
        p: [
          "Gold winning points to warm seasons: Springs and Autumns. Silver winning points to cool seasons: Summers and Winters. If both look fine, look at the Soft seasons, which sit close to neutral.",
          "Finish matters too: softer, muted seasons often look best in brushed or matte metal, while clear, high-contrast seasons can wear high shine.",
        ],
      },
    ],
    faq: [
      { q: "Can I wear silver if I'm warm?", a: "You can wear anything you like. Colour analysis only suggests what tends to make your skin look most even. Brushed or mixed metals are an easy middle ground." },
      { q: "What about rose gold?", a: "Rose gold mixes warm and cool, so it often suits neutral undertones and the Soft seasons." },
    ],
    related: ["soft-autumn", "true-winter", "deep-autumn"],
  },
  {
    slug: "is-black-bad-on-me",
    title: "Is black bad on you? Who it suits and what to wear instead",
    description: "Why black looks great on some people and harsh on others, which seasons suit it, and the best near-black for every season.",
    answer:
      "Black isn't bad. It is simply the deepest, highest-contrast neutral there is, so it suits deep, high-contrast colouring (mostly the Winter seasons) and can look harsh near the face on softer or lighter colouring. If that's you, a near-black such as espresso, charcoal or deep navy does the same job with less shadow.",
    sections: [
      {
        h: "Who suits black",
        p: ["Pure black lives mainly in the Deep Winter, True Winter and Bright Winter palettes, where high contrast is part of the look."],
      },
      {
        h: "What to wear instead",
        list: [
          "Autumns: espresso, dark chocolate, deep olive",
          "Summers: charcoal, deep navy, slate",
          "Springs: warm navy, chocolate, dark teal",
        ],
        p: [],
      },
      {
        h: "Still love black?",
        p: ["Wear it away from your face (trousers, shoes, bags) and put a colour from your palette near your face."],
      },
    ],
    faq: [
      { q: "Why do I look tired in black?", a: "If your colouring is soft or light, the strong contrast of black can cast shadows near your face. A softer dark neutral usually looks fresher." },
      { q: "Which season looks best in black?", a: "The Winter seasons, especially True Winter and Deep Winter, tend to wear pure black best." },
    ],
    related: ["deep-winter", "true-winter", "soft-autumn"],
  },
  {
    slug: "best-light-for-colour-analysis",
    title: "The best light for colour analysis (and a 4-step checklist)",
    description: "Lighting changes your colour season result more than anything else. The best light for a colour analysis selfie, and what to avoid.",
    answer:
      "The best light for colour analysis is soft, indirect daylight from a window in front of you, with no direct sun, no filter and little or no makeup. Warm bulbs, shade and beauty filters all shift your skin's apparent undertone and can give you the wrong season.",
    sections: [
      {
        h: "The checklist",
        list: ["No filter", "No (or light) makeup", "Hair visible", "Facing a window"],
        p: [],
      },
      {
        h: "Lights to avoid",
        p: [
          "Warm indoor bulbs make everyone look warmer. Deep shade and overcast evenings make everyone look cooler. Ring lights and phone beauty modes smooth and recolour skin.",
          "Screens differ too: the same photo can look warmer on one phone than another, which is why measuring the photo beats eyeballing it.",
        ],
      },
    ],
    faq: [
      { q: "What time of day is best?", a: "Late morning to early afternoon on a bright day, sitting facing a window rather than in direct sun." },
      { q: "Should I wear makeup?", a: "Little or none. Foundation, blush and bronzer change the colours being measured." },
    ],
    related: ["light-summer", "true-autumn", "bright-spring"],
  },
  {
    slug: "who-can-wear-sage-green",
    title: "Who can wear sage green? The season-by-season answer",
    description: "Sage green flatters some colouring and washes out others. Which seasons suit it, which should pick a different green, and how to test it on your face.",
    answer:
      "Sage green, a soft grey-green, tends to suit the muted seasons best: Soft Summer and Soft Autumn. High-contrast, clear colouring (Bright Winter, True Winter, Bright Spring) often finds it dull or grey, and a clearer green such as emerald or leaf green usually works better. Every season has a green that suits it; sage is just the Soft one.",
    sections: [
      {
        h: "Why sage green looks grey on some people",
        p: [
          "Sage is a low-chroma colour: green with a lot of grey mixed in. Against softly coloured skin, hair and eyes it blends in and looks calm. Against high-contrast or very clear colouring it can look flat, and some people look tired next to it.",
        ],
      },
      {
        h: "Which seasons it tends to suit",
        p: ["These are tendencies, not rules. Your own skin in daylight is the final test."],
        list: [
          "Soft Summer: the cooler, greyer sage, with a blue-grey cast.",
          "Soft Autumn: the warmer, slightly olive sage.",
          "Light Summer and Light Spring: a lighter, fresher sage or mint instead.",
          "Deep Autumn: a darker moss or olive instead of pale sage.",
          "Winter seasons: an emerald, pine or teal instead.",
        ],
      },
      {
        h: "A quick test at home",
        p: [
          "Hold a sage green fabric under your chin by a window, no filter and no makeup. If your skin looks even and your eyes look brighter, it likely works. If shadows under your eyes look darker or your face looks greyer, try a clearer or deeper green.",
        ],
      },
    ],
    faq: [
      { q: "Does sage green suit warm or cool undertones?", a: "Both can wear it, in different versions: a warmer olive-leaning sage for warm undertones and a cooler blue-grey sage for cool ones." },
      { q: "What green should I wear instead if sage looks grey on me?", a: "Clear colouring usually does better in a more saturated green such as emerald or leaf green. Deeper colouring does better in moss, pine or olive." },
    ],
    related: ["soft-summer", "soft-autumn", "light-summer"],
  },
];

export function findGuide(slug: string): Guide | undefined {
  return GUIDES.find((g) => g.slug === slug);
}
