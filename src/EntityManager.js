// ============================================
// ENTITY MANAGER - Units, Unit Management, Turn System
// ============================================

import { CONFIG, SPELLS } from './GameConfig.js';

// Note: UNIT_TYPES is available globally from units.js (loaded as script tag)

// ============================================
// UNIT CLASS
// ============================================
export class Unit {
    constructor(type, gridX, gridY, scene = null) {
        const template = UNIT_TYPES[type];
        this.type = type;
        this.name = template.name;
        this.emoji = template.emoji;
        this.health = template.health;
        this.maxHealth = template.maxHealth;
        this.damage = template.damage;
        this.moveRange = template.moveRange;
        this.rangedRange = template.rangedRange || 0;
        this.initiative = template.initiative;
        this.isPlayer = template.isPlayer;
        this.gridX = gridX;
        this.gridY = gridY;
        this.hasMoved = false;
        this.hasAttacked = false;
        this.sprite = null;
        this.scene = scene;
        this.healthBar = null;
        this.isDead = false;
        
        // Boss properties
        this.isBoss = template.isBoss || false;
        this.bossSize = template.bossSize || 1; // 1 for normal, 2 for 2x2
        this.isRare = template.isRare || false;
        
        // For 2x2 units, store all occupied tile positions (relative to top-left)
        this.occupiedTiles = [];
        if (this.bossSize > 1) {
            for (let dy = 0; dy < this.bossSize; dy++) {
                for (let dx = 0; dx < this.bossSize; dx++) {
                    this.occupiedTiles.push({ x: dx, y: dy });
                }
            }
        }
        
        // Buff/debuff tracking
        this.hasteRounds = 0;
        this.shieldRounds = 0;
        this.shieldValue = 0;
        this.blessRounds = 0;
        this.blessValue = 1;
        this.iceSlowRounds = 0;
        this.regenerateRounds = 0;
        this.regenerateAmount = 0;
        
        // Ogre Chieftain slow debuff tracking
        this.slowDebuffRounds = 0;
        this.slowDebuffValue = 0;
        
        // Permanent stat modifiers from rewards
        this.statModifiers = null;
        
        // Berserker Bloodlust stacks (permanent damage increase from kills)
        this.bloodlustStacks = 0;
    }
    
    // Get all grid positions occupied by this unit (for 2x2 bosses)
    getOccupiedPositions() {
        if (this.bossSize === 1) {
            return [{ x: this.gridX, y: this.gridY }];
        }
        const positions = [];
        for (const offset of this.occupiedTiles) {
            positions.push({
                x: this.gridX + offset.x,
                y: this.gridY + offset.y
            });
        }
        return positions;
    }
    
    // Check if this unit occupies a specific tile
    occupiesTile(x, y) {
        if (this.bossSize === 1) {
            return this.gridX === x && this.gridY === y;
        }
        return x >= this.gridX && x < this.gridX + this.bossSize &&
               y >= this.gridY && y < this.gridY + this.bossSize;
    }

    canMove() {
        return !this.hasMoved && !this.isDead;
    }

    canAttack() {
        return !this.hasAttacked && !this.isDead;
    }

    takeDamage(amount, isRanged = false, attacker = null) {
        // Apply shield if active (including permanent with rounds = -1)
        if (this.shieldRounds > 0 || this.shieldRounds === -1) {
            amount = Math.floor(amount * (1 - this.shieldValue));
        }
        
        // Apply Knight/Paladin ranged damage reduction
        if (isRanged && (this.type === 'KNIGHT' || this.type === 'PALADIN')) {
            const template = UNIT_TYPES[this.type];
            if (template.passive) {
                // Handle both formats: effect/value and effects/values array
                if (template.passive.effect === 'rangedDefense') {
                    amount = Math.floor(amount * (1 - template.passive.value));
                } else if (template.passive.effects && template.passive.effects.includes('rangedDefense')) {
                    const idx = template.passive.effects.indexOf('rangedDefense');
                    amount = Math.floor(amount * (1 - template.passive.values[idx]));
                }
            }
        }
        
        // Apply Berserker Reckless passive (+50% damage taken)
        if (this.type === 'BERSERKER') {
            amount = Math.floor(amount * 1.5);
        }
        
        this.health = Math.max(0, this.health - amount);
        this.updateHealthBar();
        
        // Ogre Chieftain: Apply slow debuff on attack (if attacker is Ogre Chieftain)
        if (attacker && attacker.type === 'OGRE_CHIEFTAIN' && this.health > 0) {
            // Remove existing slow if any (doesn't stack)
            if (this.slowDebuffRounds > 0) {
                this.moveRange += this.slowDebuffValue;
            }
            // Apply new slow (0.5 movement reduction for 2 turns)
            this.slowDebuffValue = 0.5;
            this.moveRange = Math.max(1, this.moveRange - this.slowDebuffValue);
            this.slowDebuffRounds = 2;
            
            if (this.scene && this.scene.uiManager) {
                this.scene.uiManager.showBuffText(this, 'SLOWED!', '#8B4513');
            }
        }
        
        if (this.health <= 0) {
            // Track that this unit was killed by attacker (for Bloodlust)
            this.killedBy = attacker;
            this.die(this.scene);
        }
        return this.health > 0;
    }

