#!/usr/bin/env python3
"""
Serbian news coverage collector - prototype.

Watches a list of outlets, pulls fresh articles from their RSS/Atom feeds,
groups articles about the same event into "stories", and shows how each
camp (pro-government / critical / public / mixed) is covering them.

Pure Python standard library - no installs needed (Python 3.9+).

Usage:
  python3 collector.py collect            # fetch new articles once
  python3 collector.py report             # cluster + write report.html
  python3 collector.py run                # collect + report
  python3 collector.py watch --every 15   # repeat every 15 minutes
  python3 collector.py check              # test every feed and print status
"""
import argparse
import gzip
import hashlib
import html
import json
import math
import os
import re
import sqlite3
import sys
import time
import unicodedata
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
import zlib
from collections import Counter, defaultdict
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path

HERE = Path(__file__).resolve().parent
DB_PATH = HERE / "news.db"
SOURCES_PATH = HERE / "sources.json"
REPORT_PATH = HERE / "report.html"
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) NewsCoverageResearch/0.1"
COMMON_FEED_PATHS = ["/feed/", "/rss", "/rss.xml", "/feed", "/rss/", "/index.rss", "/feeds/latest"]


# ---------------------------------------------------------------- fetching

def fetch(url, timeout=15):
    req = urllib.request.Request(url, headers={
        "User-Agent": UA,
        "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml, text/html;q=0.8, */*;q=0.5",
        "Accept-Encoding": "gzip, deflate",
    })
    with urllib.request.urlopen(req, timeout=timeout) as r:
        data = r.read()
        enc = (r.headers.get("Content-Encoding") or "").lower()
        if enc == "gzip":
            data = gzip.decompress(data)
        elif enc == "deflate":
            data = zlib.decompress(data)
        return data, r.geturl()


def looks_like_feed(data):
    head = data[:2000].lower()
    return b"<rss" in head or b"<feed" in head or b"<rdf" in head


def discover_feed(home):
    """Find a feed URL from a homepage: <link rel=alternate> first, then common paths."""
    try:
        data, final = fetch(home)
        page = data.decode("utf-8", "ignore")
        for m in re.finditer(r"<link[^>]+>", page, re.I):
            tag = m.group(0)
            if re.search(r"application/(rss|atom)\+xml", tag, re.I):
                href = re.search(r'href=["\']([^"\']+)', tag, re.I)
                if href:
                    url = urllib.parse.urljoin(final, html.unescape(href.group(1)))
                    if "." not in urllib.parse.urlsplit(url).netloc:   # e.g. href="//rss.html"
                        url = home.rstrip("/") + "/" + urllib.parse.urlsplit(url).netloc
                    return url
    except Exception:
        pass
    for path in COMMON_FEED_PATHS:
        url = home.rstrip("/") + path
        try:
            data, final = fetch(url)
            if looks_like_feed(data):
                return final
        except Exception:
            continue
    return None


SKIP_LINK = re.compile(r"/(tag|tagovi|autor|author|kategorija|category|login|pretraga|search|kontakt|impressum)\b|#|javascript:|mailto:", re.I)


JUNK_TITLE = re.compile(r'loading=|/>|="|shutterstock|getty images|foto:|photo:|©', re.I)


def clean_title(t):
    t = re.sub(r"^\d{1,3}\s+", "", t)          # leading comment counters ("1 Priveden...")
    t = re.sub(r"\s+\d{2,6}$", "", t)          # trailing view counters ("... evra 22383")
    return t.strip()


