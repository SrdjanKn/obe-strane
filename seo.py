"""Search-engine groundwork for Obe strane.

The app itself is one page that draws everything in the browser, which search engines and link previews
cannot read. This module runs at the end of every collector run and writes, next to the app:

  vest/<id>/index.html   one real page per story (title, description, share image, outlets and their headlines)
  og/<id>.png            the share image for that story (also used by Viber, WhatsApp, X, Facebook ...)
  sitemap.xml, robots.txt, 404.html
  index.html             gets its canonical / share tags and a crawlable list of stories (between the markers)

Stories that have dropped out of the 36 h window are kept as frozen pages for KEEP_DAYS, so links that were
shared keep working and search engines do not meet dead ends.

The address of the site is the only thing that changes when the domain moves: site.json ("url"), or the
OBE_SITE_URL environment variable.
"""
import functools
import hashlib
import html
import io
import json
import os
import re
import shutil
from datetime import datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

HERE = Path(__file__).resolve().parent
SITE = HERE / "site"
ASSETS = HERE / "assets"
KEEP_DAYS = 10          # how long a story page stays online after the story left the front page
MIN_OUTLETS = 3         # a comparison needs at least three outlets to be worth a page
TZ = ZoneInfo("Europe/Belgrade")

LABEL = {"pro_government": "Režimski", "critical": "Kritički", "public": "Javni servis",
         "mixed": "Između kategorija", "international": "Međunarodni"}
COLOR = {"pro_government": "#d0021b", "critical": "#0057b8", "public": "#6a4fb3", "mixed": "#9ba1aa", "international": "#007a87"}
FORMS = {"pro_government": ("režimski", "režimska", "režimskih"), "critical": ("kritički", "kritička", "kritičkih"),
         "public": ("javni servis", "javna servisa", "javnih servisa"), "mixed": ("mešoviti", "mešovita", "mešovitih"),
         "international": ("međunarodni", "međunarodna", "međunarodnih"), "medij": ("medij", "medija", "medija"),
         "ostali": ("ostali", "ostala", "ostalih")}
MONTHS = ["januara", "februara", "marta", "aprila", "maja", "juna", "jula", "avgusta", "septembra", "oktobra", "novembra", "decembra"]
LATM = dict(zip("абвгдђежзијклљмнњопрстћуфхцчџш",
                ["a", "b", "v", "g", "d", "đ", "e", "ž", "z", "i", "j", "k", "l", "lj", "m", "n", "nj", "o", "p", "r", "s", "t", "ć",
                 "u", "f", "h", "c", "č", "dž", "š"]))


# ---------------------------------------------------------------- small helpers

def site_url():
    u = os.environ.get("OBE_SITE_URL")
    if not u:
        u = json.loads((HERE / "site.json").read_text(encoding="utf-8"))["url"]
    return u.rstrip("/") + "/"


def e(s):
    return html.escape(str(s or ""), quote=True)


def latin(t):
    """Cyrillic to Latin, the same way the app does it for headlines."""
    if not re.search("[Ѐ-ӿ]", t or ""):
        return t or ""
    out = []
    for i, ch in enumerate(t):
        lo = ch.lower()
        m = LATM.get(lo)
        if m is None:
            out.append(ch)
        elif ch == lo:
            out.append(m)
        else:
            nxt_up = i + 1 < len(t) and t[i + 1] != t[i + 1].lower()
            prv_up = i > 0 and t[i - 1] != t[i - 1].lower()
            out.append(m.upper() if nxt_up or prv_up else m[0].upper() + m[1:])
    return "".join(out)


def form(n, k):
    f = FORMS[k]
    d, h = n % 10, n % 100
    return f[0] if n == 1 or (d == 1 and h != 11) else f[1] if 2 <= d <= 4 and not 12 <= h <= 14 else f[2]


RELAB = {"": "režimski", "i": "režimski", "ih": "režimskih", "a": "režimska", "e": "režimske", "im": "režimskim",
         "og": "režimskog", "om": "režimskom", "u": "režimsku"}


def relabel(t):
    """The AI texts say 'provladini'; the site says 'režimski' (same rule as the app)."""
    return re.sub(r"\b([Pp])rovladin(i|ih|a|e|im|og|om|u)?\b",
                  lambda m: ("R" if m.group(1) == "P" else "r") + RELAB[m.group(2) or ""][1:], t or "")


def clip(t, n):
    t = re.sub(r"\s+", " ", t or "").strip()
    return t if len(t) <= n else t[:t.rfind(" ", 0, n - 1) if " " in t[:n - 1] else n - 1].rstrip(" ,;:–-") + "…"


