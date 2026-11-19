# Serbian news coverage collector (prototype)

Watches ~30 Serbian outlets, picks up fresh articles automatically, groups articles about the
same event into stories, and shows which camp covers each story. It also flags **Blindspots**:
stories that only one side is covering.

No installs needed. It uses plain Python 3 (already on macOS).

## Run it

```bash
cd ~/Downloads/news-collector      # wherever you unzipped it
python3 collector.py check         # 1. test every feed (OK / FAIL)
python3 collector.py run           # 2. collect + build report.html
open report.html                   # 3. look at the result
python3 collector.py watch --every 15   # keep it running, refresh every 15 min
```

The first `run` only sees what is in the feeds right now (usually the last 20–50 articles per
outlet). Leave `watch` running for a few hours and stories fill out as more outlets cover them.

## Files

- `collector.py`: the whole pipeline (fetch → store → normalise → cluster → report)
- `sources.json`: the outlet list. Edit it to add outlets, fix feed URLs, or change camps
- `news.db`: SQLite database of every article collected (created on first run)
- `report.html`: the latest report

## How it works

1. **Collect.** Reads each outlet's RSS/Atom feed. If a feed URL is missing or broken, it finds the
   feed from the homepage (`<link rel="alternate">`, then common paths like `/feed/`, `/rss`).
   Working feed URLs are remembered in the database.
2. **Store.** Each article is saved once (keyed by cleaned URL, tracking parameters removed).
3. **Normalise.** Cyrillic is converted to Latin, diacritics are removed, stop words are dropped,
   and a light stemmer handles Serbian case endings ("Novi Sad" = "u Novom Sadu").
4. **Cluster.** TF-IDF vectors plus time-ordered centroid clustering (30h window). Tune
   `threshold` in `cluster()`: lower merges more, higher splits more.
5. **Analyse.** Each outlet counts once per story. Coverage split by camp, plus a Blindspot when
   3+ outlets cover a story and one camp has zero.
6. **Report.** The story headline is the one most similar to all the others, so no camp's framing
   is preferred.

## Known limits (next steps)

- Feed URLs for some outlets are guesses and autodiscovery may not find them. Check `check` output
  and fix them in `sources.json`.
- Word-based matching misses stories described with completely different words. Swapping in
  multilingual embeddings (e.g. `sentence-transformers`) is the main upgrade.
- Camps are starting labels, not measured scores. Several critical outlets changed owners in
  Aug 2026, so review them.
- No TV coverage yet (Pink, Informer TV, morning shows).

## Website

`site/index.html` is the website ("Obe strane" is a placeholder name). Every `run`, `report` or
`watch` cycle rewrites `site/data.js`, and an open page reloads that data every 5 minutes.

```bash
open site/index.html
```

Pages: home feed (`#/`), story page with a side-by-side headline comparison (`#/vest/<id>`),
Blindspots (`#/blindspot`) and Sources (`#/izvori`). Plain HTML/CSS/JS, no build step.
Article images come from the outlets' feeds and pages, and only articles collected from this
version onward have them.

## Putting it online (GitHub Pages, free)

`.github/workflows/collect.yml` runs the collector every 15 minutes on GitHub's servers and
publishes `site/` to GitHub Pages. The article database is kept in the Actions cache, and
articles older than 14 days are pruned.

1. Create a **public** GitHub repository (Pages on private repos needs a paid plan) and push this folder.
2. Repository → Settings → Pages → Source: **GitHub Actions**.
3. Actions tab → "Collect news and publish site" → **Run workflow** for the first run.
4. The site appears at `https://<username>.github.io/<repo>/`.

Notes:
- GitHub turns off scheduled workflows after 60 days without commits. Push any small change to wake it up.
- GitHub's servers are in the US. If an outlet blocks them, the Actions log shows that outlet as
  FAILED. The fallback is a small EU server (e.g. Hetzner, ~€4/month) running
  `python3 collector.py watch` and serving `site/` with any static web server.

## AI summaries (optional)

Add a repository secret `ANTHROPIC_API_KEY` (Settings → Secrets and variables → Actions) to turn on the
"Ukratko" summaries and the camp framing on story pages and in the morning briefing. Only the ~25 biggest
stories are summarised, and each one again only when 3+ new outlets join it. Without the key the site works
the same, just without those boxes. Model: `OBE_AI_MODEL` (default `claude-haiku-5-5`).

## Logos

Drop `site/logos/<source id>.png` (or .svg/.jpg/.webp, square, 128px+) and push; it replaces the site icon.
