# Steel and Sigils — Agent Operating Manual

> This document is the primary context file for AI agents working on this project. Read it fully before making any changes. It is the equivalent of `program.md` in autonomous research setups — it defines the codebase, the rules, the patterns, and the known pitfalls so you can work fast without breaking things.

**Current version:** check `src/main.js` → `GAME_VERSION`
**Stack:** Phaser 3 · Vanilla JS ES6 modules · No build step · Runs directly in browser

---

## 1. VERSIONING RULE (do this on every commit)

Every commit that changes game behaviour or fixes a bug **must** increment the version by +0.01 in exactly two places:

1. `src/main.js` → `const GAME_VERSION = '0.xx';`
2. `README.md` → first line `# ⚔️ Steel and Sigils v0.xx`

No other files need updating. Commits that only touch docs/comments/assets don't require a bump.

---

## 2. PROJECT DIRECTORY

```
steel-and-sigils/
├── index.html                  # All UI markup (~1073 lines)
├── style.css                   # All CSS styling
├── src/
│   ├── main.js                 # Phaser config + GAME_VERSION constant
│   ├── units.js                # UNIT_TYPES global — every unit's stats & passives
│   ├── GameConfig.js           # CONFIG (grid constants), STAGES (3 maps), SPELLS (12)
│   ├── SceneManager.js         # BattleScene + PreGameScene (~4000 lines, main game logic)
│   ├── EntityManager.js        # Unit class, UnitManager, TurnSystem (~1900 lines)
│   ├── SpellSystem.js          # All spell casting & visual effects (~1040 lines)
│   ├── InputHandler.js         # GridSystem — grid rendering, pathfinding, highlights
│   ├── UIHandler.js            # UIManager — all DOM updates (HUD, panels, floating text)
│   ├── i18n.js                 # Full EN + RU translation dictionaries (~920 lines)
│   ├── i18n-helper.js          # Exports t() helper for ES6 module imports
│   └── debug.js                # Debug tools, active only with ?debug=1
├── images/
│   ├── player/                 # 9 player sprites (64×64 PNG, face LEFT)
│   ├── enemy/
│   │   ├── greenskin/          # 7 enemy sprites
│   │   ├── dungeon/            # 6 enemy sprites (incl. banshee_sovereign.png)
│   │   └── cultist/            # 7 enemy sprites
│   ├── obstacles/              # wall, wall_large, rock, rock_large, rock_tall,
│   │                           #   rock_wide, rock_jagged
│   └── tiles/                  # grass1, grass2, grass3, dirt, rock
└── utils/
    ├── AGENTS.md               # This file
    ├── pollinations.md         # Pollinations API reference for sprite generation
    └── images-output/          # Temp folder for generated sprite candidates
```

---

## 3. ARCHITECTURE — HOW THE FILES CONNECT

```
index.html  ←→  style.css          (static UI shell)
     ↓
main.js                             (Phaser Game bootstrap)
     ↓
SceneManager.js                     (BattleScene + PreGameScene)
  ├── units.js        (UNIT_TYPES read-only data)
  ├── GameConfig.js   (CONFIG, STAGES, SPELLS read-only data)
  ├── EntityManager.js  → UnitManager, TurnSystem, Unit class
  ├── SpellSystem.js    → spell execution + visual effects
  ├── InputHandler.js   → GridSystem, pathfinding, tile clicks
  ├── UIHandler.js      → UIManager, DOM updates
  └── i18n-helper.js    → t() for translated strings
```

**Data flow for a player melee attack:**
1. Player clicks enemy tile → `GridSystem.handleTileClick()`
2. `SceneManager.performAttack(attacker, defender)`
3. `defender.takeDamage(amount, isRanged=false, attacker)` in `EntityManager`
4. If defender dies → `Unit.die()` → `UnitManager` removes unit, checks victory
5. `UIManager` updates HUD, floating damage text
6. `TurnSystem.nextTurn()` → next unit in queue

**Data flow for reward selection:**
1. `SceneManager.showVictoryScreen()` → renders DOM reward cards via `UIManager.createRewardCard()`
2. Card onclick → `SceneManager.selectReward()` → `showBuffTargetSelection()` / `showLegendaryTargetSelection()`
3. `confirmRewards()` → applies effects, calls `nextBattle()` → `SceneManager.create()` restart

---

## 4. KEY DATA STRUCTURES

### Unit object (instance of `Unit` class in EntityManager.js)

