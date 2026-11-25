"""Story artwork for Obe strane: a halftone paper collage, built from a small library of licensed
objects and buildings (no real people), plus the story's own coverage bar.

Each story gets a unique picture: the layout, burst and tears are seeded by the story id, the objects are
picked from the story's section and keywords. Sad or tragic stories get a calm layout without the burst."""
import hashlib
import math
import random
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont, ImageOps

HERE = Path(__file__).resolve().parent
FONTS = HERE / "assets" / "fonts"

PAPER = (241, 234, 222)
INK = (24, 22, 22)
RED = (208, 2, 27)
BLUE = (0, 87, 184)
GREY = (150, 150, 150)
W, H = 1200, 800


# ---------------------------------------------------------------- helpers

def font(bold, size):
    # BASIC layout: the RAQM engine spaces "ti" wrongly with these static font files ("kri tičkih")
    return ImageFont.truetype(str(FONTS / f"SourceSans3-{'Bold' if bold else 'Regular'}.ttf"), size,
                              layout_engine=ImageFont.Layout.BASIC)


def paper(rng):
    """Warm paper with fine grain."""
    base = Image.new("RGB", (W, H), PAPER)
    noise = Image.effect_noise((W, H), 18).convert("L")
    grain = ImageOps.colorize(noise, (222, 213, 199), (250, 245, 236))
    return Image.blend(base, grain, 0.35)


