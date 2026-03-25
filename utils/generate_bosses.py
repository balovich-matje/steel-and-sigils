#!/usr/bin/env python3
"""
Generate sprite candidates for Dread Knight and Iron Colossus bosses.
8 variations each → utils/images-output/dread_knight_01..08, iron_colossus_01..08
All sprites face RIGHT — the game flips them LEFT via flipX.
Style matches existing Dungeon Dwellers pixel art units (Lost Spirit, Animated Armor, etc.)
"""

import os, ssl, time, urllib.request, urllib.parse
from pathlib import Path
from PIL import Image

API_KEY    = "pk_ZYeFJPLbJvYAewAl"
BASE_URL   = "https://gen.pollinations.ai"
OUTPUT_DIR = Path(__file__).parent / "images-output"
SSL_CTX    = ssl.create_default_context()
SSL_CTX.check_hostname = False
SSL_CTX.verify_mode    = ssl.CERT_NONE

MODEL = "zimage"

BASE_STYLE = (
    "pixel art sprite, game character, full body side view, "
    "facing RIGHT, grim dark fantasy style, medieval, "
    "clean pixel art, moderate detail, NOT portrait, "
    "white background"
)
DUNGEON_STYLE = "undead, dark, evil, ancient, dungeon, cursed"

PROMPTS = [
    # ── Dread Knight ──────────────────────────────────────────────────────
    ("dread_knight_01",
     "massive undead black knight boss full body, heavy dark plate armor, "
     "glowing red eyes in helmet, tattered dark cape, giant dark sword, spectral aura"),

    ("dread_knight_02",
     "giant undead dark knight boss full body, obsidian armor skull pauldrons, "
     "dark flame aura, two-handed greatsword, cracked armor dark energy"),

    ("dread_knight_03",
     "colossal cursed knight full body, jet-black gothic armor spiked shoulders, "
     "glowing purple visor, necrotic energy swirling, massive ornate sword raised"),

    ("dread_knight_04",
     "enormous undead warlord boss full body, dark plate armor glowing runes, "
     "red cracks in armor, skull motifs breastplate, horned helmet, runed giant sword"),

    ("dread_knight_05",
     "hulking black armored death knight full body, plate armor tattered cloth, "
     "blue spectral energy flames rising from armor, oversized spiked sword, fear aura"),

    ("dread_knight_06",
     "titanic dark crusader boss full body, black armor corrupted by shadow, "
     "shadow tendrils from armor, massive greatsword, looming towering figure"),

    ("dread_knight_07",
     "giant spectral black knight full body, dark translucent armor solid black core, "
     "glowing hollow eye sockets, ethereal dark sword, ghostly aura, terrifying"),

    ("dread_knight_08",
     "colossal fallen paladin undead full body, warped corrupted heavy armor, "
     "dark wings of shadow from back, enormous dark blade with chains, death knight"),

    # ── Iron Colossus ─────────────────────────────────────────────────────
    ("iron_colossus_01",
     "massive iron golem boss full body, ancient solid iron plate construction, "
     "smooth iron faceplate glowing orange eye slits, thick riveted iron body, "
     "enormous bulky proportions, steam from joints"),

    ("iron_colossus_02",
     "giant animated iron armor boss full body, huge solid metal shell, "
     "featureless helmet dim orange glow inside, massive iron fists, "
     "massively thick pauldrons, ancient runed metal"),

    ("iron_colossus_03",
     "enormous iron sentinel boss full body, thick interlocking iron plates, "
     "glowing energy core visible chest grate, featureless iron mask, "
     "arms thick as tree trunks, archaic construct"),

    ("iron_colossus_04",
     "hulking iron golem ancient construct full body, solid metal no organic parts, "
     "glowing rune markings etched across armor, expressionless iron visor, "
     "enormous heavy bulk, orange light seeping through cracks"),

    ("iron_colossus_05",
     "colossal armored automaton boss full body, completely encased thick iron, "
     "circular glowing eye ports, barrel-chest iron torso, "
     "heavy iron shoulder plates, knuckle-dragging iron fists"),

    ("iron_colossus_06",
     "massive battle golem full body, forged solid dark iron plates, "
     "glowing orange seams between plates, blank helmet single cyclopean eye glow, "
     "immense weight and size, slow unstoppable construct"),

    ("iron_colossus_07",
     "giant iron war machine boss full body, antiquated solid iron construction, "
     "heavy plate body no organic features, amber light inside head, "
     "enormous bolted armor, magical animated construct"),

    ("iron_colossus_08",
     "titanic iron guardian ancient construct full body, full solid iron no gaps, "
     "etched rune patterns across body, two faint white eye glows featureless helmet, "
     "proportions far larger than human, heavy walking tank"),
]


def generate_image(name, prompt):
    full_prompt = f"{prompt}, {DUNGEON_STYLE}, {BASE_STYLE}"
    encoded = urllib.parse.quote(full_prompt)
    url = f"{BASE_URL}/image/{encoded}"
    params = {"model": MODEL, "width": 1024, "height": 1024,
              "seed": abs(hash(name)) % 99999,
              "enhance": "true", "safe": "false", "key": API_KEY}
    full_url = f"{url}?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(full_url, headers={
        "Authorization": f"Bearer {API_KEY}",
        "User-Agent": "SteelAndSigils-SpriteGen/1.0"
    })
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=180, context=SSL_CTX) as r:
                if r.status == 200:
                    return r.read()
                raise Exception(f"status {r.status}")
        except Exception as e:
            print(f"  ✗  {name} attempt {attempt+1}: {e}")
            time.sleep(4)
    return None


def save(name, raw):
    try:
        from io import BytesIO
        img = Image.open(BytesIO(raw)).convert("RGBA")
        img = img.transpose(Image.FLIP_LEFT_RIGHT)
        out = OUTPUT_DIR / f"{name}.png"
        img.save(out)
        print(f"  ✓  {name}.png")
    except Exception as e:
        print(f"  ✗  {name} save error: {e}")


OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
print(f"Generating {len(PROMPTS)} pixel-art boss sprites → {OUTPUT_DIR}\n")

for name, prompt in PROMPTS:
    raw = generate_image(name, prompt)
    if raw:
        save(name, raw)
    time.sleep(1)

print("\nDone. Review sprites and pick the best Dread Knight + Iron Colossus candidates.")
