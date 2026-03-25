"""
Generate sprite candidates for Dread Knight and Iron Colossus bosses.
Outputs to utils/images-output/  (dread_knight_01..08, iron_colossus_01..08)
All sprites face RIGHT — the game will flip them LEFT via flipX.
"""

import requests, os, time
from PIL import Image
from io import BytesIO

OUT_DIR = os.path.join(os.path.dirname(__file__), "images-output")
os.makedirs(OUT_DIR, exist_ok=True)

BASE_STYLE = (
    "dark fantasy game sprite, side view facing right, full body, "
    "isolated on pure white background, detailed illustration, "
    "dramatic lighting, high contrast, grim dark aesthetic"
)

PROMPTS = {
    # ── Dread Knight ────────────────────────────────────────────────────────
    "dread_knight_01": (
        f"massive 2x2 tile undead dread knight boss, heavy black full-plate armor, "
        f"glowing crimson eye slits in helmet, tattered dark cape, enormous dark broadsword, "
        f"spectral dark aura emanating from armor, looming imposing silhouette, {BASE_STYLE}"
    ),
    "dread_knight_02": (
        f"giant undead black knight boss monster, ornate obsidian plate armor with bone trim, "
        f"skull-shaped pauldrons, dark flame aura, two-handed greatsword, "
        f"towering menacing figure, cracked armor with dark energy seeping out, {BASE_STYLE}"
    ),
    "dread_knight_03": (
        f"colossal cursed dark knight, jet-black gothic armor with spiked shoulders, "
        f"glowing purple visor slit, necrotic energy swirling around body, "
        f"massive ornate sword raised, undead warlord aesthetic, {BASE_STYLE}"
    ),
    "dread_knight_04": (
        f"enormous undead warlord boss, heavy platemail armor covered in dark runes, "
        f"red glowing cracks in armor like lava, skull motifs on breastplate, "
        f"imposing horned helmet, giant runed sword, corrupted dark paladin, {BASE_STYLE}"
    ),
    "dread_knight_05": (
        f"hulking black armored death knight, full plate armor with tattered dark cloth, "
        f"blue spectral energy flames, oversized spiked mace or sword, "
        f"undead commander giant silhouette, fear aura visual effect, {BASE_STYLE}"
    ),
    "dread_knight_06": (
        f"titanic dark crusader boss, ornate black armor with gold trim corrupted by shadow, "
        f"shadow tendrils extending from armor, massive greatsword planted in ground, "
        f"oppressive towering figure, dungeon boss aesthetic, {BASE_STYLE}"
    ),
    "dread_knight_07": (
        f"giant spectral black knight, see-through ghostly dark armor with solid black core, "
        f"glowing hollow eye sockets, ethereal dark sword, ghostly aura, "
        f"terrifying undead knight boss, massive 2x2 scale, {BASE_STYLE}"
    ),
    "dread_knight_08": (
        f"colossal fallen paladin turned undead, warped corrupted heavy armor, "
        f"dark wings of shadow emerging from back, enormous dark blade with chains, "
        f"imposing dark angel of death aesthetic, dungeon dwellers boss, {BASE_STYLE}"
    ),
    # ── Iron Colossus ────────────────────────────────────────────────────────
    "iron_colossus_01": (
        f"massive 2x2 tile iron golem boss, ancient solid iron plate construction, "
        f"no face just smooth iron faceplate with glowing orange eye slits, "
        f"thick riveted iron body, enormous bulky proportions, steam venting from joints, "
        f"ancient guardian construct aesthetic, {BASE_STYLE}"
    ),
    "iron_colossus_02": (
        f"giant animated iron suit of armor boss, huge solid metal shell, "
        f"blank featureless helmet with dim orange glow inside, "
        f"massively thick pauldrons, massive iron fists, ancient runed metal body, "
        f"arcane energy holding it together, golem aesthetic, {BASE_STYLE}"
    ),
    "iron_colossus_03": (
        f"enormous iron sentinel boss monster, thick interlocking iron plates, "
        f"glowing energy core visible through chest grate, featureless iron mask, "
        f"arms as thick as tree trunks, archaic construct design, "
        f"animated armor dungeon guardian, {BASE_STYLE}"
    ),
    "iron_colossus_04": (
        f"hulking iron colossus ancient construct, solid metal body with no organic parts, "
        f"glowing rune markings etched across armor surface, expressionless iron visor, "
        f"enormous heavy bulk, cracks with orange light seeping through, "
        f"awakened forge golem aesthetic, {BASE_STYLE}"
    ),
    "iron_colossus_05": (
        f"colossal armored automaton boss, completely encased in thick iron, "
        f"circular glowing eye ports, barrel-chest iron torso, "
        f"heavy iron shoulder plates, knuckle-dragging iron fists, "
        f"ancient mechanical warrior, imposing 2x2 scale figure, {BASE_STYLE}"
    ),
    "iron_colossus_06": (
        f"massive battle golem boss, forged from solid plates of dark iron, "
        f"glowing orange seams between plates, blank helmet with single cyclopean glow, "
        f"immense weight and size, slow but unstoppable construct, "
        f"dungeon animated armor giant, {BASE_STYLE}"
    ),
    "iron_colossus_07": (
        f"giant iron war machine boss, antiquated solid iron construction, "
        f"heavy plate body without organic features, dim amber light inside head, "
        f"enormous bolted armor, magical animated construct, "
        f"arcane golem guardian, overwhelming size, {BASE_STYLE}"
    ),
    "iron_colossus_08": (
        f"titanic iron guardian ancient construct, full solid iron no gaps, "
        f"etched rune patterns across body, two faint white eye glows in featureless helmet, "
        f"proportions far larger than humans, heavy walking tank aesthetic, "
        f"animated suit of armor dungeon boss, {BASE_STYLE}"
    ),
}

MODEL = "zimage"
SIZE  = 1024

def fetch_sprite(name, prompt):
    url = f"https://image.pollinations.ai/prompt/{requests.utils.quote(prompt)}?model={MODEL}&width={SIZE}&height={SIZE}&nologo=true&seed={abs(hash(name)) % 99999}"
    for attempt in range(3):
        try:
            r = requests.get(url, timeout=90)
            r.raise_for_status()
            img = Image.open(BytesIO(r.content)).convert("RGBA")
            img = img.transpose(Image.FLIP_LEFT_RIGHT)   # face LEFT
            out = os.path.join(OUT_DIR, f"{name}.png")
            img.save(out)
            print(f"  ✓  {name}.png")
            return
        except Exception as e:
            print(f"  ✗  {name} attempt {attempt+1}: {e}")
            time.sleep(3)
    print(f"  FAILED  {name}")

print(f"Generating {len(PROMPTS)} sprites → {OUT_DIR}\n")
for name, prompt in PROMPTS.items():
    fetch_sprite(name, prompt)
    time.sleep(1)

print("\nDone.")