```javascript
{
  // Identity
  type: 'KNIGHT',               // Key into UNIT_TYPES
  name: 'Knight',
  emoji: '⚔️',
  isPlayer: boolean,
  isBoss: boolean,
  bossSize: 1 | 2,             // 2 = occupies 2×2 tiles

  // Stats (live values, modified by buffs)
  health, maxHealth,
  damage,
  moveRange,
  rangedRange,                  // 0 = melee only
  initiative,

  // Permanent stat deltas (persisted across battles in save data)
  statModifiers: {
    damage: number,
    maxHealth: number,
    moveRange: number,
    initiative: number,
    rangedRange: number,
    hasDoubleStrike: bool,
    hasCleave: bool, hasRicochet: bool, hasPiercing: bool, hasBackstab: bool,
    hasDivineRetribution: bool, hasUnstableArcana: bool, hasTemporalShift: bool,
    hasSilverArrows: bool, hasWarlust: bool,
  },

  // Temporary buff state (NOT persisted — reset each battle except hasteRounds/hasteValue)
  hasteRounds: number,          // -1 = permanent, 0 = off, >0 = turns remaining
  shieldRounds: number, shieldValue: number,   // shieldValue = 0.5 → -50% damage
  blessRounds: number, blessValue: number,     // blessValue = 1.5 → ×1.5 damage
  regenerateRounds: number, regenerateAmount: number,
  iceSlowRounds: number,
  unstableArcanaDotRounds: number, unstableArcanaDotAmount: number,
  slowDebuffRounds: number, slowDebuffValue: number,  // Ogre Chieftain slow
  voidSlowRounds: number,                             // Void Herald slow

  // Legendary/mythic flags
  hasDoubleStrike: bool,   // Berserker: attack twice
  hasCleave: bool,         // Paladin: hit adjacent
  hasRicochet: bool,       // Ranger: second target
  hasPiercing: bool,       // Archer: pierce through
  hasBackstab: bool,       // Rogue: +100% dmg from behind
  hasDivineRetribution: bool, // Paladin: reflect 30%
  hasUnstableArcana: bool,    // Wizard: DoT on hit
  hasTemporalShift: bool,     // Wizard: extra turn/round
  hasSilverArrows: bool,      // Archer: +100% vs undead
  hasWarlust: bool,           // Berserker: +5 maxHP per kill

  // Turn state (reset each turn via resetTurn())
  hasMoved: bool,
  hasAttacked: bool,
  isDead: bool,
  isWailed: bool,             // Banshee Sovereign: next attack deals 0

  // Position
  gridX, gridY,               // Grid coordinates
  sprite,                     // Phaser Image object
  healthBar: { bar, bg, text },

  // Special unit state
  bloodlustStacks: number,    // Berserker: stacks of +15 dmg
  firstSummon: bool,          // Summoner Lich: 2 units on first turn
  turnStartX, turnStartY,     // Rogue / OrcRogue: position at turn start
}
```

### selectedRewards object (BattleScene state)

```javascript
{
  unit: null | { id: 'UNIT_TYPE' } | { id: 'skipped' },
  buff: null | { id: string, effectData: BuffObject, targetUnit: Unit },
  legendary: null | { id: string, effectData: BuffObject, targetUnit: Unit },
  magic: null | { id: string, effectData: MagicObject },
  bonusBuff: null | { id: string, effectData: BuffObject, targetUnit: Unit },
}
```

`bonusBuff` is filled when the player discards their unit pick to get a second buff row.
`legendary` is used for legendary AND mythic buff selections (written by `showLegendaryTargetSelection`).

---

## 5. UNIT ROSTER

### Player Units

| Key | Name | HP | DMG | MOV | INIT | RNG | Cost | Notable Passive |
|-----|------|----|-----|-----|------|-----|------|-----------------|
| KNIGHT | Knight | 100 | 25 | 4 | 12 | — | 200 | -50% ranged dmg taken |
| ARCHER | Archer | 60 | 35 | 2 | 15 | 6 | 300 | Ranged |
| WIZARD | Wizard | 40 | 45 | 2 | 10 | — | 500 | +2 mana/turn regen |
| CLERIC | Cleric | 80 | 15 | 2 | 10 | — | 500 | Can cast Heal; +50% army healing |
| ROGUE | Rogue | 55 | 40 | 8 | 16 | — | 500 | Hit & Run (returns after attack) |
| PALADIN | Paladin | 150 | 50 | 4 | 9 | — | 800 | -50% ranged, +50% healing |
| RANGER | Ranger | 70 | 50 | 2 | 13 | 10 | 800 | Ranged, Eagle Eye |
| BERSERKER | Berserker | 90 | 50 | 4 | 11 | — | 800 | Reckless (+50% dmg taken), Bloodlust |
| SORCERER | Sorcerer | 50 | 55 | 2 | 14 | — | 800 | +50% spell dmg per Sorcerer in army |

