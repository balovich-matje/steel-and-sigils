# Steel and Sigils - Coding Agent Guide

> Quick reference for AI agents working on new features, bug fixes, or understanding the codebase.

## Project Overview

**Steel and Sigils** is a browser-based tactical combat game inspired by Heroes of Might and Magic. Built with:
- **Phaser 3** - Game engine and rendering
- **Vanilla JavaScript (ES6 modules)** - Game logic, no build step required
- **CSS3** - UI styling and animations
- **HTML5** - Page structure

## Project Structure

```
steel-and-sigils/
├── index.html              # Main HTML file with UI structure
├── style.css               # Stylesheet for all UI elements
├── src/
│   ├── main.js            # Entry point, Phaser config, game init
│   ├── units.js           # UNIT_TYPES definition (all units & stats)
│   ├── GameConfig.js      # CONFIG, STAGES, SPELLS constants
│   ├── SceneManager.js    # BattleScene, PreGameScene classes - main game logic
│   ├── SpellSystem.js     # Spell casting implementation
│   ├── EntityManager.js   # UnitManager, TurnSystem - units & turn order
│   ├── InputHandler.js    # GridSystem - grid interactions & highlights
│   ├── UIHandler.js       # UIManager - DOM UI updates
│   ├── i18n.js            # Internationalization - translations (EN/RU)
│   ├── i18n-helper.js     # Exported t() helper for use in ES6 modules
│   └── debug.js           # Debug helpers (active only with ?debug=1 URL param)
├── images/                # All sprites and assets
│   ├── player/            # Player unit sprites (archer, berserker, cleric,
│   │                      #   knight, paladin, ranger, rogue, sorcerer, wizard)
│   ├── enemy/             # Enemy sprites by faction
│   │   ├── greenskin/     # orc_warrior, orc_brute, orc_rogue,
│   │   │                  #   goblin_stone_thrower, loot_goblin, ogre_chieftain,
│   │   │                  #   orc_shaman_king
│   │   ├── dungeon/       # animated_armor, lost_spirit, skeleton_archer,
│   │   │                  #   skeleton_soldier, summoner_lich
│   │   └── cultist/       # acolyte, neophyte, gibbering_horror,
│   │                      #   flesh_warped_stalker, void_herald,
│   │                      #   octoth_hroarath, the_silence
│   ├── obstacles/         # rock, rock_jagged, rock_large, rock_tall,
│   │                      #   rock_wide, wall, wall_large
│   └── tiles/             # dirt, grass1, grass2, grass3, rock
└── utils/                 # Utilities folder
    ├── AGENTS.md          # This file
    ├── pollinations.md    # Pollinations API reference
    └── images-output/     # Generated images temp storage
```

## Key Architecture Patterns

### 1. Unit Definition System (`src/units.js`)

All units are defined in the global `UNIT_TYPES` object:

```javascript
UNIT_TYPES = {
    KNIGHT: {
        name: 'Knight',
        emoji: '⚔️',           // UI icon
        image: 'images/player/knight.png',  // Sprite path
        health: 100,
        maxHealth: 100,
        damage: 25,
        moveRange: 4,
        initiative: 12,       // Turn order (higher = earlier)
        isPlayer: true,       // Player vs Enemy
        cost: 200,            # Army points cost
        passive: {            # Optional passive ability
            name: 'Heavy Armor',
            description: '-50% damage from ranged attacks',
            effect: 'rangedDefense',
            value: 0.5
        }
    },
    // ... more units
}
```

**To add a new unit:**
1. Add entry to `UNIT_TYPES` in `src/units.js`
2. Add sprite image to appropriate `images/` subfolder
3. Add to `preload()` in `SceneManager.js` (in playerUnits or enemyUnits arrays)
4. If enemy: add to appropriate faction in `ENEMY_FACTIONS`

### 2. Scene Structure (`src/SceneManager.js`)

**BattleScene** is the main game scene with these key systems:
- `unitManager` - Creates/destroys units, tracks positions
- `turnSystem` - Initiative-based turn order
- `gridSystem` - Grid highlights, movement validation
- `spellSystem` - Spell casting logic
- `uiManager` - DOM UI updates

### 3. Sprite Standards

