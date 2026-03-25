#!/usr/bin/env python3
"""
Generate 8 Banshee Sovereign sprite variations for Steel and Sigils.
Dungeon faction boss - spectral undead queen with Wailing Screech ability.
Usage: python3 generate_banshee.py
"""

import os
import sys
import ssl
import urllib.request
import urllib.parse
from pathlib import Path
from PIL import Image

API_KEY = "pk_ZYeFJPLbJvYAewAl"
BASE_URL = "https://gen.pollinations.ai"
OUTPUT_DIR = Path(__file__).parent / "images-output"
SSL_CONTEXT = ssl.create_default_context()
SSL_CONTEXT.check_hostname = False
SSL_CONTEXT.verify_mode = ssl.CERT_NONE

MODEL = "zimage"
SPRITE_SIZE = 256

BASE_STYLE = (
    "pixel art sprite, game character, full body side view, "
    "facing RIGHT, grim dark fantasy style, medieval, "
    "clean pixel art, moderate detail, NOT portrait, "
    "white background"
)
FACTION_STYLE = "undead, skeleton, ghost, dark, evil, ancient, decaying"

PROMPTS = [
    ("towering banshee queen hovering ghost undead wailing crown spectral robes", "banshee_01"),
    ("giant screaming ghost queen undead spectral flowing ethereal gown wail", "banshee_02"),
    ("banshee sovereign floating skeleton queen dark spectral energy crown", "banshee_03"),
    ("undead spirit queen wailing open mouth ethereal chains ghostly form", "banshee_04"),
    ("ancient ghost empress hovering wraithlike spectral undead shroud crown", "banshee_05"),
    ("massive banshee floating undead queen dark aura skull crown shrieking", "banshee_06"),
    ("ghostly queen wail spectral undead boss floating tattered robes crown", "banshee_07"),
    ("screaming specter queen undead large ethereal form bony hands wail", "banshee_08"),
]


def generate_image(prompt: str) -> bytes:
    encoded_prompt = urllib.parse.quote(prompt)
    url = f"{BASE_URL}/image/{encoded_prompt}"
    params = {"model": MODEL, "width": 1024, "height": 1024, "seed": -1,
              "enhance": "true", "safe": "false", "key": API_KEY}
    full_url = f"{url}?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(full_url, headers={
        "Authorization": f"Bearer {API_KEY}",
        "User-Agent": "SteelAndSigils-SpriteGen/1.0"
    })
    with urllib.request.urlopen(req, timeout=180, context=SSL_CONTEXT) as r:
        if r.status == 200:
            return r.read()
        raise Exception(f"API returned status {r.status}")


def process_sprite(raw_path: Path, out_path: Path) -> bool:
    try:
        img = Image.open(raw_path).convert('RGBA')
        img = img.transpose(Image.FLIP_LEFT_RIGHT)
        img.resize((SPRITE_SIZE, SPRITE_SIZE), Image.Resampling.LANCZOS).save(out_path, "PNG")
        print(f"   ✅ {out_path.name}")
        return True
    except Exception as e:
        print(f"   ⚠️  Processing failed: {e}")
        return False


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    print("=" * 60)
    print("⚔️  Banshee Sovereign - Sprite Batch Generator")
    print(f"   Generating {len(PROMPTS)} variations → {OUTPUT_DIR}")
    print("=" * 60)

    for i, (subject, filename) in enumerate(PROMPTS, 1):
        full_prompt = f"{subject}, {FACTION_STYLE}, {BASE_STYLE}"
        print(f"\n[{i}/{len(PROMPTS)}] {filename}")
        try:
            data = generate_image(full_prompt)
            raw_path = OUTPUT_DIR / f"{filename}_raw.png"
            with open(raw_path, "wb") as f:
                f.write(data)
            process_sprite(raw_path, OUTPUT_DIR / f"{filename}.png")
            raw_path.unlink(missing_ok=True)
        except Exception as e:
            print(f"   ❌ Error: {e}")

    print(f"\n✅ Done! Review sprites in: {OUTPUT_DIR}")
    print("   Pick the best one, remove BG, copy to images/enemy/dungeon/banshee_sovereign.png")


if __name__ == "__main__":
    main()