    heal(amount) {
        this.health = Math.min(this.maxHealth, this.health + amount);
        this.updateHealthBar();
    }

    die(scene) {
        this.isDead = true;
        this.health = 0;
        
        // Bloodlust: If killed by Berserker, they get +15 permanent damage
        if (this.killedBy && this.killedBy.type === 'BERSERKER' && !this.killedBy.isDead) {
            this.killedBy.damage += 15;
            this.killedBy.bloodlustStacks += 1;
            if (scene && scene.uiManager) {
                scene.uiManager.showBuffText(this.killedBy, 'BLOODLUST!', '#9E4A4A');
                scene.uiManager.showFloatingText('+15 DMG', this.killedBy.sprite.x, this.killedBy.sprite.y - 80, '#9E4A4A');
            }
        }
        
        if (this.sprite) {
            if (this.sprite.setText) {
                // Text sprite (emoji mode)
                this.sprite.setText('💀');
                this.sprite.setAlpha(0.5);
            } else {
                // Image sprite - fade and add skull overlay
                this.sprite.setAlpha(0.3);
                this.sprite.setTint(0x666666);
                if (scene) {
                    scene.add.text(
                        this.sprite.x, this.sprite.y,
                        '💀',
                        { fontSize: '32px', align: 'center' }
                    ).setOrigin(0.5).setAlpha(0.7);
                }
            }
            this.sprite.setAngle(0);
            this.sprite.removeInteractive();
        }
        
        if (this.healthBar) {
            this.healthBar.clear();
        }
        
        // Clear unit info panel if this unit was selected
        if (scene && scene.selectedUnit === this) {
            const infoPanel = document.getElementById('unit-info');
            if (infoPanel) {
                infoPanel.innerHTML = '<em>Unit defeated</em>';
            }
        }
        
        // Check victory condition
        if (scene && scene.unitManager) {
            const enemies = scene.unitManager.getEnemyUnits();
            const players = scene.unitManager.getPlayerUnits();
            
            if (enemies.length === 0 && !scene.victoryShown) {
                scene.victoryShown = true;
                scene.showVictoryScreen(true);
            } else if (players.length === 0 && !scene.victoryShown) {
                scene.victoryShown = true;
                scene.showVictoryScreen(false);
            }
        }
    }

    resetTurn() {
        this.hasMoved = false;
        this.hasAttacked = false;
        
        // Store starting position for Rogue's hit-and-run
        if (this.type === 'ROGUE' || this.type === 'ORC_ROGUE' || this.type === 'LOOT_GOBLIN') {
            this.turnStartX = this.gridX;
            this.turnStartY = this.gridY;
        }
        
        // Ogre Chieftain: Regenerate 10% max HP at start of turn
        if (this.type === 'OGRE_CHIEFTAIN' && !this.isDead) {
            const regenAmount = Math.floor(this.maxHealth * 0.1);
            this.heal(regenAmount);
            if (this.scene && this.scene.uiManager) {
                this.scene.uiManager.showFloatingText(`+${regenAmount} HP`, this.sprite.x, this.sprite.y - 60, '#4CAF50');
            }
        }
        
        // Handle regenerate healing at start of turn (permanent buffs have rounds = -1)
        if (this.regenerateRounds > 0 || this.regenerateRounds === -1) {
            this.heal(this.regenerateAmount);
            if (this.regenerateRounds > 0) {
                this.regenerateRounds--;
                if (this.regenerateRounds === 0) {
                    this.regenerateAmount = 0;
                }
            }
        }
        
        // Decrement buff durations (skip if permanent with rounds = -1)
        if (this.hasteRounds > 0) {
            this.hasteRounds--;
            if (this.hasteRounds === 0) {
                this.moveRange = UNIT_TYPES[this.type].moveRange;
            }
        }
        
        if (this.shieldRounds > 0) {
            this.shieldRounds--;
            if (this.shieldRounds === 0) {
                this.shieldValue = 0;
            }
        }
        
        if (this.blessRounds > 0) {
            this.blessRounds--;
            if (this.blessRounds === 0) {
                this.blessValue = 1;
            }
        }
        
        if (this.iceSlowRounds > 0) {
            this.iceSlowRounds--;
            if (this.iceSlowRounds === 0) {
                this.moveRange = UNIT_TYPES[this.type].moveRange;
            }
        }
        
        // Ogre Chieftain slow debuff decay
        if (this.slowDebuffRounds > 0) {
            this.slowDebuffRounds--;
            if (this.slowDebuffRounds === 0) {
                this.moveRange += this.slowDebuffValue;
                this.slowDebuffValue = 0;
            }
        }
    }