### Enemy Units — Greenskin Horde

| Key | HP | DMG | MOV | Special |
|-----|----|-----|-----|---------|
| ORC_WARRIOR | 50 | 25 | 4 | — |
| ORC_BRUTE | 200 | 50 | 2 | Slow tank |
| ORC_ROGUE | 60 | 35 | 6 | Hit & Run |
| GOBLIN_STONE_THROWER | 40 | 15 | 6 | Ranged (4), scaled ×0.7 |
| **OGRE_CHIEFTAIN** (Boss) | 500 | 80 | 3 | 10% HP regen/turn; slows targets on hit |
| **ORC_SHAMAN_KING** (Boss) | 350 | 40 | 4 | Ranged (6), casts spells |
| **LOOT_GOBLIN** (Boss, Rare) | 150 | 50 | 8 | Hit & Run; legendary loot on death |

### Enemy Units — Dungeon Dwellers

| Key | HP | DMG | MOV | Special |
|-----|----|-----|-----|---------|
| ANIMATED_ARMOR | 220 | 45 | 2 | — |
| SKELETON_ARCHER | 50 | 30 | 2 | Ranged (6) |
| SKELETON_SOLDIER | 90 | 25 | 4 | -50% ranged dmg |
| LOST_SPIRIT | 70 | 50 | 6 | -75% phys dmg, +50% spell dmg |
| **SUMMONER_LICH** (Boss) | 300 | 10 | 1 | Summons 2 undead turn 1, then 1/turn |
| **BANSHEE_SOVEREIGN** (Boss) | 450 | 60 | 4 | Ethereal (-75% phys, +50% ranged/spell); Wailing Screech (silences nearby on her turn) |

### Enemy Units — Old God Worshippers

| Key | HP | DMG | MOV | Special |
|-----|----|-----|-----|---------|
| CULTIST_ACOLYTE | 40 | 20 | 5 | 25% magic resistance |
| CULTIST_NEOPHYTE | 35 | 15 | 4 | Ranged (4), 25% magic resist |
| GIBBERING_HORROR | 80 | 40 | 5 | Ranged (5); Unstable Form (+2 MOV or +10 DMG per turn) |
| FLESH_WARPED_STALKER | 70 | 40 | 7 | Feast of Flesh (refresh turn on kill) |
| **OCTOTH_HROARATH** (Boss) | 250 | 75 | 4 | Aura 15 dmg/turn to adjacent; pulls |
| **THE_SILENCE** (Boss) | 400 | 55 | 3 | Aura of Silence (no spells whole fight) |
| **VOID_HERALD** (Boss) | 320 | 35 | 4 | Ranged (6); void slow (-3 MOV all); casts voidball |

---

## 6. SPELL ROSTER (src/GameConfig.js → SPELLS)

| ID | Name | Mana | Effect | Target | Power | Range |
|----|------|------|--------|--------|-------|-------|
| fireball | Fireball | 25 | AoE dmg (3×3) | enemy | 30 | 5 |
| lightning_bolt | Lightning Bolt | 15 | Single dmg | enemy | 45 | 6 |
| heal | Heal | 20 | Restore HP | ally | 40 | 5 |
| haste | Haste | 15 | +2 MOV (3 turns) | ally | 2 | 5 |
| shield | Shield | 15 | -50% dmg (2 turns) | ally | 0.5 | 5 |
| ice_storm | Ice Storm | 30 | AoE dmg + -1 MOV | enemy | 20 | 4 |
| meteor | Meteor | 50 | Heavy AoE (5×5) | enemy | 60 | 6 |
| bless | Bless | 25 | ×1.5 dmg (3 turns) | ally | 1.5 | 5 |
| cure_wounds | Cure Wounds | 35 | Restore HP | ally | 80 | 4 |
| teleport | Teleport | 30 | Move unit to tile | ally→tile | — | 8 |
| chain_lightning | Chain Lightning | 40 | 35 dmg × 3 enemies | enemy | 35 | 5 |
| regenerate | Regenerate | 25 | 15 HP/turn (4 turns) | ally | 15 | 5 |

---

## 7. WAVE & BOSS SYSTEM

