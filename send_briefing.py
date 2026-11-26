#!/usr/bin/env python3
"""Send the morning briefing by e-mail through Buttondown.

Reads the live site data (the same briefing the site shows at #/brifing), builds one e-mail and posts it to Buttondown.
  BUTTONDOWN_API_KEY   Buttondown -> Settings -> API (GitHub secret). Without it the script only writes a preview.
  BRIEFING_STATUS      "draft" (default: Buttondown keeps it, nothing is sent) or "about_to_send" (sends to everyone)
  python3 send_briefing.py --file site/data.js --preview out.html     # local test, nothing is sent
Runs only when it is 07:xx in Belgrade and the briefing is today's (so two cron times can cover summer and winter time);
--force skips both checks."""
import argparse, json, os, re, sys, urllib.request
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from seo import e, latin, relabel, clip, form                      # same text helpers the site pages use
from collector import belgrade_now

SITE = os.environ.get("SITE_URL", "https://www.obestrane.rs/").rstrip("/") + "/"
MONTHS = ["januar", "februar", "mart", "april", "maj", "jun", "jul", "avgust", "septembar", "oktobar", "novembar", "decembar"]
DAYS = ["ponedeljak", "utorak", "sreda", "četvrtak", "petak", "subota", "nedelja"]


def load(src):
    raw = Path(src).read_text(encoding="utf-8") if not src.startswith("http") else \
        urllib.request.urlopen(urllib.request.Request(src, headers={"User-Agent": "obe-strane-briefing"}), timeout=30).read().decode("utf-8")
    return json.loads(re.sub(r"^window\.NEWS_DATA\s*=\s*|;\s*$", "", raw.strip()))


def link(s, live_ids):
    return f"{SITE}vest/{s['id']}/" if s["id"] in live_ids and s["sources"] >= 3 else f"{SITE}#/brifing"


FONT = "'Source Sans 3','Source Sans Pro',Helvetica,Arial,sans-serif"      # the site's own font; mail apps without web fonts fall back to Helvetica/Arial
META = "Inter,Helvetica,Arial,sans-serif"


def image_url(s):
    """Same illustration the site shows for the story (portrait, topic or section art), as a JPEG made for e-mail."""
    from seo import art_for
    p = art_for({"headline": latin(s["headline"]), "section": s.get("section") or "Vesti", "id": s["id"]})
    return f"{SITE}img/mail/{p.parent.name}-{p.stem}.jpg"


def story_html(s, n, live_ids, blind=False):
    ai = s.get("ai") or {}
    head = latin(s["headline"])
    lead = relabel(latin(ai.get("ukratko") or s.get("summary") or ""))
    sides = ""
    for key, label, color in (("provladini", "Režimski mediji", "#c40d22"), ("kriticki", "Kritički mediji", "#0b5bb5")):
        if ai.get(key):
            sides += f'<p style="margin:6px 0;font-size:15px;line-height:1.5"><b style="color:{color}">{label}:</b> {e(relabel(latin(ai[key])))}</p>'
    if not sides:                                           # no AI text: show the outlets' own first headlines
        for key, label, color in (("pg", "Režimski mediji", "#c40d22"), ("cr", "Kritički mediji", "#0b5bb5")):
            if s.get(key):
                sides += f'<p style="margin:6px 0;font-size:15px;line-height:1.5"><b style="color:{color}">{label}:</b> „{e(latin(s[key]["title"]))}“</p>'
    split = s.get("split", {})
    p, c, tot = split.get("pro_government", 0), split.get("critical", 0), s.get("sources", 0)
    cov = f'{tot} {form(tot, "medij")} · {p} {form(p, "pro_government")} · {c} {form(c, "critical")}'
    href = link(s, live_ids)
    img = (f'<a href="{href}"><img src="{image_url(s)}" width="{"600" if n == 1 else "180"}" alt="" '
           f'style="display:block;border:0;width:100%;max-width:{"600" if n == 1 else "180"}px;height:auto;border-radius:6px"></a>')
    text = (f'<div style="font-family:{META};font-size:12px;color:#666;margin:0 0 4px">{n}. {e(s.get("section", ""))} · {cov}</div>'
            f'<h2 style="margin:0 0 8px;font-family:{FONT};font-size:{"25" if n == 1 else "21"}px;line-height:1.22;font-weight:700">'
            f'<a href="{href}" style="color:#121212;text-decoration:none">{e(head)}</a></h2>'
            f'<p style="margin:0 0 8px;font-size:16px;line-height:1.5">{e(clip(lead, 300))}</p>{sides}')
    if n == 1:                                              # lead story: big picture on top
        inner = f'<div style="margin:0 0 14px">{img}</div>{text}'
    else:                                                   # others: picture to the right (stacks under the text on narrow screens)
        inner = (f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:0"><tr>'
                 f'<td valign="top" style="padding-right:16px">{text}</td>'
                 f'<td valign="top" width="180" style="width:180px">{img}</td></tr></table>')
    return f'<div style="margin:0 0 28px;padding-bottom:24px;border-bottom:1px solid #ddd">{inner}</div>'