    getDisplayStats() {
        const rangedInfo = this.rangedRange > 0 ? ` | RNG: ${this.rangedRange}` : '';
        
        let buffs = [];
        if (this.hasteRounds > 0) buffs.push(`Haste(${this.hasteRounds})`);
        else if (this.hasteRounds === -1) buffs.push(`Haste(∞)`);
        if (this.shieldRounds > 0) buffs.push(`Shield(${this.shieldRounds})`);
        else if (this.shieldRounds === -1) buffs.push(`Shield(∞)`);
        if (this.blessRounds > 0) buffs.push(`Bless(${this.blessRounds})`);
        else if (this.blessRounds === -1) buffs.push(`Bless(∞)`);
        if (this.regenerateRounds > 0) buffs.push(`Regen(${this.regenerateRounds})`);
        else if (this.regenerateRounds === -1) buffs.push(`Regen(∞)`);
        if (this.iceSlowRounds > 0) buffs.push(`IceSlow(${this.iceSlowRounds})`);
        if (this.slowDebuffRounds > 0) buffs.push(`Crippled(${this.slowDebuffRounds})`);
        
        const buffDisplay = buffs.length > 0 ? `<br>✨ ${buffs.join(', ')}` : '';
        
        const template = UNIT_TYPES[this.type];
        let passiveDisplay = '';
        
        // Handle multiple passives (e.g., Berserker)
        if (template.passives) {
            passiveDisplay = template.passives.map(p => `<br>⚔️ ${p.name}: ${p.description}`).join('');
        } else if (template.passive) {
            const passiveEmoji = this.type === 'KNIGHT' ? '🛡️' : '🔮';
            passiveDisplay = `<br>${passiveEmoji} Passive: ${template.passive.name}`;
        }
        
        const specialDisplay = template.special ? `<br>⚡ Special: Hit & Run` : '';
        
        // Boss indicator
        const bossDisplay = this.isBoss ? `<br>👑 BOSS (Size: ${this.bossSize}x${this.bossSize})` : '';
        
        return `${this.emoji} ${this.name}${bossDisplay}<br>
                HP: ${this.health}/${this.maxHealth}<br>
                DMG: ${Math.floor(this.damage * this.blessValue)} | MOV: ${this.moveRange}${rangedInfo}<br>
                INIT: ${this.initiative}${buffDisplay}${passiveDisplay}${specialDisplay}`;
    }

    updateHealthBar() {
        if (this.healthBar) {
            const percent = this.health / this.maxHealth;
            this.healthBar.clear();
            this.healthBar.fillStyle(0x000000);
            this.healthBar.fillRect(-20, -40, 40, 6);
            this.healthBar.fillStyle(percent > 0.5 ? 0x00ff00 : percent > 0.25 ? 0xffff00 : 0xff0000);
            this.healthBar.fillRect(-20, -40, 40 * percent, 6);
        }
    }
}

// ============================================
// UNIT MANAGER
// ============================================
export class UnitManager {
    constructor(scene) {
        this.scene = scene;
        this.units = [];
    }