- Regular enemy waves: battles 1, 2, 3, 4, 6, 7... (all non-multiples of 5)
- **Boss waves:** battle 5, 10, 15, 20, ... (every 5th battle)
- Boss adds: `Math.min(Math.floor(battleNumber / 5), 4)` regular enemies spawn alongside boss
  - Skipped for LOOT_GOBLIN and SUMMONER_LICH
- `lastBossSpawned` prevents the same boss appearing back-to-back

**Boss pools per faction:**
```javascript
GREENSKIN_HORDE:     ['OGRE_CHIEFTAIN', 'ORC_SHAMAN_KING', 'LOOT_GOBLIN']
DUNGEON_DWELLERS:    ['SUMMONER_LICH', 'BANSHEE_SOVEREIGN']
OLD_GOD_WORSHIPPERS: ['OCTOTH_HROARATH', 'THE_SILENCE', 'VOID_HERALD']
```

**Boss adds pool (in spawnBossAdds):**
```javascript
DUNGEON_DWELLERS:    ['ANIMATED_ARMOR', 'SKELETON_SOLDIER', 'SKELETON_ARCHER', 'LOST_SPIRIT']
GREENSKIN_HORDE:     ['ORC_WARRIOR', 'ORC_BRUTE', 'ORC_ROGUE', 'GOBLIN_STONE_THROWER']
OLD_GOD_WORSHIPPERS: ['CULTIST_ACOLYTE', 'CULTIST_NEOPHYTE', 'GIBBERING_HORROR', 'FLESH_WARPED_STALKER']
```

---

## 8. DAMAGE SYSTEM — CRITICAL DETAILS

### takeDamage(amount, isRanged = false, attacker = null)

`isRanged` = `true` for **both** ranged attacks AND spell damage. This is the single flag used for all non-melee damage.

**Passive reductions applied in order:**
1. Knight/Paladin Heavy Armor: if `isRanged` → `amount *= 0.5`
2. Cultist 25% magic resist (all cultist types including bosses): if `isRanged` → `amount *= 0.75`
3. Lost Spirit Ethereal: if `!isRanged` → `amount *= 0.25`; if `isRanged` → `amount *= 1.5`
4. Banshee Sovereign: if `!isRanged` → `amount *= 0.25`; if `isRanged` → `amount *= 1.5`
5. Berserker Reckless: always → `amount *= 1.5` (AFTER all reductions)
6. Shield buff: `amount *= (1 - shieldValue)` (shieldValue = 0.5 by default)

### takeSpellDamage(amount, attacker = null)

Calls `takeDamage(amount, isRanged=true, attacker)` after applying spell-specific modifiers. Always passes `isRanged = true`.

### Bless damage multiplier

Applied in `performAttack()` and `performRangedAttack()` **before** calling `takeDamage()`:
```javascript
if (unit.blessRounds !== 0) damage = Math.floor(damage * unit.blessValue);
```

---

## 9. BUFF PERSISTENCE ACROSS BATTLES

Units are saved when moving to the next battle (`nextBattle()` around line 3494) and restored at scene start (around line 195).

**What persists:** `statModifiers` object (permanent stat changes from reward buffs)
**What is saved temporarily:** `hasteRounds`, `hasteValue`, `shieldRounds/Value`, `blessRounds/Value`, `regenerateRounds/Amount`, `unstableArcanaDotRounds/Amount`
**What resets each battle:** all temporary debuffs (ice slow, void slow, Ogre slow), `isWailed`, turn state

### ⚠️ FOOTGUN: hasteValue formula

When saving haste for the next battle:
```javascript
// CORRECT (current code):
hasteValue: u.hasteRounds > 0 || u.hasteRounds === -1
    ? u.moveRange - UNIT_TYPES[u.type].moveRange - (u.statModifiers?.moveRange || 0)
    : 0,
```
The `statModifiers.moveRange` subtraction is essential. Without it, permanent haste + obsidian armor (which reduces `statModifiers.moveRange` by -2) would save a negative hasteValue, which then compounds each battle, draining `moveRange` toward 0.

### ⚠️ FOOTGUN: moveRange reset on buff expiry

When haste, ice slow, or void slow expire they reset moveRange to the base template value:
```javascript
this.moveRange = UNIT_TYPES[this.type].moveRange;  // ignores statModifiers!
```
This means a unit with obsidian armor (statModifiers.moveRange = -2) will incorrectly regain 2 movement when any of these debuffs expire. **Planned fix:** these resets should be `UNIT_TYPES[this.type].moveRange + (this.statModifiers?.moveRange || 0)`.

---

