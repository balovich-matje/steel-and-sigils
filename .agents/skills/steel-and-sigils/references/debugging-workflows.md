# Debugging Workflows

## Bug Categories & Investigation Paths

### 1. Spell Not Casting

**Symptoms**: Clicking does nothing, mana not spent, no effect

**Checklist**:
1. Is `activeSpell` set? (Check SpellSystem.js)
2. Does the click handler reach `executeSpellAt()`?
3. Is the click being intercepted by sprite or modal check?
4. Is `spellbook-modal` hidden? (Early return if open)
5. Is targetType matching the clicked target?

**Common Fix**: Ensure unit sprite clicks call `executeSpellAt(unit.gridX, unit.gridY)` when spell active

### 2. Buffs Disappearing

**Symptoms**: Buffs gone after battle/round

**Checklist**:
1. Is buff saved in `nextBattle()` playerUnits mapping?
2. Is buff restored in `create()` from `unitData.buffs`?
3. Is `resetTurn()` checking `> 0` vs `=== -1` correctly?
4. Is the buff value being set (not just rounds)?

**Common Fix**: Add buff restoration logic in SceneManager.js `create()` method

### 3. Unit Positioning Issues

**Symptoms**: Units floating, too high, too low, wrong after move

**Checklist**:
1. Is `updateUnitPosition()` using correct Y calculation?
2. Images: `(gridY + 1) * TILE_SIZE - 5` (bottom with gap)
3. Check if unit has image vs emoji in positioning logic
4. Is `setOrigin(0.5, 1.0)` set for images?

**Common Fix**: Ensure `updateUnitPosition()` mirrors `addUnit()` positioning logic

### 4. Click Interference

**Symptoms**: Spell book clicks affect game, or game clicks ignored

**Checklist**:
1. Is spellbook modal check in BOTH `InputHandler.handleTileClick()` AND `SceneManager pointerdown`?
2. Is placement mode check in place?
3. Are sprite clicks blocked when spell active?

**Common Fix**: Add `spellbook-modal` visibility check at start of click handlers

### 5. AI Behavior Issues

**Symptoms**: Enemies not attacking, not using ranged, moving wrong

**Checklist**:
1. Is `executeAITurn()` checking `rangedRange` before AND after move?
2. Is `canAttack()` being checked?
3. Is `nextTurn()` being called appropriately?
4. Are delays (`time.delayedCall`) long enough for animations?

**Common Fix**: Ensure ranged attack check happens before movement decision

### 6. Persistence Issues

**Symptoms**: Stats/buffs lost between battles

**Checklist**:
1. Is data saved in `nextBattle()` playerUnits mapping?
2. Is data restored in `create()`?
3. Is the property being copied (not referenced)?
4. Are magicBuffs being passed to scene restart?

**Common Fix**: Add property to both save (nextBattle) and restore (create) locations

## Console Debugging

```javascript
// Add temporarily to check state
console.log('Active spell:', this.spellSystem.activeSpell);
console.log('Current unit:', this.turnSystem.currentUnit?.name);
console.log('Buffs:', unit.hasteRounds, unit.shieldRounds);
console.log('Mana:', this.mana, '/', this.maxMana);
```

## Visual Debugging

```javascript
// Highlight a tile temporarily
const graphics = this.add.graphics();
graphics.fillStyle(0xff0000, 0.5);
graphics.fillRect(x * 64, y * 64, 64, 64);
this.time.delayedCall(1000, () => graphics.destroy());
```

## Test Scenarios

Always test these scenarios after changes:
1. **Fresh game start** - No prior state
2. **After victory** - State persistence
3. **Multiple battles** - Accumulated buffs/stats
4. **Keyboard shortcuts** - S, E, Esc
5. **Spell targeting** - On units, empty tiles, through spell book
