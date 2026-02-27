---
name: rogues-of-might-and-magic
description: Browser-based turn-based tactical RPG inspired by Heroes of Might and Magic 5. Built with Phaser 3, ES6 modules, vanilla JavaScript. Use when working on unit systems, spell mechanics, turn-based combat, UI components, buff/debuff systems, or adding new content (units, spells, enemies).
---

# Rogues of Might and Magic - Development Skill

## Project Overview

Turn-based tactical combat game with:
- **Engine**: Phaser 3
- **Architecture**: ES6 modules, ~2500 lines across 7 files
- **Style**: Grim Dark Fantasy (dark wood #2D241E, aged gold #A68966)
- **Grid**: 10x8 tiles, 64px each
- **Combat**: Initiative-based turn order, HOMM5-style

## File Structure

```
src/
├── main.js           # Game bootstrap, PreGameScene
├── GameConfig.js     # Constants, UNIT_TYPES, SPELLS
├── SceneManager.js   # BattleScene - main game logic (~1200 lines)
├── EntityManager.js  # UnitManager, TurnSystem, Unit class
├── InputHandler.js   # GridSystem - clicks, movement highlighting
├── SpellSystem.js    # Spell casting, effects
└── UIHandler.js      # DOM UI updates, mana, buffs

units.js              # Global UNIT_TYPES database
index.html            # UI structure
style.css             # Styling
```

## Core Architecture

### Unit System
- **Base stats** in `UNIT_TYPES` (units.js)
- **Runtime instance** = Unit class (EntityManager.js)
- **Positioning**: Images use `origin(0.5, 1.0)` (bottom-center), emojis use `origin(0.5)`
- **Scaling**: Dynamic based on source image size, max 1.3x tile (83px)

### Turn System
- Initiative-based queue sorted each round
- `resetTurn()` called at start of each unit's turn
- Buff durations decrement in `resetTurn()` (except permanent = -1)

### Spell System
- Spells defined in `SPELLS` constant (GameConfig.js)
- `castSpell()` → sets `activeSpell` → click target → `executeSpellAt()`
- **Critical**: When spell active, unit sprite clicks must call `executeSpellAt()`, not attack

### Buff/Debuff Mechanics
| Buff | Storage | Decrement | Permanent |
|------|---------|-----------|-----------|
| Haste | `hasteRounds` | Each turn | `-1` |
| Shield | `shieldRounds`, `shieldValue` | Each turn | `-1` |
| Bless | `blessRounds`, `blessValue` | Each turn | `-1` |
| Regenerate | `regenerateRounds` | Each turn | `-1` |
| Ice Slow | `iceSlowRounds` | Each turn | No |

**Persistence**: Buffs saved in `nextBattle()` and restored in `create()` via `unitData.buffs`

## Common Patterns & Pitfalls

### Adding New Unit Types
1. Add to `UNIT_TYPES` in units.js with: `name`, `emoji`, `health`, `damage`, `moveRange`, `initiative`, `cost`, optional `rangedRange`, optional `passive`
2. Add image path: `images/player/unitname.png` or `images/enemy/unitname.png`
3. Load in `BattleScene.preload()` (already auto-loads from arrays)
4. Add to `recruitableUnits` in `generateRewardChoices()` if player-recruitable

### Adding New Spells
1. Add to `SPELLS` in GameConfig.js with: `name`, `icon`, `manaCost`, `targetType`, `effect`, `power`, `duration`
2. Implement effect handler in `SpellSystem.js` (e.g., `executeMeteor()`)
3. Add case in `executeTileSpell()` or `executeUnitSpell()`

### Target Types
- `'tile'` - AoE spells, target any tile
- `'enemy'` - Single target damage or AoE centered on enemy
- `'ally'` - Buff/heal friendly units
- `'ally_then_tile'` - Teleport: pick unit, then destination

### Critical Bug Patterns

**1. Sprite vs Tile Click Conflicts**
```javascript
// WRONG: Just blocking sprite clicks
if (this.scene.spellSystem.activeSpell) return;

// RIGHT: Cast spell at unit position
if (this.scene.spellSystem.activeSpell) {
    this.scene.spellSystem.executeSpellAt(unit.gridX, unit.gridY);
    return;
}
```

**2. Mana Cost Stacking**
- Use flat reduction: `this.manaCostMultiplier = Math.max(0.2, 1 - buff.value)`
- NOT multiplicative: ~~`this.manaCostMultiplier *= 0.8`~~ (causes exponential stacking)

**3. Health Persistence**
- Always save `health` in `nextBattle()` playerUnits mapping
- Restore in `create()` from `unitData.health`
- Don't let units heal to full between battles unless intended (spells, regeneration)

**4. Buff Duration Logic**
```javascript
// Correct check for active buff (includes permanent)
if (this.shieldRounds > 0 || this.shieldRounds === -1) {
    // Apply shield
}

// Correct decrement (skip permanent)
if (this.shieldRounds > 0) {
    this.shieldRounds--;
}
```

### AI Unit Behavior

Located in `TurnSystem.executeAITurn()`:
1. Find nearest enemy
2. Check ranged attack (if `rangedRange > 0` and in range)
3. Check melee (adjacent)
4. Move toward enemy
5. Attack after moving if possible

**For ranged enemies** (Goblin Stone Thrower):
- Must check `rangedRange` BEFORE moving
- Must check again after moving

## UI System

### HTML Overlays
- `spellbook-modal` - Spell selection grid
- `victory-screen` - Reward selection
- `initiative-bar` - Turn order display
- `magic-buffs-panel` - Active magic buffs

### Hotkeys
- **S** - Open spell book
- **E** - End turn
- **Esc** - Close spell book OR cancel spell selection

### Adding UI Elements
- Use existing CSS classes: `spell-button`, `spell-card`, `mana-display`
- Follow color scheme: `#2D241E` (wood), `#A68966` (gold), `#E3D5B8` (parchment)

## Testing Checklist

When adding new features, verify:
- [ ] Works in both single-player and progression (nextBattle)
- [ ] Keyboard shortcuts work (S, E, Esc)
- [ ] Spell book doesn't let clicks pass through to game board
- [ ] Buffs persist between battles if intended
- [ ] Unit positioning correct (bottom-origin for images)
- [ ] Initiative bar updates correctly

## Extending the Game

### Adding Legendary Buffs
1. Add buff definition in `tryGenerateLegendaryBuff()`
2. Add effect check in attack handling (SceneManager.js)
3. Add persistence in `statModifiers`
4. Add restoration logic in `create()`

### Adding Magic Buff Types
1. Add to magicOptions array in `generateRewardChoices()`
2. Set `unique: true` if shouldn't stack
3. Set `maxStacks: N` if capped
4. Handle in `confirmRewards()` buff application
5. Handle in `create()` buff restoration
6. Add display text in UIHandler.js `updateMagicBuffsDisplay()`

## Known Quirks

- **Orc Rogue hit-and-run**: Uses `turnStartX/Y` captured in `resetTurn()`
- **Berserker Bloodlust**: Stacks permanently, saved via `bloodlustStacks`
- **Wizard mana regen**: Per-wizard +1, calculated in `regenerateMana()`
- **Enemy scaling**: `statMultiplier = 1 + (battleNumber - 1) * 0.15`
- **Point buy system**: 1000 points start, units have `cost` in UNIT_TYPES
