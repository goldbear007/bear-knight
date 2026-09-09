"""Chroma-key the Moonwatch main-menu crest onto a transparent PNG."""
from pathlib import Path
import numpy as np
from PIL import Image

SRC = Path(r"C:\Users\ivan-\.cursor\projects\c-Users-ivan-my-app\assets\moonwatch-menu-crest.png")
DST = Path(r"C:\Users\ivan-\my-app\assets\art\moonwatch\menu-crest.png")


def main():
    arr = np.array(Image.open(SRC).convert("RGBA")).astype(np.int16)
    r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
    mag = (r > 130) & (g < 55) & (b > 55) & ((r - g) > 70)
    near = (r > 110) & (g < 80) & (b > 40) & ((r - g) > 40) & ~mag
    alpha = np.where(mag, 0, np.where(near, 70, 255)).astype(np.uint8)
    out = arr.astype(np.uint8)
    out[:, :, 3] = alpha
    fringe = (alpha > 0) & (alpha < 255)
    out[:, :, 0] = np.where(fringe, np.minimum(out[:, :, 0], out[:, :, 1] + 24), out[:, :, 0])
    im = Image.fromarray(out)
    bbox = im.getbbox()
    if bbox:
        pad = 8
        l, t, rgt, btm = bbox
        im = im.crop((max(0, l - pad), max(0, t - pad), min(im.width, rgt + pad), min(im.height, btm + pad)))
    DST.parent.mkdir(parents=True, exist_ok=True)
    im.save(DST, "PNG")
    print(f"wrote {DST} {im.size} alpha={im.getchannel('A').getextrema()}")


if __name__ == "__main__":
    main()
