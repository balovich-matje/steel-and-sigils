#!/usr/bin/env python3
"""
Remove background from sprite images using rembg.
Saves original as <name>_original.<ext> and outputs <name>.png with transparency.

Usage:
    python3 utils/remove_bg.py <image_path> [--out <output_dir>] [--cleanup]

Options:
    --out <dir>    Output directory (default: same as input)
    --cleanup      Aggressive edge cleanup — removes light residue pixels

Examples:
    python3 utils/remove_bg.py utils/temp/bone_behemoth.jpg
    python3 utils/remove_bg.py utils/temp/bone_behemoth.jpg --cleanup
    python3 utils/remove_bg.py utils/temp/bone_behemoth.jpg --out images/enemy/dungeon
"""

import sys
import os
import shutil

try:
    from rembg import remove
    from PIL import Image
    import numpy as np
except ImportError:
    print("Missing dependencies. Install with: pip3 install rembg Pillow numpy")
    sys.exit(1)


def cleanup_edges(img):
    """
    Post-process: remove light-colored semi-transparent pixels left by rembg.
    These show up as white/beige residue on edges near the old background.
    """
    data = np.array(img)
    r, g, b, a = data[:, :, 0], data[:, :, 1], data[:, :, 2], data[:, :, 3]

    # 1. Kill fully or nearly transparent pixels outright
    nearly_transparent = a < 30
    data[nearly_transparent, 3] = 0

    # 2. For semi-transparent pixels (alpha 30-200), check if they're light/whitish
    #    These are the "residue" pixels — light bg color bleeding through
    semi_transparent = (a >= 30) & (a < 200)
    brightness = (r.astype(int) + g.astype(int) + b.astype(int)) / 3
    is_light = brightness > 180  # close to white/beige
    residue = semi_transparent & is_light
    data[residue, 3] = 0

    # 3. For semi-transparent pixels that aren't super light but are still
    #    suspiciously faded, reduce their alpha to sharpen edges
    faded = semi_transparent & ~is_light & (brightness > 120)
    data[faded, 3] = (data[faded, 3] * 0.5).astype(np.uint8)

    cleaned = Image.fromarray(data)
    print(f"  Cleanup: zeroed {int(residue.sum())} residue pixels, faded {int(faded.sum())} edge pixels")
    return cleaned


def remove_background(input_path, output_dir=None, do_cleanup=False):
    if not os.path.isfile(input_path):
        print(f"Error: File not found: {input_path}")
        sys.exit(1)

    dirname = os.path.dirname(input_path)
    basename = os.path.basename(input_path)
    name, ext = os.path.splitext(basename)

    # Output dir defaults to same directory as input
    out_dir = output_dir or dirname

    # 1. Save original backup
    backup_path = os.path.join(out_dir, f"{name}_original{ext}")
    if not os.path.exists(backup_path):
        shutil.copy2(input_path, backup_path)
        print(f"Backup saved: {backup_path}")
    else:
        print(f"Backup already exists: {backup_path}")

    # 2. Remove background
    print(f"Removing background from {basename}...")
    inp = Image.open(input_path)
    out = remove(inp)

    # 3. Optional edge cleanup
    if do_cleanup:
        print("Running edge cleanup...")
        out = cleanup_edges(out)

    # 4. Save as PNG with transparency
    output_path = os.path.join(out_dir, f"{name}.png")
    out.save(output_path, "PNG")
    print(f"Done: {output_path}")

    return output_path


if __name__ == "__main__":
    if len(sys.argv) < 2 or sys.argv[1] == "--help":
        print(__doc__.strip())
        sys.exit(0)

    input_file = sys.argv[1]
    out_dir = None
    do_cleanup = False

    i = 2
    while i < len(sys.argv):
        if sys.argv[i] == "--out" and i + 1 < len(sys.argv):
            out_dir = sys.argv[i + 1]
            i += 2
        elif sys.argv[i] == "--cleanup":
            do_cleanup = True
            i += 1
        else:
            i += 1

    remove_background(input_file, out_dir, do_cleanup)
