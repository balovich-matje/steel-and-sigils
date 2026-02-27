# ⚔️ Rogues of Might and Magic

A browser-based turn-based tactical combat game inspired by Heroes of Might and Magic 5.

## 🎮 How to Play

1. Open `index.html` in your browser
2. **Army Selection**: Spend 1000 points to buy starting units
3. **Unit Placement**: Place your units in the highlighted gold area (first 2 columns)
4. **Combat**: Click units to select, move (blue tiles), and attack enemies (red tiles)
5. **Victory**: Defeat all enemies to win and choose upgrades for the next battle

## 📋 Core Mechanics

### Turn Order
- Initiative-based: higher INIT = earlier turn
- Initiative bar shows upcoming 8 units in queue
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

After victory, there's a 50% chance to roll a **Legendary Power** in place of a regular buff. These can only be applied to units that don't already have them:

| Unit | Legendary Power | Effect |
|------|-----------------|--------|
| 🪓 Berserker | **Blood Frenzy** 🩸 | Strikes 2 times per attack |
| 🛡️ Paladin | **Divine Wrath** ⚡ | 3x3 cleave attack (100% main target, 50% to adjacent), +40 damage |
| 🎯 Ranger | **Ricochet Shot** 🏹 | Arrows bounce to nearby targets within 2 tiles (50% dmg), +40 damage |
| 🧙 Wizard | **Arcane Pierce** 🔮 | 20 range, shots pierce through all enemies in line |

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
| **Mana Flow** 🌊 | +2 mana regen per turn |
| **Arcane Power** 🔮 | +20% spell damage |
| **Efficient Casting** ⚡ | -20% mana cost |
| **Twin Cast** 🔄 | Cast 2 spells per round |
| **Expanded Mana Pool** 💧 | +30 max mana |

*Note: Having both Eternal Magic and Mass Enchantment means one buff spell permanently buffs your entire army!*

### Enemy Units (Point-based spawning)

Enemies scale each round: +250 points and +10% stats per battle.

| Unit | HP | DMG | MOV | INIT | Cost | Special |
|------|----|-----|-----|------|------|---------|
| 👹 Orc Warrior | 50 | 25 | 4 | 10 | 250 | Basic fighter |
| 👿 Orc Brute | 200 | 50 | 2 | 6 | 500 | Tank |
| 🥷 Orc Rogue | 60 | 35 | 6 | 16 | 500 | ⚡ Hit & Run |
| 👺 Goblin Stone-Thrower | 35 | 25 | 3 | 8 | 250 | Ranged attacker |

### Progression

- **New Units**: Available every 2 battles (rounds 2, 4, 6...)
- **Unit Recruitment Pool**: Knight, Archer, Wizard, Paladin, Ranger, Berserker, Cleric, Rogue, Sorcerer
- **Victory Rewards**: Pick 1 new unit (if available), 1 unit buff, 1 magic enhancement
- **Bloodlust**: Berserker's damage increases by +15 permanently for each kill (persists across battles)

### Unit Buffs (Victory Rewards)

- **Veteran Training** ⚔️: +10 Damage
- **Enhanced Toughness** 💪: +30 Max HP
- **Greater Agility** 💨: +1 Movement
- **Precision Strikes** 🎯: +5 Initiative & +5 Damage
- **Ranged Training** 🏹: Gain Ranged Attack (Range 3)
- **Legendary Status** ⭐: +20 HP, +5 DMG, +1 MOV

## 🎨 Visual Style

Grim Dark Fantasy aesthetic with aged gold (#A68966), dark wood (#2D241E), and parchment (#E3D5B8) colors.

## 🛠️ Tech Stack

- Phaser 3 for game engine
- ES6 Modules
- Vanilla JavaScript (no build step required)
