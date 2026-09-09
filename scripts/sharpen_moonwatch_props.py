"""Sharpen 2D Moonwatch props without changing their flat style."""
from pathlib import Path
from PIL import Image, ImageFilter, ImageEnhance

ROOT = Path(r"C:\Users\ivan-\my-app\assets\art\moonwatch")
PROPS = [
    "tree.png",
    "pillar.png",
    "arch.png",
    "bush.png",
    "spikes.png",
    "chest.png",
    "grave.png",
    "firepit.png",
    "rock.png",
    "house.png",
    "lamp.png",
    "wall.png",
    "window.png",
    "spire.png",
    "bones.png",
    "ice.png",
    "fence.png",
]


def sharpen(im):
    im = im.convert("RGBA")
    sharp = im.filter(ImageFilter.UnsharpMask(radius=1.8, percent=165, threshold=2))
    rgb = ImageEnhance.Contrast(sharp).enhance(1.06)
    return rgb


def main():
    for name in PROPS:
        path = ROOT / name
        if not path.exists():
            print("missing", name)
            continue
        out = sharpen(Image.open(path))
        out.save(path, "PNG")
        print("sharpened", name, out.size)


if __name__ == "__main__":
    main()
