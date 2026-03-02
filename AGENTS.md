# Steel and Sigils - AI Agent Guide

## Project Overview

**Steel and Sigils** is a browser-based turn-based tactical combat game inspired by Heroes of Might and Magic 5. Players control an army of units on a grid-based battlefield, taking turns with AI-controlled enemies to defeat each other.

### Key Features
- Initiative-based turn order system (HOMM5 style)
- 9 playable unit types with unique passives and stats
- 7 enemy unit types including 3 boss units with special abilities
- 12 different spells with various effects (damage, healing, buffs, utility)
- Unit progression through victory rewards (buffs, new units, magic enhancements)
- Legendary powers for elite units (rare drops after victory)
- Boss waves every 5 rounds with 2x2 boss units

---

## Technology Stack

| Component | Technology |
|-----------|------------|
| Game Engine | Phaser 3 (v3.70.0 via CDN) |
| Language | Vanilla JavaScript (ES6 Modules) |
| Module System | ES6 `import`/`export` |
| Styling | Vanilla CSS (Grim Dark Fantasy theme) |
| Build Step | None - runs directly in browser |
| Dependencies | Phaser 3 only |

**No build tools, no bundlers, no package managers.** This is a pure browser-based project that runs by simply opening `index.html`.

---

## File Structure

```
├── index.html              # Main HTML file, UI structure, game container
├── style.css               # Styling - Grim Dark Fantasy theme
├── units.js                # Global UNIT_TYPES database (loaded as script tag)
├── script.js.backup        # Original monolithic file (backup, not used)
├── REFACTORING.md          # Notes from refactoring to ES6 modules
├── README.md               # User-facing documentation
├── AGENTS.md               # This file - AI agent guide
├── LICENSE                 # Project license
│
├── src/                    # Source code (ES6 modules)
│   ├── main.js             # Entry point - Phaser game bootstrap (~26 lines)
│   ├── GameConfig.js       # Constants, CONFIG, SPELLS database (~174 lines)
│   ├── SceneManager.js     # BattleScene, PreGameScene - main game logic (~1758 lines)
│   ├── EntityManager.js    # Unit class, UnitManager, TurnSystem (~1058 lines)
│   ├── InputHandler.js     # GridSystem - input handling, tile highlights (~327 lines)
│   ├── SpellSystem.js      # Spell casting, effects, targeting (~485 lines)
│   └── UIHandler.js        # UIManager - DOM updates, floating text (~205 lines)
│
├── images/                 # Unit sprites
│   ├── player/             # 9 player unit PNGs
│   └── enemy/              # 7 enemy unit PNGs (including 3 bosses)
│
└── .agents/
    └── skills/
        └── steel-and-sigils/
            ├── SKILL.md              # Development skill reference
            └── references/
                ├── adding-content.md # How to add units/spells/buffs
                └── debugging-workflows.md
```

---

## Architecture

### Module Dependencies

```
main.js
├── SceneManager.js
│   ├── EntityManager.js
│   ├── InputHandler.js
│   ├── SpellSystem.js
│   └── UIHandler.js
└── GameConfig.js (imported by most modules)
```

`units.js` is loaded as a global script tag in `index.html` and provides `UNIT_TYPES` globally.

### Core Systems

#### 1. Unit System (`EntityManager.js`)
- **Unit class**: Runtime unit instances with stats, buffs, positioning
- **UnitManager**: Creation, positioning, queries (getUnitAt, getPlayerUnits, etc.)
- **TurnSystem**: Initiative queue, round management, AI turn execution
- **Boss support**: 2x2 tile units with special collision and targeting logic

#### 2. Grid System (`InputHandler.js`)
- **GridSystem**: Renders 10x8 tile grid, handles clicks, movement highlighting
- Uses BFS for valid move calculation
- Handles both tile clicks and unit sprite clicks
- Supports 2x2 boss units for placement validation

#### 3. Spell System (`SpellSystem.js`)
- **SpellSystem**: Casting, targeting, effect execution
- Target types: `tile`, `enemy`, `ally`, `ally_then_tile`
- Integrates with mana system and buff multipliers
- **Army buffs**: When enabled, buff spells affect entire player army

#### 4. UI System (`UIHandler.js`)
- **UIManager**: DOM updates for mana, buffs, unit info
- Floating text effects using Phaser tweens
- Reward card creation for victory screen

### Game Flow

1. **PreGameScene** (Army Selection)
   - Player spends 1000 points to buy units
   - Units placed in left 2 columns
   - Confirm → transitions to BattleScene

