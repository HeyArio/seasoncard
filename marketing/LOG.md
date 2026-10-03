# Growth log

## 2026-09-30
- **Published:** post 1 ("Your colour season is 4 measurements", TikTok photo carousel, 29 Sep 19:00 ET). Post 2 goes out tonight.
- **Metrics:** Metricool's TikTok analytics don't show post 1 yet (under 24h old, still syncing). The only TikTok item in analytics is an older 21 Sep video on @nazarbanai: 672 views, 0 likes/comments/shares, 98% For You traffic. No Season Card post data yet, so no best performer.
- **Changed:** queue ran to 5 Oct (5 days ahead). Rendered and scheduled posts 9 (Soft Summer vs Soft Autumn), 11 (gold vs silver), 12 (celebrity seasons) and 13 (burgundy), 6–9 Oct at 19:00 ET. Queue now runs to 9 Oct.
  - Post 12: removed the named celebrity and the press quote from the script and kept it general, so there's no claim we would have to source.
  - Post 12's face slide is labelled "illustration" per rules.md.
  - Post 11 uses the real per-season metals from seasons.json.
  - Renderer now reads APP from the environment (default: repo root), takes ONLY=9,11 to render a subset, and has a `table` visual plus a `note` line on the card mock.
- **Site check:** couldn't run this time (WebFetch permission timed out in the unattended run). Needs checking next run.
- **Why:** there's no performance data yet, so posts ran in posts.md order. Two posts (7, 11) ask for a comment reply, which the algorithm rewards on new accounts. The 12:00 slot waits until posts have data.

## 2026-10-03
- **Published so far:** posts 1, 2, 3 and 5 (29 Sep to 2 Oct, 19:00 ET). Post 6 (undertone in photos) goes out tonight.
- **Metrics (Metricool, TikTok photo carousels; the connector doesn't expose saves):**
  - Post 3, Soft vs True Autumn: 795 views, 7 likes, 0 comments, 0 shares
  - Post 5, sage green: 762 views, 10 likes, 0 comments, 0 shares (under 24h old)
  - Post 2, is black bad on you: 399 views, 2 likes
  - Post 1, 4 measurements: 354 views, 1 like
  - Total: 2,310 views and 20 likes. Over 99% of views came from For You.
- **Best performers:** the season-vs-season comparison (post 3) and the trend-colour post (post 5). Each got about 2x the views of the explainer and myth posts (1, 2). No post has a comment yet.
- **Changed:** nothing in the queue. Posts 6–13 are scheduled through 9 Oct, which is 6 days ahead, so no new posts were needed. The queue already leans toward what works: 7 (pinks), 9 (Soft Summer vs Soft Autumn) and 13 (burgundy). The next batch should be more comparisons and trend colours, e.g. "True Winter vs Deep Winter", "Which season is chocolate brown for?" and "Which season is butter yellow for?".
- **12:00 slot:** not yet. Views are still in the hundreds. Add a second slot once a post clears ~2k views, or once comparisons hold up on posts 9 and 13.
- **Site check:** the WebFetch permission timed out again in the unattended run, so the site wasn't checked (second run in a row).
- **Later 2026-10-03 (push for the first sale, at Saman's request):**
  - Diagnosis: 2.3k TikTok views but no clickable link, so very few people reach the site.
  - Added Instagram Reels and Facebook posts of posts 3 and 5 (12:00 and 20:00 ET). The Facebook posts link to seasoncard.app/?ref=fb, so any Facebook sale shows up separately in the admin summary.
  - The result page now previews the paid report: 6 palette colours, the other 30 blurred, and one colour to skip with the reason. Release eba09be, live on the server.
  - Second daily slot opened (12:00 ET, 4–8 Oct): posts 14–18, built on the formats that work (comparisons, trend colours, "pick your letter" comment prompts). Each one goes to TikTok, Instagram (carousel) and Facebook (with the clickable ?ref=fb link).
  - SEO release da68920 is live: 12 season pages, 14 comparison pages, 5 guides, /seasons and /guides indexes, structured data (WebApplication + Offer, FAQPage, Article, BreadcrumbList), llms.txt, a sitemap with 38 URLs and an IndexNow key file. Still to do: Google Search Console verification (needs Saman's code) and the IndexNow submission (run from the server; this sandbox can't reach api.indexnow.org).
  - Saman set the focus to TikTok + SEO/AEO/GEO and turned Instagram off. The two IG reels were set to draft, and posts 14–18 were moved to TikTok only.
  - Viral batch: posts 19–28 (the "5 signs" series for Soft Autumn, Deep Winter, Light Summer and True Spring; whites; navy; pick-a-colour; guess part 2; closet; orange). Added a third daily TikTok slot at 16:00 ET. The TikTok queue now runs to 10 Oct (2–3 posts a day). Playbook written to marketing/viral.md.
