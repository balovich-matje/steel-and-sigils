// ============================================
// BASE BATTLE SCENE - Shared logic for PVE and PVP
// ============================================

import { GridSystem } from './InputHandler.js';
import { UnitManager } from './EntityManager.js';
import { SpellSystem } from './SpellSystem.js';
import { UIManager } from './UIHandler.js';
import { CONFIG } from './GameConfig.js';

/**
 * BaseBattleScene - Abstract base class for all battle modes.
 * Contains shared logic: grid, units, combat, spells, UI, input.
 * Subclasses must implement: nextTurn(), isPlayerTurn(), syncAction()
 */
export class BaseBattleScene extends Phaser.Scene {
    constructor(config) {
        super(config);

        // Systems (initialized in create)
        this.gridSystem = null;
        this.unitManager = null;
        this.spellSystem = null;
        this.uiManager = null;

        // Game state
        this.units = [];
        this.selectedUnit = null;
        this.battleEnded = false;
        this.mana = 100;
        this.maxMana = 100;
        this.manaRegen = 10;

        // Position tracking
        this.unitPositions = new Map();
    }

    // ============================================
    // ABSTRACT METHODS - Must be implemented by subclasses
    // ============================================

    /**
     * Called when it's time to advance to the next turn
     * PVE: Use TurnSystem
     * PVP: Wait for opponent or allow player to end turn
     */
    nextTurn() {
        throw new Error('nextTurn() must be implemented by subclass');
    }

    /**
     * Check if it's currently the local player's turn
     * PVE: Check TurnSystem.currentUnit.isPlayer
     * PVP: Check currentTurn === playerNumber
     */
    isPlayerTurn() {
        throw new Error('isPlayerTurn() must be implemented by subclass');
    }

    /**
     * Sync an action to the opponent (if applicable)
     * PVE: No-op (local only)
     * PVP: Send via WebRTC
     */
    syncAction(action) {
        // Default: no-op for PVE
    }

    // ============================================
    // COMMON SETUP
    // ============================================

    preload() {
        // Load player unit images
        const playerUnits = ['KNIGHT', 'ARCHER', 'WIZARD', 'PALADIN', 'RANGER',
            'BERSERKER', 'CLERIC', 'ROGUE', 'SORCERER'];
        for (const unitType of playerUnits) {
            const template = UNIT_TYPES[unitType];
            if (template && template.image) {
                const imageKey = unitType.toLowerCase() + '_img';
                this.load.image(imageKey, template.image);
            }
        }

        // Load enemy unit images
        const enemyUnits = ['ORC_WARRIOR', 'ORC_BRUTE', 'ORC_ROGUE', 'GOBLIN_STONE_THROWER',
            'OGRE_CHIEFTAIN', 'ORC_SHAMAN_KING', 'LOOT_GOBLIN'];
        for (const unitType of enemyUnits) {
            const template = UNIT_TYPES[unitType];
            if (template && template.image) {
                const imageKey = unitType.toLowerCase() + '_img';
                this.load.image(imageKey, template.image);
            }
        }
    }

    create(data) {
        window.gameScene = this;

        // Initialize systems
        this.gridSystem = new GridSystem(this);
        this.unitManager = new UnitManager(this);
        this.spellSystem = new SpellSystem(this);
        this.uiManager = new UIManager(this);

        this.gridSystem.create();

        // Initialize subclass-specific units
        this.createUnits(data);

        // Input handling
        this.input.on('pointerdown', (p) => this._onPointerDown(p));

        // Start the battle
        this.startBattle();
    }

    /**
     * Create units - implemented by subclasses
     * PVE: Create player units from placedUnits, spawn enemies
     * PVP: Create units from myArmy and opponentArmy
     */
    createUnits(data) {
        throw new Error('createUnits() must be implemented by subclass');
    }

    /**
     * Start the battle - implemented by subclasses
     * PVE: Initialize TurnSystem
     * PVP: Show turn indicator, wait for both players ready
     */
    startBattle() {
        throw new Error('startBattle() must be implemented by subclass');
    }

