"""Chroma-key circular UI medallions into the Moonwatch pack."""
from pathlib import Path
import numpy as np
from PIL import Image

SRC = Path(r"C:\Users\ivan-\.cursor\projects\c-Users-ivan-my-app\assets")
DST = Path(r"C:\Users\ivan-\my-app\assets\art\moonwatch")

MAP = {
    "ui-icon-gear.png": "icon-gear.png",
    "ui-icon-shop.png": "icon-shop.png",
    "ui-icon-skills.png": "icon-skills.png",
    "ui-icon-settings.png": "icon-settings.png",
}


def main():
    DST.mkdir(parents=True, exist_ok=True)
    for src_name, dst_name in MAP.items():
        arr = np.array(Image.open(SRC / src_name).convert("RGBA")).astype(np.int16)
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
            pad = 6
            l, t, rgt, btm = bbox
            im = im.crop(
                (max(0, l - pad), max(0, t - pad), min(im.width, rgt + pad), min(im.height, btm + pad))
            )
        dest = DST / dst_name
        im.save(dest, "PNG")
        print(f"wrote {dst_name} {im.size} alpha={im.getchannel('A').getextrema()}")


if __name__ == "__main__":
    main()