    addUnit(type, gridX, gridY) {
        const template = UNIT_TYPES[type];
        const bossSize = template.bossSize || 1;
        
        // Check if placement is valid (especially for 2x2 units)
        if (!this.isValidPlacement(gridX, gridY, bossSize)) {
            return null;
        }
        
        const unit = new Unit(type, gridX, gridY, this.scene);
        
        // For 2x2 units, center the sprite over the 2x2 area
        let spriteX, spriteY;
        if (bossSize > 1) {
            // Center of the 2x2 block
            spriteX = gridX * CONFIG.TILE_SIZE + (bossSize * CONFIG.TILE_SIZE) / 2;
            spriteY = gridY * CONFIG.TILE_SIZE + (bossSize * CONFIG.TILE_SIZE) / 2;
        } else {
            spriteX = gridX * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
            spriteY = gridY * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
        }
        // For images: position bottom 5px above tile bottom (adjusted for boss size)
        const yBottom = (gridY + bossSize) * CONFIG.TILE_SIZE - 5;
        
        // Check if unit has an image and if it's loaded
        const imageKey = template.image ? type.toLowerCase() + '_img' : null;
        const hasImage = imageKey && this.scene.textures.exists(imageKey);
        
        if (hasImage) {
            unit.sprite = this.scene.add.image(spriteX, yBottom, imageKey);
            // Scale image to fit within tile size (64px) while preserving aspect ratio
            const texture = this.scene.textures.get(imageKey);
            const srcWidth = texture.getSourceImage().width;
            const srcHeight = texture.getSourceImage().height;
            // Target: fit within 64px tile, but allow up to 1.3x (83px) for tall units
            // For 2x2 bosses, allow larger sprites
            const maxSize = bossSize > 1 ? CONFIG.TILE_SIZE * bossSize * 1.2 : CONFIG.TILE_SIZE * 1.3;
            const scale = Math.min(maxSize / srcWidth, maxSize / srcHeight);
            unit.sprite.setScale(scale);
            unit.sprite.setOrigin(0.5, 1.0); // Bottom center so feet are on the tile
        } else {
            // For 2x2 bosses, use larger emoji
            const fontSize = bossSize > 1 ? '48px' : '36px';
            unit.sprite = this.scene.add.text(
                spriteX, spriteY,
                unit.emoji,
                { fontSize: fontSize, align: 'center' }
            ).setOrigin(0.5);
        }

        unit.healthBar = this.scene.add.graphics();
        unit.updateHealthBar();

        unit.sprite.setInteractive();
        unit.sprite.on('pointerdown', () => {
            // If a spell is selected, cast it at this unit's position
            if (this.scene.spellSystem.activeSpell) {
                this.scene.spellSystem.executeSpellAt(unit.gridX, unit.gridY);
                return;
            }
            
            // Check if current player unit can attack this unit
            const currentUnit = this.scene.turnSystem.currentUnit;
            if (currentUnit && currentUnit.isPlayer && currentUnit.canAttack() && 
                !unit.isPlayer && !unit.isDead) {
                // For 2x2 bosses, find distance to nearest occupied tile
                const positions = unit.getOccupiedPositions();
                let minDist = Infinity;
                for (const pos of positions) {
                    const dist = Math.abs(pos.x - currentUnit.gridX) + Math.abs(pos.y - currentUnit.gridY);
                    minDist = Math.min(minDist, dist);
                }
                
                // Ranged attack
                if (minDist > 1 && minDist <= currentUnit.rangedRange && currentUnit.rangedRange > 0) {
                    this.scene.performRangedAttack(currentUnit, unit);
                    return;
                }
                // Melee attack (adjacent to any part of the boss)
                if (minDist === 1) {
                    this.scene.performAttack(currentUnit, unit);
                    return;
                }
            }
            // Otherwise just select the unit
            this.scene.selectUnit(unit);
        });

        this.units.push(unit);
        return unit;
    }

    getUnitAt(x, y) {
        return this.units.find(u => u.occupiesTile(x, y) && !u.isDead && u.health > 0);
    }
    
    // Check if a position is valid for placing a unit (considers 2x2 units)
    isValidPlacement(x, y, bossSize = 1) {
        for (let dy = 0; dy < bossSize; dy++) {
            for (let dx = 0; dx < bossSize; dx++) {
                const checkX = x + dx;
                const checkY = y + dy;
                // Check bounds
                if (checkX < 0 || checkX >= CONFIG.GRID_WIDTH || 
                    checkY < 0 || checkY >= CONFIG.GRID_HEIGHT) {
                    return false;
                }
                // Check if tile is occupied
                if (this.getUnitAt(checkX, checkY)) {
                    return false;
                }
            }
        }
        return true;
    }

    getPlayerUnits() {
        return this.units.filter(u => u.isPlayer && !u.isDead && u.health > 0);
    }

    getEnemyUnits() {
        return this.units.filter(u => !u.isPlayer && !u.isDead && u.health > 0);
    }

    getAllAliveUnits() {
        return this.units.filter(u => !u.isDead && u.health > 0);
    }

    updateUnitPosition(unit, newX, newY) {
        unit.gridX = newX;
        unit.gridY = newY;
        const bossSize = unit.bossSize || 1;
        
        // Check if this unit uses an image (bottom-origin) or emoji (center-origin)
        const template = UNIT_TYPES[unit.type];
        const imageKey = template.image ? unit.type.toLowerCase() + '_img' : null;
        const hasImage = imageKey && this.scene.textures.exists(imageKey);
        
        if (hasImage) {
            // Images: position at bottom of tile block with 5px gap
            unit.sprite.setPosition(
                newX * CONFIG.TILE_SIZE + (bossSize * CONFIG.TILE_SIZE) / 2,
                (newY + bossSize) * CONFIG.TILE_SIZE - 5
            );
        } else {
            // Emoji: position at center of tile block
            unit.sprite.setPosition(
                newX * CONFIG.TILE_SIZE + (bossSize * CONFIG.TILE_SIZE) / 2,
                newY * CONFIG.TILE_SIZE + (bossSize * CONFIG.TILE_SIZE) / 2
            );
        }
        unit.updateHealthBar();
    }
}

// ============================================
// TURN SYSTEM
// ============================================
export class TurnSystem {
    constructor(scene) {
        this.scene = scene;
        this.turnQueue = [];
        this.currentUnit = null;
        this.roundNumber = 1;
    }

    initQueue() {
        this.updateQueue();
        this.nextTurn();
    }

    updateQueue() {
        const aliveUnits = this.scene.unitManager.getAllAliveUnits();
        this.turnQueue = aliveUnits.sort((a, b) => b.initiative - a.initiative);
    }

