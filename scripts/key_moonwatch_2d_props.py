"""Chroma-key the new 2D Moonwatch props into the pack."""
from pathlib import Path
import numpy as np
from PIL import Image
from collections import deque

SRC = Path(r"C:\Users\ivan-\.cursor\projects\c-Users-ivan-my-app\assets")
DST = Path(r"C:\Users\ivan-\my-app\assets\art\moonwatch")

MAP = {
    "moonwatch-house.png": "house.png",
    "moonwatch-tree.png": "tree.png",
    "moonwatch-pillar.png": "pillar.png",
    "moonwatch-arch.png": "arch.png",
    "moonwatch-lamp.png": "lamp.png",
    "moonwatch-wall.png": "wall.png",
    "moonwatch-window.png": "window.png",
    "moonwatch-grave.png": "grave.png",
    "moonwatch-chest.png": "chest.png",
    "moonwatch-firepit.png": "firepit.png",
    "moonwatch-bush.png": "bush.png",
    "moonwatch-rock.png": "rock.png",
    "moonwatch-fence.png": "fence.png",
    "moonwatch-spire.png": "spire.png",
    "moonwatch-bones.png": "bones.png",
    "moonwatch-ice.png": "ice.png",
    "moonwatch-spikes.png": "spikes.png",
}


def chroma_magenta(im):
    arr = np.array(im.convert("RGBA")).astype(np.int16)
    r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
    mag = (r > 130) & (g < 55) & (b > 55) & ((r - g) > 70)
    near = (r > 110) & (g < 80) & (b > 40) & ((r - g) > 40) & ~mag
    alpha = np.where(mag, 0, np.where(near, 70, 255)).astype(np.uint8)
    out = arr.astype(np.uint8)
    out[:, :, 3] = alpha
    fringe = (alpha > 0) & (alpha < 255)
    out[:, :, 0] = np.where(fringe, np.minimum(out[:, :, 0], out[:, :, 1] + 24), out[:, :, 0])
    return Image.fromarray(out)


def flood_key_card(im, tol=26):
    """Knock out the flat studio card that 2D gens leave around the sprite."""
    arr = np.array(im.convert("RGBA"))
    h, w = arr.shape[:2]
    rgb = arr[:, :, :3].astype(np.int16)
    alpha = arr[:, :, 3].copy()
    vis = np.zeros((h, w), dtype=bool)
    q = deque()
    ys, xs = np.where(alpha == 0)
    if len(ys) == 0:
        # no magenta: seed from image corners
        for y, x in ((0, 0), (0, w - 1), (h - 1, 0), (h - 1, w - 1)):
            q.append((y, x))
            vis[y, x] = True
            alpha[y, x] = 0
    else:
        for y, x in zip(ys.tolist(), xs.tolist()):
            q.append((y, x))
            vis[y, x] = True

    fill = None
    while q:
        y, x = q.popleft()
        for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
            if ny < 0 or nx < 0 or ny >= h or nx >= w or vis[ny, nx]:
                continue
            vis[ny, nx] = True
            if alpha[ny, nx] == 0:
                q.append((ny, nx))
                continue
            col = rgb[ny, nx]
            patch = rgb[max(0, ny - 2) : ny + 3, max(0, nx - 2) : nx + 3].astype(np.float32)
            if patch.std() > 11:
                continue
            if fill is None:
                fill = col.astype(np.int16)
            dist = abs(int(col[0]) - int(fill[0])) + abs(int(col[1]) - int(fill[1])) + abs(int(col[2]) - int(fill[2]))
            if dist <= tol * 3:
                alpha[ny, nx] = 0
                q.append((ny, nx))
    arr[:, :, 3] = alpha
    return Image.fromarray(arr)


def crop_alpha(im, pad=6):
    bbox = im.getbbox()
    if not bbox:
        return im
    l, t, r, b = bbox
    return im.crop((max(0, l - pad), max(0, t - pad), min(im.width, r + pad), min(im.height, b + pad)))


def main():
    for src, dst in MAP.items():
        im = chroma_magenta(Image.open(SRC / src))
        im = flood_key_card(im)
        im = crop_alpha(im)
        path = DST / dst
        im.save(path, "PNG")
        a = im.getchannel("A").getextrema()
        print(f"wrote {dst} {im.size} alpha={a}")


if __name__ == "__main__":
    main()
