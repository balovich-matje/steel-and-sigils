# ⚔️ Steel and Sigils v1.09

A browser-based tactical combat game inspired by Heroes of Might and Magic. Built with Phaser 3, vanilla JavaScript (ES6 modules), and CSS. No build tools required - runs directly in your browser.

**Play:** Open `index.html` in a modern browser

---

## 🎮 Features

- **Turn-based tactical combat** on a hexless grid with initiative-based turn order
- **9 playable unit types** with distinct roles, passives, and abilities
- **3 enemy factions** with unique units and boss encounters
- **12 powerful spells** organized into 4 magical schools
- **Progression system** with unit buffs and magic enhancements between battles
- **3 battle maps** with different sizes, terrain, and tactical challenges
- **Boss waves every 5th battle** featuring massive 2×2 bosses with unique mechanics
- **Permadeath roguelike** - defeat means starting over
- **Legendary & Mythic perks** that units can acquire through progression
- **Mobile-friendly** layout with collapsible side panels and touch support

---

## 🛡️ Player Units

### Common Units

| Unit | Emoji | HP | DMG | MOV | INIT | Cost | Special |
|------|-------|-----|-----|-----|------|------|---------|
| **Knight** | ⚔️ | 100 | 25 | 4 | 12 | 200 | Heavy Armor: -50% damage from ranged attacks |
| **Archer** | 🏹 | 60 | 35 | 2 | 15 | 300 | Ranged: 6 tile range |

### Specialist Units

| Unit | Emoji | HP | DMG | MOV | INIT | Cost | Special |
|------|-------|-----|-----|-----|------|------|---------|
| **Wizard** | 🧙 | 40 | 45 | 2 | 10 | 500 | Ranged: 4 tiles. Arcane Channeling: +2 mana regen per Wizard |
| **Cleric** | ✝️ | 80 | 15 | 2 | 10 | 500 | Ranged: 4 tiles. Blessed Touch: Can cast Heal once per turn. Army-wide +50% healing |
| **Rogue** | 🗡️ | 55 | 40 | 8 | 16 | 500 | Shadow Step: Returns to starting position after attack |

### Legendary Units

| Unit | Emoji | HP | DMG | MOV | INIT | Cost | Special |
|------|-------|-----|-----|-----|------|------|---------|
| **Paladin** | 🛡️ | 150 | 50 | 4 | 9 | 800 | Divine Protection: -50% ranged damage, +50% healing received |
| **Ranger** | 🎯 | 70 | 50 | 2 | 13 | 800 | Eagle Eye: 10 tile range (longest in game) |
| **Berserker** | 🪓 | 90 | 50 | 4 | 11 | 800 | Bloodlust: Killing blow permanently increases damage by 15. Reckless: +50% damage taken, movement immune to all reduction |
| **Sorcerer** | 🔮 | 50 | 55 | 2 | 14 | 800 | Ranged: 4 tiles. Arcane Mastery: +50% spell damage. Active: Cast Fireball |

---

## 👹 Enemy Factions

### Greenskin Horde

| Unit | Emoji | HP | DMG | MOV | INIT | Cost | Special |
|------|-------|-----|-----|-----|------|------|---------|
| Orc Warrior | 👹 | 50 | 25 | 4 | 10 | 250 | Basic melee fighter |
| Orc Brute | 🐗 | 200 | 50 | 2 | 6 | 500 | Tanky slow fighter |
| Orc Rogue | 🥷 | 60 | 35 | 6 | 16 | 500 | Hit and Run tactic |
| Goblin Stone Thrower | 🪨 | 40 | 15 | 3 | 12 | 200 | Ranged: 4 tiles |

### Dungeon Dwellers

| Unit | Emoji | HP | DMG | MOV | INIT | Cost | Special |
|------|-------|-----|-----|-----|------|------|---------|
| Animated Armor | 🤖 | 220 | 45 | 2 | 5 | 550 | Slow but durable |
| Skeleton Archer | 💀🏹 | 50 | 30 | 2 | 14 | 300 | Ranged: 6 tiles |
| Skeleton Soldier | 💀⚔️ | 90 | 25 | 4 | 11 | 250 | Shielded: -50% ranged damage |
| Lost Spirit | 👻 | 70 | 50 | 6 | 15 | 800 | Ethereal: -75% physical damage. Arcane Weakness: +50% spell damage |