def halftone(gray, cell=7, angle=45):
    """Classic newspaper halftone: black dots whose size follows the darkness of the photo.
    Returns an L image, 0 = ink, 255 = paper."""
    big = gray.rotate(angle, expand=True, fillcolor=255)
    bw, bh = big.size
    small = big.resize((max(1, bw // cell), max(1, bh // cell)), Image.BILINEAR)
    out = Image.new("L", (bw, bh), 255)
    d = ImageDraw.Draw(out)
    px = small.load()
    for y in range(small.size[1]):
        for x in range(small.size[0]):
            dark = 1 - px[x, y] / 255
            r = cell * 0.72 * math.sqrt(dark)
            if r > 0.4:
                cx, cy = x * cell + cell / 2, y * cell + cell / 2
                d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=0)
    out = out.rotate(-angle, expand=True, fillcolor=255)
    ox, oy = (out.size[0] - gray.size[0]) // 2, (out.size[1] - gray.size[1]) // 2
    return out.crop((ox, oy, ox + gray.size[0], oy + gray.size[1]))


def print_look(img, cell=6):
    """Photo -> black-and-white newspaper print: contrasty grey, mixed with a halftone screen."""
    g = ImageOps.autocontrast(ImageOps.grayscale(img), cutoff=2)
    g = g.point(lambda v: int(255 * (v / 255) ** 1.1))
    ht = halftone(g, cell=cell)
    return Image.blend(g, ht, 0.55)


def torn_mask(size, rng, edges="tb", depth=14, step=9):
    """Paper scrap mask with ragged torn edges on the chosen sides."""
    w, h = size
    pts = []
    top = [(x, rng.uniform(0, depth)) for x in range(0, w + step, step)] if "t" in edges else [(0, 0), (w, 0)]
    right = [(w - rng.uniform(0, depth), y) for y in range(0, h + step, step)] if "r" in edges else [(w, 0), (w, h)]
    bottom = [(x, h - rng.uniform(0, depth)) for x in range(w, -step, -step)] if "b" in edges else [(w, h), (0, h)]
    left = [(rng.uniform(0, depth), y) for y in range(h, -step, -step)] if "l" in edges else [(0, h), (0, 0)]
    pts = top + right + bottom + left
    m = Image.new("L", size, 0)
    ImageDraw.Draw(m).polygon(pts, fill=255)
    return m


def cutout(img, mode):
    """Alpha mask separating the subject from a plain background. mode: 'light' (white/sky bg),
    'color:<r>,<g>,<b>' (solid colour bg)."""
    rgb = img.convert("RGB")
    if mode == "light":
        g = ImageOps.grayscale(rgb)
        r, gch, b = rgb.split()
        sky = ImageChops.subtract(b, r)                        # blue sky reads as background too
        bg = ImageChops.lighter(g.point(lambda v: 255 if v > 205 else 0), sky.point(lambda v: 255 if v > 38 else 0))
    else:
        tr, tg, tb = (int(c) for c in mode.split(":")[1].split(","))
        px = rgb.load()
        bg = Image.new("L", rgb.size, 0)
        bp = bg.load()
        for y in range(rgb.size[1]):
            for x in range(rgb.size[0]):
                r, g, b = px[x, y]
                bp[x, y] = 255 if abs(r - tr) + abs(g - tg) + abs(b - tb) < 120 else 0
    m = ImageOps.invert(bg).filter(ImageFilter.MedianFilter(7)).filter(ImageFilter.MaxFilter(3))
    return m.filter(ImageFilter.GaussianBlur(0.8))


def burst(d, cx, cy, rng, colors, n=9, rin=150, rout=(380, 640)):
    """Big starburst of red and black shards behind the main subject, like a torn poster."""
    a0 = rng.uniform(0, math.pi)
    d.ellipse((cx - rin * 1.25, cy - rin, cx + rin * 1.25, cy + rin), fill=colors[0])
    for i in range(n):
        a = a0 + i * 2 * math.pi / n + rng.uniform(-0.12, 0.12)
        span = rng.uniform(0.30, 0.52)
        ro = rng.uniform(*rout)
        p = [(cx + rin * math.cos(a - span), cy + rin * math.sin(a - span) * 0.8),
             (cx + ro * math.cos(a), cy + ro * math.sin(a) * 0.72),
             (cx + rin * math.cos(a + span), cy + rin * math.sin(a + span) * 0.8)]
        d.polygon(p, fill=colors[i % len(colors)])


def scribble(d, x0, y0, length, rng, width=6):
    """A quick marker stroke, like an editor's underline."""
    pts = []
    for i in range(140):
        t = i / 139
        x = x0 + t * length + 26 * math.cos(t * 22) * (1 - t * 0.6)
        y = y0 + 14 * math.sin(t * 22) + t * 10 + rng.uniform(-1.5, 1.5)
        pts.append((x, y))
    d.line(pts, fill=INK, width=width, joint="curve")


def place(canvas, layer, mask, xy, angle=0):
    if angle:
        layer = layer.rotate(angle, expand=True, resample=Image.BICUBIC, fillcolor=(255, 255, 255))
        mask = mask.rotate(angle, expand=True, resample=Image.BICUBIC)
    canvas.paste(layer, (int(xy[0]), int(xy[1])), mask)


def shadow(canvas, mask, xy, angle=0, off=(6, 8)):
    if angle:
        mask = mask.rotate(angle, expand=True, resample=Image.BICUBIC)
    sh = mask.filter(ImageFilter.GaussianBlur(6)).point(lambda v: int(v * 0.28))
    dark = Image.new("RGB", mask.size, (60, 50, 40))
    canvas.paste(dark, (int(xy[0] + off[0]), int(xy[1] + off[1])), sh)


def fit(img, box_w, box_h, cover=True):
    r = (max if cover else min)(box_w / img.width, box_h / img.height)
    return img.resize((max(1, int(img.width * r)), max(1, int(img.height * r))), Image.LANCZOS)


def cover_crop(img, w, h, fx=0.5, fy=0.5):
    img = fit(img, w, h, cover=True)
    x, y = int((img.width - w) * fx), int((img.height - h) * fy)
    return img.crop((x, y, x + w, y + h))


# ---------------------------------------------------------------- coverage bar

def coverage_bar(canvas, split, rng):
    """The story's own režimski | ostali | kritički split, as a torn strip along the bottom."""
    p = split.get("pro_government", 0)
    c = split.get("critical", 0)
    o = sum(v for k, v in split.items() if k not in ("pro_government", "critical"))
    n = max(1, p + c + o)
    bw, bh = 760, 34
    x0, y0 = (W - bw) // 2, H - 92
    strip = Image.new("RGB", (bw, bh), GREY)
    d = ImageDraw.Draw(strip)
    xp = round(bw * p / n)
    xo = xp + round(bw * o / n)
    d.rectangle((0, 0, xp, bh), fill=RED)
    d.rectangle((xp, 0, xo, bh), fill=(188, 182, 172))
    d.rectangle((xo, 0, bw, bh), fill=BLUE)
    m = torn_mask((bw, bh), rng, edges="lr", depth=8, step=6)
    shadow(canvas, m, (x0, y0), off=(3, 4))
    place(canvas, strip, m, (x0, y0))
    lab = ImageDraw.Draw(canvas)
    f = font(True, 22)
    lab.text((x0, y0 + bh + 8), f"{p} režimskih", font=f, fill=RED)
    t = f"{c} kritičkih"
    lab.text((x0 + bw - lab.textlength(t, font=f), y0 + bh + 8), t, font=f, fill=BLUE)
    if o:
        t = f"{o} ostalih"
        lab.text((W / 2 - lab.textlength(t, font=f) / 2, y0 + bh + 8), t, font=font(False, 22), fill=(110, 104, 96))


# ---------------------------------------------------------------- compositions

def compose(story, assets, calm=False):
    """story: {id, section, split}. assets: {'hero': (img, cut_mode), 'left': img, 'right': img, ...}"""
    rng = random.Random(int(hashlib.md5(story["id"].encode()).hexdigest()[:8], 16))
    canvas = paper(rng)
    d = ImageDraw.Draw(canvas)
    cx, cy = W // 2 + rng.randint(-30, 30), 330

    if not calm:
        burst(d, cx, cy, rng, [RED, INK, RED, INK, RED])
    else:                                   # calm: one soft grey band, no blades, no scribble
        d.rectangle((0, 150, W, 520), fill=(226, 219, 207))

    # side scraps: torn photo strips tilted left and right
    for key, (bx, by, bw_, bh_, ang, edges) in {
            "left": (70, 120, 360, 300, rng.uniform(-6, -2), "trbl"),
            "right": (W - 430, 150, 360, 280, rng.uniform(2, 6), "trbl")}.items():
        if key in assets:
            scrap = print_look(cover_crop(assets[key], bw_, bh_, fy=0.45)).convert("RGB")
            m = torn_mask((bw_, bh_), rng, edges=edges, depth=12)
            shadow(canvas, m, (bx, by), ang)
            place(canvas, scrap, m, (bx, by), ang)

    # newspaper scrap low left
    if "paper" in assets:
        sw, sh_ = 300, 150
        scrap = print_look(cover_crop(assets["paper"], sw, sh_), cell=4).convert("RGB")
        m = torn_mask((sw, sh_), rng, edges="trbl", depth=10)
        pos = (90, 470) if not calm else (W - 400, 470)
        shadow(canvas, m, pos, -4)
        place(canvas, scrap, m, pos, rng.uniform(-6, 2))

    # hero object, cut out, big in the middle
    img, mode = assets["hero"]
    hero = fit(img, *(story.get("hero_box") or (640, 480)), cover=False)
    if hero.mode == "RGBA":
        mask = hero.getchannel("A")
        flat = Image.new("RGB", hero.size, (255, 255, 255)); flat.paste(hero, mask=mask); hero = flat
    else:
        mask = cutout(hero, mode)
    look = print_look(hero, cell=6).convert("RGB")
    hx, hy = cx - hero.width // 2, cy - hero.height // 2 + 30
    shadow(canvas, mask, (hx, hy), off=(10, 12))
    canvas.paste(look, (hx, hy), mask)

    if not calm:
        scribble(d, W - 520, H - 150, 330, rng)

    coverage_bar(canvas, story["split"], rng)

    # section tag, top left, as a black label
    tag = story["section"]
    f = font(True, 26)
    tw = d.textlength(tag, font=f)
    d.rectangle((40, 36, 40 + tw + 28, 36 + 44), fill=INK)
    d.text((54, 41), tag, font=f, fill=PAPER)
    return canvas
