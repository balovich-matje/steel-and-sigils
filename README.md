# ⚔️ Steel and Sigils v0.90

A browser-based turn-based tactical combat game inspired by Heroes of Might and Magic 5.

## 🎮 How to Play

1. Open `index.html` in your browser
2. **Stage Selection**: Choose your battlefield:
   - 🌲 **Whispering Woods** (10×8): 1000 starting points, open grassland
   - 🏰 **Ruins of a Castle** (15×15): 1700 starting points, dirt terrain with walls
3. **Army Selection**: Spend points to buy starting units
4. **Unit Placement**: Place your units in your designated area
5. **Combat**: Click units to select, move (blue tiles), and attack enemies (red tiles)
6. **Victory**: Defeat all enemies to win and choose upgrades for the next battle

## 🗺️ Stage Selection

Choose your battlefield before each run:

| Stage | Size | Points | Terrain | Features |
|-------|------|--------|---------|----------|
| 🌲 Whispering Woods | 10×8 | 1000 | Grass | Open field, no obstacles |
| 🏰 Ruins of a Castle | 15×15 | 1700 | Dirt | Stone walls, larger battles |
| ⛰️ Mountain Pass | 13×11 | 1300 | Mountains | Obstacles, right-flank enemy spawn |

## 🎮 Game Modes

### PVE Mode (Player vs AI)
- Progress through increasingly difficult battles
- Victory rewards: new units, buffs, magic enhancements
- Boss waves every 5 rounds
- Maps scale to fit screen (smaller maps = larger tiles)

## 📋 Core Mechanics

### Turn Order
- Initiative-based: higher INIT = earlier turn
- Each unit can move and attack once per turn

### Player Units

#### Basic Units (200-400 points)
| Unit | HP | DMG | MOV | RNG | INIT | Cost | Passive |
|------|----|-----|-----|-----|------|------|---------|
| ⚔️ Knight | 100 | 25 | **4** | - | 12 | 200 | 🛡️ -50% ranged damage |
| 🏹 Archer | 60 | 35 | 2 | **6** | 15 | 300 | - |
| 🧙 Wizard | 40 | 45 | 2 | 4 | 10 | 400 | 🔮 +1 mana regen/turn |

#### Specialist Units (500 points)
| Unit | HP | DMG | MOV | RNG | INIT | Cost | Passive |
|------|----|-----|-----|-----|------|------|---------|
| ✝️ Cleric | 80 | 15 | 2 | 4 | 10 | 500 | 💚 +50% healing done |
| 🗡️ Rogue | 55 | 40 | **8** | - | **16** | 500 | 👤 Returns to start after attack |

#### Elite Units (800 points)
| Unit | HP | DMG | MOV | RNG | INIT | Cost | Passive |
|------|----|-----|-----|-----|------|------|---------|
| 🛡️ Paladin | **150** | 50 | 4 | - | 9 | 800 | 🛡️ -50% ranged dmg, +50% healing |
| 🎯 Ranger | 70 | 50 | 2 | **10** | 13 | 800 | 🦅 10 tile range |
| 🪓 Berserker | 90 | 50 | 4 | - | 11 | 800 | ⚔️ Reckless (+50% dmg taken), Bloodlust (+15 dmg per kill) |
| 🔮 Sorcerer | 50 | 55 | 2 | 4 | 14 | 800 | ✨ +50% spell damage |

### Legendary Powers ⭐

After victory, there's a chance to roll a **Legendary Power** in place of a regular buff. These can only be applied to units that don't already have them. Units with legendary perks display a subtle **orange glow**.

| Unit | Legendary Power | Effect |
|------|-----------------|--------|
| 🪓 Berserker | **Blood Frenzy** 🩸 | Strikes 2 times per attack |
| 🛡️ Paladin | **Divine Wrath** ⚡ | 3x3 cleave attack (100% main target, 50% to adjacent), +40 damage |
| 🎯 Ranger | **Ricochet Shot** 🏹 | Arrows bounce to nearby targets within 2 tiles (50% dmg), +40 damage |
| 🔮 Sorcerer | **Arcane Pierce** 🔮 | 999 range, shots pierce through all enemies in line |
| 🗡️ Rogue | **Shadow Strike** 🗡️ | +100% backstab damage |

### Mythic Powers ☄️

Mythic powers are the pinnacle of unit enhancements, displaying a visible **red glowing aura**. **Mythic perks can only be acquired by units that already have their respective legendary perk.** 

| Unit | Mythic Power | Effect |
|------|-----------------|--------|
| 🛡️ Paladin | **Divine Retribution** ⚔️ | Unlimited melee retaliation against melee attackers (double normal damage) |
| 🔮 Sorcerer | **Arcane Focus** 🔥 | Consecutive casts of the same spell increase its damage by 50% |

### Spell System
- **Mana**: 100 max, +1 base regen per turn (+1 per Wizard alive)
- **Spells Per Round**: Base 1 (can be increased with Twin Cast buff)
- **12 Spells**: Fireball, Lightning Bolt, Heal, Haste, Shield, Ice Storm, Meteor, Bless, Cure Wounds, Teleport, Chain Lightning, Regenerate

### Spell Buff Enhancements

Magic buffs can be acquired from victory rewards:

| Buff | Effect |
|------|--------|
| **Eternal Magic** ♾️ | Spell buffs (Haste, Shield, Bless, Regenerate) never expire |
| **Mass Enchantment** 🌟 | Buff spells target your entire army at once |
| **Mana Flow** 🌊 | +2 base mana regen |
| **Arcane Power** 🔮 | +25% spell damage |
| **Efficient Casting** ⚡ | -20% mana cost |
| **Twin Cast** 🔄 | +1 spell per round (stackable) |
| **Expanded Mana Pool** 💧 | +50 max mana |
| **Mana Surge** ✨ | fully restore missing mana instantly |
| **Healing Surge** 💚 | +35% healing spell power |

