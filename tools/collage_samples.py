"""One-off: render sample story artwork from Unsplash photos (Unsplash License). Runs in GitHub Actions."""
import io, sys, urllib.request
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from PIL import Image
import collage as C

U = "https://images.unsplash.com/{}?ixlib=rb-4.1.0&q=85&fm=jpg&w=1600"
SRC = {  # name: (unsplash photo, photographer) -- all Unsplash License, no identifiable people
    "assembly": ("photo-1781174849412-f998295ce354", "Anton Borzenkov"),
    "cuffs": ("photo-1521437100987-e1cb2178879b", "niu niu"),
    "typewriter": ("photo-1764339297035-9c03aac0f130", "Ashley Kirk"),
    "mic": ("photo-1745848413041-3eeb106db501", "dlxmedia.hu"),
    "paper": ("photo-1504711434969-e33886168f5c", "AbsolutVision"),
    "police": ("photo-1608095476825-d4e0f916372f", "Scott Rodgerson"),
}
img = {}
for k, (pid, _) in SRC.items():
    req = urllib.request.Request(U.format(pid), headers={"User-Agent": "obe-strane"})
    img[k] = Image.open(io.BytesIO(urllib.request.urlopen(req, timeout=60).read())).convert("RGB")

out = Path("samples"); out.mkdir(exist_ok=True)
jobs = [
    ({"id": "58184a3c9e", "section": "Politika", "hero_box": (820, 470),
      "split": {"pro_government": 15, "critical": 10, "mixed": 3, "public": 2, "international": 2}},
     {"hero": (img["assembly"], "light"), "left": img["mic"], "right": img["paper"], "paper": img["paper"]}, False),
    ({"id": "31776e8a95", "section": "Hronika",
      "split": {"pro_government": 15, "critical": 12, "mixed": 4, "public": 2, "international": 3}},
     {"hero": (img["cuffs"], "light"), "left": img["police"], "right": img["paper"], "paper": img["paper"]}, False),
    ({"id": "ad4bbcd2f1", "section": "Društvo",
      "split": {"pro_government": 15, "critical": 7, "mixed": 3, "public": 2}},
     {"hero": (img["typewriter"], "light"), "left": img["paper"], "paper": img["paper"]}, True),
]
for story, assets, calm in jobs:
    C.compose(story, assets, calm=calm).convert("RGB").save(out / f"{story['id']}.jpg", quality=86)
    print("ok", story["id"])
