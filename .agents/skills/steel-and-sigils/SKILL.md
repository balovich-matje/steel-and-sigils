---
name: steel-and-sigils
description: Browser-based turn-based tactical RPG inspired by Heroes of Might and Magic 5. Built with Phaser 3, ES6 modules, vanilla JavaScript. Features PVE (vs AI) and PVP (WebRTC peer-to-peer) modes. Use when working on unit systems, spell mechanics, turn-based combat, UI components, buff/debuff systems, PVP networking, or adding new content (units, spells, enemies).
---

# Steel and Sigils - Development Skill

## Project Overview

Turn-based tactical combat game with:
- **Engine**: Phaser 3
- **Architecture**: ES6 modules, ~4000 lines across 10 files
- **Style**: Grim Dark Fantasy (dark wood #2D241E, aged gold #A68966)
- **Grid**: 10x8 tiles, 64px each
- **Combat**: Initiative-based (PVE), Alternating turns (PVP)
- **Networking**: WebRTC DataChannel for PVP

## Game Modes

### PVE Mode
- Player vs AI enemies
- Progression with victory rewards
- Boss waves every 5 rounds

### PVP Mode (WebRTC)
- Real-time peer-to-peer multiplayer
- Host creates session (6-char key)
- Guest joins with key
- Alternating turns
- All actions synced via DataChannel

## File Structure

```
src/
├── main.js              # Game bootstrap, PVP scene loading
├── GameConfig.js        # Constants, SPELLS
├── SceneManager.js      # BattleScene, PreGameScene
├── EntityManager.js     # UnitManager, TurnSystem, Unit class
├── InputHandler.js      # GridSystem - clicks, movement
├── SpellSystem.js       # Spell casting, effects
├── UIHandler.js         # DOM UI updates, mana, buffs
├── PVPManager.js        # PVP coordination, messaging
├── PVPMatchScene.js     # PVP matchmaking
├── PVPBattleScene.js    # PVP real-time battle
├── firebase-config.js   # Firebase config for PVP signaling
└── network/
    └── WebRTCAdapter.js # WebRTC P2P implementation

units.js                 # Global UNIT_TYPES database (9 player, 4 enemy)
index.html               # UI structure
style.css                # Styling
```

## Core Architecture

### Unit System
- **Base stats** in `UNIT_TYPES` (units.js)
- **Runtime instance** = Unit class (EntityManager.js)
- **Positioning**: Images use `origin(0.5, 1.0)` (bottom-center), emojis use `origin(0.5)`
- **Scaling**: Dynamic based on source image size, max 1.3x tile (83px)

### Turn System
- **PVE**: Initiative-based queue sorted each round
- **PVP**: Simple alternating turns (Player 1 → Player 2)
- `resetTurn()` called at start of each unit's turn
- Buff durations decrement in `resetTurn()` (except permanent = -1)

### Spell System
- Spells defined in `SPELLS` constant (GameConfig.js)
- `castSpell()` → sets `activeSpell` → click target → `executeSpellAt()`
- **Critical**: When spell active, unit sprite clicks must call `executeSpellAt()`, not attack
- **Army buffs**: If `armyBuffs` enabled, buff spells target entire player army

### PVP System
- **WebRTCAdapter**: Manages RTCPeerConnection, DataChannel
- **PVPManager**: High-level coordination, sends actions via `sendAction()`
- **PVPMatchScene**: Session setup, army exchange
- **PVPBattleScene**: Real-time battle with action sync

### Unit Passives
- **Knight/Paladin**: `-50%` ranged damage taken
- **Wizard**: `+1` mana regen per wizard per turn
- **Berserker**: `Reckless` (+50% damage taken), `Bloodlust` (+15 permanent damage on kill)
- **Rogue**: Hit-and-run (returns to start position after attack)
- **Sorcerer**: `+50%` spell damage
- **Cleric/Paladin**: `+50%` healing done/received

### Legendary Buffs (Rare Drops)
| Buff | Unit | Effect |
|------|------|--------|
| Blood Frenzy | Berserker | Double strike per attack |
| Divine Wrath | Paladin | 3x3 cleave attack, +40 damage |
| Ricochet Shot | Ranger | Bounces to nearby targets (2 range, 50% dmg), +40 damage |
| Arcane Pierce | Wizard | 20 range, shots pierce through enemies in line |

## Common Patterns & Pitfalls

### Adding New Unit Types
1. Add to `UNIT_TYPES` in units.js with: `name`, `emoji`, `health`, `damage`, `moveRange`, `initiative`, `cost`, optional `rangedRange`, optional `passive`
2. Add image path: `images/player/unitname.png` or `images/enemy/unitname.png`
3. Load in `BattleScene.preload()` (already auto-loads from arrays)
4. Add to `recruitableUnits` in `generateRewardChoices()` if player-recruitable

### Adding New Spells
1. Add to `SPELLS` in GameConfig.js with: `name`, `icon`, `manaCost`, `targetType`, `effect`, `power`, `duration`
2. Implement effect handler in `SpellSystem.js`
3. Add case in `executeSpellAt()`

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
- Don't let units heal to full between battles unless intended

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

**5. PVP Action Sync**
```javascript
// Always sync actions to opponent in PVP
_tryMove(tx, ty) {
    // ... perform move locally ...
    this._syncAction({ type: 'move', fromX, fromY, toX: tx, toY: ty });
}

// Apply opponent actions when received
_applyOpponentAction(action) {
    switch (action.type) {
        case 'move': this._applyMove(action); break;
        case 'attack': this._applyAttack(action); break;
        case 'spell': this._applySpell(action); break;
        case 'end_turn': this._advanceTurn(); break;
    }
}
```

**6. WebRTC Connection**
```javascript
// Firebase is ONLY for signaling (SDP exchange)
// All game data flows through DataChannel after connection

// Host flow:
const offer = await pc.createOffer();
await pc.setLocalDescription(offer);
// Send offer to Firebase
// Wait for guest's answer from Firebase
await pc.setRemoteDescription(answer);
// DataChannel opens - now use send() for all game data

// Cleanup Firebase after connected (no longer needed)
webrtc.cleanupSignaling();
```

### AI Unit Behavior (PVE only)

Located in `TurnSystem.executeAITurn()`:
1. Find nearest enemy
2. Check ranged attack (if `rangedRange > 0` and in range)
3. Check melee (adjacent)
4. Move toward enemy
5. Attack after moving if possible

## Reward System

### Victory Rewards (PVE, every battle)
1. **New Unit** - Every 2 rounds (battle 2, 4, 6...), choose 1 of 3 random units
2. **Unit Buff** - Choose 1 of 3 buffs (50% chance for legendary class buff)
3. **Magic Buff** - Choose 1 of 3 magic enhancements

### Magic Buff Types
| Buff | Effect | Unique? |
|------|--------|---------|
| Expanded Mana Pool | +30 Max Mana | No |
| Mana Flow | +2 Mana Regen | No |
| Arcane Power | +20% Spell Damage | No |
| Efficient Casting | -20% Mana Cost (max 4 stacks) | Capped |
| Mana Surge | Full restore +20 max | No |
| Twin Cast | +1 spell per round | No |
| Eternal Magic | Buffs don't expire | Yes |
| Mass Enchantment | Spells target whole army | Yes |

## UI System

### HTML Overlays
- `spellbook-modal` - Spell selection grid
- `victory-screen` - Reward selection
- `initiative-bar` - Turn order display (PVE)
- `magic-buffs-panel` - Active magic buffs
- `pvp-menu` - PVP mode selection
- `pvp-waiting` - Waiting for opponent (PVP)
- `pvp-session-info` - Active session display (PVP)

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
- [ ] Initiative bar updates correctly (PVE)
- [ ] **PVP**: WebRTC connects successfully
- [ ] **PVP**: Actions sync correctly between players
- [ ] **PVP**: Turn alternates properly (Player 1 → Player 2)
- [ ] **PVP**: Session cleanup works after connection

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

### Adding PVP Features
1. Add action type to `_syncAction()` in PVPBattleScene.js
2. Add handler in `_applyOpponentAction()`
3. Add corresponding apply method (e.g., `_applyNewFeature()`)
4. Test with two browser instances

## Known Quirks

- **Orc Rogue hit-and-run**: Uses `turnStartX/Y` captured in `resetTurn()`
- **Berserker Bloodlust**: Stacks permanently, saved via `bloodlustStacks`
- **Wizard mana regen**: Per-wizard +1, calculated in `regenerateMana()`
- **Enemy scaling**: `statMultiplier = 1 + (battleNumber - 1) * 0.15`
- **Point buy system**: 1000 points start (PVE), 2500 points (PVP)
- **New unit waves**: Every 2 rounds
- **PVP Side assignment**: Host = left (columns 0-1), Guest = right (columns 8-9)
- **PVP Turn order**: Player 1 always starts