*Note: Having both Eternal Magic and Mass Enchantment means one buff spell permanently buffs your entire army!*

### Enemy Units

At the start of a PVE run, one of three enemy factions is randomly chosen. Enemies scale each round: +250 points and +10% stats per battle.

#### Greenskin Horde
| Unit | HP | DMG | MOV | INIT | Special |
|------|----|-----|-----|------|---------|
| 👹 Orc Warrior | 50 | 25 | 4 | 10 | - |
| 👿 Orc Brute | 200 | 50 | 2 | 6 | Tank |
| 🥷 Orc Rogue | 60 | 35 | 6 | 16 | ⚡ Hit & Run |
| 👺 Goblin Stone-Thrower | 35 | 25 | 3 | 8 | Ranged |

#### Dungeon Dwellers
| Unit | HP | DMG | MOV | INIT | Special |
|------|----|-----|-----|------|---------|
| 💀⚔️ Skeleton Soldier | 90 | 25 | 4 | 11 | 🛡️ -50% ranged dmg |
| 💀🏹 Skeleton Archer | 50 | 30 | 2 | 14 | Ranged |
| 🤖 Animated Armor | 220 | 45 | 2 | 5 | Tank |
| 👻 Lost Spirit | 70 | 50 | 6 | 15 | ✨ Ethereal (-75% phys dmg, +50% spell dmg) |

#### Old God Worshippers
| Unit | HP | DMG | MOV | INIT | Special |
|------|----|-----|-----|------|---------|
| 👤 Cultist Acolyte | 40 | 20 | 4 | 10 | - |
| 🤫 Cultist Neophyte | 35 | 15 | 3 | 9 | Ranged |
| 🐙 Gibbering Horror | 80 | 40 | 3 | 11 | Ranged |
| 🦎 Flesh-warped Stalker | 70 | 40 | 7 | 16 | Fast melee |

#### Faction Bosses (Every 5th Wave)
| Faction | Boss | HP | DMG | Special |
|------|------|----|-----|---------|
| Greenskin Horde | 👑 Ogre Chieftain | 500 | 80 | Regenerates, slows enemies |
| Greenskin Horde | 🔮 Orc Shaman King | 350 | 40 | Casts AoE spells |
| Dungeon Dwellers | 💀👑 Summoner Lich | 300 | 10 | Summons undead allies each turn |
| Old God Worshippers | 🦑 Octo'th Hroa'rath | 250 | 75 | Pulls enemies into melee, AoE aura |

### PVE Progression

- **New Units**: Available every 2 battles (rounds 2, 4, 6...)
- **Unit Recruitment Pool**: Knight, Archer, Wizard, Paladin, Ranger, Berserker, Cleric, Rogue, Sorcerer
- **Victory Rewards**: Pick 1 new unit (if available), 1 unit buff, 1 magic enhancement
- **Bloodlust**: Berserker's damage increases by +15 permanently for each kill (persists across battles)

### Unit Buffs (Victory Rewards)

Buffs now have specific rarity tiers (Common to Mythic):

- **Veteran Training** ⚔️ (Common): +10 Damage
- **Enhanced Toughness** 💪 (Common): +30 Max HP
- **Greater Agility** 💨 (Common): +1 Movement
- **Precision Strikes** 🎯 (Common): +5 Initiative & +5 Damage
- **Ranged Training** 🏹 (Common): Gain Ranged Attack (Range 3)
- **Champion's Favor** ⭐ (Epic): +20 HP, +5 DMG, +1 MOV
- **Obsidian Armor** ⬛ (Epic): Max HP x2, Movement -2
- **Glass Cannon** 💥 (Epic): Double damage, half max HP
- **Temporal Shift** ⏳ (Epic): 2 actions per turn, half damage

## 🎨 Visual Style

Grim Dark Fantasy aesthetic with aged gold (#A68966), dark wood (#2D241E), and parchment (#E3D5B8) colors.

All unit sprites are pixel art (64×64). Units face left-to-right and are flipped programmatically for enemies.

## 🛠️ Tech Stack

| Component | Technology |
|-----------|------------|
| Game Engine | Phaser 3 (v3.70.0 via CDN) |
| Language | Vanilla JavaScript (ES6 Modules) |
| Styling | Vanilla CSS |
| Build Step | None - runs directly in browser |

**No build tools required.** Just open `index.html` in a modern browser.

## 📁 Project Structure

```
├── index.html              # Main HTML, UI structure
├── style.css               # Styling - Grim Dark Fantasy theme
├── units.js                # Global UNIT_TYPES database
├── README.md               # This file
├── AGENTS.md               # Developer guide
├── LICENSE                 # Project license
│
├── src/                    # Source code (ES6 modules)
│   ├── main.js             # Entry point - Phaser bootstrap
│   ├── GameConfig.js       # Constants, CONFIG, SPELLS
│   ├── BaseBattleScene.js  # Parent class for battle scenes
│   ├── SceneManager.js     # BattleScene, PreGameScene
│   ├── EntityManager.js    # Unit class, UnitManager, TurnSystem
│   ├── InputHandler.js     # GridSystem - input handling
│   ├── SpellSystem.js      # Spell casting, effects
│   ├── UIHandler.js        # UIManager - DOM updates
│   └── units.js            # Global UNIT_TYPES database
│
└── images/                 # Unit sprites
    ├── player/             # 9 player unit PNGs
    ├── enemy/              # Enemy factions
    │   ├── greenskin/      # Greenskin Horde
    │   ├── dungeon/        # Dungeon Dwellers
    │   └── cultist/        # Old God Worshippers
    └── obstacles/          # Wall/obstacle sprites
```