    // ============================================
    // UNIT MANAGEMENT
    // ============================================

    _spawnUnit(type, x, y, owner) {
        const unit = this.unitManager.addUnit(type, x, y);
        if (!unit) return null;

        unit.owner = owner;
        unit.alive = true;

        if (unit.sprite) {
            // Clear existing listeners and add our own
            unit.sprite.removeAllListeners('pointerdown');
            unit.sprite.removeAllListeners('pointerover');
            unit.sprite.setInteractive();

            // Click to select (only if it's the local player's unit and their turn)
            unit.sprite.on('pointerdown', () => this._onUnitClick(unit));

            // Hover to show stats (works for all units)
            unit.sprite.on('pointerover', () => {
                if (this.uiManager) {
                    this.uiManager.updateUnitInfo(unit);
                }
            });
        }

        this.units.push(unit);
        this.unitPositions.set(`${x},${y}`, unit);
        return unit;
    }

    _getUnitAt(x, y) {
        return this.unitPositions.get(`${x},${y}`);
    }

    _removeUnitFromPosition(x, y) {
        this.unitPositions.delete(`${x},${y}`);
    }

    _setUnitPosition(unit, x, y) {
        this.unitPositions.set(`${x},${y}`, unit);
    }

    // ============================================
    // INPUT HANDLING
    // ============================================

    _onPointerDown(pointer) {
        if (this.battleEnded) return;
        if (!this.isPlayerTurn()) return;

        const x = Math.floor(pointer.x / CONFIG.TILE_SIZE);
        const y = Math.floor(pointer.y / CONFIG.TILE_SIZE);

        if (x < 0 || x >= CONFIG.GRID_WIDTH || y < 0 || y >= CONFIG.GRID_HEIGHT) return;

        // Handle spell casting
        if (this.spellSystem.activeSpell) {
            this._castSpell(x, y);
            return;
        }

        // Handle unit abilities
        if (this.activeUnitAbility) {
            this.executeUnitAbilityAt(x, y);
            return;
        }

        // Handle unit movement
        if (this.selectedUnit && this.selectedUnit.canMove()) {
            if (this.gridSystem.isValidMove(x, y)) {
                this._tryMove(x, y);
                return;
            }
        }

        // Handle attack
        const clickedUnit = this._getUnitAt(x, y);
        if (clickedUnit && !clickedUnit.isDead && this.selectedUnit) {
            this._tryAttack(clickedUnit);
        }
    }

    _onUnitClick(unit) {
        // Show stats on click too
        if (this.uiManager) {
            this.uiManager.updateUnitInfo(unit);
        }

        // Only allow selecting own units on player's turn
        if (!this.isPlayerTurn()) return;
        if (unit.isDead) return;
        if (unit.owner !== this.getPlayerOwner()) return;

        this.selectUnit(unit);
    }

    /**
     * Get the owner value for the local player
     * PVE: true (isPlayer)
     * PVP: playerNumber (1 or 2)
     */
    getPlayerOwner() {
        throw new Error('getPlayerOwner() must be implemented by subclass');
    }

    // ============================================
    // SELECTION & MOVEMENT
    // ============================================

    selectUnit(unit) {
        this.deselectUnit();
        this.selectedUnit = unit;

        if (unit.sprite) unit.sprite.setTint(0xFFFF00);
        this.gridSystem.highlightValidMoves(unit);
    }

    deselectUnit() {
        if (this.selectedUnit?.sprite) {
            this.selectedUnit.sprite.clearTint();
        }
        this.selectedUnit = null;
        this.gridSystem.clearHighlights();
    }

    /**
     * Called by GridSystem when a valid move is clicked
     */
    moveUnit(unit, tx, ty) {
        if (unit !== this.selectedUnit) return;
        this._tryMove(tx, ty);
    }

