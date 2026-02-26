# ⚔️ Rogues of Might and Magic

A browser-based turn-based tactical combat game inspired by Heroes of Might and Magic.

## 🎮 How to Play

1. Open `index.html` in your browser
2. **Army Selection**: Spend 1000 points to buy starting units (Knight, Archer, Wizard)
3. **Unit Placement**: Place your units on the left 3 columns of the grid
4. **Combat**: Click units to select, move (blue tiles), and attack enemies (red tiles)
5. **Victory**: Defeat all enemies to win and choose upgrades for the next battle

## 📋 Core Mechanics

### Turn Order
- Initiative-based: higher INIT = earlier turn
- Each unit can move and attack once per turn

### Player Units

| Unit | HP | DMG | MOV | RNG | INIT | Cost | Passive |
|------|----|-----|-----|-----|------|------|---------|
| Knight | 100 | 25 | **4** | - | 10 | 200 | 🛡️ -50% ranged damage |
| Archer | 60 | 35 | 2 | **6** | 12 | 300 | - |
| Wizard | 40 | 45 | 2 | 4 | 15 | 400 | 🔮 +1 mana regen per Wizard |

### Enemy Units (Point-based spawning)

| Unit | HP | DMG | MOV | INIT | Cost | Special |
|------|----|-----|-----|------|------|---------|
| Orc Warrior | 50 | 25 | 4 | 10 | 250 | Basic fighter |
| Orc Brute | 200 | 50 | 2 | 6 | 500 | Tank |
| Orc Rogue | 60 | 35 | 6 | 16 | 500 | ⚡ Hit & Run |

### Spell System
- **Mana**: 100 max, +1 base regen per turn (+1 per Wizard)
- **12 Spells**: Fireball, Lightning Bolt, Heal, Haste, Shield, Ice Storm, Meteor, Bless, Cure Wounds, Teleport, Chain Lightning, Regenerate

### Progression
- Each battle enemies get +250 points and +10% stats
- Victory rewards: pick 1 new unit, 1 unit buff, 1 magic enhancement
