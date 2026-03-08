# ⚔️ Steel and Sigils v0.96

A browser-based tactical combat game inspired by Heroes of Might and Magic 5. Built with Phaser 3, vanilla JavaScript, and CSS. No build tools required - runs directly in your browser.

**Play:** Open `index.html` in a modern browser

## 🎮 Features

- **Turn-based tactical combat** on a hexless grid
- **9 playable unit types** with distinct roles and abilities
- **3 enemy factions** with unique bosses
- **Spell system** with 12 spells and mana management
- **Buff progression:** Common → Epic → Legendary → Mythic tiers
- **3 battle maps:** Whispering Woods, Ruins of a Castle, Mountain Pass
- **Permadeath roguelike** - defeat means starting over
- **Save/load system** - continue your run later

## 🛡️ Player Units

### Core Units

| Unit | Role | HP | DMG | Special |
|------|------|-----|-----|---------|
| 🛡️ **Knight** | Tank | 100 | 15 | High defense, reliable |
| 🏹 **Archer** | Ranged | 70 | 12 | Ranged attacks, precision |
| 🔮 **Wizard** | Mage | 60 | 10 | Spell casting, low HP |

### Advanced Units

| Unit | Role | HP | DMG | Special |
|------|------|-----|-----|---------|
| 🪓 **Berserker** | Melee DPS | 90 | 18 | High damage, Blood Frenzy |
| 🛡️ **Paladin** | Tank/Support | 110 | 14 | Divine Wrath cleave, healing |
| 🎯 **Ranger** | Ranged DPS | 75 | 14 | Ricochet shots, mobility |
| 🗡️ **Rogue** | Assassin | 65 | 16 | Backstab (4x from behind), Vanish |
| ✨ **Cleric** | Healer | 70 | 8 | Mass healing, support spells |
| 🔮 **Sorcerer** | Mage | 55 | 12 | Arcane Pierce (infinite range) |

### Legendary Perks

Units can acquire legendary perks at the end of battle waves:

| Unit | Legendary Perk | Effect |
|------|---------------|--------|
| Berserker | **Blood Frenzy** | Attack twice per turn |
| Paladin | **Divine Wrath** | 3×3 cleave attack (+40 damage) |
| Ranger | **Ricochet Shot** | Arrows bounce to nearby targets |
| Sorcerer | **Arcane Pierce** | Infinite range, pierces all enemies |
| Rogue | **Shadow Strike** | 4× damage when attacking from behind |

### Mythic Perks

Mythic perks can only be acquired by units that already have their legendary perk:

| Unit | Mythic Perk | Effect |
|------|-------------|--------|
| Paladin | **Divine Retribution** | Reflects melee damage to attackers |
| Sorcerer | **Arcane Focus** | Consecutive same spells increase damage 50% |

## 👹 Enemy Factions

### Greenskin Horde
- Orc Warrior, Orc Brute, Orc Rogue, Goblin Stone Thrower
- **Boss:** War Chieftain Gormak (2×2, chain lightning, flees from melee)

### Dungeon Dwellers
- Animated Armor, Skeleton Archer, Skeleton Soldier, Lost Spirit
- **Boss:** Sentinel of the Depths (2×2, powerful melee)
- **Boss:** Summoner Lich (summons skeletons, 2×2)

### Old God Worshippers (Cultists)
- Cultist Acolyte, Cultist Neophyte, Gibbering Horror, Flesh-Warped Stalker
- **Boss:** Octoth Hroarath (2×2, eldritch powers)
- **Boss:** **The Silence** (2×2, silences all spell casting during fight)
- **Boss:** **Void Herald** (2×2, mass slow + 38 damage Voidball)

## 🗺️ Battle Maps

| Map | Size | Features |
|-----|------|----------|
| **Whispering Woods** | 10×8 | Forest terrain, open field |
| **Ruins of a Castle** | 15×15 | Stone walls border 5×5 center area, 2-cell gaps for passage |
| **Mountain Pass** | 19×19 | Rock formations create chokepoint, enemies spawn on right side |

## ✨ Spells

### Destructo (Damage)
- **Fireball** - 3×3 explosion, 40 damage
- **Lightning Bolt** - Single target, 50 damage
- **Chain Lightning** - Chains to nearby enemies
- **Meteor** - Large 5×5 explosion, 60 damage

### Restoratio (Healing)
- **Healing Light** - Single target, 40 heal
- **Mass Heal** - All allies, 25 heal each

### Benedictio (Buffs)
- **Bless** - +50% damage for 3 turns
- **Shield** - +10 defense for 3 turns
- **Haste** - +2 movement for 3 turns
- **Regenerate** - Heal 10 HP per turn for 5 turns

### Utilitas (Utility)
- **Ice Storm** - Slow enemies in area

## 🎯 How to Play

1. **Choose your army** - Select units within the point limit
2. **Pick a map** - Each offers different tactical challenges
3. **Deploy units** - Place them in the player spawn area
4. **Combat** - Take turns moving and attacking
5. **Spells** - Use mana to cast powerful spells
6. **Victory rewards** - Choose buffs to strengthen your army
7. **Survive** - Face increasingly difficult waves

### Controls
- **Click** unit to select
- **Click** highlighted tile to move
- **Click** enemy to attack (if in range)
- **Click** spell, then target to cast
- **End Turn** button when done

## 🏆 Victory Conditions

- Defeat all enemies in the wave
- Survive 5 waves to face the boss
- Defeat the boss to win the battle

## 💀 Defeat

If all your units die, the run ends. Learn from each attempt and try different strategies!

## 🎨 Visual Style

Grim Dark Fantasy aesthetic with aged gold (#A68966), dark wood (#2D241E), and parchment (#E3D5B8) colors.

All unit sprites are pixel art (64×64). Units face left-to-right and are flipped programmatically for enemies.

## 🛠️ Tech Stack

- **Phaser 3** - Game engine
- **Vanilla JavaScript** (ES6 modules) - No build step
- **CSS** - Styling
- **Pollinations.ai** - Sprite generation (zimage model)

## 📄 License

See LICENSE file

---

*Steel and Sigils - Tactical combat in your browser*
