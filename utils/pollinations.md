# Pollinations API — Sprite Generation

Used to generate pixel art unit sprites for Steel and Sigils.

## API Key
`pk_ZYeFJPLbJvYAewAl` (publishable key, safe for scripts)

## Quick Usage

### Generate a sprite
```bash
node utils/generate_sprite.js "Bone Behemoth, massive skeletal giant" --model zimage --count 3
```

### Options
```
node utils/generate_sprite.js <description> [options]
  --model <name>    Image model (default: flux). Use zimage for best pixel art results.
  --count <n>       Number of variations (default: 2)
  --out <dir>       Output directory (default: utils/temp)
  --name <slug>     Override filename slug
```

### Models
- **zimage** (recommended) — best pixel art style, closest to existing sprites
- **flux** — good detail but darker, sometimes adds backgrounds
- **gptimage** — supports transparent backgrounds but higher resolution output

## Style Prompt
Built into `generate_sprite.js`:
> Pixel art character sprite, 256x256, dark fantasy RPG style, full body three-quarter view facing left, single character centered, transparent background, black outline, detailed shading, grim dark medieval aesthetic, inspired by Heroes of Might and Magic

## Post-Processing

### Remove background
```bash
python3 utils/remove_bg.py utils/temp/sprite.jpg --cleanup
```
Requires: `pip3 install rembg Pillow numpy` (uses u2net model, ~176MB first download)

### Flip sprite (if facing wrong direction)
```python
from PIL import Image
img = Image.open('sprite.png').transpose(Image.FLIP_LEFT_RIGHT)
img.save('sprite.png')
```

## Output Specs
- 256x256 RGBA PNG (matches all existing sprites)
- Units face LEFT by default (game flips for player units)
- Place final sprites in `images/player/` or `images/enemy/<faction>/`