    _tryMove(tx, ty) {
        const unit = this.selectedUnit;
        if (!unit) return;

        const dist = Math.abs(tx - unit.gridX) + Math.abs(ty - unit.gridY);
        if (dist > unit.moveRange || this._getUnitAt(tx, ty)) return;

        const fromX = unit.gridX, fromY = unit.gridY;

        // Update position tracking
        this._removeUnitFromPosition(fromX, fromY);
        this.unitManager.updateUnitPosition(unit, tx, ty);
        this._setUnitPosition(unit, tx, ty);

        unit.hasMoved = true;

        // Sync for PVP
        this.syncAction({ type: 'move', fromX, fromY, toX: tx, toY: ty });

        this.deselectUnit();

        // Re-highlight if unit can still act
        if (unit.canAttack()) {
            this.selectUnit(unit);
        }
    }

    // ============================================
    // COMBAT
    // ============================================

    _tryAttack(target) {
        const attacker = this.selectedUnit;
        if (!attacker || !attacker.canAttack()) return;
        if (target.isDead) return;

        const dist = this.getDistanceBetweenUnits(attacker, target);

        // Check for ranged attack
        if (attacker.rangedRange > 0 && dist > 1 && dist <= attacker.rangedRange) {
            this.performRangedAttack(attacker, target);
            return;
        }

        // Melee attack
        if (dist === 1) {
            this.performAttack(attacker, target);
        }
    }

    getDistanceBetweenUnits(unitA, unitB) {
        const sizeA = unitA.bossSize || 1;
        const sizeB = unitB.bossSize || 1;

        if (sizeA === 1 && sizeB === 1) {
            return Math.abs(unitB.gridX - unitA.gridX) + Math.abs(unitB.gridY - unitA.gridY);
        }

        // For multi-tile units, find minimum distance
        let minDist = Infinity;
        for (let dyA = 0; dyA < sizeA; dyA++) {
            for (let dxA = 0; dxA < sizeA; dxA++) {
                for (let dyB = 0; dyB < sizeB; dyB++) {
                    for (let dxB = 0; dxB < sizeB; dxB++) {
                        const dist = Math.abs((unitB.gridX + dxB) - (unitA.gridX + dxA)) +
                            Math.abs((unitB.gridY + dyB) - (unitA.gridY + dyA));
                        minDist = Math.min(minDist, dist);
                    }
                }
            }
        }
        return minDist;
    }

    performAttack(attacker, defender) {
        if (!attacker.canAttack()) return;

        attacker.hasAttacked = true;

        // Visual lunge
        const originalX = attacker.sprite.x;
        const originalY = attacker.sprite.y;
        const targetX = defender.sprite.x;
        const targetY = defender.sprite.y;

        const lungeX = originalX + (targetX - originalX) * 0.3;
        const lungeY = originalY + (targetY - originalY) * 0.3;

        this.tweens.add({
            targets: attacker.sprite,
            x: lungeX,
            y: lungeY,
            duration: 100,
            yoyo: true,
            onComplete: () => {
                // Deal damage
                let damage = attacker.damage;

                // Apply damage reductions
                if (defender.shieldRounds > 0) {
                    damage = Math.floor(damage * 0.5);
                }

                defender.health -= damage;
                this.uiManager.showDamageText(defender, damage);
                defender.updateHealthBar();

                // Apply on-hit effects
                this.applyOnHitEffects(attacker, defender);

                // Check for kill
                if (defender.health <= 0) {
                    this.killUnit(defender);
                }

                this.checkWinCondition();
            }
        });

        // Sync for PVP
        this.syncAction({
            type: 'attack',
            attackerX: attacker.gridX,
            attackerY: attacker.gridY,
            targetX: defender.gridX,
            targetY: defender.gridY,
            damage: attacker.damage
        });

        this.deselectUnit();
    }