def build(data):
    b = data.get("briefing")
    if not b:
        return None, None, None
    live_ids = {s["id"] for s in data.get("stories", [])}
    d = datetime.fromisoformat(b["day"])
    date = f'{DAYS[d.weekday()]}, {d.day}. {MONTHS[d.month - 1]}'
    stories, blinds = b.get("stories", []), b.get("blindspots", [])
    body = "".join(story_html(s, i + 1, live_ids) for i, s in enumerate(stories))
    if blinds:
        body += (f'<h2 style="margin:30px 0 6px;font-family:{FONT};font-size:24px;color:#b36b00">Prećutano</h2>'
                 f'<p style="margin:0 0 16px;font-size:14px;color:#666">Vesti koje je objavila samo jedna strana.</p>')
        body += "".join(story_html(s, len(stories) + i + 1, live_ids, True) for i, s in enumerate(blinds))
    html_ = (f'<style>@import url("https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;600;700&family=Inter:wght@500&display=swap");</style>'
             f'<div style="font-family:{FONT};color:#121212;max-width:600px;margin:0 auto">'
             f'<p style="margin:0 0 2px;font-family:{META};font-size:13px;color:#666">Jutarnji brifing · {e(date)}</p>'
             f'<h1 style="margin:0 0 22px;font-family:{FONT};font-size:34px;line-height:1.1;font-weight:700;letter-spacing:-.01em">Obe strane u 5 minuta</h1>{body}'
             f'<p style="font-family:{META};font-size:12px;color:#777;line-height:1.5">Ilustracije: Obe strane. Sažetke i opise uokviravanja piše AI model na osnovu naslova i uvoda članaka i mogu da sadrže greške. '
             f'<a href="{SITE}metodologija/" style="color:#777">Kako radimo</a>. Vesti tokom dana: <a href="{SITE}" style="color:#777">obestrane.rs</a>.</p></div>')
    top = latin(stories[0]["headline"]) if stories else "Vesti dana"
    return f"Obe strane, {date}: {clip(top, 70)}", html_, b["day"]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--file", default=SITE + "data.js")
    ap.add_argument("--preview")
    ap.add_argument("--force", action="store_true")
    a = ap.parse_args()
    now = belgrade_now()
    subject, body, day = build(load(a.file))
    if not subject:
        print("No briefing in the data; nothing to send."); return 0
    if not a.force and (now.hour != 7 or day != now.date().isoformat()):
        print(f"Skipping: Belgrade time {now:%Y-%m-%d %H:%M}, briefing day {day}."); return 0
    if a.preview:
        Path(a.preview).write_text(f"<!doctype html><meta charset=utf-8><title>{e(subject)}</title>{body}", encoding="utf-8")
        print(f"Preview written: {a.preview}\nSubject: {subject}")
    key = os.environ.get("BUTTONDOWN_API_KEY")
    if not key:
        print("BUTTONDOWN_API_KEY is not set: not sent."); return 0
    status = os.environ.get("BRIEFING_STATUS", "draft")
    req = urllib.request.Request("https://api.buttondown.com/v1/emails", method="POST",
                                 data=json.dumps({"subject": subject, "body": body, "status": status}).encode(),
                                 headers={"Authorization": f"Token {key}", "Content-Type": "application/json", "User-Agent": "obe-strane-briefing"})
    with urllib.request.urlopen(req, timeout=60) as r:
        print(f"Buttondown: HTTP {r.status}, status={status}, subject={subject}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