    nextTurn() {
        this.turnQueue = this.turnQueue.filter(u => !u.isDead);

        if (this.turnQueue.length === 0) {
            this.startNewRound();
            return;
        }

        this.currentUnit = this.turnQueue.shift();
        
        if (this.currentUnit.isDead) {
            this.nextTurn();
            return;
        }

        this.currentUnit.resetTurn();
        this.updateTurnDisplay();

        if (!this.currentUnit.isPlayer) {
            this.scene.time.delayedCall(500, () => this.executeAITurn());
        } else {
            this.scene.selectUnit(this.currentUnit);
            // Re-enable spellbook button for player's turn
            this.scene.spellSystem.resetSpellButton();
        }
    }

    startNewRound() {
        this.roundNumber++;
        this.scene.regenerateMana();
        this.scene.spellsCastThisRound = 0;
        // Reset spell button at start of new round
        this.scene.spellSystem.resetSpellButton();
        this.updateQueue();
        this.nextTurn();
    }

    executeAITurn() {
        if (!this.currentUnit || this.currentUnit.isDead) {
            this.nextTurn();
            return;
        }

        const unit = this.currentUnit;
        const playerUnits = this.scene.unitManager.getPlayerUnits();

        if (playerUnits.length === 0) return;

        // Orc Shaman King: Try to cast spells first
        if (unit.type === 'ORC_SHAMAN_KING') {
            this.executeShamanKingTurn(playerUnits);
            return;
        }

        // Find nearest player unit
        let nearest = null;
        let minDist = Infinity;

        for (const player of playerUnits) {
            const dist = this.getDistanceToUnit(unit, player);
            if (dist < minDist) {
                minDist = dist;
                nearest = player;
            }
        }

        // Check for ranged attack first (if within range and not adjacent)
        if (unit.rangedRange > 0 && minDist > 1 && minDist <= unit.rangedRange && unit.canAttack()) {
            this.scene.performRangedAttack(unit, nearest);
            
            // Loot Goblin hit-and-run
            if (unit.type === 'LOOT_GOBLIN' && unit.turnStartX !== undefined) {
                this.scene.time.delayedCall(600, () => {
                    if (!unit.isDead && unit.health > 0) {
                        this.scene.uiManager.showBuffText(unit, 'ESCAPED!', '#FFD700');
                        this.scene.unitManager.updateUnitPosition(unit, unit.turnStartX, unit.turnStartY);
                    }
                });
            }
            
            this.scene.time.delayedCall(800, () => this.nextTurn());
            return;
        }

        // If adjacent, melee attack
        if (minDist === 1) {
            this.scene.performAttack(unit, nearest);
            
            // Orc Rogue or Loot Goblin hit-and-run
            if ((unit.type === 'ORC_ROGUE' || unit.type === 'LOOT_GOBLIN') && unit.turnStartX !== undefined) {
                this.scene.time.delayedCall(600, () => {
                    if (!unit.isDead && unit.health > 0) {
                        const text = unit.type === 'LOOT_GOBLIN' ? 'ESCAPED!' : 'VANISH!';
                        const color = unit.type === 'LOOT_GOBLIN' ? '#FFD700' : '#6B5B8B';
                        this.scene.uiManager.showBuffText(unit, text, color);
                        this.scene.unitManager.updateUnitPosition(unit, unit.turnStartX, unit.turnStartY);
                    }
                });
            }
            
            this.scene.time.delayedCall(800, () => this.nextTurn());
            return;
        }

        // Move towards player - use all available movement
        console.log(`[AI Turn] ${unit.name} starting movement, range: ${unit.moveRange}, hasMoved: ${unit.hasMoved}`);
        let movesRemaining = unit.moveRange;
        let totalMoves = 0;
        
        while (movesRemaining > 0) {
            const currentDist = this.getDistanceToUnit(unit, nearest);
            console.log(`[AI Movement] Distance to target: ${currentDist}, moves remaining: ${movesRemaining}`);
            
            if (currentDist === 1) {
                console.log(`[AI Movement] Adjacent to target, stopping movement`);
                break;
            }
            
            const dx = Math.sign(nearest.gridX - unit.gridX);
            const dy = Math.sign(nearest.gridY - unit.gridY);
            
            let moved = false;
            
            // Try to move in both directions - prioritize the larger distance
            const xDist = Math.abs(nearest.gridX - unit.gridX);
            const yDist = Math.abs(nearest.gridY - unit.gridY);
            
            if (xDist >= yDist && dx !== 0) {
                // Try X first, then Y
                const newX = unit.gridX + dx;
                if (this.isValidMoveForUnit(unit, newX, unit.gridY)) {
                    this.scene.moveUnitAI(unit, newX, unit.gridY);
                    moved = true;
                } else if (dy !== 0) {
                    const newY = unit.gridY + dy;
                    if (this.isValidMoveForUnit(unit, unit.gridX, newY)) {
                        this.scene.moveUnitAI(unit, unit.gridX, newY);
                        moved = true;
                    }
                }
            } else if (dy !== 0) {
                // Try Y first, then X
                const newY = unit.gridY + dy;
                if (this.isValidMoveForUnit(unit, unit.gridX, newY)) {
                    this.scene.moveUnitAI(unit, unit.gridX, newY);
                    moved = true;
                } else if (dx !== 0) {
                    const newX = unit.gridX + dx;
                    if (this.isValidMoveForUnit(unit, newX, unit.gridY)) {
                        this.scene.moveUnitAI(unit, newX, unit.gridY);
                        moved = true;
                    }
                }
            }
            
            // If still not moved, try any valid direction as fallback
            if (!moved) {
                const directions = [
                    { dx: 1, dy: 0 }, { dx: -1, dy: 0 },
                    { dx: 0, dy: 1 }, { dx: 0, dy: -1 }
                ];
                // Shuffle directions for variety
                directions.sort(() => 0.5 - Math.random());
                
                for (const dir of directions) {
                    const newX = unit.gridX + dir.dx;
                    const newY = unit.gridY + dir.dy;
                    if (this.isValidMoveForUnit(unit, newX, newY)) {
                        // Only move if it gets us closer to target
                        const newDist = Math.abs(nearest.gridX - newX) + Math.abs(nearest.gridY - newY);
                        if (newDist < currentDist) {
                            this.scene.moveUnitAI(unit, newX, newY);
                            moved = true;
                            break;
                        }
                    }
                }
            }
            
            if (!moved) {
                console.log(`[AI Movement] Could not find valid move, stopping`);
                break;
            }
            
            totalMoves++;
            movesRemaining--;
            console.log(`[AI Movement] Successfully moved, total moves this turn: ${totalMoves}`);
        }
        
        // Mark unit as having moved after all movement is complete
        unit.hasMoved = true;
        console.log(`[AI Turn] ${unit.name} finished movement, moved ${totalMoves} cells`);

        // Check if can attack after moving (melee or ranged)
        const finalDist = this.getDistanceToUnit(unit, nearest);
        if (unit.canAttack()) {
            if (finalDist === 1) {
                // Melee attack
                this.scene.time.delayedCall(400, () => {
                    this.scene.performAttack(unit, nearest);
                    
                    // Orc Rogue or Loot Goblin hit-and-run
                    if ((unit.type === 'ORC_ROGUE' || unit.type === 'LOOT_GOBLIN') && unit.turnStartX !== undefined) {
                        this.scene.time.delayedCall(600, () => {
                            if (!unit.isDead && unit.health > 0) {
                                const text = unit.type === 'LOOT_GOBLIN' ? 'ESCAPED!' : 'VANISH!';
                                const color = unit.type === 'LOOT_GOBLIN' ? '#FFD700' : '#6B5B8B';
                                this.scene.uiManager.showBuffText(unit, text, color);
                                this.scene.unitManager.updateUnitPosition(unit, unit.turnStartX, unit.turnStartY);
                            }
                        });
                    }
                });
            } else if (unit.rangedRange > 0 && finalDist <= unit.rangedRange) {
                // Ranged attack after moving
                this.scene.time.delayedCall(400, () => {
                    this.scene.performRangedAttack(unit, nearest);
                    
                    // Loot Goblin hit-and-run
                    if (unit.type === 'LOOT_GOBLIN' && unit.turnStartX !== undefined) {
                        this.scene.time.delayedCall(600, () => {
                            if (!unit.isDead && unit.health > 0) {
                                this.scene.uiManager.showBuffText(unit, 'ESCAPED!', '#FFD700');
                                this.scene.unitManager.updateUnitPosition(unit, unit.turnStartX, unit.turnStartY);
                            }
                        });
                    }
                });
            }
        }

        this.scene.time.delayedCall(1200, () => this.nextTurn());
    }
    
