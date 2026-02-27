# Adding New Content

## Adding a Unit

### 1. Define in units.js
```javascript
UNIT_TYPE = {
    name: 'Unit Name',
    emoji: '🎯',
    image: 'images/player/unitname.png', // or images/enemy/
    health: 100,
    maxHealth: 100,
    damage: 25,
    moveRange: 4,
    initiative: 12,
    isPlayer: true, // false for enemies
    cost: 500,
    // Optional:
    rangedRange: 6,
    passive: {
        name: 'Passive Name',
        description: 'What it does',
        effect: 'effectKey',
        value: 0.5
    }
}
```

### 2. Add to recruitment pool (if player unit)
In SceneManager.js `generateRewardChoices()`:
```javascript
const recruitableUnits = ['KNIGHT', 'ARCHER', 'WIZARD', 'NEW_UNIT', ...];
```

### 3. Add to enemy spawn pool (if enemy)
In SceneManager.js `createEnemyUnits()`:
```javascript
const enemyTypes = ['ORC_WARRIOR', 'NEW_ENEMY', ...];
```

## Adding a Spell

### 1. Define in GameConfig.js
```javascript
SPELLS = {
    NEW_SPELL: {
        name: 'Spell Name',
        icon: '🔥',
        manaCost: 30,
        targetType: 'enemy', // 'tile', 'ally', 'ally_then_tile'
        effect: 'newEffect', // matches handler name
        power: 50,
        duration: 3 // for buffs
    }
}
```

### 2. Add handler in SpellSystem.js
```javascript
executeNewEffect(spell, unitOrX, y) {
    // For unit-targeted:
    this.executeUnitSpell(spell, unit);
    
    // For tile-targeted:
    this.executeTileSpell(spell, x, y);
}
```

### 3. Connect in executeSpellAt
```javascript
case 'newEffect':
    this.executeNewEffect(spell, ...);
    break;
```

### 4. Add visual effect (optional)
```javascript
createNewEffect(gridX, gridY) {
    const x = gridX * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
    const y = gridY * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
    // Add tweens, particles, etc.
}
```

## Adding a Magic Buff (Victory Reward)

### 1. Add to magicOptions
In SceneManager.js `generateRewardChoices()`:
```javascript
{
    id: 'buff_id',
    name: 'Buff Name',
    icon: '⭐',
    desc: 'What it does',
    buffType: 'buffType', // for magicBuffs array
    buffValue: value,
    effect: () => { this.property += value; },
    unique: true, // if shouldn't stack
    maxStacks: 4   // if capped
}
```

### 2. Handle in confirmRewards
Usually automatic, but if special stacking logic:
```javascript
if (existingBuff && magicEffect.buffType === 'yourType') {
    existingBuff.value = Math.min(max, existingBuff.value + magicEffect.buffValue);
}
```

### 3. Handle in create (restoration)
```javascript
if (buff.type === 'yourType') this.property += buff.value;
```

### 4. Add display in UIHandler.js
```javascript
else if (buff.type === 'yourType') valueText = `+${buff.value} description`;
```

## Adding a Legendary Buff

### 1. Add to tryGenerateLegendaryBuff
```javascript
if (playerUnits.some(u => u.type === 'UNIT_TYPE') && !hasBuff('UNIT_TYPE', 'buffProperty')) {
    availableLegendaryBuffs.push({
        id: 'legendary_id',
        name: 'Buff Name',
        icon: '⚡',
        desc: 'Unit: Effect description',
        unitType: 'UNIT_TYPE',
        effect: (unit) => {
            unit.hasNewBuff = true;
            unit.statModifiers = unit.statModifiers || {};
            unit.statModifiers.hasNewBuff = true;
        }
    });
}
```

### 2. Implement effect in attack handling
In SceneManager.js `performAttack()` or `performRangedAttack()`:
```javascript
if (attacker.hasNewBuff) {
    this.performNewEffect(attacker, defender);
}
```

### 3. Add persistence check
In `showLegendaryTargetSelection()` filter and `tryGenerateLegendaryBuff()`:
```javascript
if (hasBuff('UNIT_TYPE', 'hasNewBuff')) return; // Already has it
```

### 4. Add restoration in create()
```javascript
if (unitData.statModifiers.hasNewBuff) unit.hasNewBuff = true;
```

## Adding Enemy AI Behavior

Modify `TurnSystem.executeAITurn()`:

```javascript
// After finding nearest player
if (unit.type === 'NEW_ENEMY_TYPE') {
    // Custom behavior
    // e.g., prioritizes ranged, flees when low health, etc.
}
```

## Visual Style Guidelines

### Colors
- Background: `#1A1C1E` (near black)
- Panel: `#2D241E` (dark wood)
- Accent: `#A68966` (aged gold)
- Text: `#E3D5B8` (parchment)
- Secondary: `#8B7355` (muted brown)

### Fonts
- Use system fonts, no custom font loading
- Button text: 14-16px
- Headers: 18-24px
- Stats: 11-12px

### Icons
- Use emoji for simplicity: ⚔️ 🛡️ 🏹 ✝️ 🗡️ 🎯 🪓 🔮
- Consistent sizing: 32px in cards, 40px in selection
