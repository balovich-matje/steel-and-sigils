#!/usr/bin/env python3
"""
SFX Generator for Steel and Sigils — uses Meta AudioGen locally.

Usage:
    source ~/audiocraft-env/bin/activate
    python3 utils/generate_sfx.py                    # Generate all SFX
    python3 utils/generate_sfx.py --only melee       # Generate one category
    python3 utils/generate_sfx.py --list              # List all categories
    python3 utils/generate_sfx.py --only melee --variations 3  # 3 variations per sound

Output goes to utils/temp/sfx/
"""

import sys
import os
import argparse
import time
import types

# ── Stub out CUDA-only deps before any audiocraft imports ──
_xf = types.ModuleType('xformers')
_xf.ops = types.ModuleType('xformers.ops')
sys.modules['xformers'] = _xf
sys.modules['xformers.ops'] = _xf.ops
_sp = types.ModuleType('spacy')
_sp.load = lambda *a, **k: None
sys.modules['spacy'] = _sp

# ── SFX Definitions ──────────────────────────────────────
# Each entry: (filename, duration_seconds, prompt)
# Prompts tuned for AudioGen — concise, material-specific, close-mic style

SFX = {
    "melee": [
        ("sword_hit_armor", 1.0, "sharp steel sword striking metal plate armor, close impact, no reverb"),
        ("sword_slash", 0.5, "fast sword swinging through air, sharp whoosh, close up"),
        ("dagger_stab", 0.5, "quick dagger stabbing into leather, sharp thud, close"),
        ("axe_heavy_hit", 1.0, "heavy battle axe chopping into wood and metal, brutal impact"),
        ("mace_hit", 1.0, "heavy blunt mace crushing against metal armor, deep thud"),
        ("fist_punch", 0.5, "bare fist punching flesh, quick impact, close"),
    ],
    "ranged": [
        ("arrow_shoot", 0.5, "wooden bow string releasing arrow with a twang snap, close"),
        ("arrow_hit", 0.5, "arrow hitting wooden shield with a solid thunk"),
        ("magic_projectile", 1.0, "magical energy bolt flying through air with ethereal whoosh"),
    ],
    "spells_destructo": [
        ("fireball_cast", 1.5, "fireball launching with whooshing flames, rising fire roar"),
        ("fireball_explode", 1.5, "fireball explosion with roaring flames and crackling debris"),
        ("lightning_bolt", 1.0, "sharp lightning bolt strike, electric crack and thunder, close"),
        ("ice_storm", 2.0, "ice crystals forming and shattering, freezing wind howling, cracking ice"),
        ("meteor_impact", 2.0, "massive meteor crashing into stone ground, deep explosion, earth shaking"),
        ("chain_lightning", 1.5, "multiple electric arcs zapping in quick succession, crackling electricity"),
    ],
    "spells_healing": [
        ("heal", 1.5, "gentle magical chimes with warm glowing energy, soft shimmer"),
        ("cure_wounds", 1.5, "bright healing magic with rising crystal tones, ethereal bells"),
        ("regenerate", 2.0, "slow pulsing magical energy, gentle continuous hum with soft chimes"),
    ],
    "spells_buff": [
        ("haste", 1.0, "quick magical speed boost, rushing wind whoosh with sparkle"),
        ("shield_buff", 1.0, "magical barrier forming, deep resonant hum with crystalline layer"),
        ("bless", 1.5, "divine blessing, choir-like shimmer with radiant energy pulse"),
        ("teleport", 1.0, "magical teleportation, quick spatial distortion whoosh and pop"),
    ],
    "defense": [
        ("shield_block", 0.8, "heavy metal shield blocking sword strike, deep resonant clang"),
        ("armor_clank", 0.5, "plate armor pieces clanking together during movement, metallic"),
        ("dodge", 0.5, "quick leather rustling dodge movement, fast whoosh"),
    ],
    "death": [
        ("death_grunt_male", 0.5, "man grunting in pain, short sharp exhale, dying"),
        ("body_fall_armor", 1.0, "armored body falling to stone ground, metal clanking on impact"),
        ("skeleton_death", 1.0, "skeleton collapsing into pile of bones, rattling and clattering"),
        ("bone_absorb", 1.5, "bones flying through air and magically fusing together, dark energy whoosh"),
    ],
    "creature": [
        ("skeleton_rattle", 1.0, "skeleton bones rattling and clicking together, eerie"),
        ("monster_growl", 1.5, "deep undead monster growl, low threatening rumble"),
        ("ghost_wail", 1.5, "ghostly wailing spirit, ethereal and haunting moan"),
        ("boss_roar", 2.0, "massive creature roaring, deep thunderous bellow, intimidating"),
    ],
    "ui": [
        ("coin_clink", 0.5, "small pile of gold coins clinking together"),
        ("page_turn", 0.5, "old parchment page turning in a book"),
        ("level_up", 1.5, "triumphant short fanfare, bright and victorious"),
        ("menu_click", 0.3, "subtle clean button click, soft tap"),
        ("victory_sting", 2.0, "heroic victory fanfare, triumphant brass and drums"),
        ("defeat_sting", 2.0, "somber defeat sound, low horns fading out, mournful"),
    ],
}


def generate(categories, variations=1, out_dir="utils/temp/sfx"):
    import torch
    from audiocraft.models import AudioGen
    from audiocraft.data.audio import audio_write

    os.makedirs(out_dir, exist_ok=True)

    device = "mps" if torch.backends.mps.is_available() else "cpu"
    print(f"Loading AudioGen model on {device}...")
    model = AudioGen.get_pretrained("facebook/audiogen-medium", device=device)

    total = sum(len(SFX[c]) for c in categories) * variations
    generated = 0

    for cat in categories:
        cat_dir = os.path.join(out_dir, cat)
        os.makedirs(cat_dir, exist_ok=True)
        entries = SFX[cat]

        for filename, duration, prompt in entries:
            model.set_generation_params(duration=duration)

            for v in range(variations):
                generated += 1
                suffix = f"_v{v+1}" if variations > 1 else ""
                out_name = f"{filename}{suffix}"
                out_path = os.path.join(cat_dir, out_name)

                # Skip if already exists
                if os.path.exists(out_path + ".wav"):
                    print(f"  [{generated}/{total}] {out_name} — already exists, skipping")
                    continue

                print(f"  [{generated}/{total}] {out_name} ({duration}s) ... ", end="", flush=True)
                t0 = time.time()
                wav = model.generate([prompt])
                audio_write(out_path, wav[0].cpu(), model.sample_rate,
                            strategy="loudness", loudness_compressor=True)
                elapsed = time.time() - t0
                print(f"OK ({elapsed:.1f}s)")

    print(f"\nDone. {generated} clips in {out_dir}/")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate game SFX with AudioGen")
    parser.add_argument("--only", type=str, help="Generate only this category")
    parser.add_argument("--list", action="store_true", help="List available categories")
    parser.add_argument("--variations", type=int, default=1, help="Variations per sound (default 1)")
    parser.add_argument("--out", type=str, default="utils/temp/sfx", help="Output directory")
    args = parser.parse_args()

    if args.list:
        for cat, entries in SFX.items():
            print(f"  {cat} ({len(entries)} sounds)")
            for fn, dur, prompt in entries:
                print(f"    {fn} ({dur}s) — {prompt[:60]}...")
        sys.exit(0)

    categories = [args.only] if args.only else list(SFX.keys())
    for c in categories:
        if c not in SFX:
            print(f"Unknown category: {c}")
            print(f"Available: {', '.join(SFX.keys())}")
            sys.exit(1)

    generate(categories, args.variations, args.out)