**CRITICAL:** All unit sprites follow these rules:
- **Size:** 64×64 pixels
- **Format:** PNG with transparency
- **Direction:** Face **LEFT** by default (game flips with `flipX` for facing right)
- **Style:** Grim dark fantasy pixel art
- **Colors:** 
  - Aged Gold (#A68966) - Primary accent
  - Dark Wood (#2D241E) - Backgrounds
  - Parchment (#E3D5B8) - Text

### 4. Facing Direction System

Base sprites face LEFT. The game handles flipping:
```javascript
// In SceneManager.js faceTarget():
// Players face RIGHT (flipX = true) by default
// Enemies face LEFT (flipX = false) by default
// When attacking, units temporarily face their target
```

### 5. Grid System

- Grid is coordinate-based (x, y)
- Tile size is dynamic based on map dimensions (CONFIG.getTileSize)
- Obstacles are stored in GridSystem and block movement
- 2×2 bosses need special placement validation

## Common Tasks

### Add a New Player Unit

1. **Create sprite:** Generate 64×64 PNG, facing left, transparent bg
   - Save to: `images/player/{unit_name}.png`
   
2. **Define unit:** Add to `UNIT_TYPES` in `src/units.js`:
```javascript
NEWUNIT: {
    name: 'New Unit',
    emoji: '🎯',
    image: 'images/player/newunit.png',
    health: 80,
    maxHealth: 80,
    damage: 30,
    moveRange: 3,
    initiative: 10,
    isPlayer: true,
    cost: 400,
    passive: { name: 'Ability', description: 'Effect' }
}
```

3. **Register for loading:** Add to `preload()` in `SceneManager.js`:
```javascript
const playerUnits = ['KNIGHT', 'ARCHER', ..., 'NEWUNIT'];  // Add to array
```

4. **Add to army selection UI:** Add unit card HTML to `index.html` in the placement screen

### Add a New Enemy Unit

1. **Create sprite:** 64×64 PNG, facing left, transparent bg
   - Save to: `images/enemy/{faction}/{name}.png`
   
2. **Define unit:** Add to `UNIT_TYPES` in `src/units.js`

3. **Add to faction:** Add unit key to `ENEMY_FACTIONS` in `SceneManager.js`:
```javascript
const ENEMY_FACTIONS = {
    GREENSKIN_HORDE: ['ORC_WARRIOR', 'ORC_BRUTE', 'ORC_ROGUE', 'GOBLIN_STONE_THROWER'],
    DUNGEON_DWELLERS: ['ANIMATED_ARMOR', 'SKELETON_ARCHER', 'SKELETON_SOLDIER', 'LOST_SPIRIT'],
    OLD_GOD_WORSHIPPERS: ['CULTIST_ACOLYTE', 'CULTIST_NEOPHYTE', 'GIBBERING_HORROR', 'FLESH_WARPED_STALKER', 'NEW_ENEMY']
};
```

4. **Register for loading:** Add to `preload()` enemyUnits array in `SceneManager.js`

### Add a New Boss

Bosses are 2×2 units with special handling:
```javascript
BOSS_NAME: {
    name: 'Boss Name',
    emoji: '👑',
    image: 'images/enemy/{faction}/boss_name.png',
    health: 500,
    maxHealth: 500,
    damage: 80,
    moveRange: 3,
    initiative: 8,
    isPlayer: false,
    cost: 1500,
    isBoss: true,
    bossSize: 2,  // 2x2 cells
    passive: { name: 'Boss Ability', description: 'Effect' }
}
```

### Add a New Spell

1. **Define spell:** Add to `SPELLS` in `src/GameConfig.js`:
```javascript
new_spell: {
    id: 'new_spell',
    name: 'New Spell',
    icon: '✨',
    type: 'Buff',
    manaCost: 25,
    description: 'What it does',
    targetType: 'ally',  // 'enemy', 'ally', 'ally_then_tile'
    effect: 'customEffect',
    power: 30,
    range: 5
}
```

2. **Implement effect:** Add handler in `src/SpellSystem.js` `executeSpellAt()` or `executeUnitSpell()`

### Fix a Bug

1. Check `SceneManager.js` for game logic issues
2. Check `EntityManager.js` for unit/turn system issues
3. Check `InputHandler.js` for grid/input issues
4. Check `SpellSystem.js` for spell issues
5. Check browser console for errors

### Add a New Map/Stage

1. **Define stage:** Add to `STAGES` in `src/GameConfig.js`:
```javascript
new_stage: {
    id: 'new_stage',
    name: 'Stage Name',
    width: 12,
    height: 10,
    playerArea: { x1: 0, x2: 2, y1: 0, y2: 10 },
    hasObstacles: true,
    obstacleType: 'custom',
    spawnLogic: 'right_flank',  // or 'perimeter', default
    startingPoints: 1200,
    tileType: 'grass'  // or 'dirt'
}
```

2. **Add obstacle generation:** Add case in `generateObstacles()` in `SceneManager.js`

3. **Add UI:** Add map selection button in `index.html`

> **Note:** `tileType` can be `'grass'`, `'dirt'`, or `'rock'`. The current stages use: forest→grass, ruins→dirt, mountain→rock.

### Add or Update Translations (i18n)

The game supports English and Russian. All user-facing strings go through the i18n system.

1. **Add a translation key** to `src/i18n.js` in both `en` and `ru` dictionaries:
```javascript
// In TRANSLATIONS object:
en: { 'my.key': 'English text' },
ru: { 'my.key': 'Русский текст' }
```

2. **Use in HTML:** Use `data-i18n="my.key"` attribute on elements — they are auto-translated on language switch.

3. **Use in JS modules:** Import and call the `t()` helper:
```javascript
import { t } from './i18n-helper.js';
const label = t('my.key');
```

4. **Use inline in JS (no import):** Access `window.i18n.t('my.key')` directly.

The language preference is persisted in a cookie (`steel_and_sigils_lang`). Default is `'en'`.

## Versioning

**Every commit that changes game behaviour or fixes a bug must increment the version by +0.01 in two places:**

1. `src/main.js` — `const GAME_VERSION = '0.xx';`
2. `README.md` — first line `# ⚔️ Steel and Sigils v0.xx`

Use a simple string replace; no other files need updating. The commit message should start with the new version number (e.g. `v0.97: Fix Loot Goblin reward loop`).

## Code Conventions

- Use ES6 modules with `import`/`export`
- Class names: PascalCase
- Variables/functions: camelCase
- Constants: UPPER_CASE or CAPS_CASE
- Units referenced by TYPE_KEY (e.g., 'KNIGHT', 'ORC_WARRIOR')

## Testing

Simply open `index.html` in a browser. No build step required.

### Debug Mode

Open `index.html?debug=1` to enable the debug API (`window.debug`):

```javascript
debug.state()             // Snapshot of game state (round, faction, units, mana)
debug.wipeEnemies()       // Instantly kill all enemies (reach victory screen fast)
debug.spawnBoss('KEY')    // Force-spawn a specific boss in the current battle
debug.spawnBoss()         // Let the game pick a boss naturally (respects anti-repeat)
debug.restartAtRound(5)   // Restart scene at a specific battle number
debug.skipToBossWave()    // Jump to the next boss wave (next multiple of 5)
debug.bosses()            // Print all boss keys per faction
```

**Typical workflow for testing a boss ability:**
1. Open `index.html?debug=1`, start a battle
2. Run `debug.spawnBoss('SUMMONER_LICH')` in the console
3. Play through the boss's turn to verify the ability
4. Run `debug.wipeEnemies()` to finish the battle quickly

Use browser DevTools console to inspect raw state:
```javascript
window.gameScene.unitManager.units   // All units
window.gameScene.turnSystem.currentUnit  // Whose turn it is
window.gameScene.battleNumber        // Current battle number
```

## Image Generation for Sprites

### Base Script

The main sprite generation script is `generate_sprite.py`. It uses Pollinations API to generate game sprites.

**Basic usage:**
```bash
cd utils
python3 generate_sprite.py "orc warrior with axe" greenskin orc_warrior
```

**For batch generation:** Copy and modify the script:
```bash
cp generate_sprite.py generate_enemy_army.py
# Then edit generate_enemy_army.py for your specific needs
```

### Important Settings

| Setting | Value | Notes |
|---------|-------|-------|
| **Recommended Model** | `zimage` | Best for consistent pixel art sprites |
| **Output Size** | 256x256 | Good balance of quality and performance |
| **Base Prompt** | See `BASE_STYLE` in script | Includes "facing RIGHT" (gets flipped to LEFT) |

### DO NOT USE These Models
- `flux`, `flux-2-dev`, `klein` - Poor quality for pixel art
- `grok-imagine` - Inconsistent orientation
- `imagen-4` - Often front-facing instead of side view

### Workflow

1. **Generate** with `generate_sprite.py` or a modified copy
2. **Review** output in `utils/images-output/`
3. **Remove background** manually (Photoshop/GIMP/remove.bg)
4. **Copy** final sprite to `images/player/` or `images/enemy/{faction}/`
5. **Add unit definition** to `src/units.js`
6. **Register for loading** in `src/SceneManager.js`

### See Also

- `pollinations.md` - Full API documentation and model list

## Color Palette Reference

| Color | Hex | Usage |
|-------|-----|-------|
| Aged Gold | #A68966 | Primary accent, borders |
| Dark Wood | #2D241E | Backgrounds, panels |
| Parchment | #E3D5B8 | Text color |
| Player Blue | #4a7cd9 | Player side highlight |
| Enemy Red | #d94a4a | Enemy side highlight |

## Key Files for Common Changes

| Task | Files to Edit |
|------|---------------|
| Add/modify unit | `src/units.js`, `src/SceneManager.js` (preload) |
| Change unit stats | `src/units.js` |
| Add spell | `src/GameConfig.js`, `src/SpellSystem.js` |
| Change game rules | `src/SceneManager.js` |
| UI changes | `index.html`, `style.css` |
| Add map | `src/GameConfig.js`, `src/SceneManager.js`, `index.html` |
| Fix grid/movement | `src/InputHandler.js` |
| Fix turn order | `src/EntityManager.js` |
| Add/edit translations | `src/i18n.js` |
