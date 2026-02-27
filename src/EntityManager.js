// ============================================
// ENTITY MANAGER - Units, Unit Management, Turn System
// ============================================

import { CONFIG } from './GameConfig.js';

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
        
        // Buff/debuff tracking
        this.hasteRounds = 0;
        this.shieldRounds = 0;
        this.shieldValue = 0;
        this.blessRounds = 0;
        this.blessValue = 1;
        this.iceSlowRounds = 0;
        this.regenerateRounds = 0;
        this.regenerateAmount = 0;
        
        // Permanent stat modifiers from rewards
        this.statModifiers = null;
        
        // Berserker Bloodlust stacks (permanent damage increase from kills)
        this.bloodlustStacks = 0;
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
        if (this.type === 'ROGUE' || this.type === 'ORC_ROGUE') {
            this.turnStartX = this.gridX;
            this.turnStartY = this.gridY;
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
        if (this.iceSlowRounds > 0) buffs.push(`Slow(${this.iceSlowRounds})`);
        
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
        
        return `${this.emoji} ${this.name}<br>
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
        const unit = new Unit(type, gridX, gridY, this.scene);
        
        const x = gridX * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
        const y = gridY * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
        // For images: position bottom 5px above tile bottom
        const yBottom = (gridY + 1) * CONFIG.TILE_SIZE - 5;
        
        // Check if unit has an image and if it's loaded
        const template = UNIT_TYPES[type];
        const imageKey = template.image ? type.toLowerCase() + '_img' : null;
        const hasImage = imageKey && this.scene.textures.exists(imageKey);
        
        if (hasImage) {
            unit.sprite = this.scene.add.image(x, yBottom, imageKey);
            // Scale image to fit within tile size (64px) while preserving aspect ratio
            const texture = this.scene.textures.get(imageKey);
            const srcWidth = texture.getSourceImage().width;
            const srcHeight = texture.getSourceImage().height;
            // Target: fit within 64px tile, but allow up to 1.3x (83px) for tall units
            const maxSize = CONFIG.TILE_SIZE * 1.3; // 83px max
            const scale = Math.min(maxSize / srcWidth, maxSize / srcHeight);
            unit.sprite.setScale(scale);
            unit.sprite.setOrigin(0.5, 1.0); // Bottom center so feet are on the tile
        } else {
            unit.sprite = this.scene.add.text(
                x, y,
                unit.emoji,
                { fontSize: '36px', align: 'center' }
            ).setOrigin(0.5);
        }

        unit.healthBar = this.scene.add.graphics();
        unit.updateHealthBar();

        unit.sprite.setInteractive();
        unit.sprite.on('pointerdown', () => {
            // Check if current player unit can attack this unit
            const currentUnit = this.scene.turnSystem.currentUnit;
            if (currentUnit && currentUnit.isPlayer && currentUnit.canAttack() && 
                !unit.isPlayer && !unit.isDead) {
                const dist = Math.abs(unit.gridX - currentUnit.gridX) + 
                             Math.abs(unit.gridY - currentUnit.gridY);
                
                // Ranged attack
                if (dist > 1 && dist <= currentUnit.rangedRange && currentUnit.rangedRange > 0) {
                    this.scene.performRangedAttack(currentUnit, unit);
                    return;
                }
                // Melee attack
                if (dist === 1) {
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
        return this.units.find(u => u.gridX === x && u.gridY === y && !u.isDead && u.health > 0);
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
        // Check if this unit uses an image (bottom-origin) or emoji (center-origin)
        const template = UNIT_TYPES[unit.type];
        const imageKey = template.image ? unit.type.toLowerCase() + '_img' : null;
        const hasImage = imageKey && this.scene.textures.exists(imageKey);
        
        if (hasImage) {
            // Images: position at bottom of tile with 5px gap
            unit.sprite.setPosition(
                newX * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2,
                (newY + 1) * CONFIG.TILE_SIZE - 5
            );
        } else {
            // Emoji: position at center of tile
            unit.sprite.setPosition(
                newX * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2,
                newY * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2
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

        // Find nearest player unit
        let nearest = null;
        let minDist = Infinity;

        for (const player of playerUnits) {
            const dist = Math.abs(player.gridX - unit.gridX) + Math.abs(player.gridY - unit.gridY);
            if (dist < minDist) {
                minDist = dist;
                nearest = player;
            }
        }

        // If adjacent, attack
        if (minDist === 1) {
            this.scene.performAttack(unit, nearest);
            
            // Orc Rogue hit-and-run
            if (unit.type === 'ORC_ROGUE' && unit.turnStartX !== undefined) {
                this.scene.time.delayedCall(600, () => {
                    if (!unit.isDead && unit.health > 0) {
                        this.scene.showBuffText(unit, 'VANISH!', '#6B5B8B');
                        this.scene.unitManager.updateUnitPosition(unit, unit.turnStartX, unit.turnStartY);
                    }
                });
            }
            
            this.scene.time.delayedCall(800, () => this.nextTurn());
            return;
        }

        // Move towards player - use all available movement
        let movesRemaining = unit.moveRange;
        while (movesRemaining > 0 && unit.canMove()) {
            const currentDist = Math.abs(nearest.gridX - unit.gridX) + Math.abs(nearest.gridY - unit.gridY);
            if (currentDist === 1) break;
            
            const dx = Math.sign(nearest.gridX - unit.gridX);
            const dy = Math.sign(nearest.gridY - unit.gridY);
            
            let moved = false;
            
            if (dx !== 0) {
                const newX = unit.gridX + dx;
                if (this.scene.gridSystem.isValidMoveAI(newX, unit.gridY)) {
                    this.scene.moveUnit(unit, newX, unit.gridY);
                    moved = true;
                }
            }
            
            if (!moved && dy !== 0) {
                const newY = unit.gridY + dy;
                if (this.scene.gridSystem.isValidMoveAI(unit.gridX, newY)) {
                    this.scene.moveUnit(unit, unit.gridX, newY);
                    moved = true;
                }
            }
            
            if (!moved) break;
            movesRemaining--;
        }

        // Check if can attack after moving
        const finalDist = Math.abs(nearest.gridX - unit.gridX) + Math.abs(nearest.gridY - unit.gridY);
        if (finalDist === 1 && unit.canAttack()) {
            this.scene.time.delayedCall(400, () => {
                this.scene.performAttack(unit, nearest);
                
                // Orc Rogue hit-and-run
                if (unit.type === 'ORC_ROGUE' && unit.turnStartX !== undefined) {
                    this.scene.time.delayedCall(600, () => {
                        if (!unit.isDead && unit.health > 0) {
                            this.scene.showBuffText(unit, 'VANISH!', '#6B5B8B');
                            this.scene.unitManager.updateUnitPosition(unit, unit.turnStartX, unit.turnStartY);
                        }
                    });
                }
            });
        }

        this.scene.time.delayedCall(1200, () => this.nextTurn());
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