    // Calculate distance from a unit to another unit (accounting for 2x2 bosses)
    getDistanceToUnit(fromUnit, toUnit) {
        // For normal 1x1 units, use simple Manhattan distance to center
        if (fromUnit.bossSize === 1 && toUnit.bossSize === 1) {
            return Math.abs(toUnit.gridX - fromUnit.gridX) + Math.abs(toUnit.gridY - fromUnit.gridY);
        }
        
        // For 2x2 units, find minimum distance between any occupied tiles
        const fromPositions = fromUnit.getOccupiedPositions();
        const toPositions = toUnit.getOccupiedPositions();
        
        let minDist = Infinity;
        for (const fromPos of fromPositions) {
            for (const toPos of toPositions) {
                const dist = Math.abs(toPos.x - fromPos.x) + Math.abs(toPos.y - fromPos.y);
                minDist = Math.min(minDist, dist);
            }
        }
        return minDist;
    }
    
    // Check if a move is valid for a unit (accounting for 2x2)
    isValidMoveForUnit(unit, x, y) {
        const bossSize = unit.bossSize || 1;
        for (let dy = 0; dy < bossSize; dy++) {
            for (let dx = 0; dx < bossSize; dx++) {
                const checkX = x + dx;
                const checkY = y + dy;
                if (!this.scene.gridSystem.isValidMoveAI(checkX, checkY)) {
                    return false;
                }
                // Check if occupied by another unit (not this unit)
                const otherUnit = this.scene.unitManager.getUnitAt(checkX, checkY);
                if (otherUnit && otherUnit !== unit) {
                    return false;
                }
            }
        }
        return true;
    }
    