2. **BattleScene** (Combat)
   - Turn-based combat via TurnSystem
   - Player controls: click to select, move, attack
   - AI turns: auto-executed with delays
   - Boss waves every 5 rounds
   - Victory/Defeat → show reward screen or game over

3. **Victory Rewards**
   - Choose 1 new unit (every 2 rounds), 1 unit buff, 1 magic enhancement
   - Legendary buffs have 50% chance to replace regular buffs
   - Loot Goblin kill grants special reward choice
   - `nextBattle()` transitions to next BattleScene with persisted data

---

## Running the Game

### Local Development

Simply open `index.html` in any modern web browser:

```bash
# macOS
open index.html

# Linux
xdg-open index.html

# Or use a simple HTTP server for better module support
python3 -m http.server 8000
# Then visit http://localhost:8000
```

### No Build Required

This project has **no build step**. Files are served as-is and ES6 modules are loaded directly by the browser.

---

## Code Style Guidelines

### JavaScript Conventions

1. **ES6 Modules**: Always use `import`/`export`
   ```javascript
   import { CONFIG, SPELLS } from './GameConfig.js';
   export class Unit { ... }
   ```

2. **Naming**:
   - Classes: PascalCase (`UnitManager`, `TurnSystem`)
   - Constants: UPPER_SNAKE_CASE (`CONFIG`, `SPELLS`, `UNIT_TYPES`)
   - Methods/Variables: camelCase (`updateQueue`, `currentUnit`)

3. **File Headers**: Use section comments
   ```javascript
   // ============================================
   // SECTION NAME - Brief description
   // ============================================
   ```

4. **Global Access**: `UNIT_TYPES` is globally available from `units.js`
   - Do not import it - it's loaded as a script tag before modules

### Visual Style

- **Color Palette** (defined in CSS and CONFIG):
  - Background: `#1A1C1E` (deep charcoal)
  - Panels: `#2D241E` (dark oak wood)
  - Accent: `#A68966` (aged gold)
  - Text: `#E3D5B8` (parchment)
  - Highlight Move: `#4a90d9` (blue)
  - Highlight Attack: `#d94a4a` (red)

- **Icons**: Use emoji for UI elements
  - Units: ⚔️ 🏹 🧙 🛡️ 🎯 🪓 ✝️ 🗡️ 🔮
  - Spells: 🔥 ⚡ 💚 💨 🛡️ ❄️ ☄️ ✨ 💗 🌀 🌿

---

## Key Patterns & Pitfalls

### 1. Buff Duration Logic

Buffs can be permanent (rounds = -1) or temporary:

```javascript
// Check if active (includes permanent)
if (this.shieldRounds > 0 || this.shieldRounds === -1) {
    // Apply shield
}

// Decrement (skip permanent)
if (this.shieldRounds > 0) {
    this.shieldRounds--;
}
```

### 2. Spell Targeting

When a spell is active, ALL clicks must go through `executeSpellAt()`:

```javascript
// In sprite click handler
if (this.scene.spellSystem.activeSpell) {
    this.scene.spellSystem.executeSpellAt(unit.gridX, unit.gridY);
    return;
}
```

### 3. Mana Cost Stacking

Use flat reduction, NOT multiplicative:

```javascript
// CORRECT
this.manaCostMultiplier = Math.max(0.2, 1 - buff.value);

// WRONG (causes exponential stacking)
// this.manaCostMultiplier *= 0.8;
```

### 4. Unit Positioning

- **Images**: Use `origin(0.5, 1.0)` (bottom-center), position at `y = (gridY + bossSize) * TILE_SIZE - 5`
- **Emojis**: Use `origin(0.5)` (center), position at `y = gridY * TILE_SIZE + (bossSize * TILE_SIZE) / 2`
- **Bosses**: Center sprite over 2x2 area with adjusted positioning

### 5. Health Persistence

Always save/restore health between battles:

```javascript
// In nextBattle()
health: unit.health

// In create()
if (unitData.health !== undefined) {
    unit.health = Math.min(unitData.health, unit.maxHealth);
}
```

### 6. Boss Unit Distance Calculation

For 2x2 boss units, use proper distance calculation:

```javascript
// CORRECT - accounts for all occupied tiles
const dist = this.getDistanceToUnit(unit, enemy);

// WRONG - simple Manhattan distance fails for bosses
// const dist = Math.abs(enemy.gridX - unit.gridX) + Math.abs(enemy.gridY - unit.gridY);
```