### Old God Worshippers (Cultists)

| Unit | Emoji | HP | DMG | MOV | INIT | Cost | Special |
|------|-------|-----|-----|-----|------|------|---------|
| Cultist Acolyte | 👤 | 40 | 20 | 4 | 10 | 150 | Basic cultist fighter |
| Cultist Neophyte | 🤫 | 35 | 15 | 3 | 9 | 200 | Ranged: 4 tiles |
| Gibbering Horror | 🐙 | 80 | 40 | 3 | 11 | 500 | Ranged: 5 tiles |
| Flesh-warped Stalker | 🦎 | 70 | 40 | 7 | 16 | 550 | Fast melee attacker |

---

## 👑 Boss Units

Bosses appear every 5th battle and occupy 2×2 cells on the grid.

### Greenskin Horde Bosses

| Boss | Emoji | HP | DMG | MOV | INIT | Special |
|------|-------|-----|-----|-----|------|---------|
| **Ogre Chieftain** | 👑 | 500 | 80 | 3 | 8 | Brutal Regeneration: Heals 10% max HP per turn. Attacks slow enemies by 0.5 MOV for 2 turns |
| **Orc Shaman King** | 🔮 | 350 | 40 | 4 | 14 | Arcane Mastery: Casts Chain Lightning and Fireball spells. Keeps distance from enemies |
| **Loot Goblin** | 💰 | 150 | 50 | 8 | 18 | Hit and Run: Returns to starting position after attacking. Drops legendary loot on death |

### Dungeon Dwellers Bosses

| Boss | Emoji | HP | DMG | MOV | INIT | Special |
|------|-------|-----|-----|-----|------|---------|
| **Summoner Lich** | 💀👑 | 300 | 10 | 1 | 7 | Summon Undead: Summons 1 undead ally per turn (2 on first turn) |

### Old God Worshippers Bosses

| Boss | Emoji | HP | DMG | MOV | INIT | Special |
|------|-------|-----|-----|-----|------|---------|
| **Octo'th Hroa'rath** | 🦑 | 250 | 75 | 4 | 10 | Otherworldly Aura: Deals 15 damage to adjacent units at start of turn. Tendril Pull: Pulls distant enemies into melee range |
| **The Silence** | 🤐 | 400 | 55 | 3 | 8 | Aura of Silence: All spellcasting is disabled during the fight. Melee only! |
| **Void Herald** | 🌑 | 320 | 35 | 4 | 12 | Void Slow: Reduces all enemy movement by 3 at fight start (min 1). Voidball: Casts 38 damage voidball each turn |

---

## 🗺️ Battle Maps

| Map | Size | Points | Features |
|-----|------|--------|----------|
| **Whispering Woods** | 10×8 | 1000 | Grass terrain, open field, no obstacles |
| **Mountain Pass** | 13×11 | 1300 | Dirt terrain, rock formations create chokepoints, enemies spawn on right flank |
| **Ruins of a Castle** | 15×15 | 1700 | Dirt terrain, stone walls border 5×5 center area with 2-cell gaps for passage |

---

## ✨ Spells

Spells are organized into 4 magical schools and cost mana to cast. Mana regenerates each turn (base +1, +2 per Wizard).

### 🔥 Destructo (Damage)

| Spell | Icon | Mana | Effect |
|-------|------|------|--------|
| **Fireball** | 🔥 | 25 | 3×3 area, 30 damage to all enemies |
| **Lightning Bolt** | ⚡ | 15 | Single target, 45 damage |
| **Ice Storm** | ❄️ | 30 | 3×3 area, 20 damage and reduces enemy movement by 1 for 2 turns |
| **Meteor** | ☄️ | 50 | Devastating 5×5 area, 60 damage |
| **Chain Lightning** | ⚡ | 40 | Hits target and chains to 2 nearby enemies for 35 damage each |

### 💚 Restoratio (Healing)

| Spell | Icon | Mana | Effect |
|-------|------|------|--------|
| **Heal** | 💚 | 20 | Restores 40 HP to a friendly unit |
| **Cure Wounds** | 💗 | 35 | Powerful healing that restores 80 HP |
| **Regenerate** | 🌿 | 25 | Heals 15 HP at the start of each turn for 4 turns |

### 🛡️ Benedictio (Buffs)

