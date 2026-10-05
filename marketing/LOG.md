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

## 2026-10-04
- **Published so far:** posts 1, 2, 3, 5 (29 Sep to 2 Oct). Post 6 (3 Oct, 19:00) is not in Metricool analytics yet (still syncing).
- **Metrics (Metricool, TikTok):** post 3 Soft vs True Autumn 795 views / 7 likes; post 5 sage green 762 / 10; post 2 black 399 / 2; post 1 four measurements 354 / 1. Total 2,310 views, 20 likes, 0 comments, 0 shares. Nothing near 2,000 on a single post. Best by views: season-vs-season. Best by engagement rate: sage green (1.3%).
- **Queue:** TikTok runs to 10 Oct at all three slots (12:00, 16:00, 19:00), 6 days ahead, so no new posts were written. Next batch (due from ~7 Oct): more season-vs-season and trend colours from the viral.md queue.
- **SEO:** not a Monday and no format has clearly won yet, so no new page this run.
- **Repo:** links in deploy/native-install.sh, i.sh and marketing/SCHEDULE.md now point to HeyArio/seasoncard (one-time job).
- **Site check:** could not run. The sandbox egress proxy blocks seasoncard.app (WebFetch and curl). Third run in a row without a site check.

## 2026-10-04 (sales mode run)
- **Metrics (Metricool, TikTok):** unchanged since the earlier 4 Oct entry: post 3 795 views / 7 likes, post 5 762 / 10, post 2 399 / 2, post 1 354 / 1, plus an older post at 682 views / 0 likes. 0 comments and 0 shares on every post. No post near 2,000 views. Best by views: season-vs-season (post 3). Best by engagement rate: sage green (post 5). Post 6 (3 Oct 19:00) not synced yet.
- **Queue:** TikTok runs to 10 Oct at all three slots (6 days incl. today), so no new posts written. The next batch is due from about 7 Oct.
- **Sales mode:** added marketing/offer.md (Personal Season Review $29 for the first 20 clients then $39, DM scripts, Saman's daily routine, review template, client tracker) and marketing/videos.md (3 scripts: drape test, "stop buying these if you might be a Soft Autumn", founder story). No palette cards were needed. Added the REVIEW line to all 18 queued TikTok posts from 5 Oct onward via updateScheduledPost (times and media unchanged). Posts of 6 Oct 12:00 and 8 Oct 19:00 had no comment question, so they only got the REVIEW line. The CTA slide footer in render.mjs now reads "Free scan: seasoncard.app · Personal review: comment REVIEW" for new posts. viral.md updated.
- **SEO:** not a Monday and no format has clearly won, so no page this run. No site changes are waiting for a release.
- **Site check:** not checked. The sandbox egress proxy blocks seasoncard.app (fourth run in a row).
- **Notify:** no comments, no post above 2,000 views, no sale visible, no failure, so no notification.

## 2026-10-04 (evening run)
- **Metrics (Metricool, TikTok):** sage green trend post 1,404 views / 17 likes / 2 comments / 0 shares (best by views and engagement, first post with comments); Soft vs True Autumn 825 / 9 / 0; undertone-in-photos 715 / 4 / 0; black 413 / 3 / 0; painter post 366 / 1 / 0; a newer sage green post 259 / 2 / 0. About 3,980 views in total. No post at 2,000 yet.
- **Ranking:** trend colour (sage) beats season-vs-season, which beats the explainers. viral.md ranking updated; trend colours are now the top format for the next batch.
- **Queue:** TikTok runs to 10 Oct at all three slots (6 days), all posts from 5 Oct carry the REVIEW line. No new posts needed. The next batch is due about 7 Oct: trend colours first (cherry red, mocha, olive, cobalt), then comparisons.
- **Sales mode:** 3 new video scripts added to videos.md (greens drape test, "stop buying if Light Summer", reply-to-comment on the sage green post). No palette cards needed.
- **SEO:** not a Monday, so no page. Candidate for Monday: a "who can wear sage green" guide.
- **Site check:** not checked, the egress proxy blocks seasoncard.app (fifth run in a row).
- **Notify:** yes, comments on the sage green post.

## 2026-10-04 (Saman: "more posts, likes and sales")
- **Today's posts weren't missing:** today's slots are 12:00, 16:00 and 19:00 ET, and it was 09:00 ET at the time of this run, so posts 14, 19 and 7 hadn't gone out yet.
- **Volume up:** 4th daily slot at 21:00 ET. Wrote, rendered, checked and scheduled posts 29–38 (7 trend colours, the winning format: mocha, olive, cobalt, plum, pistachio, grey, camel coat; plus Bright Spring vs Bright Winter, Deep Autumn vs Deep Winter, 5 signs Soft Summer). Queue: 4/day through 10 Oct, 21:00 only from 11 to 13 Oct. The contact-sheet check caught 4 slide titles and 2 captions that didn't match the swatches; all fixed before scheduling.
- **Research:** written into viral.md (ranking signals, TikTok SEO, frequency, bio-link rules, ManyChat, Promote).
- **Needs Saman (can't be automated from here):** (1) reply to the 2 sage comments; (2) TikTok Business account + business registration for a clickable website link before 1,000 followers; (3) connect ManyChat (TikTok channel, open beta) for automatic DM replies to the keyword "SEASON"; (4) a pinned comment on each post: "Free scan: seasoncard.app · DM me SEASON for a personal review"; (5) optional $20–30 TikTok Promote on the best post (sage green) with the website-visits goal.
- **Later 4 Oct:** Saman confirmed @seasoncard.app is a Business account with a bio link (Metricool can't show the bio and the sandbox blocks tiktok.com, so it wasn't checked directly). All 31 queued TikTok captions now say "seasoncard.app (link in bio)", and today's 3 posts also got the REVIEW line. New slides' CTA footer reads "Free scan: link in bio". Account data from Metricool: 36 followers (+4 since 2 Oct), 17 profile views, sage green post best at 1,404 views. Average watch time is 7–15s on the carousels.
- **4 Oct:** Saman pinned the CTA comment (free scan link in bio + DM SEASON) and replied to the 2 comments on the sage green post. Pinning is now step 1 of his daily routine in offer.md.
- **4 Oct 20:00 ET (Saman: "get a lead"):** today's posts not synced to Metricool yet, so no new comments visible. Made post 39, a lead post ("Comment your hair, eyes and skin, I'll guess your season"), scheduled 22:30 ET tonight. Every comment is a lead Saman replies to; reply table and template in offer.md. If it pulls comments, make it a weekly format.

## 2026-10-05 (Monday run)
- **Metrics (Metricool, TikTok):** unchanged from the 4 Oct evening entry: sage green 1,404 views / 17 likes / 2 comments (already replied to), Soft vs True Autumn 825 / 9, undertone-in-photos 715 / 4, black 413 / 3, painter 366 / 1, newer sage post 259 / 2. About 3,980 views in total; no new comments, no post near 2,000. Today's posts had not gone out yet at run time (06:20 UTC).
- **Queue:** 4 posts a day at 12:00, 16:00, 19:00, 21:00 ET through 10 Oct, plus 21:00 only on 11–13 Oct; all carry the REVIEW line. No new posts needed.
- **SEO (Monday):** added guide /guides/who-can-wear-sage-green (answers the best-performing post's question). tsc and vitest pass (50 tests). On main, not released: needs a release.
- **Sales mode:** videos 7–9 added to videos.md (drape test whites, stop buying if Deep Winter, founder short cut). No palette cards needed.
- **Site check:** not checked, egress proxy blocks seasoncard.app.