def when(iso):
    d = datetime.fromisoformat(iso).astimezone(TZ)
    return f"{d.day}. {MONTHS[d.month - 1]} {d.year}. u {d:%H:%M}"


def stamp(name):
    """Short fingerprint of a site file, so a changed app.css / app.js is fetched again."""
    p = SITE / name
    return hashlib.md5(p.read_bytes()).hexdigest()[:8] if p.exists() else "0"


# ---------------------------------------------------------------- what we keep about a story

def coverage(rec):
    """(režimski, kritički, ostali, all) counts and the one-sentence reading of the split (the app's own wording)."""
    sp, n = rec["split"], rec["n"]
    p, c = sp.get("pro_government", 0), sp.get("critical", 0)
    o = n - p - c
    rest = " i ".join(f"{sp[k]} {form(sp[k], k)}" for k in ("public", "mixed", "international") if sp.get(k))
    if p and c:
        lead = "Vest je ravnomerno pokrivena" if abs(p - c) <= 1 else "Vest više prate režimski mediji" if p > c else "Vest više prate kritički mediji"
    else:
        lead = "Vest prati samo jedna strana"
    sentence = f"{lead}: {p} {form(p, 'pro_government')} i {c} {form(c, 'critical')} {form(c or p, 'medij')}" + (f", uz {rest}" if rest else "") + "."
    return p, c, o, n, sentence


def snapshot(s, names):
    ai = s.get("ai") or {}
    items = [{"s": i["source"], "name": names.get(i["source"], {}).get("name", i["source"]),
              "camp": names.get(i["source"], {}).get("camp", "mixed"), "t": i["title"], "u": i["url"], "p": i["published"]}
             for i in s["items"]]
    first = min(items, key=lambda i: i["p"]) if items else None
    return {"id": s["id"], "headline": latin(s["headline"]), "section": s.get("section") or "Vesti",
            "summary": clip(s.get("summary", ""), 220), "razlika": relabel(ai.get("razlika", "")),
            "split": dict(s["split"]), "n": s["sources"], "blind": s.get("blindspot") or "",
            "first": s["first"], "last": s["last"], "broke": first["name"] if first else "", "broke_at": first["p"] if first else s["first"],
            "items": items}


def keep(con, data):
    """Remember today's stories, forget the old ones. Returns [(record, live)], newest first."""
    con.execute("CREATE TABLE IF NOT EXISTS story_pages(id TEXT PRIMARY KEY, first_seen TEXT, last_seen TEXT, body TEXT)")
    names = {x["id"]: x for x in data["sources"]}
    now = datetime.now(timezone.utc).isoformat()
    live = set()
    for s in data["stories"]:
        if s["sources"] < MIN_OUTLETS:
            continue
        live.add(s["id"])
        con.execute("INSERT INTO story_pages VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET last_seen=excluded.last_seen, body=excluded.body",
                    (s["id"], now, now, json.dumps(snapshot(s, names), ensure_ascii=False)))
    cut = (datetime.now(timezone.utc) - timedelta(days=KEEP_DAYS)).isoformat()
    con.execute("DELETE FROM story_pages WHERE last_seen < ?", (cut,))
    con.commit()
    rows = con.execute("SELECT id, last_seen, body FROM story_pages ORDER BY last_seen DESC").fetchall()
    return [(json.loads(b), i in live, ls) for i, ls, b in rows]



# ---------------------------------------------------------------- story art (same rules as site/app.js)

_L = r"[^\W\d_]"
PEOPLE = [("makron", r"Makron"), ("si", r"\bSi\s+(?:Đinping|Džinping|Điping)" + _L + "*"), ("merc", r"\bMerc(?:a|u|om)?(?!" + _L + ")"),
          ("zelenski", r"Zelensk"), ("putin", r"Putin"), ("tramp", r"Tramp"), ("dodik", r"Dodik"), ("vucevic", r"Vučević"),
          ("bakic", r"Jov" + _L + r"*\s+Baki[ćc]"), ("jovanovic", r"Miloš" + _L + r"*\s+Jovanovi[ćc]"), ("brnabic", r"Brnabi[ćc]"),
          ("vucicevic", r"Vučićević", 2), ("cupic", r"Čupić"), ("vucic", r"Vučić(?!ević)", 2)]