PUB_PATTERNS = [
    r'<meta[^>]+(?:property|name|itemprop)=["\'](?:article:published_time|datePublished|pubdate|publish-date|date)["\'][^>]+content=["\']([^"\']+)',
    r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+(?:property|name|itemprop)=["\'](?:article:published_time|datePublished)["\']',
    r'"datePublished"\s*:\s*"([^"]+)"',
    r'<time[^>]+datetime=["\']([^"\']+)',
]


def enrich_article(url):
    """For scraped links: read the article page for its real publish time and description."""
    try:
        data, _ = fetch(url, timeout=10)
    except Exception:
        return None, "", ""
    page = data[:300000].decode("utf-8", "ignore")
    pub = None
    for pat in PUB_PATTERNS:
        m = re.search(pat, page, re.I)
        if m:
            pub = parse_date(m.group(1))
            if pub:
                break
    m = re.search(r'<meta[^>]+(?:property|name)=["\'](?:og:description|description)["\'][^>]+content=["\']([^"\']*)', page, re.I)
    img = re.search(r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)', page, re.I)
    return pub, (strip_tags(m.group(1))[:600] if m else ""), (html.unescape(img.group(1)) if img else "")


def scrape_homepage(home, limit=150, stay_in_section=True):
    """Read article headlines straight from a homepage or section page (no dates; see enrich_article)."""
    data, final = fetch(home)
    page = data.decode("utf-8", "ignore")
    domain = urllib.parse.urlsplit(final).netloc.lower().removeprefix("www.")
    # homes like bbc.com/serbian/lat or dw.com/sr: stay inside that language section
    home_path = urllib.parse.urlsplit(home).path.rstrip("/")
    section_prefix = (home_path.rsplit("/", 1)[0] if home_path.count("/") > 1 else home_path) if stay_in_section else ""
    items, seen = [], set()
    for m in re.finditer(r'<a\b[^>]*href=["\']([^"\']+)["\'][^>]*>(.*?)</a>', page, re.S | re.I):
        href, text = m.group(1), clean_title(strip_tags(m.group(2)))
        if not (25 <= len(text) <= 220) or SKIP_LINK.search(href) or JUNK_TITLE.search(text):
            continue
        url = urllib.parse.urljoin(final, html.unescape(href))
        parts = urllib.parse.urlsplit(url)
        if not parts.netloc.lower().removeprefix("www.").endswith(domain):
            continue
        if section_prefix and not parts.path.startswith(section_prefix):
            continue
        path = parts.path.strip("/")
        if path.count("/") < 1 and not re.search(r"\d", path):   # skip section pages like /politika
            continue
        key = canonical_url(url)
        if key in seen:
            continue
        seen.add(key)
        items.append({"title": text, "url": url, "summary": "", "published": None, "image": ""})
        if len(items) >= limit:
            break
    return items


# ---------------------------------------------------------------- parsing

def strip_tags(s):
    s = re.sub(r"<[^>]+>", " ", s or "")
    return re.sub(r"\s+", " ", html.unescape(s)).strip()


def parse_date(s):
    if not s:
        return None
    s = s.strip()
    try:
        d = parsedate_to_datetime(s)
    except Exception:
        d = None
        for fmt in ("%Y-%m-%dT%H:%M:%S%z", "%Y-%m-%dT%H:%M:%S.%f%z", "%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%SZ"):
            try:
                d = datetime.strptime(s.replace("Z", "+00:00") if "%z" in fmt else s, fmt)
                break
            except Exception:
                continue
    if d is None:
        return None
    if d.tzinfo is None:
        d = d.replace(tzinfo=timezone(timedelta(hours=1)))  # assume Belgrade time
    return d.astimezone(timezone.utc)


IMG_EXT = re.compile(r"\.(jpe?g|png|webp|gif)(\?|$)", re.I)


def local(tag):
    return tag.rsplit("}", 1)[-1].lower()


def parse_feed(data):
    """Return list of dicts: title, url, summary, published. Handles RSS 2.0, RSS 1.0, Atom."""
    items = []
    try:
        root = ET.fromstring(data)
        for el in root.iter():
            name = local(el.tag)
            if name not in ("item", "entry"):
                continue
            rec = {"title": "", "url": "", "summary": "", "published": None, "image": ""}
            for ch in el:
                n = local(ch.tag)
                text = (ch.text or "").strip()
                if not rec["image"]:
                    u = ch.attrib.get("url") or ""
                    if n in ("content", "thumbnail") and u:
                        rec["image"] = u
                    elif n == "enclosure" and (ch.attrib.get("type", "").startswith("image") or IMG_EXT.search(u)):
                        rec["image"] = u
                    elif n in ("description", "encoded", "summary", "content"):
                        m = re.search(r'<img[^>]+src=["\']([^"\']+)', text)
                        if m:
                            rec["image"] = html.unescape(m.group(1))
                if n == "title":
                    rec["title"] = strip_tags(text)
                elif n == "link":
                    href = ch.attrib.get("href")
                    if href and ch.attrib.get("rel", "alternate") == "alternate":
                        rec["url"] = href
                    elif text and not rec["url"]:
                        rec["url"] = text
                elif n in ("description", "summary") and not rec["summary"]:
                    rec["summary"] = strip_tags(text)[:600]
                elif n == "encoded" and not rec["summary"]:
                    rec["summary"] = strip_tags(text)[:600]
                elif n in ("pubdate", "published", "updated", "date") and not rec["published"]:
                    rec["published"] = parse_date(text)
                elif n == "guid" and not rec["url"] and text.startswith("http"):
                    rec["url"] = text
            if rec["title"] and rec["url"]:
                items.append(rec)
        return items
    except ET.ParseError:
        pass
    # Lenient fallback for malformed XML
    text = data.decode("utf-8", "ignore")
    for block in re.findall(r"<item\b.*?</item>", text, re.S | re.I):
        def grab(tag):
            m = re.search(rf"<{tag}[^>]*>(.*?)</{tag}>", block, re.S | re.I)
            if not m:
                return ""
            v = m.group(1)
            v = re.sub(r"^<!\[CDATA\[|\]\]>$", "", v.strip())
            return v
        title, link = strip_tags(grab("title")), strip_tags(grab("link"))
        if title and link:
            items.append({"title": title, "url": link,
                          "summary": strip_tags(grab("description"))[:600],
                          "published": parse_date(strip_tags(grab("pubDate")))})
    return items


# ---------------------------------------------------------------- storage

def db():
    con = sqlite3.connect(DB_PATH)
    con.execute("""CREATE TABLE IF NOT EXISTS articles(
        id TEXT PRIMARY KEY, source_id TEXT, title TEXT, summary TEXT, url TEXT,
        published TEXT, fetched TEXT)""")
    if "image" not in [r[1] for r in con.execute("PRAGMA table_info(articles)")]:
        con.execute("ALTER TABLE articles ADD COLUMN image TEXT DEFAULT ''")
    con.execute("CREATE TABLE IF NOT EXISTS skipped(id TEXT PRIMARY KEY, at TEXT)")   # page links with no usable date
    con.execute("""CREATE TABLE IF NOT EXISTS feeds(
        source_id TEXT PRIMARY KEY, feed_url TEXT, last_ok TEXT, last_error TEXT, last_count INTEGER)""")
    return con


def load_sources():
    cfg = json.loads(SOURCES_PATH.read_text(encoding="utf-8"))
    # "paused" outlets stay listed on the site but are not fetched (e.g. they block automated access)
    return cfg["camps"], [s for s in cfg["sources"] if not s.get("paused")]


def all_sources():
    return json.loads(SOURCES_PATH.read_text(encoding="utf-8"))["sources"]


def canonical_url(u):
    p = urllib.parse.urlsplit(u.strip())
    q = [(k, v) for k, v in urllib.parse.parse_qsl(p.query) if not k.lower().startswith(("utm_", "fbclid"))]
    return urllib.parse.urlunsplit((p.scheme, p.netloc.lower(), p.path.rstrip("/"), urllib.parse.urlencode(q), ""))


THIN_FEED = 30   # feeds with fewer items than this often miss articles: also read the homepage


def with_pages(src, items):
    """Add headlines from the outlet's homepage (thin feeds) and its listed section pages (sources.json "sections").
    Feeds can leave articles out; the latest Serbian news matters most, and it sits on these pages."""
    pages = list(src.get("sections", []))
    if len(items) < THIN_FEED:
        pages.insert(0, src["home"])
    have = {canonical_url(i["url"]) for i in items}
    extra = []
    for page in pages:
        try:
            # a listing page such as /najnovije links to articles all over the site
            found = scrape_homepage(page, limit=60, stay_in_section=(page == src["home"]))
        except Exception as e:
            print(f"  page {page}: {type(e).__name__}: {e}")
            continue
        if not found:
            print(f"  page {page}: no article links")
        for it in found:
            key = canonical_url(it["url"])
            if key not in have and not skip_url(it["url"]):
                have.add(key)
                it["from_page"] = True
                extra.append(it)
    return items + extra


def collect_source(src, known_feed):
    """Fetch one source. Returns (source_id, feed_url, items, error)."""
    sid, feed, items, err = _collect_source(src, known_feed)
    if feed and not feed.startswith("html:"):
        items = with_pages(src, items)
    return sid, feed, items, err


def _collect_source(src, known_feed):
    if known_feed and known_feed.startswith("html:"):
        try:
            return src["id"], known_feed, scrape_homepage(src["home"]), None
        except Exception as e:
            return src["id"], known_feed, [], f"{type(e).__name__}: {e}"
    candidates = [u for u in (known_feed, src.get("feed")) if u]
    tried = set()
    for url in candidates:
        if url in tried:
            continue
        tried.add(url)
        try:
            data, final = fetch(url)
            if looks_like_feed(data):
                items = parse_feed(data)
                if items:
                    return src["id"], final, items, None
        except Exception:
            pass
    found = discover_feed(src["home"])
    if found and found not in tried:
        try:
            data, final = fetch(found)
            items = parse_feed(data)
            if items:
                return src["id"], final, items, None
        except Exception:
            pass
    try:
        items = scrape_homepage(src["home"])
        if items:
            return src["id"], "html:" + src["home"], items, None
        return src["id"], None, [], "no feed, homepage had no article links"
    except Exception as e:
        return src["id"], None, [], f"no feed, homepage failed: {type(e).__name__}: {e}"


SKIP_SECTIONS = re.compile(r"/(sport|sportski|fudbal|kosarka|tenis|zabava|estrada|showbiz|lifestyle|zivot-i-stil|"
                           r"stil|magazin|horoskop|recepti|kuhinja|zdravlje|auto|tehnologija|scitech|tv-vodic|razonoda|zanimljivosti|"
                           r"dom-i-saveti|kultura-i-zabava|showbiz|sportal|kviz|nagradna-igra)(/|-|$)", re.I)
SKIP_HOSTS = re.compile(r"^(najzena|sport|zena|zabava|lifestyle|stil|media)\.", re.I)


def skip_url(url):
    p = urllib.parse.urlsplit(url)
    return bool(SKIP_SECTIONS.search(p.path) or SKIP_HOSTS.search(p.netloc))


def collect(verbose=True):
    camps, sources = load_sources()
    con = db()
    known = dict(con.execute("SELECT source_id, feed_url FROM feeds").fetchall())
    now = datetime.now(timezone.utc).isoformat()
    total_new = 0
    with ThreadPoolExecutor(max_workers=16) as ex:
        results = list(ex.map(lambda s: collect_source(s, known.get(s["id"])), sources))
    names = {s["id"]: s["name"] for s in sources}
    # scraped homepage links have no date: fetch new ones for their real publish time (bounded per run)
    todo = []
    for sid, feed_url, items, err in results:
        for it in items:
            if it["published"] is None:
                aid = hashlib.sha1(canonical_url(it["url"]).encode()).hexdigest()[:16]
                if not con.execute("SELECT 1 FROM articles WHERE id=? UNION SELECT 1 FROM skipped WHERE id=?", (aid, aid)).fetchone():
                    todo.append(it)
    todo = todo[:600]
    if todo and verbose:
        print(f"  reading {len(todo)} new homepage articles for publish dates...")
    with ThreadPoolExecutor(max_workers=12) as ex:
        for it, (pub, summary, img) in zip(todo, ex.map(lambda i: enrich_article(i["url"]), todo)):
            it["published"], it["summary"] = pub, summary or it["summary"]
            it["image"] = it.get("image") or img
            it["undated"] = pub is None
            it["opened"] = True
    # a page link with no publish date, or an old one, would show up as new: remember it and leave it out
    cutoff = datetime.now(timezone.utc) - timedelta(days=14)
    for sid, feed_url, items, err in results:
        for it in items:
            if it.get("from_page") and it.get("opened") and (it["published"] is None or it["published"] < cutoff):
                it["drop"] = True
                aid = hashlib.sha1(canonical_url(it["url"]).encode()).hexdigest()[:16]
                con.execute("INSERT OR IGNORE INTO skipped VALUES (?,?)", (aid, now))
    for sid, feed_url, items, err in results:
        new = 0
        for it in items:
            if it.get("drop") or skip_url(it["url"]):
                continue
            url = canonical_url(it["url"])
            aid = hashlib.sha1(url.encode()).hexdigest()[:16]
            pub = (it["published"] or datetime.now(timezone.utc)).isoformat()
            img = it.get("image") or ""
            img = urllib.parse.urljoin(it["url"], img) if img else ""
            cur = con.execute("INSERT OR IGNORE INTO articles(id, source_id, title, summary, url, published, fetched, image) "
                              "VALUES (?,?,?,?,?,?,?,?)", (aid, sid, it["title"], it["summary"], url, pub, now, img))
            new += cur.rowcount
        total_new += new
        con.execute("""INSERT INTO feeds VALUES (?,?,?,?,?)
            ON CONFLICT(source_id) DO UPDATE SET
              feed_url=COALESCE(excluded.feed_url, feeds.feed_url),
              last_ok=COALESCE(excluded.last_ok, feeds.last_ok),
              last_error=excluded.last_error, last_count=excluded.last_count""",
                    (sid, feed_url, now if not err else None, err, len(items)))
        if verbose:
            pg = sum(1 for i in items if i.get("from_page"))
            status = (f"{len(items) - pg:3d} items, {new:3d} new" + (f"  (+{pg} links from pages)" if pg else "")) if not err else f"FAILED - {err}"
            print(f"  {names[sid]:<28} {status}")
    # keep the database small: drop articles older than 14 days
    con.execute("DELETE FROM articles WHERE published < ?",
                ((datetime.now(timezone.utc) - timedelta(days=14)).isoformat(),))
    con.execute("DELETE FROM skipped WHERE at < ?", ((datetime.now(timezone.utc) - timedelta(days=30)).isoformat(),))
    con.commit()
    if verbose:
        print(f"\nCollected {total_new} new articles.")
    return total_new


# ---------------------------------------------------------------- text normalisation

CYR = dict(zip("абвгдђежзијклљмнњопрстћуфхцчџш",
               ["a", "b", "v", "g", "d", "dj", "e", "z", "z", "i", "j", "k", "l", "lj", "m", "n", "nj", "o",
                "p", "r", "s", "t", "c", "u", "f", "h", "c", "c", "dz", "s"]))
LAT = {"č": "c", "ć": "c", "š": "s", "ž": "z", "đ": "dj", "dž": "dz"}

STOP = set("""a ali i ili da je su se sa od do na za u o po pre posle kod kao sto sta koji koja koje kojeg kojem
kojih ovo ova ovaj taj ta to te ti tu on ona ono oni one mi vi ja nas vas njih njega njoj njemu biti bio bila bilo
bili bice bi nije nisu nece hoce ce sam si smo ste jos vec samo sve svi svih vise manje kada gde kako zasto jer ako
ni niti ne li pa te dok iz ka prema izmedju preko ispred iza oko kroz bez uz pri nad pod protiv tokom zbog radi
godine godina danas juce sutra ovde tamo the and for with vesti video foto video: foto: news srbija srbije srbiji
evra evro dinara miliona milion milijardi milijarde milijardu hitno uzivo blog oglasio oglasila
evo ovim znaci poznato rekao rekla kaze kazao izjavio izjavila naveo navela prema reci""".split())


def normalise(text):
    t = (text or "").lower()
    t = "".join(CYR.get(ch, ch) for ch in t)
    for k, v in LAT.items():
        t = t.replace(k, v)
    t = unicodedata.normalize("NFKD", t)
    return "".join(ch for ch in t if not unicodedata.combining(ch))


def tokens(text):
    out = []
    for w in re.findall(r"[a-z0-9]+", normalise(text)):
        if len(w) < 3 or w in STOP or w.isdigit() and len(w) < 4:
            continue
        out.append(stem(w))
    return out


SUFFIXES = sorted("ovima evima ama ima ata eta ovi evi ove eve oga emu ome om em og oj im ih ju a e i o u".split(),
                  key=len, reverse=True)


def stem(w):
    """Light stemmer: Serbian changes word endings by case (Novi Sad / u Novom Sadu)."""
    for suf in SUFFIXES:
        if w.endswith(suf) and len(w) - len(suf) >= 3:
            w = w[:-len(suf)]
            break
    return w[:5]


# ---------------------------------------------------------------- clustering

def vectorise(docs):
    df = Counter()
    for d in docs:
        df.update(set(d))
    n = len(docs)
    vecs = []
    for d in docs:
        tf = Counter(d)
        v = {w: (1 + math.log(c)) * math.log((n + 1) / (df[w] + 0.5)) for w, c in tf.items() if n < 50 or df[w] < n * 0.3}
        norm = math.sqrt(sum(x * x for x in v.values())) or 1.0
        vecs.append({w: x / norm for w, x in v.items()})
    return vecs


def cosine(a, b):
    if len(a) > len(b):
        a, b = b, a
    return sum(x * b.get(w, 0.0) for w, x in a.items())


def cluster(articles, threshold=0.28, window_h=30):
    """Single-pass centroid clustering in time order. Returns list of clusters (lists of article dicts)."""
    docs = [tokens(a["title"]) * 3 + tokens(a["summary"]) for a in articles]
    vecs = vectorise(docs)
    clusters = []  # each: {"items": [...], "centroid": {}, "last": datetime}
    order = sorted(range(len(articles)), key=lambda i: articles[i]["published"])
    for i in order:
        a, v = articles[i], vecs[i]
        if not v:
            continue
        best, best_sim = None, 0.0
        for c in clusters:
            if (a["published"] - c["last"]).total_seconds() > window_h * 3600:
                continue
            s = cosine(v, c["centroid"])
            if s > best_sim:
                best, best_sim = c, s
        if best and best_sim >= threshold:
            best["items"].append(a)
            k = len(best["items"])
            cen = defaultdict(float, {w: x * (k - 1) / k for w, x in best["centroid"].items()})
            for w, x in v.items():
                cen[w] += x / k
            norm = math.sqrt(sum(x * x for x in cen.values())) or 1.0
            best["centroid"] = {w: x / norm for w, x in cen.items()}
            best["last"] = max(best["last"], a["published"])
        else:
            clusters.append({"items": [a], "centroid": dict(v), "last": a["published"]})
    return [c["items"] for c in clusters]


# ---------------------------------------------------------------- analysis + report

def build_stories(hours=36, min_sources=2):
    camps, sources = load_sources()
    meta = {s["id"]: s for s in sources}
    con = db()
    since = (datetime.now(timezone.utc) - timedelta(hours=hours)).isoformat()
    rows = [r for r in con.execute("SELECT source_id, title, summary, url, published, image FROM articles WHERE published >= ?",
                                   (since,)).fetchall() if not skip_url(r[3])]
    arts = []
    for sid, title, summary, url, pub, image in rows:
        if sid not in meta:
            continue
        arts.append({"source": sid, "name": meta[sid]["name"], "camp": meta[sid]["camp"],
                     "title": title, "summary": summary, "url": url, "image": image or "",
                     "published": datetime.fromisoformat(pub)})
    # when did we start seeing each source? (feeds only reach back a few hours on the first run)
    # Only high-volume outlets count as "watching": a weekly investigative site whose feed reaches back
    # 10 days says nothing about whether its camp covered this morning's news.
    start, rate = {}, {}
    for sid, n, lo, hi in con.execute("SELECT source_id, COUNT(*), MIN(published), MAX(published) FROM articles "
                                     "WHERE published >= ? GROUP BY source_id", (since,)):
        lo, hi = datetime.fromisoformat(lo), datetime.fromisoformat(hi)
        start[sid] = lo
        rate[sid] = n / max((hi - lo).total_seconds() / 86400, 1 / 24)   # articles per day
    camp_sources = defaultdict(list)
    for s in sources:
        camp_sources[s["camp"]].append(s["id"])

    def watched(camp, t, min_share=0.5):
        """True if outlets producing at least half of this camp's usual output were being collected at time t."""
        ids = [sid for sid in camp_sources[camp] if sid in rate]
        total = sum(rate[sid] for sid in ids)
        seen = sum(rate[sid] for sid in ids if start[sid] <= t - timedelta(hours=1))
        return total > 0 and seen / total >= min_share

    stories = []
    for items in cluster(arts):
        # one vote per outlet, so an outlet posting 5 versions doesn't dominate
        by_source = {}
        for a in sorted(items, key=lambda x: x["published"]):
            by_source.setdefault(a["source"], a)
        if len(by_source) < min_sources:
            continue
        split = Counter(a["camp"] for a in by_source.values())
        n = len(by_source)
        pg, cr = split.get("pro_government", 0), split.get("critical", 0)
        blind = None
        first = min(a["published"] for a in items)
        if n >= 3 and pg == 0 and cr >= 2 and watched("pro_government", first):
            blind = "Not covered by pro-government outlets"
        elif n >= 3 and cr == 0 and pg >= 2 and watched("critical", first):
            blind = "Not covered by critical outlets"
        # neutral headline: the one that shares the most words with all the others (no camp preference)
        sets = {a["url"]: set(tokens(a["title"])) for a in by_source.values()}
        lead = max(by_source.values(), key=lambda a: sum(
            len(sets[a["url"]] & o) / (len(sets[a["url"]] | o) or 1) for u, o in sets.items() if u != a["url"]))
        firsts = sorted(by_source.values(), key=lambda a: a["published"])
        summary = max((a["summary"] for a in by_source.values() if a["summary"]), key=len, default="")
        img_from = lead if lead["image"] else next((a for a in firsts if a["image"]), None)
        image = img_from["image"] if img_from else ""
        last = max(a["published"] for a in items)
        # ranking: number of outlets, halved for every 8 hours since the story last got a new article,
        # so a big story from the morning gives way to fresh news that is still spreading
        hours_quiet = max((datetime.now(timezone.utc) - last).total_seconds() / 3600, 0)
        score = n * 0.5 ** (hours_quiet / 8)
        stories.append({"id": hashlib.sha1(firsts[0]["url"].encode()).hexdigest()[:10],
                        "headline": lead["title"], "summary": summary[:400], "image": image,
                        "image_source": img_from["source"] if img_from else "", "score": score, "last": last,
                        "broke": firsts[0]["source"], "sources": n, "articles": len(items), "split": split,
                        "blindspot": blind, "items": sorted(by_source.values(), key=lambda a: a["camp"]),
                        "first": min(a["published"] for a in items)})
    stories.sort(key=lambda s: (-s["score"], -s["sources"], s["first"]))
    return camps, stories, len(arts)


SITE_DIR = HERE / "site"

SECTIONS = [  # (section, URL path keywords) - first match wins
    ("Hronika", ("hronika", "crna-hronika", "hronika-")),
    ("Politika", ("politika", "politics")),
    ("Ekonomija", ("ekonomija", "biznis", "novac", "privreda", "business", "economy")),
    ("Svet", ("svet", "planeta", "world", "inostranstvo")),
    ("Region", ("region", "regija", "ex-yu", "balkan")),
    ("Kultura", ("kultura", "culture")),
    ("Društvo", ("drustvo", "društvo", "srbija", "beograd", "novi-sad", "vojvodina", "gradovi", "vesti")),
]


def section_of(urls):
    """Majority vote over the outlets' own URL sections ('/hronika/', '/politika/'...)."""
    votes = Counter()
    for u in urls:
        path = urllib.parse.urlsplit(u).path.lower()
        for name, keys in SECTIONS:
            if any(f"/{k}" in path for k in keys):
                votes[name] += 1
                break
    return votes.most_common(1)[0][0] if votes else "Vesti"


TOPICS = [  # (slug, name, regex on normalised Latin text without diacritics) - shown when 2+ stories match
    ("izbori", "Izbori", r"\b(izbor|glasanj|glasac|birac|birack|cik\b|kampanj|kandidat)"),
    ("protesti", "Protesti i studenti", r"\b(protest|student|blokad|zbor|plenum)"),
    ("nadstresnica", "Nadstrešnica u Novom Sadu", r"\b(nadstresnic|kanop)"),
    ("pravosudje", "Pravosuđe i istrage", r"\b(tuzilast|tuzilac|tuzioc|sudij|presud|uhapsen|hapsenj|optuznic|pritvor)"),
    ("mediji", "Mediji", r"\b(rem\b|novinar|medij|cenzur)"),
    ("kosovo", "Kosovo", r"\b(kosov|pristin|kurti|kfor)"),
    ("eu", "Evropska unija", r"\b(evropsk\w* unij|eu\b|brisel|evropsk\w* komisij)"),
    ("energetika", "NIS i energetika", r"\b(nis\b|naftn|gazprom|struj|energet|eps\b)"),
    ("litijum", "Litijum i Jadar", r"\b(litijum|rio tinto|jadar)"),
    ("ekspo", "Ekspo 2027", r"\b(ekspo|expo)"),
    ("region", "Region", r"\b(hrvatsk|bih\b|bosn|crn\w* gor|republik\w* srpsk|dodik|zagreb|sarajev|podgoric)"),
    ("rusija-ukrajina", "Rusija i Ukrajina", r"\b(ukrajin|rusij|rusk|putin|zelensk|moskv|kijev)"),
    ("sad", "SAD i Tramp", r"\b(tramp|trump|vasington|bela kuca|amerik)"),
    ("kina", "Kina", r"\b(kina\b|kine\b|kini\b|kinesk|peking)"),
]


def topics_of(story):
    text = normalise(" ".join([story["headline"]] + [a["title"] for a in story["items"]]))
    return [slug for slug, _, pat in TOPICS if re.search(pat, text)]


# ---------------------------------------------------------------- AI summaries (optional)

AI_MODEL = os.environ.get("OBE_AI_MODEL", "claude-haiku-5-5")
AI_PROMPT = """You summarise Serbian news coverage for a media-comparison site. Below are headlines and intros
of articles about ONE event, grouped by the outlet's camp (pro-government, critical, public broadcaster,
in-between, international). Write in Serbian, Latin script.

Return only JSON with these keys:
"ukratko": 2-3 neutral sentences on what happened, using only facts the reports have in common.
"provladini": 1-2 sentences on what pro-government outlets emphasise and how they frame it, or null if none.
"kriticki": 1-2 sentences on what critical outlets emphasise and how they frame it, or null if none.
"razlika": one sentence on the main difference in emphasis between the camps, or null if only one camp
reported or there is no real difference.

Rules: be strictly neutral; describe framing, never judge which side is right; attribute claims
("provladini mediji navode..."); use only what is in the text below; no facts from elsewhere.

ARTICLES:
{articles}"""
AI_LABEL = {"pro_government": "PROVLADINI", "critical": "KRITIČKI", "public": "JAVNI SERVIS",
            "mixed": "IZMEĐU KATEGORIJA", "international": "MEĐUNARODNI"}


def ai_call(prompt):
    req = urllib.request.Request("https://api.anthropic.com/v1/messages", method="POST",
                                 data=json.dumps({"model": AI_MODEL, "max_tokens": 4000,
                                                  "messages": [{"role": "user", "content": prompt}]}).encode(),
                                 headers={"x-api-key": os.environ["ANTHROPIC_API_KEY"],
                                          "anthropic-version": "2023-06-01", "content-type": "application/json"})
    with urllib.request.urlopen(req, timeout=60) as r:
        out = json.loads(r.read())
    text = "".join(b.get("text", "") for b in out.get("content", []) if b.get("type") == "text")
    m = re.search(r"\{.*\}", text, re.S)
    if not m:
        raise ValueError(f"no JSON in reply (stop={out.get('stop_reason')}, blocks={[b.get('type') for b in out.get('content', [])]}): {text[:300]!r}")
    body = json.loads(m.group(0))
    return {k: (str(body.get(k)).strip() if body.get(k) else None) for k in ("ukratko", "provladini", "kriticki", "razlika")}


def ai_summaries(con, stories, top=25, max_calls=15):
    """Neutral summary + how each camp framed the story, for the biggest stories. Cached in news.db;
    a story is summarised again only when it has grown by 3+ outlets. Skipped without ANTHROPIC_API_KEY."""
    con.execute("CREATE TABLE IF NOT EXISTS ai(story_id TEXT PRIMARY KEY, n INTEGER, made TEXT, body TEXT)")
    cached = {sid: (n, json.loads(b)) for sid, n, b in con.execute("SELECT story_id, n, body FROM ai")}
    calls = made = 0
    have_key = bool(os.environ.get("ANTHROPIC_API_KEY"))
    for s in [s for s in stories if s["sources"] >= 3][:top]:
        # a story's id comes from its earliest article; if an even earlier one joins, the id changes,
        # so also look for a summary cached under any of its articles
        old = cached.get(s["id"]) or next((cached[k] for k in (hashlib.sha1(a["url"].encode()).hexdigest()[:10]
                                                                for a in s["items"]) if k in cached), None)
        if old and s["sources"] < old[0] + 3:
            s["ai"] = old[1]
            continue
        if not have_key or calls >= max_calls:
            if old:
                s["ai"] = old[1]
            continue
        lines = [f"[{AI_LABEL.get(a['camp'], a['camp'])}] {a['name']}: {a['title']}"
                 + (f" — {a['summary'][:280]}" if a["summary"] else "") for a in s["items"]]
        try:
            calls += 1
            body = ai_call(AI_PROMPT.format(articles="\n".join(lines)))
            if not body.get("ukratko"):
                raise ValueError("empty summary")
            con.execute("INSERT OR REPLACE INTO ai VALUES (?,?,?,?)", (s["id"], s["sources"],
                        datetime.now(timezone.utc).isoformat(), json.dumps(body, ensure_ascii=False)))
            s["ai"] = body
            made += 1
        except Exception as e:
            print(f"  AI summary failed for {s['id']}: {type(e).__name__}: {e}")
            if old:
                s["ai"] = old[1]
    con.execute("DELETE FROM ai WHERE made < ?", ((datetime.now(timezone.utc) - timedelta(days=3)).isoformat(),))
    con.commit()
    if calls:
        print(f"  AI summaries: {made} new, {calls - made} failed")
    for s in stories[:10]:
        print(f"  {'AI' if s.get('ai') else '--'} {s['sources']:3d} {s['id']} {s['headline'][:70]}")


# ---------------------------------------------------------------- daily briefing

def belgrade_now():
    try:
        from zoneinfo import ZoneInfo
        return datetime.now(ZoneInfo("Europe/Belgrade"))
    except Exception:
        return datetime.now(timezone(timedelta(hours=1)))


def briefing(con, stories, n_articles):
    """One fixed edition a day: frozen at the first run after 07:00 Belgrade time (or right away if none exists)."""
    con.execute("CREATE TABLE IF NOT EXISTS briefings(day TEXT PRIMARY KEY, made TEXT, body TEXT)")
    bg = belgrade_now()
    today = bg.date().isoformat()
    exists_today = con.execute("SELECT 1 FROM briefings WHERE day=?", (today,)).fetchone()
    any_yet = con.execute("SELECT 1 FROM briefings LIMIT 1").fetchone()
    if not exists_today and (bg.hour >= 7 or not any_yet):
        cut = datetime.now(timezone.utc) - timedelta(hours=24)
        recent = [s for s in stories if s["last"] >= cut]
        pick = sorted(recent, key=lambda s: (-s["sources"], -s["score"]))[:8]
        bs = sorted([s for s in recent if s["blindspot"] and s not in pick], key=lambda s: -s["sources"])[:2]

        def entry(s):
            first = lambda k: next(({"source": a["source"], "title": a["title"], "url": a["url"]}
                                    for a in sorted(s["items"], key=lambda a: a["published"]) if a["camp"] == k), None)
            return {"id": s["id"], "headline": s["headline"], "summary": s["summary"][:300], "image": s["image"],
                    "section": section_of([a["url"] for a in s["items"]]), "sources": s["sources"],
                    "split": dict(s["split"]), "blindspot": blind_key(s), "ai": s.get("ai"),
                    "pg": first("pro_government"), "cr": first("critical")}
        body = {"day": today, "made": datetime.now(timezone.utc).isoformat(), "articles": n_articles,
                "stories": [entry(s) for s in pick], "blindspots": [entry(s) for s in bs]}
        con.execute("INSERT OR REPLACE INTO briefings VALUES (?,?,?)",
                    (today, body["made"], json.dumps(body, ensure_ascii=False)))
        con.execute("DELETE FROM briefings WHERE day < ?", ((bg.date() - timedelta(days=14)).isoformat(),))
        con.commit()
        print(f"  Briefing for {today}: {len(pick)} stories")
    row = con.execute("SELECT body FROM briefings ORDER BY day DESC LIMIT 1").fetchone()
    days = [d for (d,) in con.execute("SELECT day FROM briefings ORDER BY day DESC LIMIT 7")]
    return json.loads(row[0]) if row else None, days


def blind_key(s):
    return s["blindspot"] and ("pro_government" if s["blindspot"].endswith("pro-government outlets") else "critical")


# ---------------------------------------------------------------- cover image quality

IMG_MIN_W, IMG_MIN_H, IMG_MAX_BLUR = 600, 330, 0.6
WP_SIZE = re.compile(r"-\d{2,4}x\d{2,4}(?=\.(?:jpe?g|png|webp)\b)", re.I)


def image_quality(url):
    """(width, height, blur) of an image. blur compares edge detail before and after halving the resolution,
    at the size the site shows it (900px): ~0.2-0.4 for a sharp photo, 0.85+ for a small or soft one that would
    look blurry. It works the same for busy and plain photos."""
    from PIL import Image, ImageFilter, ImageStat
    import io
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "image/*"})
    with urllib.request.urlopen(req, timeout=12) as r:
        data = r.read(8_000_000)
    im = Image.open(io.BytesIO(data))
    w, h = im.size
    g = im.convert("L")
    g = g.resize((900, max(1, round(h * 900 / w))), Image.BICUBIC)
    var = lambda x: ImageStat.Stat(x.filter(ImageFilter.FIND_EDGES)).var[0]
    low = g.resize((450, max(1, g.height // 2)), Image.BILINEAR).resize(g.size, Image.BICUBIC)
    return w, h, round(var(low) / max(var(g), 1e-6), 3)


def good_image(q):
    w, h, blur = q
    return w >= IMG_MIN_W and h >= IMG_MIN_H and 0.9 <= w / h <= 2.4 and blur <= IMG_MAX_BLUR


def choose_images(con, stories, top=120):
    """Give each story the best sharp, large-enough photo among its articles' images. Feed thumbnails are
    often tiny, so we also try the full-size WordPress original and, if needed, the articles' og:image.
    Stories with no good photo get none: the site shows a clean placeholder instead of a blurry picture."""
    try:
        import PIL  # noqa: F401
    except ImportError:
        print("  Pillow missing: image quality check skipped")
        return
    con.execute("CREATE TABLE IF NOT EXISTS img_q(url TEXT PRIMARY KEY, w INTEGER, h INTEGER, blur REAL, checked TEXT)")
    con.execute("CREATE TABLE IF NOT EXISTS og_img(url TEXT PRIMARY KEY, img TEXT)")
    known = {u: (w, h, b) for u, w, h, b in con.execute("SELECT url, w, h, blur FROM img_q")}
    now = datetime.now(timezone.utc).isoformat()

    def measure(urls):
        new = [u for u in dict.fromkeys(urls) if u and u not in known]
        with ThreadPoolExecutor(max_workers=16) as ex:
            for u, q in zip(new, ex.map(lambda u: _try(image_quality, u), new)):
                known[u] = q or (0, 0, 1.0)
                con.execute("INSERT OR REPLACE INTO img_q VALUES (?,?,?,?,?)", (u, *known[u], now))

    def cands(s):
        out = []
        for a in s["items"]:
            if a["image"]:
                full = WP_SIZE.sub("", a["image"])
                out += [(full, a["source"])] if full != a["image"] else []
                out.append((a["image"], a["source"]))
        return out

    shown = stories[:top]
    measure([u for s in shown for u, _ in cands(s)])
    # stories still without a good photo: look at the og:image of up to 3 of their articles
    og = dict(con.execute("SELECT url, img FROM og_img"))
    need = [a for s in shown if not any(good_image(known[u]) for u, _ in cands(s))
            for a in s["items"][:3] if a["url"] not in og]
    with ThreadPoolExecutor(max_workers=16) as ex:
        for a, res in zip(need, ex.map(lambda a: _try(enrich_article, a["url"]), need)):
            og[a["url"]] = (res[2] if res else "") or ""
            con.execute("INSERT OR REPLACE INTO og_img VALUES (?,?)", (a["url"], og[a["url"]]))
    measure([og.get(a["url"]) for s in shown for a in s["items"][:3]])

    kept = 0
    for i, s in enumerate(stories):
        s["image"], s["image_source"] = "", ""
        if i >= top:
            continue
        pool = cands(s) + [(og[a["url"]], a["source"]) for a in s["items"][:3] if og.get(a["url"])]
        good = [(u, src) for u, src in pool if good_image(known.get(u, (0, 0, 1)))]
        if good:   # biggest sharp one wins
            u, src = max(good, key=lambda x: (min(known[x[0]][0], 1600), -known[x[0]][2]))
            s["image"], s["image_source"] = u, src
            kept += 1
    con.execute("DELETE FROM img_q WHERE checked < ?", ((datetime.now(timezone.utc) - timedelta(days=3)).isoformat(),))
    con.commit()
    used = [known[u] for s in shown for u, _ in cands(s) + [(og.get(a["url"]), "") for a in s["items"][:3]] if u in known]
    small = sum(1 for w, h, b in used if w and (w < IMG_MIN_W or h < IMG_MIN_H))
    soft = sum(1 for w, h, b in used if w >= IMG_MIN_W and h >= IMG_MIN_H and b > IMG_MAX_BLUR)
    print(f"  Cover photos: {kept} of {min(top, len(stories))} stories have a sharp photo "
          f"(rejected {small} too small, {soft} too blurry, {sum(1 for q in used if not q[0])} unreadable, of {len(used)} checked)")
    for s in shown[:8]:
        q = known.get(s["image"])
        print(f"    {s['headline'][:50]:50s} {s['image_source'] or '-':12s} {q}")


def _try(fn, arg):
    try:
        return fn(arg)
    except Exception:
        return None


# ---------------------------------------------------------------- site export

def export_site(hours=36):
    """Write site/data.js for the website (a JS file, so the site also works opened straight from disk)."""
    camps, stories, n_articles = build_stories(hours)
    sources = all_sources()
    con = db()
    choose_images(con, stories)
    ai_summaries(con, stories)
    brief, brief_days = briefing(con, stories, n_articles)
    now = datetime.now(timezone.utc)
    iso = lambda d: d.astimezone(timezone.utc).isoformat()
    for s in stories:
        s["section"] = section_of([a["url"] for a in s["items"]])
        s["topics"] = topics_of(s)

    # per-outlet numbers for the outlet pages
    counts, loud, secs = Counter(), Counter(), defaultdict(Counter)
    for s in stories:
        for a in s["items"]:
            counts[a["source"]] += 1
            secs[a["source"]][s["section"]] += 1
            if s["blindspot"]:
                loud[a["source"]] += 1
    since36 = (now - timedelta(hours=hours)).isoformat()
    since7 = (now - timedelta(days=7)).isoformat()
    n36 = dict(con.execute("SELECT source_id, COUNT(*) FROM articles WHERE published >= ? GROUP BY source_id", (since36,)))
    n7 = dict(con.execute("SELECT source_id, COUNT(*) FROM articles WHERE published >= ? GROUP BY source_id", (since7,)))
    recent = defaultdict(list)
    for sid, title, url, pub in con.execute("SELECT source_id, title, url, published FROM articles WHERE published >= ? "
                                            "ORDER BY published DESC", (since7,)):
        if len(recent[sid]) < 8 and not skip_url(url):
            recent[sid].append({"title": title, "url": url, "published": pub})
    logos = {}
    if (SITE_DIR / "logos").is_dir():
        for f in (SITE_DIR / "logos").iterdir():
            if f.suffix.lower() in (".png", ".svg", ".jpg", ".jpeg", ".webp"):
                logos[f.stem] = f"logos/{f.name}"

    # balance: how many outlet appearances of each camp we showed, against what we collected
    shown, collected, outlets = Counter(), Counter(), Counter()
    meta = {s["id"]: s for s in sources}
    for s in stories:
        shown.update(s["split"])
    for sid, n in n36.items():
        if sid in meta:
            collected[meta[sid]["camp"]] += n
    for s in sources:
        if not s.get("paused"):
            outlets[s["camp"]] += 1

    topic_counts = Counter(t for s in stories for t in s["topics"])
    data = {
        "generated": now.isoformat(), "hours": hours, "articles": n_articles,
        "camps": camps, "ai_model": AI_MODEL,
        "balance": {"shown": dict(shown), "collected": dict(collected), "outlets": dict(outlets)},
        "topics": [{"slug": slug, "name": name, "stories": topic_counts[slug]} for slug, name, _ in TOPICS if topic_counts[slug]],
        "briefing": brief, "briefing_days": brief_days,
        "sources": [{"id": s["id"], "name": s["name"], "camp": s["camp"], "home": s["home"], "group": s.get("group", ""),
                     "note": s.get("note", ""), "owner": s.get("owner", ""), "owner_src": s.get("owner_src", ""),
                     "public_money": s.get("public_money", ""), "public_money_src": s.get("public_money_src", ""),
                     "paused": s.get("paused", ""), "logo": logos.get(s["id"], ""),
                     "stories": counts[s["id"]], "blind_loud": loud[s["id"]],
                     "a36": n36.get(s["id"], 0), "a7": n7.get(s["id"], 0),
                     "sections": [k for k, _ in secs[s["id"]].most_common(3)], "recent": recent.get(s["id"], [])}
                    for s in sources],
        "stories": [{"id": s["id"], "headline": s["headline"], "summary": s["summary"], "image": s["image"],
                     "image_source": s["image_source"], "last": iso(s["last"]), "score": round(s["score"], 2),
                     "section": s["section"], "topics": s["topics"], "ai": s.get("ai"),
                     "broke": s["broke"], "first": iso(s["first"]), "sources": s["sources"],
                     "split": dict(s["split"]), "blindspot": blind_key(s),
                     "items": [{"source": a["source"], "title": a["title"], "url": a["url"], "summary": a["summary"][:280],
                                "image": a["image"], "published": iso(a["published"])}
                               for a in sorted(s["items"], key=lambda a: a["published"])]}
                    for s in stories],
    }
    SITE_DIR.mkdir(exist_ok=True)
    (SITE_DIR / "data.js").write_text("window.NEWS_DATA = " + json.dumps(data, ensure_ascii=False) + ";\n",
                                      encoding="utf-8")
    print(f"Site data: {SITE_DIR / 'data.js'}  (open site/index.html)")


def bar(split, camps, total):
    parts = []
    for key, c in camps.items():
        k = split.get(key, 0)
        if k:
            pct = 100 * k / total
            parts.append(f'<span style="width:{pct:.1f}%;background:{c["color"]}" title="{c["label"]}: {k}"></span>')
    return f'<div class="bar">{"".join(parts)}</div>'


def write_report(hours=36):
    camps, stories, n_articles = build_stories(hours)
    blind = [s for s in stories if s["blindspot"]]
    gen = datetime.now().strftime("%d.%m.%Y %H:%M")

    def story_html(s):
        rows = "".join(
            f'<li><span class="dot" style="background:{camps[a["camp"]]["color"]}"></span>'
            f'<b>{html.escape(a["name"])}</b> <a href="{html.escape(a["url"])}" target="_blank" rel="noopener">'
            f'{html.escape(a["title"])}</a></li>' for a in s["items"])
        pct = " · ".join(f'{camps[k]["label"]} {100*v/s["sources"]:.0f}%' for k, v in s["split"].most_common())
        flag = f'<div class="flag">⚑ {s["blindspot"]}</div>' if s["blindspot"] else ""
        return (f'<article><h3>{html.escape(s["headline"])}</h3>{flag}'
                f'{bar(s["split"], camps, s["sources"])}<div class="meta">{s["sources"]} outlets · {pct}</div>'
                f'<details><summary>Show headlines</summary><ul>{rows}</ul></details></article>')

    legend = "".join(f'<span><i style="background:{c["color"]}"></i>{c["label"]}</span>' for c in camps.values())
    page = f"""<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="300"><title>Coverage report {gen}</title>
<style>
body{{font:15px/1.45 -apple-system,system-ui,sans-serif;max-width:860px;margin:32px auto;padding:0 16px;color:#1d1d1f;background:#fafafa}}
h1{{font-size:24px;margin:0}} h2{{margin-top:36px;font-size:18px;border-bottom:1px solid #ddd;padding-bottom:6px}}
.sub{{color:#666;margin:4px 0 16px}} .legend span{{margin-right:16px;font-size:13px}}
.legend i{{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:5px}}
article{{background:#fff;border:1px solid #e5e5e5;border-radius:10px;padding:14px 16px;margin:12px 0}}
h3{{font-size:16px;margin:0 0 8px}} .bar{{display:flex;height:8px;border-radius:4px;overflow:hidden;background:#eee}}
.meta{{font-size:12.5px;color:#666;margin-top:6px}} .flag{{color:#b35c00;font-size:13px;font-weight:600;margin-bottom:6px}}
details{{margin-top:8px}} summary{{cursor:pointer;font-size:13px;color:#2e7dd7}} ul{{padding-left:0;list-style:none}}
li{{margin:5px 0;font-size:14px}} li a{{color:#1d1d1f}} .dot{{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:6px}}
</style></head><body>
<h1>Who covers what — Serbian media</h1>
<div class="sub">Generated {gen} · last {hours}h · {n_articles} articles · {len(stories)} stories covered by 2+ outlets</div>
<div class="legend">{legend}</div>
<h2>Blindspots ({len(blind)})</h2>
{''.join(story_html(s) for s in blind) or '<p>None in this window.</p>'}
<h2>Top stories</h2>
{''.join(story_html(s) for s in stories[:80])}
<p class="sub">Prototype. Outlet camps are editable starting labels in sources.json.</p>
</body></html>"""
    REPORT_PATH.write_text(page, encoding="utf-8")
    export_site(hours)
    print(f"Report: {REPORT_PATH}  ({len(stories)} stories, {len(blind)} blindspots)")
    for s in stories[:10]:
        pct = ", ".join(f"{camps[k]['label']} {v}" for k, v in s["split"].most_common())
        print(f"  [{s['sources']:2d}] {s['headline'][:90]}\n       {pct}" + (f"  ⚑ {s['blindspot']}" if s['blindspot'] else ""))


def check():
    _, sources = load_sources()
    with ThreadPoolExecutor(max_workers=8) as ex:
        results = list(ex.map(lambda s: collect_source(s, None), sources))
    for (sid, feed, items, err), s in zip(results, sources):
        print(f"{s['name']:<28} {'OK  ' if not err else 'FAIL'} {len(items):3d}  {feed or err}")


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("cmd", choices=["collect", "report", "run", "watch", "check"])
    p.add_argument("--hours", type=int, default=36, help="time window for the report")
    p.add_argument("--every", type=int, default=15, help="minutes between runs in watch mode")
    a = p.parse_args()
    if a.cmd == "collect":
        collect()
    elif a.cmd == "report":
        write_report(a.hours)
    elif a.cmd == "run":
        collect(); write_report(a.hours)
    elif a.cmd == "check":
        check()
    elif a.cmd == "watch":
        while True:
            print(f"\n=== {datetime.now():%H:%M} ===")
            try:
                collect(); write_report(a.hours)
            except Exception as e:
                print("error:", e, file=sys.stderr)
            time.sleep(a.every * 60)


if __name__ == "__main__":
    main()
