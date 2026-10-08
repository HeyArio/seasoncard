# TikTok viral playbook (Season Card)

Goal: views → profile visits → typed "seasoncard.app" → free scan → $9.99 report. Honesty rules in rules.md always apply
(no fake reviews, before/afters, accuracy %, or real faces).

## Formats, ranked by what has worked (update as data comes in)
1. **Season vs season** ("Soft Autumn or True Autumn? The one difference"): 825 views, second best (4 Oct).
2. **Trend colour × season** ("Sage green looks grey on some people"): best post so far, 1,404 views, 17 likes, 2 comments (4 Oct). Make this the top format; next: cherry red, mocha, olive, cobalt.
3. **Pick-a-letter** (A/B/C/D on slide 1, answers on slides 3–6, "comment your letter"): built for comments.
4. **"5 signs you're a ___"** identity series (one per season = 12 posts): built for shares ("this is so me") and search.
5. **Quiz** ("Guess the season from the palette", score /4): built for comments and replays.
6. **Hot take** ("Stop wearing pure white", "Navy is the new black"): mild contrarian hook, built for saves.

**Data, 7 Oct (Metricool columns are views, likes, comments, shares; earlier log entries wrongly read comments as 0):** sage green trend 1,551 views / 21 likes / 8 comments is still #1; guess-my-season lead post (post 39) 689 / 1 / 8 is the best for comments; season-vs-season 760-870 views / 3-7 likes / 1-3 comments is steady; "5 signs" 230-850; painter founder post 377 / 5 / 5 comments / 15 shares; Soft vs True Autumn has 39 shares (best shared). Next batch used: rust, emerald, lavender, denim (trend colours), 3 season-vs-season, compliments lead post.

**Data, 8 Oct (17 posts, 11.6k views total; 7 Oct posts not yet synced):** nothing new above 1,551 (sage green). By engagement rate (likes+comments+shares / views) the leaders are the painter founder post (6.6%, 15 shares) and Soft vs True Autumn (6.0%, 39 shares): shares are what the audience gives, so keep season-vs-season and founder content (videos 13-15). 5 signs remain weakest on views (228-850).

7. **Guess-my-season comment post** (post 39, 4 Oct): built for leads, since every comment gets a personal reply and the REVIEW offer. Test, then repeat weekly if it pulls comments.

## Rules for every post
- Slide 1 = the whole hook in under 10 words, with a curiosity gap or a direct "you". The visual alone must make sense.
- 7 slides: hook → why → 4 value slides → CTA mock. Slide 7 is a price ladder (free scan, $9.99 report, $29 Personal Review, button "Comment REVIEW"), rendered by render.mjs; footer "Season Club: comment your season". Call the community "Season Club" ("Season Club: comment your season"); TikTok only until 1,000 followers. Every value slide should be screenshot-worthy (save trigger).
- Caption: line 1 restates the hook, then one question that is easy to answer in a word or letter ("Comment your letter"),
  then "Want a personal colour review? Comment REVIEW 🎨" (sales mode, 4 Oct), then "Free scan at seasoncard.app (link in bio)", then a plain-text search line ("soft autumn color palette · am I a soft autumn"),
  then 4–5 hashtags (1 broad #coloranalysis, 1 #colorseason, 2–3 specific).
- `autoAddMusic: true`, `commercialContentOwnBrand: true`, title = the hook.
- Never claim accuracy, popularity numbers or trends we can't source. "you might be" not "you are".

## Cadence
- 4 TikTok posts/day from 4 Oct: 12:00, 16:00, 19:00, 21:00 America/New_York. Always ≥5 days queued at all 4 slots.
  Research (4 Oct): more posts lift total views with diminishing returns; 2–4 distinct posts/day is the safe range, so don't go above 4 with near-duplicates.
- Rotate formats so no two posts in a row share a format. Series (5 signs, guess part N) run every 2–3 days.
- Each run: rank posts by views and by (likes+comments+shares)/views; make 60% of the next batch the top format,
  40% new experiments. Retire a format after 3 posts below the median.

## Next ideas queue
- 5 signs: Bright Winter, Light Spring, Bright Spring, True Winter, True Autumn (True Summer and Deep Autumn queued 12-13 Oct)
- Trend colours: cherry red, chocolate vs black, mustard, teal, coral, mint (done: mocha, olive, cobalt, pistachio, plum, grey, camel coat, rust, emerald, lavender, denim)
- Season vs: Light Spring vs Bright Spring, Soft Summer vs True Summer, Soft Autumn vs Soft Summer (True Summer vs True Winter and True Autumn vs True Spring queued 11 and 13 Oct)
- Pick-a-letter: denim wash, lipstick nude, hair colour, eyeshadow, metals
- Quiz: guess the season part 3 (all Autumns), "which palette is fake?"

## Research notes (4 Oct 2026)
- Ranking: completion/rewatches, then shares, saves and comments count more than likes. Design slide 1 to make people swipe and the last slide to make them comment.
- TikTok search reads the first ~50 characters of the caption and the on-screen text: start captions with the exact search phrase ("Sage green…", "Soft Autumn color palette").
- Carousel vs video: the studies disagree, so keep both. Carousels for "save this palette"; Saman's hand-swatch videos for reach.
- Sales: the account is a TikTok Business account with a website link in the bio (Saman, 4 Oct), so every caption says "link in bio". Comment-to-DM automation (ManyChat) isn't available for most regions; the "DM me a keyword" trigger works. TikTok Shop doesn't allow digital products.
- Promote: about $3/day minimum. Only boost a post that is already winning organically, $20–50 total as a test.

## Video track (sales mode)
Faceless hand-only videos, scripts in marketing/videos.md (3 new per run). Offer, DM scripts and Saman's routine: marketing/offer.md.