## 10. REWARD SYSTEM — SELECTION SLOTS

`selectedRewards` has five slots. Each must be filled before confirm unlocks:

| Slot | Key | Filled by |
|------|-----|-----------|
| Unit | `unit` | `selectReward('unit', ...)` — or auto-set to `{id:'skipped'}` when no unit offered |
| Regular buff | `buff` | `showBuffTargetSelection()` → writes `selectedRewards.buff` |
| Legendary/mythic | `legendary` | `showLegendaryTargetSelection()` → writes `selectedRewards.legendary` |
| Magic upgrade | `magic` | `selectReward('magic', ...)` |
| Bonus buff | `bonusBuff` | `showBonusBuffTargetSelection()` → writes `selectedRewards.bonusBuff` |

Only ONE of `buff` or `legendary` is expected per normal reward screen. The confirm button checks `buff || legendary` as a single requirement.

**Bonus buff row** (triggered via Discard Units button):
- Sets `selectedRewards.unit = { id: 'skipped' }`
- Renders a second set of buff cards in `#reward-buffs-bonus`
- These cards have their onclick **overridden** after `renderBuffCards()` to call `showBonusBuffTargetSelection()` instead of `selectReward()`
- `confirmRewards()` applies both `buff` and `bonusBuff` independently

### ⚠️ FOOTGUN: Don't let bonus row cards call selectReward()

All `createRewardCard()` calls attach `onclick = () => this.scene.selectReward(...)` by default (UIHandler.js line 378). This writes to `selectedRewards.buff`, overwriting the first row. The fix is already in place: after `renderBuffCards()` for the bonus container, loop through the children and reassign onclick to `showBonusBuffTargetSelection()`.

---

## 11. i18n SYSTEM — RULES

### Always add BOTH languages

Every new user-facing string needs a key in `src/i18n.js` in **both** `en` and `ru` blocks. Never hardcode English strings in JS — use `t()`.

### Key naming conventions

```
game.*          Title, subtitle
map.*           Stage names/stats
faction.*       Enemy faction descriptions
army.*          Army building UI text
unit.*          Unit names (e.g. unit.knight, unit.banshee_sovereign)
stat.*          HP, DMG, MOV, INIT, RNG
passive.*       Passive ability descriptions
spell.*         Spell names
spell.desc.*    Spell descriptions
school.*        Magic schools
victory.*       Victory screen
defeat.*        Defeat screen
reward.*        Reward screen UI labels
buff.*          Buff names (buff.obsidian)
buff.*.desc     Buff descriptions (buff.obsidian.desc)
magic.*         Magic upgrade names
magic.*.desc    Magic upgrade descriptions
combat.*        Combat log messages
error.*         Error messages (no mana, silence, etc.)
loot_goblin.*   Loot goblin specific strings
```

### Usage

```javascript
import { t } from './i18n-helper.js';
// With no args:
const label = t('buff.obsidian');           // → "Obsidian Armor"
// With placeholder substitution:
const msg = t('unit.cost', 200);            // → "Cost: 200"  (replaces {0})
const msg2 = t('reward.picks_remaining', 3); // → "3 picks remaining"
```

### In reward/buff definitions

Buff objects must use `t()` for their `name` and `desc` fields:
```javascript
{ id: 'my_buff', name: t('buff.my_buff'), desc: t('buff.my_buff.desc'), ... }
```
Never use hardcoded English strings — they won't translate on language switch.

---

## 12. RECIPE: ADD A NEW ENEMY UNIT

1. **Add to `src/units.js`:**
```javascript
MY_ENEMY: {
    name: 'My Enemy',
    emoji: '👾',
    image: 'images/enemy/dungeon/my_enemy.png',
    health: 80, maxHealth: 80,
    damage: 30, moveRange: 4, initiative: 12,
    isPlayer: false, cost: 400,
    passives: [{ name: 'Ability Name', description: 'What it does.' }]
}
```

2. **Add sprite** to `images/enemy/{faction}/my_enemy.png` (64×64 PNG, face LEFT)

3. **Register in preload** — in `SceneManager.preload()`, add `'MY_ENEMY'` to the `enemyUnits` array

4. **Add to faction pool** — find `ENEMY_FACTIONS` in `SceneManager.js` (used in `createEnemyWave()`), add to the correct faction array

5. **Add i18n key** to `src/i18n.js`:
```javascript
en: { 'unit.my_enemy': 'My Enemy', ... }
ru: { 'unit.my_enemy': 'Мой Враг', ... }
```