TOPICS = [("rem", r"\brem(?:a|u|om|e|i)?\b|regulatorn\w* tel\w* za elektronsk|elektronsk\w* medij"),
          ("nadstresnica", r"nadstresnic|kanop"), ("litijum", r"litijum|rio tinto|jadar"), ("kosovo", r"kosov|pristin|kurti|kfor"),
          ("kina", r"\bkin[aeiu]\b|kinesk|peking"), ("sad", r"tramp|trump|vasington|bela kuc|ameri[ck]"),
          ("rusija-ukrajina", r"ukrajin|rusij|rusk|moskv|kijev"), ("eu", r"evropsk\w* unij|\beu\b|brisel|evropsk\w* komisij"),
          ("energetika", r"naftn|gazprom|\bstruj[aeiu]?\b|energet|\beps\b"), ("protesti", r"protest|student|blokad|\bzbor|plenum"),
          ("izbori", r"izbori|izbora|izborn|izbore|glasanj|birac|kampanj|kandidat"), ("skupstina", r"skupstin|parlament|poslanic"),
          ("pravosudje", r"tuzilast|tuzilac|sudij|presud|optuznic"), ("mediji", r"medij|novinar|televizij|tabloid|\bn1\b|nova s\b"),
          ("region", r"\bregion|zapadn\w* balkan|hrvatsk|bosn|crnogor|slovenij|makedon|sarajev|zagreb|podgoric|skoplj|republik\w* srpsk")]
SECTION_ART = {"Politika": "politika", "Društvo": "drustvo", "Hronika": "hronika", "Ekonomija": "ekonomija", "Svet": "svet",
               "Region": "region", "Kultura": "kultura"}


def _plain(s):
    import unicodedata
    s = unicodedata.normalize("NFD", (s or "").lower())
    return "".join(c for c in s if not unicodedata.combining(c)).replace("đ", "dj")


def art_for(rec):
    """Path of the illustration the site shows for this story: person portrait, else topic art, else section art."""
    h, img = rec["headline"], SITE / "img"
    best = None
    for k, pat, *n in PEOPLE:
        m = re.search(pat, h)
        if m and (best is None or m.start() < best[0]):
            best = (m.start(), k, n[0] if n else 0)
    if best:
        v = f"-{1 + (int(str(rec['id'])[-1], 16) if str(rec['id'])[-1] in '0123456789abcdefABCDEF' else 0) % best[2]}" if best[2] else ""
        return img / "lica" / f"{best[1]}{v}.webp"
    p = _plain(h)
    for k, pat in TOPICS:
        hit = re.search(pat, p) or (k == "sad" and re.search(r"\bSAD\b", h)) or (k == "energetika" and re.search(r"\bNIS\b", h))
        if hit and not (k == "pravosudje" and rec.get("section") not in ("Politika", "Društvo")):
            return img / "teme" / f"{k}.webp"
    return img / "sekcije" / f"{SECTION_ART.get(rec.get('section'), 'vesti')}.webp"


# ---------------------------------------------------------------- share image (1200 x 630)

@functools.lru_cache(maxsize=None)
def _font(name, size):
    from PIL import ImageFont
    return ImageFont.truetype(str(ASSETS / "fonts" / f"SourceSans3-{name}.ttf"), size)


@functools.lru_cache(maxsize=64)
def _panel(path, w, h):
    """The right-hand illustration of a share card, cropped once per image (there are ~45 images and hundreds of cards)."""
    from PIL import Image
    a = Image.open(path).convert("RGB")
    a = a.resize((round(a.width * h / a.height), h), Image.LANCZOS)
    left = max(0, min(a.width - w, round(a.width * 0.5 - w / 2)))
    return a.crop((left, 0, left + w, h))


def _wrap(draw, text, font, maxw):
    lines, cur = [], ""
    for w in text.split():
        t = (cur + " " + w).strip()
        if draw.textlength(t, font=font) <= maxw or not cur:
            cur = t
        else:
            lines.append(cur)
            cur = w
    return lines + ([cur] if cur else [])


