"""Flatten Moonwatch props toward the knight's 2D language: fewer value bands, less volume."""
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter

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


def blur_luma(y, a, radius):
    premul = np.clip(y * a, 0, 255).astype(np.uint8)
    alpha = np.clip(a * 255, 0, 255).astype(np.uint8)
    yb = np.array(Image.fromarray(premul, "L").filter(ImageFilter.GaussianBlur(radius)), dtype=np.float32)
    ab = np.array(Image.fromarray(alpha, "L").filter(ImageFilter.GaussianBlur(radius)), dtype=np.float32) / 255.0
    return yb / np.maximum(ab, 0.05)


def flatten(im):
    arr = np.array(im.convert("RGBA")).astype(np.float32)
    rgb = arr[:, :, :3]
    a = arr[:, :, 3] / 255.0
    r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    y = r * 0.2126 + g * 0.7152 + b * 0.0722

    radius = max(14, int(min(im.size) * 0.06))
    y_mean = blur_luma(y, a, radius)
    y_flat = y * 0.32 + y_mean * 0.68
    y_flat = 132.0 + (y_flat - 132.0) * 0.5

    scale = np.where(y > 2.0, y_flat / np.maximum(y, 2.0), 1.0)
    rgb2 = rgb * scale[:, :, None]

    bands = 5.0
    step = 255.0 / bands
    quantized = np.round(rgb2 / step) * step
    rgb2 = rgb2 * 0.55 + quantized * 0.45

    warm = (r > 148) & (g > 72) & ((r - b) > 36) & (r > g)
    cool = (b > 170) & (g > 150) & (b > r + 8)
    keep = (warm | cool) & (a > 0.2)
    rgb2[keep] = rgb[keep]

    rgb2 = np.clip(rgb2, 0, 255)
    sat = 1.06
    gray = (rgb2[:, :, 0] * 0.2126 + rgb2[:, :, 1] * 0.7152 + rgb2[:, :, 2] * 0.0722)[:, :, None]
    rgb2 = np.clip(gray + (rgb2 - gray) * sat, 0, 255)

    out = arr.copy()
    vis = a > 0.02
    out[vis, 0] = rgb2[vis, 0]
    out[vis, 1] = rgb2[vis, 1]
    out[vis, 2] = rgb2[vis, 2]
    return Image.fromarray(out.astype(np.uint8), "RGBA")


def main():
    for name in PROPS:
        path = ROOT / name
        if not path.exists():
            print("missing", name)
            continue
        im = Image.open(path)
        flat = flatten(im)
        flat.save(path, "PNG")
        print(f"flattened {name} {flat.size}")


if __name__ == "__main__":
    main()
