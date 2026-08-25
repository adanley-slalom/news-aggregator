# Task: Filter out paywalled articles in news-aggregator

## Context (read first)

This repo pulls headlines from 8 Google News RSS topic feeds and duplicates the
same fetch/categorize/select logic in two places that must stay in sync:

- `api/news.js` — Vercel serverless handler (production)
- `server/server.js` — Express server (local dev, port 5001)

Each returns article objects shaped like:

```js
{
  id: "TECHNOLOGY-0",
  title: "...",
  description: "...",
  link: "...",
  category: "technology",
  score: 100,
  source: "The Wall Street Journal"   // human-readable publisher name from <source> in the RSS item
}
```

**Important nuance:** `link` is a Google News redirect URL
(`https://news.google.com/rss/articles/...`), not the publisher's real
domain — so paywall detection must key off the `source` field (the
publisher's display name), not the link's hostname.

## Goal

`/api/news` (both `api/news.js` and `server/server.js`) should never return
an article from a known paywalled publisher.

## Implementation

1. **Create a new shared module** at `shared/paywallFilter.js` (plain
   CommonJS, no dependencies) that exports:
   - `PAYWALLED_PUBLISHERS`: an array of lowercase strings — publisher names
     or distinctive substrings to match against the `source` field. Seed it
     with (dedupe/alphabetize as you like):
     ```
     the new york times, wall street journal, the wall street journal,
     washington post, financial times, bloomberg, the economist,
     the athletic, business insider, barron's, the information,
     harvard business review, wired, los angeles times, boston globe,
     the times, new yorker, foreign policy, the atlantic, statnews,
     consumer reports
     ```
   - `isPaywalledSource(sourceName)`: case-insensitive check that returns
     `true` if `sourceName` contains any entry from `PAYWALLED_PUBLISHERS`.

2. **Wire it into both `fetchNewsFromFeeds()` functions** (in `api/news.js`
   and `server/server.js`). Inside the `items.forEach(...)` loop, after
   `source` is derived and before `articles.push(...)`, skip the article if
   `isPaywalledSource(source)` is true. Keep a counter of skipped articles
   per run and log a single summary line (e.g.
   `Filtered 6 paywalled articles`) — don't log per-article.

3. **Require the shared module with a relative path** from each file
   (`../shared/paywallFilter.js`). Do not duplicate the array in both files —
   that's exactly the drift `categoryKeywords` already has, don't repeat it.

4. **Make it toggleable** via `process.env.FILTER_PAYWALLED`. Default to
   filtering ON when the env var is unset; only skip the filter step if it's
   explicitly `'false'`.

5. **Leave `selectDiverseArticles()` untouched.** Filtering happens upstream
   in `fetchNewsFromFeeds()`, so paywalled articles never enter the
   candidate pool and the existing scoring/diversity logic doesn't need to
   change.

6. **Don't add live per-article HTTP checks** (e.g., fetching each article
   page to look for paywall meta tags). With 8 feeds × ~20-30 items each,
   that's 150+ extra requests per 30-minute cache refresh and risks timeouts
   on the Vercel function. The static publisher-name list is the intended
   approach for this task.

7. **Update `README.md`**: add a bullet to the Features list, e.g.
   `**Paywall Filtering** - Articles from known paywalled publishers are
   automatically excluded (list in shared/paywallFilter.js)`.

## Acceptance criteria

- Neither `/api/news` (Vercel) nor `http://localhost:5001/api/news` (Express)
  ever returns an article whose `source` matches an entry in
  `PAYWALLED_PUBLISHERS`.
- No new network calls are added per article.
- The publisher list exists in exactly one file, required by both handlers.
- Setting `FILTER_PAYWALLED=false` restores current (unfiltered) behavior.
- Caching, category classification, and the 16-article diverse selection
  behave exactly as before for non-filtered articles.

## Before you start — confirm one design choice with me

The task above **omits** (drops) paywalled articles entirely, per the
request. An alternative is to keep them but tag them (e.g., add
`paywalled: true` to the object) and let the React client show a lock icon
instead of hiding the story. If you'd rather do that, say so before
generating the diff — it changes both the backend filter step and
`client/src/components/NewsAggregator.js`.