6. **If it has special AI behavior**, add a branch in `EntityManager.executeEnemyTurn()` (or `Unit.resetTurn()` for turn-start effects). Do NOT return early from the turn unless you want to skip normal movement/attacking.

---

## 13. RECIPE: ADD A NEW BOSS

Bosses are 2×2 units spawned by `createBossWave()` (every 5th battle).

1. **Define in `src/units.js`** — same as enemy unit but add:
```javascript
isBoss: true, bossSize: 2,
```

2. **Add to boss pool** in `SceneManager.createBossWave()` — find the faction's boss array:
```javascript
const dungeonBosses = ['SUMMONER_LICH', 'BANSHEE_SOVEREIGN', 'MY_NEW_BOSS'];
```

3. **If boss spawns with adds** — the `addsCount > 0` check already handles most bosses. Exclude explicitly if needed:
```javascript
if (addsCount > 0 && selectedBoss !== 'LOOT_GOBLIN' && selectedBoss !== 'SUMMONER_LICH') {
    this.spawnBossAdds(addsCount);
}
```

4. **Implement any special ability:**
   - **Turn-start effect** → `Unit.resetTurn()` in EntityManager (e.g., Ogre regen, Lich summoning, Banshee wail)
   - **Custom AI behavior** → `EntityManager.executeEnemyTurn()` — add `if (unit.type === 'MY_BOSS') { this.executeMyBossTurn(); }`. Do NOT return unless you want to skip normal AI movement.
   - **Damage resistance** → `Unit.takeDamage()` — add a `if (this.type === 'MY_BOSS')` block

5. **Register in preload**, add i18n key as above.

---

## 14. RECIPE: ADD A NEW REWARD BUFF

Reward buffs appear in the victory screen. There are three tiers:

### Regular buff (appears in getRandomBuffs())

Add to the array inside `getRandomBuffs()` in `SceneManager.js`:
```javascript
{
    id: 'my_buff',
    name: t('buff.my_buff'),
    icon: '⚡',
    desc: t('buff.my_buff.desc'),
    rarity: 'common',   // or 'epic'
    effect: (unit) => {
        unit.damage += 10;
        unit.statModifiers = unit.statModifiers || {};
        unit.statModifiers.damage = (unit.statModifiers.damage || 0) + 10;
        unit.updateHealthBar();
    }
}
```

**Always update `statModifiers`** in the effect — this is what persists the change to the next battle. The live stat change applies immediately; `statModifiers` replays it on the fresh unit at the start of each subsequent battle.

### Legendary buff (unit-type specific)

Add to `tryGenerateLegendaryBuff()` AND `tryGenerateLegendaryBuffForLootGoblin()`. The legendary buff must:
- Check that the target unit type is in the player's army
- Check that the unit doesn't already have the buff
- Set both `unit.hasMyBuff = true` AND `unit.statModifiers.hasMyBuff = true`

### Mythic buff

Same as legendary, but goes in `tryGenerateMythicBuff()` / `tryGenerateMythicBuffForLootGoblin()`. Use id prefix `mythic_` for the buff id.

---

## 15. RECIPE: ADD A NEW SPELL

1. **Define in `src/GameConfig.js` SPELLS:**
```javascript
my_spell: {
    id: 'my_spell', name: 'My Spell', icon: '✨',
    type: 'Destructo',    // School: Destructo | Restoratio | Benedictio | Utilitas
    manaCost: 25,
    description: 'Does something cool.',
    targetType: 'enemy',  // 'enemy' | 'ally' | 'tile' | 'ally_then_tile'
    effect: 'myEffect',
    power: 40,
    range: 5,
    duration: 3           // Optional, for buff spells
}
```

2. **Implement in `SpellSystem.js`:** Add a case in `executeUnitSpell()` or `executeTileSpell()` for `spell.effect === 'myEffect'`, calling a new `executeMyEffect(spell, unit)` method.

3. **Add i18n keys:** `spell.my_spell` and `spell.desc.my_spell` in both languages.

4. **Add to spellbook UI** in `index.html` (find the `.spell-list` section).

---

## 16. RECIPE: ADD i18n KEYS

Open `src/i18n.js`. The structure is:
```javascript
const TRANSLATIONS = {
    en: { /* all english */ },
    ru: { /* all russian */ }
};
```

Add your key in the same relative position in BOTH blocks:
```javascript
en: {
    // ... existing keys ...
    'buff.my_new_buff': 'My New Buff',
    'buff.my_new_buff.desc': 'Does something for one unit.',
    // ...
},
ru: {
    // ... existing keys ...
    'buff.my_new_buff': 'Мой Новый Бафф',
    'buff.my_new_buff.desc': 'Делает что-то для одного юнита.',
    // ...
}
```