    performRangedAttack(attacker, defender) {
        if (!attacker.canAttack()) return;

        attacker.hasAttacked = true;

        // Create projectile
        const projectile = this.add.text(
            attacker.sprite.x, attacker.sprite.y,
            attacker.rangedAttackType === 'magic' ? '✨' : '🏹',
            { fontSize: '24px' }
        ).setOrigin(0.5);

        this.tweens.add({
            targets: projectile,
            x: defender.sprite.x,
            y: defender.sprite.y,
            duration: 300,
            onComplete: () => {
                projectile.destroy();

                // Deal damage
                let damage = attacker.damage;
                if (defender.shieldRounds > 0) {
                    damage = Math.floor(damage * 0.5);
                }

                defender.health -= damage;
                this.uiManager.showDamageText(defender, damage);
                defender.updateHealthBar();

                this.applyOnHitEffects(attacker, defender);

                if (defender.health <= 0) {
                    this.killUnit(defender);
                }

                this.checkWinCondition();
            }
        });

        // Sync for PVP
        this.syncAction({
            type: 'ranged_attack',
            attackerX: attacker.gridX,
            attackerY: attacker.gridY,
            targetX: defender.gridX,
            targetY: defender.gridY,
            damage: attacker.damage
        });

        this.deselectUnit();
    }

    applyOnHitEffects(attacker, defender) {
        // Ogre Chieftain: Slow enemies
        if (attacker.type === 'OGRE_CHIEFTAIN' && defender.isPlayer) {
            defender.moveRange = Math.max(1, defender.moveRange - 0.5);
            this.uiManager.showBuffText(defender, '-0.5 MOV', '#ff6600');
        }
    }

    killUnit(unit) {
        unit.isDead = true;

        this.tweens.add({
            targets: unit.sprite,
            alpha: 0,
            duration: 500,
            onComplete: () => unit.sprite.setVisible(false)
        });

        this._removeUnitFromPosition(unit.gridX, unit.gridY);

        // Show defeat message
        this.uiManager.showFloatingText(
            `${unit.emoji} ${unit.name} defeated!`,
            unit.sprite.x, unit.sprite.y - 50, '#ff4444'
        );
    }

    // ============================================
    // SPELLS
    // ============================================

    _castSpell(x, y) {
        const spell = this.spellSystem.activeSpell;
        const caster = this.selectedUnit;

        if (!spell || !caster) return;
        if (this.mana < spell.manaCost) return;

        // Execute spell
        this.spellSystem.executeSpellAt(x, y);
        this.mana -= spell.manaCost;
        this.uiManager.updateManaDisplay();

        // Sync for PVP
        this.syncAction({
            type: 'spell',
            spell: spell.name,
            casterX: caster.gridX,
            casterY: caster.gridY,
            targetX: x,
            targetY: y
        });
    }

    // ============================================
    // WIN/LOSS
    // ============================================

    checkWinCondition() {
        const playerUnits = this.units.filter(u => u.owner === this.getPlayerOwner() && !u.isDead);
        const enemyUnits = this.units.filter(u => u.owner !== this.getPlayerOwner() && !u.isDead);

        if (enemyUnits.length === 0) {
            this.endBattle(true);
        } else if (playerUnits.length === 0) {
            this.endBattle(false);
        }
    }

    endBattle(victory) {
        this.battleEnded = true;

        setTimeout(() => {
            this.showVictoryScreen(victory);
        }, 1000);
    }

    /**
     * Show victory/defeat screen - implemented by subclass
     */
    showVictoryScreen(victory) {
        throw new Error('showVictoryScreen() must be implemented by subclass');
    }

    // ============================================
    // UTILITY
    // ============================================

    regenerateMana() {
        const wizardCount = this.units.filter(u =>
            u.type === 'WIZARD' && !u.isDead && u.owner === this.getPlayerOwner()
        ).length;

        const totalRegen = this.manaRegen + wizardCount;

        if (this.mana < this.maxMana) {
            this.mana = Math.min(this.maxMana, this.mana + totalRegen);
            this.uiManager.updateManaDisplay();
        }
    }
}
