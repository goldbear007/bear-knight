"""Normalize generated Moonwatch plates: chroma-key props, sky-key mids, crop caps."""
from pathlib import Path
import shutil
import numpy as np
from PIL import Image

SRC = Path(r"C:\Users\ivan-\.cursor\projects\c-Users-ivan-my-app\assets")
DST = Path(r"C:\Users\ivan-\my-app\assets\art\moonwatch")
DST.mkdir(parents=True, exist_ok=True)


def save(im, name):
    p = DST / name
    im.save(p, "PNG")
    bands = im.getbands()
    alpha = im.getchannel("A").getextrema() if "A" in bands else None
    print(f"wrote {name} {im.size} {im.mode} alpha={alpha}")


def chroma_magenta(im):
    arr = np.array(im.convert("RGBA")).astype(np.int16)
    r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
    mag = (r > 130) & (g < 55) & (b > 55) & ((r - g) > 70)
    near = (r > 110) & (g < 80) & (b > 40) & ((r - g) > 40) & ~mag
    alpha = np.where(mag, 0, np.where(near, 80, 255)).astype(np.uint8)
    out = arr.astype(np.uint8)
    out[:, :, 3] = alpha
    fringe = (alpha > 0) & (alpha < 255)
    out[:, :, 0] = np.where(fringe, np.minimum(out[:, :, 0], out[:, :, 1] + 30), out[:, :, 0])
    return Image.fromarray(out)


def key_studio_black(im, luma_max=18):
    arr = np.array(im.convert("RGBA")).astype(np.int16)
    luma = (arr[:, :, 0] * 3 + arr[:, :, 1] * 6 + arr[:, :, 2]) // 10
    a = arr[:, :, 3]
    a = np.where((luma < luma_max) & (a > 0), 0, a)
    arr[:, :, 3] = a.astype(np.uint8)
    return Image.fromarray(arr.astype(np.uint8))


def crop_alpha(im, pad=4):
    bbox = im.getbbox()
    if not bbox:
        return im
    l, t, r, b = bbox
    l = max(0, l - pad)
    t = max(0, t - pad)
    r = min(im.width, r + pad)
    b = min(im.height, b + pad)
    return im.crop((l, t, r, b))


def sky_key_luma(im, sky_luma_max=32, keep_from=0.58):
    arr = np.array(im.convert("RGBA")).astype(np.float32)
    luma = arr[:, :, 0] * 0.2126 + arr[:, :, 1] * 0.7152 + arr[:, :, 2] * 0.0722
    h = arr.shape[0]
    y = np.linspace(0, 1, h, dtype=np.float32)[:, None]
    strength = np.clip((keep_from - y) / keep_from, 0, 1)
    keyed = np.clip((luma - sky_luma_max) / 28.0, 0, 1) * 255.0
    alpha = np.minimum(arr[:, :, 3], keyed * strength + 255.0 * (1.0 - strength))
    arr[:, :, 3] = np.clip(alpha, 0, 255)
    return Image.fromarray(arr.astype(np.uint8))


def fade_top(im, frac=0.22):
    arr = np.array(im.convert("RGBA"))
    h = arr.shape[0]
    band = max(1, int(h * frac))
    ramp = (np.linspace(0, 1, band) ** 1.35)[:, None]
    arr[:band, :, 3] = (arr[:band, :, 3] * ramp).astype(np.uint8)
    return Image.fromarray(arr)


def crop_cap(im, frac=0.44):
    h = max(48, int(im.height * frac))
    return im.crop((0, 0, im.width, h))


COPY_RAW = {
    "moonwatch-stone-village.png": "stone-village.png",
    "moonwatch-stone-catacombs.png": "stone-catacombs.png",
    "moonwatch-stone-wastes.png": "stone-wastes.png",
    "moonwatch-stone-citadel.png": "stone-citadel.png",
}

PROPS = {
    "moonwatch-spire.png": "spire.png",
    "moonwatch-bones.png": "bones.png",
    "moonwatch-ice.png": "ice.png",
    "moonwatch-fence.png": "fence.png",
}

MIDS = {
    "moonwatch-mid-village.png": ("mid-village.png", 0.26, 0.55),
    "moonwatch-mid-catacombs.png": ("mid-catacombs.png", 0.12, 0.22),
    "moonwatch-mid-wastes.png": ("mid-wastes.png", 0.28, 0.52),
}

CAPS = {
    "moonwatch-ground-village.png": "ground-village.png",
    "moonwatch-ground-catacombs.png": "ground-catacombs.png",
    "moonwatch-ground-wastes.png": "ground-wastes.png",
    "moonwatch-ground-citadel.png": "ground-citadel.png",
}


def process_prop(src_name, dst_name, black_key=False):
    im = Image.open(SRC / src_name)
    im = chroma_magenta(im)
    if black_key:
        im = key_studio_black(im, luma_max=16)
    im = crop_alpha(im, pad=6)
    save(im, dst_name)


def main():
    for src, dst in COPY_RAW.items():
        shutil.copyfile(SRC / src, DST / dst)
        im = Image.open(DST / dst)
        print(f"copied {dst} {im.size}")

    for src, dst in PROPS.items():
        process_prop(src, dst, black_key=(src in ("moonwatch-bones.png", "moonwatch-ice.png")))

    for src, (dst, fade, keep) in MIDS.items():
        im = Image.open(SRC / src).convert("RGBA")
        im = sky_key_luma(im, sky_luma_max=30, keep_from=keep)
        im = fade_top(im, frac=fade)
        save(im, dst)

    for src, dst in CAPS.items():
        im = Image.open(SRC / src).convert("RGB")
        im = crop_cap(im, 0.42)
        save(im, dst)


if __name__ == "__main__":
    main()