### 7. Army Buffs

When `armyBuffs` is enabled, spells target entire army:

```javascript
// In SpellSystem.js
if (this.scene.armyBuffs && isBuffSpell) {
    const playerUnits = this.scene.unitManager.getPlayerUnits();
    for (const targetUnit of playerUnits) {
        // Apply buff to each unit
    }
}
```

---

## Adding New Content

### Adding a Unit

1. Add to `UNIT_TYPES` in `units.js`:
   ```javascript
   NEW_UNIT: {
       name: 'New Unit',
       emoji: '🎯',
       image: 'images/player/newunit.png',
       health: 100, maxHealth: 100,
       damage: 25, moveRange: 4, initiative: 12,
       isPlayer: true, cost: 500,
       rangedRange: 6,  // optional
       passive: { name: 'Passive', description: '...', effect: '...', value: 0.5 }
   }
   ```

2. Add image to `images/player/newunit.png`

3. If player-recruitable, add to `recruitableUnits` in `generateRewardChoices()`

### Adding a Boss Unit

1. Add to `UNIT_TYPES` with boss properties:
   ```javascript
   BOSS_NAME: {
       name: 'Boss Name',
       emoji: '👑',
       image: 'images/enemy/boss.png',
       health: 500, maxHealth: 500,
       damage: 80, moveRange: 3, initiative: 8,
       isPlayer: false, cost: 1500,
       isBoss: true,
       bossSize: 2,  // 2x2 tiles
       passive: { name: 'Passive', description: '...', effect: '...' }
   }
   ```

2. Add to `bossTypes` array in `createBossWave()`

3. Implement special AI behavior in `TurnSystem` if needed

### Adding a Spell

1. Add to `SPELLS` in `GameConfig.js`
2. Implement handler in `SpellSystem.js`
3. Add case in `executeTileSpell()` or `executeUnitSpell()`

### Adding a Magic Buff

1. Add to `magicOptions` array in `generateRewardChoices()`
2. Handle in `confirmRewards()` for application
3. Handle in `create()` for restoration
4. Add display in `UIHandler.js`

See `.agents/skills/steel-and-sigils/references/adding-content.md` for detailed examples.

---

## Testing

### Manual Testing Checklist

When adding new features, verify:
- [ ] Works in both first battle and progression (nextBattle)
- [ ] Keyboard shortcuts work (S for spellbook, E for end turn, Esc to cancel)
- [ ] Spell book modal blocks game board clicks
- [ ] Buffs persist between battles if intended
- [ ] Unit positioning correct (bottom-origin for images)
- [ ] Initiative bar updates correctly
- [ ] Boss units (2x2) work correctly for placement, movement, and targeting
- [ ] No console errors in browser dev tools

### Browser Console

Check browser console for:
- Module loading errors
- Undefined variable errors
- Phaser texture loading issues

---

## Debugging Tips

1. **Global Access**: The game instance is exposed as `window.game` and current scene as `window.gameScene`

2. **Spell Debugging**: Check `gameScene.spellSystem.activeSpell` for currently selected spell

3. **Unit Inspection**: Access units via `gameScene.unitManager.getPlayerUnits()` / `getEnemyUnits()`

4. **Turn Order**: Check `gameScene.turnSystem.turnQueue` to see upcoming turns

5. **Buff State**: Inspect `gameScene.magicBuffs` for active magic enhancements

6. **Boss Units**: Check `unit.bossSize` and `unit.getOccupiedPositions()` for 2x2 units

---

## File Size Reference

| File | Lines | Purpose |
|------|-------|---------|
| SceneManager.js | ~1758 | Main game logic, scenes, combat, rewards, boss waves |
| EntityManager.js | ~1058 | Unit class, management, turn system, boss AI |
| InputHandler.js | ~327 | Grid, input, movement highlighting |
| GameConfig.js | ~174 | Constants, spell database |
| SpellSystem.js | ~485 | Spell casting and effects |
| UIHandler.js | ~205 | DOM UI updates |

---

## External Resources

- **Phaser 3 Docs**: https://photonstorm.github.io/phaser3-docs/
- **Phaser Examples**: https://phaser.io/examples
- **Project README**: `README.md` for gameplay mechanics
- **Refactoring Notes**: `REFACTORING.md` for architecture decisions
- **Development Skill**: `.agents/skills/steel-and-sigils/SKILL.md` for detailed patterns