def card(headline, split=None, n=0, blind="", sub="", host="", counts=True, art=None):
    """The picture that shows when a story link is shared: headline and the režimski | ostali | kritički bar."""
    from PIL import Image, ImageDraw
    W, H, X = 1200, 630, 64
    img = Image.new("RGB", (W, H), "#141a22")
    TW = W - 2 * X                          # width available for text
    if art and Path(art).exists():          # illustration panel on the right, same art as on the site
        PW = 380
        img.paste(_panel(str(art), PW, H), (W - PW, 0))
        TW = W - PW - X - 40
    d = ImageDraw.Draw(img)
    logo = Image.open(ASSETS / "logo-card.png").convert("RGBA")
    logo = logo.resize((round(logo.width * 46 / logo.height), 46), Image.LANCZOS)
    img.paste(logo, (X, 48), logo)
    top = 138
    if blind:
        f = _font("Bold", 26)
        t = "Slepa tačka"
        d.rounded_rectangle((X, top, X + d.textlength(t, font=f) + 32, top + 44), radius=6, fill="#f5b800")
        d.text((X + 16, top + 6), t, font=f, fill="#121212")
        who = "režimski" if blind == "pro_government" else "kritički"
        d.text((X + d.textlength(t, font=f) + 52, top + 7), f"nijedan {who} medij nije objavio ovu vest", font=_font("Regular", 26), fill="#cfd6df")
        top += 68
    bottom = 440 if split else 520
    room = bottom - top
    for size in range(78, 36, -2):
        f = _font("Bold", size)
        lines = _wrap(d, headline, f, TW)
        if len(lines) * size * 1.13 <= room and len(lines) <= 5:
            break
    else:
        lines = lines[:max(1, int(room // (size * 1.13)))]
        lines[-1] = clip(lines[-1] + "…", 60)
    y = top
    for ln in lines:
        d.text((X, y), ln, font=f, fill="#ffffff")
        y += size * 1.13
    if split:
        p, c = split.get("pro_government", 0), split.get("critical", 0)
        o = max(0, n - p - c)
        segs = [(p, COLOR["pro_government"]), (o, COLOR["mixed"]), (c, COLOR["critical"])]
        segs = [s for s in segs if s[0]]
        gap, bw, by = 4, TW, 468
        usable = bw - gap * (len(segs) - 1)
        x = X
        for i, (k, col) in enumerate(segs):
            w = round(usable * k / max(1, n)) if i < len(segs) - 1 else X + bw - x
            d.rounded_rectangle((x, by, x + w - 1, by + 30), radius=5, fill=col)
            x += w + gap
        f = _font("Regular", 30 if TW > 800 else 25)
        x, ty = X, by + 52
        for k, col, label in () if not counts else ((p, COLOR["pro_government"], form(p, "pro_government")), (o, COLOR["mixed"], form(o, "ostali")),
                              (c, COLOR["critical"], form(c, "critical"))):
            if not k:
                continue
            d.ellipse((x, ty + 11, x + 18, ty + 29), fill=col)
            t = f"{k} {label}"
            d.text((x + 28, ty), t, font=f, fill="#ffffff")
            x += 28 + d.textlength(t, font=f) + (36 if TW > 800 else 22)
        t = f"{n} {form(n, 'medij')}" if counts else ""
        if TW > 800:
            d.text((X + TW - d.textlength(t, font=_font("Bold", 30)), ty), t, font=_font("Bold", 30), fill="#cfd6df")
        elif t:
            d.text((X, ty + 40), t, font=_font("Bold", 25), fill="#cfd6df")
    if sub:
        f = _font("Regular", 32)
        yy = top + len(lines) * size * 1.13 + 18
        for ln in _wrap(d, sub, f, TW)[:4]:
            d.text((X, yy), ln, font=f, fill="#cfd6df")
            yy += 42
    if host:
        f = _font("Regular", 22)
        d.text((X if TW < W - 2 * X else W - X - d.textlength(host, font=f), H - 44), host, font=f, fill="#7d8896")
    buf = io.BytesIO()
    img.quantize(colors=96, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).save(buf, "PNG", optimize=True)
    return buf.getvalue()


# ---------------------------------------------------------------- pages

def head_shared():
    """Icon and font links, copied from the app's index.html so every page looks the same."""
    t = (SITE / "index.html").read_text(encoding="utf-8")
    return "\n".join(re.findall(r'^<(?:link (?:rel="icon"|rel="manifest"|rel="apple-touch-icon"|rel="preconnect"|href="https://fonts)|meta name="theme-color")[^\n]*$', t, re.M))


def ldjson(obj):
    return '<script type="application/ld+json">' + json.dumps(obj, ensure_ascii=False).replace("</", "<\\/") + "</script>"


def describe(rec):
    p, c, o, n, _ = coverage(rec)
    counts = f"{n} medija: {p} {form(p, 'pro_government')} i {c} {form(c, 'critical')}."
    if rec["razlika"]:          # lead with what differs between the two sides; counts only if there is room
        main = clip(rec["razlika"], 158)
        return clip(f"{main} {counts}", 158) if len(main) + len(counts) < 150 else main
    return clip(f"{counts} {rec['summary']}".strip(), 158)


def page_title(rec):
    return clip(rec["headline"], 62 - len(" | Obe strane")) + " | Obe strane"


def story_html(rec, live, site, v):
    url = f"{site}vest/{rec['id']}/"
    img = f"{site}og/{rec['id']}.png"
    desc = describe(rec)
    p, c, o, n, sentence = coverage(rec)
    cols = {}
    for it in sorted(rec["items"], key=lambda i: i["p"]):
        cols.setdefault("pro_government" if it["camp"] == "pro_government" else "critical" if it["camp"] == "critical" else "other", []).append(it)

    def col(key, title, color):
        items = cols.get(key, [])
        if not items:
            who = {"pro_government": "režimski", "critical": "kritički"}.get(key)
            return (f'<section class="st-col" style="--c:{color}"><h2>{title} · 0</h2><p class="st-none">Nijedan {who} medij nije objavio ovu vest.</p></section>' if who else "")
        lis = "".join(f'<li><a href="{e(i["u"])}" target="_blank" rel="noopener nofollow">{e(i["t"])}</a>'
                      f'<small>{e(i["name"])} · {e(when(i["p"]))}</small></li>' for i in items)
        return f'<section class="st-col" style="--c:{color}"><h2>{title} · {len(items)}</h2><ul>{lis}</ul></section>'

    def seg(k, col_):
        return f'<i style="flex:{k};background:{col_}"></i>' if k else ""

    key = "".join(f'<span style="--c:{col_}">{k} {form(k, kk)}</span>' for k, col_, kk in
                  ((p, COLOR["pro_government"], "pro_government"), (o, COLOR["mixed"], "ostali"), (c, COLOR["critical"], "critical")) if k)
    blind = ""
    if rec["blind"]:
        who = "režimski" if rec["blind"] == "pro_government" else "kritički"
        blind = f'<p class="st-blind"><b>Slepa tačka.</b> Nijedan {who} medij nije objavio ovu vest.</p>'
    diff = f'<p class="st-diff"><b>Glavna razlika.</b> {e(rec["razlika"])}</p>' if rec["razlika"] else ""
    note = ""
    if not live:
        note = (f'<p class="st-note">Ovo je sačuvan prikaz vesti iz {e(when(rec["last"]))}. Poslednje vesti i novi naslovi: '
                f'<a href="./">Obe strane</a>.</p>')
    body = f'''<div class="wrap st">
<header class="st-top"><a href="./"><img src="logo.svg" alt="Obe strane" width="174" height="40"></a>
<nav aria-label="Glavni meni"><a href="./">Naslovna</a><a href="./#/slepe-tacke">Slepe tačke</a><a href="./#/izvori">Izvori</a><a href="./#/o-nama">O nama</a></nav></header>
<article>
<p class="st-crumb"><a href="./">Naslovna</a> › {e(rec["section"])}</p>
<h1>{e(rec["headline"])}</h1>
<p class="st-meta">Prvi je objavio {e(rec["broke"])} · {e(when(rec["broke_at"]))} · ukupno {n} {form(n, "medij")}</p>
<p class="st-lead">{e(sentence)}</p>
<div class="st-bar" role="img" aria-label="{e(sentence)}">{seg(p, COLOR["pro_government"])}{seg(o, COLOR["mixed"])}{seg(c, COLOR["critical"])}</div>
<p class="st-key">{key}</p>
{blind}{diff}
<h2 class="st-h">Kako su naslovili</h2>
<div class="st-cols">{col("pro_government", "Režimski", COLOR["pro_government"])}{col("critical", "Kritički", COLOR["critical"])}{col("other", "Ostali", COLOR["mixed"])}</div>
{note}
</article>
<div class="st-foot">Obe strane uporedo prikazuje kako različiti mediji prenose istu vest. Naslovi pripadaju izdanjima koja su ih objavila;
ovde ih samo poredimo i vodimo ka originalu. <a href="metodologija/">Kako razvrstavamo medije</a></div>
</div>'''
    ld = ldjson({"@context": "https://schema.org", "@graph": [
        {"@type": "WebPage", "@id": url, "url": url, "name": rec["headline"], "description": desc, "inLanguage": "sr-Latn",
         "datePublished": rec["first"], "dateModified": rec["last"], "primaryImageOfPage": {"@type": "ImageObject", "url": img},
         "isPartOf": {"@type": "WebSite", "name": "Obe strane", "url": site}},
        {"@type": "BreadcrumbList", "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Naslovna", "item": site},
            {"@type": "ListItem", "position": 2, "name": rec["headline"], "item": url}]}]})
    app = f'''<div id="app">{body}</div>
<script>window.__ROUTE = "vest/{rec["id"]}";</script>
<script>document.write('<script src="data.js?t=' + Math.floor(Date.now() / 60000) + '"><\\/script>');</script>
<script src="app.js?v={v["js"]}"></script>''' if live else f'<div id="app">{body}</div>'
    return f'''<!DOCTYPE html>
<html lang="sr">
<head>
<meta charset="utf-8">
<base href="../../">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{e(page_title(rec))}</title>
<meta name="description" content="{e(desc)}">
{"" if live else '<meta name="robots" content="noindex, follow">'}
<link rel="canonical" href="{url}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="Obe strane">
<meta property="og:locale" content="sr_RS">
<meta property="og:title" content="{e(rec["headline"])}">
<meta property="og:description" content="{e(desc)}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{img}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="article:published_time" content="{e(rec["first"])}">
<meta property="article:modified_time" content="{e(rec["last"])}">
<meta name="twitter:card" content="summary_large_image">
{head_shared()}
<link rel="stylesheet" href="app.css?v={v["css"]}">
<script src="analytics.js?v={v["an"]}"></script>
{ld}
</head>
<body>
{app}
</body>
</html>
'''




METHOD_UPDATED = "25. novembra 2026."


def methodology_html(site, v, n_outlets, ai_model):
    url = f"{site}metodologija/"
    desc = "Kako Obe strane prikupljaju vesti, grupišu ih u priče i razvrstavaju medije, i kako možete da osporite oznaku ili podatak."
    body = f'''<div class="wrap st"><header class="st-top"><a href="./"><img src="logo.svg" alt="Obe strane" width="174" height="40"></a>
<nav aria-label="Glavni meni"><a href="./">Naslovna</a><a href="./#/slepe-tacke">Slepe tačke</a><a href="./#/izvori">Izvori</a><a href="./#/o-nama">O nama</a></nav></header>
<article class="prose">
<h1>Metodologija</h1>
<p class="dek" style="font-size:21px">Kako prikupljamo vesti, grupišemo ih u priče i razvrstavamo medije, i kako možete da osporite našu odluku.</p>

<h2 id="prikazujemo">Šta prikazujemo, a šta ne</h2>
<p>Prikazujemo naslov, kratak uvod, vreme objave i link ka originalu. Ne prenosimo članke, ne ocenjujemo da li je neka vest tačna i ne govorimo koja strana je u pravu. Uz svaki naslov stoji medij koji ga je objavio; naslovi i tekstovi pripadaju njima.</p>

<h2 id="kako-radimo">Kako radimo</h2>
<ol>
<li><b>Prikupljanje.</b> Više puta dnevno čitamo RSS izvore i naslovne strane {n_outlets} medija i čuvamo naslov, uvod, vreme objave i link. Sport, zabavu i lifestyle preskačemo.</li>
<li><b>Grupisanje u priče.</b> Program poredi reči u naslovima i uvodima, na ćirilici i latinici, i spaja članke o istom događaju objavljene u razmaku do 30 sati. Prikazujemo samo priče koje je objavilo najmanje dva medija, a za stranicu priče tražimo najmanje tri. Naslov priče je onaj koji je najsličniji svim ostalima, bez obzira iz kog je tabora. U jednoj priči svaki medij se računa samo jednom, koliko god članaka da je objavio.</li>
<li><b>Slepe tačke.</b> Priča je slepa tačka kada ju je objavilo najmanje tri medija, od toga bar dva sa jedne strane, a nijedan sa druge. Računa se samo ako su mediji te druge strane u to vreme bili praćeni i objavljivali druge vesti, da kvar u prikupljanju ne bi izgledao kao prećutkivanje.</li>
<li><b>Redosled vesti.</b> Priča je viša što je više medija prati i što je svežija: njena težina se prepolovi za svakih osam sati bez novog članka.</li>
<li><b>AI sažeci.</b> Za najveće priče AI model ({e(ai_model)}) piše kratak neutralan sažetak i opis toga kako je koja strana uokvirila vest. Model dobija samo naslove i uvode članaka, uz uputstvo da ne ocenjuje ko je u pravu i da ne dodaje činjenice. Sažeci su uvek označeni i mogu da sadrže greške.</li>
<li><b>Vlasništvo.</b> Podatke o vlasnicima uzimamo iz javnih izvora (State Media Monitor, CRTA, BIRN, istraživanja medija) i uz svaki navodimo izvor. Poslednja provera: novembar 2026.</li>
</ol>

<h2 id="oznake">Kako razvrstavamo medije</h2>
<p>Svaki medij ima početnu oznaku. Oznake se zasnivaju na javnim analizama (CRTA, BIRN Media Ownership Monitor, Raskrikavanje) i na podacima o vlasništvu. To su pretpostavke koje proveravamo, a ne presude.</p>
<ul>
<li><b>Režimski:</b> mediji koji su tokom 14 godina vladavine SNS-a dosledno zastupali tadašnju vlast. Do izbora 25. oktobra 2026. ovu grupu smo zvali „provladini“. Oznaka opisuje uređivačku prošlost medija, ne njihov odnos prema novoj vlasti, i redovno je preispitujemo.</li>
<li><b>Kritički:</b> mediji koje javne analize opisuju kao nezavisne ili kritičke prema vlastima.</li>
<li><b>Javni servis:</b> javni medijski servisi.</li>
<li><b>Između kategorija:</b> mediji koji se ne uklapaju dosledno ni u jednu od dve grupe.</li>
<li><b>Međunarodni:</b> strani mediji koji izveštavaju o Srbiji i regionu.</li>
</ul>
<p>Oznaka, vlasnik i izvor podatka za svaki medij vide se na stranici <a href="./#/izvori">Izvori</a>.</p>

<h2 id="osporavanje">Kako osporiti oznaku ili podatak</h2>
<p>Ako mislite da je oznaka, podatak o vlasništvu ili grupisanje vesti pogrešno, pišite na <a href="mailto:info@obestrane.rs">info@obestrane.rs</a> ili otvorite prijavu na <a href="https://github.com/SrdjanKn/obe-strane/issues" target="_blank" rel="noopener">GitHubu</a>. Navedite medij i, ako možete, izvor koji pokazuje drugačije. Svaku primedbu čitamo; ako dokaz stoji, menjamo oznaku ili podatak. Sve izmene spiska medija vide se u javnoj istoriji koda projekta.</p>

<h2 id="ogranicenja">Ograničenja</h2>
<ul>
<li>Program grupiše vesti po rečima, pa ponekad spoji dve različite vesti ili razdvoji istu.</li>
<li>AI sažeci mogu da sadrže greške: proverite ih u izvornim člancima.</li>
<li>Neki mediji blokiraju automatsko čitanje. Te blokade ne zaobilazimo: takve medije pauziramo dok ne dobijemo RSS ili dozvolu redakcije.</li>
<li>Manji mediji objavljuju malo vesti, pa se ređe pojavljuju u pričama.</li>
</ul>

<h2 id="merenje">Merenje posećenosti</h2>
<p>Da bismo videli koje se vesti i rubrike čitaju, koristimo Google Analytics, ali tek ako to prihvatite u poruci pri dnu stranice. Beležimo koju stranicu ste otvorili, otprilike odakle dolazite (država i uređaj) i koliko dugo ostajete. Ne beležimo ime, e-adresu ni sadržaj pretrage, a reklame i praćenje radi oglašavanja su isključeni. Podatke obrađuje Google. Ako odbijete, ništa se ne šalje. Izbor možete da promenite bilo kada: <button type="button" data-consent-open style="font:inherit;padding:2px 10px;border:1px solid currentColor;border-radius:4px;background:none;color:inherit;cursor:pointer">Promeni izbor</button></p>

<h2 id="projekat">O projektu</h2>
<p>Projekat je nezavisan, neprofitan i u fazi prototipa. Kod je javan na <a href="https://github.com/SrdjanKn/obe-strane" target="_blank" rel="noopener">GitHubu</a>, pa svako može da proveri kako radi. Tekst poslednji put izmenjen: {METHOD_UPDATED}</p>
</article></div>'''
    ld = ldjson({"@context": "https://schema.org", "@type": "WebPage", "@id": url, "url": url, "name": "Metodologija", "description": desc,
                 "inLanguage": "sr-Latn", "isPartOf": {"@type": "WebSite", "name": "Obe strane", "url": site}})
    return f'''<!DOCTYPE html>
<html lang="sr">
<head>
<meta charset="utf-8">
<base href="../">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Metodologija: kako razvrstavamo medije i grupišemo vesti | Obe strane</title>
<meta name="description" content="{e(desc)}">
<link rel="canonical" href="{url}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Obe strane">
<meta property="og:locale" content="sr_RS">
<meta property="og:title" content="Metodologija | Obe strane">
<meta property="og:description" content="{e(desc)}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{site}og/default.png">
<meta name="twitter:card" content="summary_large_image">
{head_shared()}
<link rel="stylesheet" href="app.css?v={v["css"]}">
<script src="analytics.js?v={v["an"]}"></script>
{ld}
</head>
<body>
<div id="app">{body}</div>
</body>
</html>
'''


# ---------------------------------------------------------------- front page, sitemap, robots

def between(text, tag, new):
    """Replace what sits between <!--tag--> and <!--/tag--> (so running this twice changes nothing)."""
    return re.sub(rf"(<!--{tag}-->).*?(<!--/{tag}-->)", lambda m: m.group(1) + new + m.group(2), text, flags=re.S)


def stamp_index(site, recs, v):
    p = SITE / "index.html"
    t = p.read_text(encoding="utf-8")
    desc = "Ista vest, dve strane. Uporedite kako je prenose režimski i kritički mediji – i šta jedna strana prećuti."
    img = f"{site}og/default.png"
    head = f'''
<link rel="canonical" href="{site}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Obe strane">
<meta property="og:locale" content="sr_RS">
<meta property="og:title" content="Obe strane — ista vest, dve strane">
<meta property="og:description" content="{e(desc)}">
<meta property="og:url" content="{site}">
<meta property="og:image" content="{img}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
{ldjson({"@context": "https://schema.org", "@type": "WebSite", "name": "Obe strane", "url": site, "inLanguage": "sr-Latn",
         "description": desc})}
'''
    t = between(t, "seo", head)
    lis = "".join(f'<li><a href="vest/{r["id"]}/">{e(r["headline"])}</a></li>' for r, live, _ in recs if live)[:60000]
    nos = (f'<noscript><main style="max-width:760px;margin:0 auto;padding:24px;font-family:system-ui,sans-serif">'
           f'<h1>Obe strane — ista vest, dve strane</h1><p>{e(desc)}</p><ul>{lis}</ul></main></noscript>')
    t = between(t, "nos", nos)
    t = re.sub(r"app\.css\?v=\w+", f"app.css?v={v['css']}", t)
    t = re.sub(r"app\.js\?v=\w+", f"app.js?v={v['js']}", t)
    t = re.sub(r"analytics\.js\?v=\w+", f"analytics.js?v={v['an']}", t)
    p.write_text(t, encoding="utf-8")


def sitemap(site, recs):
    today = f"{datetime.now(timezone.utc):%Y-%m-%d}"
    urls = [f"<url><loc>{site}</loc><lastmod>{today}</lastmod></url>", f"<url><loc>{site}metodologija/</loc><lastmod>{today}</lastmod></url>"]
    urls += [f"<url><loc>{site}vest/{r['id']}/</loc><lastmod>{ls[:10]}</lastmod></url>" for r, live, ls in recs if live]
    return ('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
            + "\n".join(urls) + "\n</urlset>\n")


def not_found(site, v):
    return f'''<!DOCTYPE html>
<html lang="sr"><head><meta charset="utf-8"><base href="{site}"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex"><title>Stranica nije pronađena | Obe strane</title>
{head_shared()}
<link rel="stylesheet" href="app.css?v={v["css"]}">
<script src="analytics.js?v={v["an"]}"></script></head>
<body><div class="wrap st"><header class="st-top"><a href="./"><img src="logo.svg" alt="Obe strane" width="174" height="40"></a></header>
<h1>Ova stranica ne postoji</h1><p class="st-lead">Vest je možda stara, ili je adresa pogrešna. Najnovije vesti su na <a href="./">naslovnoj</a>.</p></div></body></html>
'''


# ---------------------------------------------------------------- entry point

def build(con, data):
    site = site_url()
    v = {"css": stamp("app.css"), "js": stamp("app.js"), "an": stamp("analytics.js")}
    recs = keep(con, data)
    for sub in ("vest", "og"):
        shutil.rmtree(SITE / sub, ignore_errors=True)
        (SITE / sub).mkdir(parents=True)
    host = re.sub(r"^https?://", "", site).rstrip("/")
    for rec, live, _ in recs:
        d = SITE / "vest" / rec["id"]
        d.mkdir()
        (d / "index.html").write_text(story_html(rec, live, site, v), encoding="utf-8")
        (SITE / "og" / f"{rec['id']}.png").write_bytes(card(rec["headline"], rec["split"], rec["n"], rec["blind"], host=host, art=art_for(rec)))
    (SITE / "og" / "default.png").write_bytes(card("Ista vest, dve strane", {"pro_government": 5, "critical": 5}, 12, counts=False, sub="Uporedite kako je prenose režimski i kritički mediji – i šta jedna strana prećuti.", host=host, art=SITE / "img" / "sekcije" / "vesti.webp"))
    stamp_index(site, recs, v)
    (SITE / "metodologija").mkdir(exist_ok=True)
    n_out = sum(1 for x in data["sources"] if not x.get("paused"))
    (SITE / "metodologija" / "index.html").write_text(methodology_html(site, v, n_out, data.get("ai_model") or "Claude"), encoding="utf-8")
    (SITE / "sitemap.xml").write_text(sitemap(site, recs), encoding="utf-8")
    (SITE / "robots.txt").write_text(f"User-agent: *\nAllow: /\n\nSitemap: {site}sitemap.xml\n", encoding="utf-8")
    (SITE / "404.html").write_text(not_found(site, v), encoding="utf-8")
    print(f"SEO: {len(recs)} story pages ({sum(1 for _, l, _ in recs if l)} live), share images, sitemap, robots  [{site}]")