---

## 17. KNOWN FOOTGUNS & GOTCHAS

### 1. hasteValue negative feedback loop (FIXED in v0.99)
When saving `hasteValue`, always subtract `statModifiers.moveRange`. See Section 9.

### 2. moveRange reset on buff expiry (NOT YET FIXED)
When haste/iceSlowRounds/voidSlowRounds hit 0, they reset `moveRange = UNIT_TYPES[this.type].moveRange`. This ignores obsidian armor (or any `statModifiers.moveRange`). If you work near this code, fix it to: `UNIT_TYPES[this.type].moveRange + (this.statModifiers?.moveRange || 0)`.

### 3. Bonus buff row onclick override (FIXED in v0.99)
`createRewardCard()` always attaches `selectReward()` as onclick. Bonus buff cards must have their onclick overridden *after* `renderBuffCards()` to call `showBonusBuffTargetSelection()` instead.

### 4. isRanged = true for spells
`takeDamage(amount, isRanged)` — pass `isRanged = true` for all spell damage, not just ranged attacks. This enables Knight/Paladin armor, Banshee weakness, Lost Spirit weakness, etc.

### 5. 2×2 boss placement
When spawning a 2×2 boss, check that all four tiles (gridX, gridX+1, gridY, gridY+1) are free. `unitManager.isValidPlacement(x, y, bossSize)` handles this — always pass `bossSize`.

### 6. Buff object name/desc must use t()
If you add a buff with hardcoded English `name`/`desc`, those strings WON'T update when the player switches to Russian. The victory screen shows the buff names, so they'll appear in English even in RU mode. Always use `t('buff.key')`.

### 7. Boss special AI — return or fall-through
In `executeEnemyTurn()`, special boss code runs before the default AI. If you DON'T `return` after the special code, the boss also moves and attacks normally. Banshee wail intentionally falls through (wails THEN moves). Lich, Void Herald, Octoth have full custom turns and DO return. Match this pattern to your intent.

### 8. statModifiers accumulation
`statModifiers` is cumulative across battles. If a buff that reduces stats (like obsidian armor: -2 MOV) isn't deduplicated, picking it multiple reward screens will keep reducing the stat. Buffs that should only apply once must set a flag like `unit.statModifiers.hasObsidianArmor = true` and check `if (!unit.statModifiers.hasObsidianArmor)` before offering it.

### 9. i18n in reward generators
Buff objects are created fresh every time `getRandomBuffs()` / `tryGenerateLegendaryBuff()` etc. are called. Because `t()` is called at creation time, the language at the moment of reward screen generation is captured. This is correct — language switch requires reopening the reward screen to see translated buffs.

### 10. clearBuffSelection only clears the first row
`clearBuffSelection()` targets `#reward-buffs` and clears `selectedRewards.buff + .legendary`. It does NOT touch `#reward-buffs-bonus` or `selectedRewards.bonusBuff`. This is intentional — the two rows are independent.

---

## 18. TESTING CHECKLIST

Before committing a change, verify:

**Syntax check (fast):**
```bash
node --check src/SceneManager.js
node --check src/EntityManager.js
node --check src/SpellSystem.js
```

**Functional checks (manual, in browser with ?debug=1):**

| Change type | What to test |
|-------------|--------------|
| New enemy unit | `debug.restartAtRound(1)` — verify it spawns, moves, and attacks. Kill it and check no JS errors. |
| New boss | `debug.spawnBoss('MY_BOSS')` — verify special ability fires correctly. `debug.wipeEnemies()` after. |
| New buff | Win a battle (use `debug.wipeEnemies()`), select the buff, verify stat change on unit info panel. Play next battle to confirm stat persists. |
| Buff with moveRange | After applying, check unit moves correctly. Win that battle, verify move range is correct in the next battle (haste interaction!). |
| Reward screen change | Test both the normal path AND the discard-for-bonus path. Both buff rows should apply independently. |
| i18n key | Switch language via the flag button and verify the new string shows correctly in both EN and RU. |
| Damage formula change | Test against Knight/Paladin (ranged resist), Berserker (reckless), Lost Spirit/Banshee (ethereal), shield-buffed unit. |

**Regression checks:**
- Loot Goblin still gives legendary rewards
- Boss waves still fire at battle 5, 10, etc.
- Permanent buff (`?debug=1` — cast Haste with permanentBuffs on) persists across battles