    // Orc Shaman King AI: Cast spells and keep distance
    executeShamanKingTurn(playerUnits) {
        const unit = this.currentUnit;
        const scene = this.scene;
        
        // Find nearest player for reference
        let nearest = null;
        let minDist = Infinity;
        for (const player of playerUnits) {
            const dist = this.getDistanceToUnit(unit, player);
            if (dist < minDist) {
                minDist = dist;
                nearest = player;
            }
        }
        
        // Try to cast chain lightning first (if mana available and units clustered)
        const manaCost = Math.floor(SPELLS.chain_lightning.manaCost * scene.manaCostMultiplier);
        if (scene.mana >= manaCost && unit.canAttack()) {
            // Find best target for chain lightning (most enemies in chain range)
            let bestTarget = null;
            let maxChains = 0;
            
            for (const player of playerUnits) {
                const dist = this.getDistanceToUnit(unit, player);
                if (dist <= unit.rangedRange) {
                    // Count how many other enemies are within chain range (2 tiles)
                    let chainCount = 0;
                    for (const other of playerUnits) {
                        if (other !== player) {
                            const chainDist = Math.abs(other.gridX - player.gridX) + Math.abs(other.gridY - player.gridY);
                            if (chainDist <= 2) chainCount++;
                        }
                    }
                    if (chainCount > maxChains) {
                        maxChains = chainCount;
                        bestTarget = player;
                    }
                }
            }
            
            if (bestTarget && maxChains >= 1) {
                unit.hasAttacked = true;
                scene.uiManager.showBuffText(unit, 'CHAIN LIGHTNING!', '#9B59B6');
                scene.spendMana(manaCost);
                this.castChainLightning(unit, bestTarget);
                scene.time.delayedCall(1000, () => this.nextTurn());
                return;
            }
        }
        
        // Try fireball if chain lightning not optimal
        const fireballCost = Math.floor(SPELLS.fireball.manaCost * scene.manaCostMultiplier);
        if (scene.mana >= fireballCost && unit.canAttack()) {
            // Find best AoE target
            let bestTarget = null;
            let maxHits = 0;
            
            for (const player of playerUnits) {
                const dist = this.getDistanceToUnit(unit, player);
                if (dist <= unit.rangedRange) {
                    // Count enemies in 3x3 area around this target
                    let hits = 0;
                    for (const other of playerUnits) {
                        const aoeDist = Math.abs(other.gridX - player.gridX) + Math.abs(other.gridY - player.gridY);
                        if (aoeDist <= 1) hits++;
                    }
                    if (hits > maxHits) {
                        maxHits = hits;
                        bestTarget = player;
                    }
                }
            }
            
            if (bestTarget && maxHits >= 2) {
                unit.hasAttacked = true;
                scene.uiManager.showBuffText(unit, 'FIREBALL!', '#E74C3C');
                scene.spendMana(fireballCost);
                this.castFireball(unit, bestTarget);
                scene.time.delayedCall(1000, () => this.nextTurn());
                return;
            }
        }
        
        // Try ranged attack if available
        if (unit.rangedRange > 0 && minDist <= unit.rangedRange && unit.canAttack()) {
            scene.performRangedAttack(unit, nearest);
            scene.time.delayedCall(800, () => this.nextTurn());
            return;
        }
        
        // Move to keep distance - prefer staying at ranged range
        if (unit.canMove()) {
            let bestX = unit.gridX;
            let bestY = unit.gridY;
            let bestScore = -Infinity;
            
            // Check all possible positions within move range using BFS
            const visited = new Set([`${unit.gridX},${unit.gridY}`]);
            const queue = [{ x: unit.gridX, y: unit.gridY, moves: 0 }];
            
            while (queue.length > 0) {
                const { x, y, moves } = queue.shift();
                
                // Calculate score for this position
                const distToNearest = Math.abs(nearest.gridX - x) + Math.abs(nearest.gridY - y);
                // Prefer positions at ranged range distance, away from melee
                let score = 0;
                if (distToNearest >= 3 && distToNearest <= unit.rangedRange) {
                    score = 100; // Ideal range
                } else if (distToNearest > unit.rangedRange) {
                    score = 50; // Too far but safe
                } else if (distToNearest > 1) {
                    score = 10; // Suboptimal but not in melee
                } else {
                    score = -100; // In melee range, bad
                }
                
                if (score > bestScore) {
                    bestScore = score;
                    bestX = x;
                    bestY = y;
                }
                
                // Explore neighbors if we have moves remaining
                if (moves < unit.moveRange) {
                    const neighbors = [
                        { x: x + 1, y }, { x: x - 1, y },
                        { x, y: y + 1 }, { x, y: y - 1 }
                    ];
                    
                    for (const n of neighbors) {
                        const key = `${n.x},${n.y}`;
                        if (!visited.has(key) && this.isValidMoveForUnit(unit, n.x, n.y)) {
                            visited.add(key);
                            queue.push({ x: n.x, y: n.y, moves: moves + 1 });
                        }
                    }
                }
            }
            
            // Move towards best position
            if (bestX !== unit.gridX || bestY !== unit.gridY) {
                // Use simple path towards best position (Shaman King moves once per turn)
                const dx = Math.sign(bestX - unit.gridX);
                const dy = Math.sign(bestY - unit.gridY);
                
                console.log(`[Shaman King] Moving towards optimal position (${bestX},${bestY})`);
                if (dx !== 0 && this.isValidMoveForUnit(unit, unit.gridX + dx, unit.gridY)) {
                    scene.moveUnitAI(unit, unit.gridX + dx, unit.gridY);
                    unit.hasMoved = true;
                } else if (dy !== 0 && this.isValidMoveForUnit(unit, unit.gridX, unit.gridY + dy)) {
                    scene.moveUnitAI(unit, unit.gridX, unit.gridY + dy);
                    unit.hasMoved = true;
                }
            } else {
                unit.hasMoved = true;
            }
        }
        
        // Try ranged attack again after moving
        const newDist = this.getDistanceToUnit(unit, nearest);
        if (unit.canAttack() && newDist <= unit.rangedRange) {
            scene.time.delayedCall(400, () => {
                scene.performRangedAttack(unit, nearest);
            });
        }
        
        scene.time.delayedCall(1200, () => this.nextTurn());
    }
    