| Spell | Icon | Mana | Effect |
|-------|------|------|--------|
| **Haste** | 💨 | 15 | Increases movement range by 2 for 3 turns |
| **Shield** | 🛡️ | 15 | Reduces damage taken by 50% for 2 turns |
| **Bless** | ✨ | 25 | Increases damage dealt by 50% for 3 turns |

### ✨ Utilitas (Utility)

| Spell | Icon | Mana | Effect |
|-------|------|------|--------|
| **Teleport** | 🌀 | 30 | Instantly moves a unit to any empty tile within range 8 |

---

## 🎯 How to Play

### Setup Phase
1. **Choose your battlefield** - Select from 3 maps with different tactical challenges
2. **Build your army** - Spend points to recruit units (200-800 cost each)
3. **Deploy units** - Place them in the player spawn area before battle begins

### Combat Phase
1. **Turn Order** - Units act based on initiative (higher = earlier)
2. **Movement** - Click highlighted tiles to move (blue = valid moves)
3. **Attacks** - Click enemies to attack if in range (red = valid attacks)
4. **Spells** - Open Spell Book (S key) to cast powerful spells using mana
5. **Abilities** - Use unit-specific abilities (U key) like Cleric's Heal
6. **End Turn** - Press E or click End Turn when done

### Victory & Progression
- Defeat all enemies to win the battle
- Choose rewards: new units, buffs for existing units, or magic enhancements
- Survive increasingly difficult waves
- Face a boss every 5th battle
- If all your units die, the run ends

---

## 🎮 Controls

| Key | Action |
|-----|--------|
| **Click** | Select unit, move, attack, or cast spells |
| **S** | Open Spell Book |
| **E** | End Turn |
| **U** | Use Unit Ability |
| **ESC** | Cancel spell/ability or close Spell Book |
| **Arrow Keys** | Navigate Spell Book pages |
| **Hotkeys** | Press first letter of spell name to cast (when Spell Book is open) |

---

## 🏆 Legendary & Mythic Perks

Units can acquire powerful perks through progression:

### Legendary Perks

| Unit | Perk | Effect |
|------|------|--------|
| Berserker | **Double Strike** | Attack twice per turn |
| Paladin | **Cleave** | 3×3 area damage on attack (+50% splash) |
| Ranger | **Ricochet** | Arrows bounce to nearby targets within 2 tiles |
| Sorcerer | **Piercing** | Ranged attacks pierce through all enemies in line |
| Rogue | **Backstab** | 4× damage when attacking from behind |

### Mythic Perks

| Unit | Perk | Effect |
|------|------|--------|
| Paladin | **Divine Retribution** | Reflects melee damage to attackers (2× damage) |
| Sorcerer | **Arcane Focus** | Consecutive same spells increase damage by 50% per stack |
| Ranger | **Silver Arrows** | Bonus damage equal to 25% of target max HP (5% vs bosses), applies on all ricochet bounces |
| Berserker | **Warlust** | Each kill grants +5 permanent Max HP (in addition to Bloodlust's +15 DMG) |

---

## 🎨 Visual Style

Grim Dark Fantasy aesthetic with:
- **Aged Gold** (#A68966) - Primary accent color
- **Dark Wood** (#2D241E) - Background tones
- **Parchment** (#E3D5B8) - Text color
- **Pixel art sprites** (64×64) for all units
- Units face left-to-right and flip programmatically for enemies

---

## 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| **Phaser 3** | Game engine and rendering |
| **Vanilla JavaScript (ES6 modules)** | Game logic - no build step required |
| **CSS3** | UI styling and animations |
| **HTML5** | Page structure |

### File Structure
```
steel-and-sigils-main/
├── index.html              # Main HTML file
├── style.css               # Stylesheet
├── src/
│   ├── main.js            # Entry point
│   ├── units.js           # Unit definitions
│   ├── GameConfig.js      # Spells, stages, config
│   ├── SceneManager.js    # Main game logic
│   ├── SpellSystem.js     # Spell casting
│   ├── EntityManager.js   # Units & turn system
│   ├── InputHandler.js    # Grid & input
│   └── UIHandler.js       # UI management
└── images/                # Sprites and assets
```

---

## 📝 License

See LICENSE file

---

*Steel and Sigils - Tactical combat in your browser*