---

## 19. DEBUG TOOLS

Add `?debug=1` to URL to enable. All commands via browser console:

```javascript
debug.state()                    // Current game snapshot
debug.wipeEnemies()              // Instant victory — fastest way to reach reward screen
debug.spawnBoss('BANSHEE_SOVEREIGN')  // Force specific boss
debug.restartAtRound(5)          // Jump to battle 5 (first boss wave)
debug.skipToBossWave()           // Jump to next multiple of 5
debug.bosses()                   // List all boss keys per faction

// Direct state inspection:
window.gameScene.unitManager.units         // All alive units
window.gameScene.turnSystem.currentUnit    // Whose turn it is
window.gameScene.selectedRewards           // Current reward state
window.gameScene.battleNumber              // Current wave
window.gameScene.mana                      // Current mana
```

---

## 20. SPRITE GENERATION

Use `utils/generate_sprite.py` and the Pollinations `zimage` model.

**Quick batch generation:**
```python
# See utils/generate_banshee.py for a real example
import requests, PIL
model = "zimage"
size = 1024  # generates at 1024, game uses 64 so quality headroom is fine
prompt = "towering undead boss, dark fantasy pixel art, side view facing right, transparent background"
# Always generate facing RIGHT — the game will flip to LEFT via flipX
# Download → flip horizontally → save to utils/images-output/
```

**After picking a sprite:**
1. Remove background (Photoshop / remove.bg / GIMP)
2. Scale/crop to appropriate display size
3. Copy to `images/enemy/{faction}/unit_name.png`
4. Wire up in `src/units.js` and `SceneManager.preload()`

**Models to use:** `zimage`
**Models to avoid:** `flux`, `flux-2-dev`, `klein`, `grok-imagine`, `imagen-4` (inconsistent orientation/style)

---

## 21. CODE CONVENTIONS

- **ES6 modules** with `import`/`export` — no build step, loads directly in browser
- **No TypeScript** — raw JS, stay consistent
- **Class names:** PascalCase (`BattleScene`, `UnitManager`)
- **Functions/variables:** camelCase (`performAttack`, `selectedUnit`)
- **Constants:** UPPER_SNAKE_CASE (`UNIT_TYPES`, `ENEMY_FACTIONS`)
- **Unit keys:** UPPER_SNAKE_CASE strings (`'BANSHEE_SOVEREIGN'`, `'ORC_WARRIOR'`)
- **No external dependencies** beyond Phaser 3 (loaded from CDN in index.html)
- **DOM manipulation** is done in `UIHandler.js` and `SceneManager.js` — Phaser handles the canvas, DOM handles all HTML panels
- **i18n:** import `t` from `./i18n-helper.js` in every module that needs translated strings; use `window.i18n.t()` only for inline scripts in index.html

---

## 22. FILES BY TASK — QUICK LOOKUP

| Task | Primary file(s) |
|------|-----------------|
| Add / modify unit stats | `src/units.js` |
| Add enemy to faction pool | `SceneManager.js` → ENEMY_FACTIONS + createEnemyWave |
| Add boss to boss pool | `SceneManager.js` → createBossWave |
| Boss special ability (turn-start) | `EntityManager.js` → Unit.resetTurn() |
| Boss special ability (AI turn) | `EntityManager.js` → executeEnemyTurn() |
| Boss damage resistance | `EntityManager.js` → Unit.takeDamage() |
| Add spell | `GameConfig.js` + `SpellSystem.js` |
| Add reward buff (regular) | `SceneManager.js` → getRandomBuffs() |
| Add reward buff (legendary) | `SceneManager.js` → tryGenerateLegendaryBuff() + ForLootGoblin variant |
| Add reward buff (mythic) | `SceneManager.js` → tryGenerateMythicBuff() + ForLootGoblin variant |
| Buff persistence across battles | `SceneManager.js` → nextBattle() save block + create() restore block |
| Add i18n key | `src/i18n.js` — both en and ru |
| UI panel changes | `index.html` + `style.css` |
| Grid / pathfinding | `InputHandler.js` |
| Turn order | `EntityManager.js` → TurnSystem |
| Mana / spell logic | `SpellSystem.js` + `SceneManager.js` |
| Visual effects (floating text, animations) | `UIHandler.js` + `SpellSystem.js` |
| New map/stage | `GameConfig.js` + `SceneManager.js` + `index.html` |
| Sprite generation | `utils/generate_sprite.py` (copy and modify) |