    // Cast chain lightning from a boss unit
    castChainLightning(caster, target) {
        const scene = this.scene;
        const power = Math.floor(SPELLS.chain_lightning.power * scene.spellPowerMultiplier);
        const chains = SPELLS.chain_lightning.chains;
        
        // Visual effect
        scene.uiManager.showBuffText(target, 'ZAP!', '#9B59B6');
        
        // Hit primary target
        target.takeDamage(power, true, caster);
        scene.uiManager.showDamageText(target, power);
        
        // Chain to nearby enemies
        const playerUnits = scene.unitManager.getPlayerUnits().filter(u => u !== target && !u.isDead);
        let chained = 0;
        
        for (const player of playerUnits) {
            if (chained >= chains) break;
            const dist = Math.abs(player.gridX - target.gridX) + Math.abs(player.gridY - target.gridY);
            if (dist <= 2) {
                scene.time.delayedCall(200 * (chained + 1), () => {
                    scene.uiManager.showBuffText(player, 'CHAIN!', '#9B59B6');
                    player.takeDamage(power, true, caster);
                    scene.uiManager.showDamageText(player, power);
                });
                chained++;
            }
        }
    }
    
    // Cast fireball from a boss unit
    castFireball(caster, target) {
        const scene = this.scene;
        const power = Math.floor(SPELLS.fireball.power * scene.spellPowerMultiplier);
        
        // Hit all enemies in 3x3 area
        const playerUnits = scene.unitManager.getPlayerUnits();
        
        for (const player of playerUnits) {
            const dist = Math.abs(player.gridX - target.gridX) + Math.abs(player.gridY - target.gridY);
            if (dist <= 1) {
                player.takeDamage(power, true, caster);
                scene.uiManager.showDamageText(player, power);
            }
        }
    }

    updateTurnDisplay() {
        const turnText = document.getElementById('current-turn');
        if (this.currentUnit && turnText) {
            const side = this.currentUnit.isPlayer ? 'Player' : 'AI';
            turnText.innerHTML = `${side}: ${this.currentUnit.emoji} ${this.currentUnit.name}`;
            turnText.style.color = this.currentUnit.isPlayer ? '#4a7cd9' : '#d94a4a';
        }
        
        // Update initiative bar (show up to 8 units)
        this.updateInitiativeBar();
        
        // Auto-highlight ranged targets if applicable
        if (this.currentUnit && this.currentUnit.isPlayer && this.currentUnit.rangedRange > 0 && this.currentUnit.canAttack()) {
            this.scene.gridSystem.highlightRangedAttackRange(this.currentUnit);
        }
    }

    updateInitiativeBar() {
        const queueEl = document.getElementById('initiative-queue');
        if (!queueEl) return;
        
        // Build queue: current unit + next up to 7 units
        const displayQueue = [this.currentUnit, ...this.turnQueue.slice(0, 7)];
        
        let html = '';
        displayQueue.forEach((unit, index) => {
            if (!unit || unit.isDead) return;
            const isActive = index === 0;
            const activeClass = isActive ? 'active' : '';
            html += `
                <div class="initiative-unit ${activeClass}">
                    <div class="unit-emoji">${unit.emoji}</div>
                </div>
            `;
        });
        
        queueEl.innerHTML = html;
    }
}
