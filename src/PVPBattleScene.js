// ============================================
// PVP BATTLE SCENE - Final PVP battle between two players
// ============================================

import { CONFIG, SPELLS } from './GameConfig.js';
import { GridSystem } from './InputHandler.js';
import { UnitManager, TurnSystem } from './EntityManager.js';
import { SpellSystem } from './SpellSystem.js';
import { UIManager } from './UIHandler.js';

/**
 * PVPBattleScene handles the final player-vs-player battle.
 * Each player controls only their own units.
 * Random side assignment (left or right).
 * Synchronized via Firebase.
 */
export class PVPBattleScene extends Phaser.Scene {
    constructor() {
        super({ key: 'PVPBattleScene' });
        
        // Systems
        this.gridSystem = null;
        this.unitManager = null;
        this.turnSystem = null;
        this.spellSystem = null;
        this.uiManager = null;
        
        // Mana system
        this.mana = 100;
        this.maxMana = 100;
        this.manaRegen = 1;
        this.manaCostMultiplier = 1;
        this.spellPowerMultiplier = 1;
        this.spellsPerRound = 1;
        this.spellsCastThisRound = 0;
        this.permanentBuffs = false;
        this.armyBuffs = false;
        
        // PVP context
        this.pvpManager = null;
        this.playerSide = null;  // 'left' or 'right'
        this.myArmy = [];
        this.opponentArmy = [];
        this.onComplete = null;
        
        // Game state
        this.selectedUnit = null;
        this.victoryShown = false;
        this.magicBuffs = [];
    }

    init(data) {
        this.pvpManager = data.pvpManager;
        this.playerSide = data.playerSide;
        this.myArmy = data.myArmy || [];
        this.opponentArmy = data.opponentArmy || [];
        this.onComplete = data.onComplete;
        this.magicBuffs = data.myMagicBuffs || [];
        
        // Apply magic buffs
        this._applyMagicBuffs();
    }

    create() {
        // Initialize systems
        this.gridSystem = new GridSystem(this);
        this.unitManager = new UnitManager(this);
        this.turnSystem = new TurnSystem(this);
        this.spellSystem = new SpellSystem(this);
        this.uiManager = new UIManager(this);

        this.gridSystem.create();
        
        // Create units with proper sides
        this._createPVPUnits();
        
        // Set up input for spell targeting
        this.input.on('pointerdown', (pointer) => {
            const spellbookModal = document.getElementById('spellbook-modal');
            if (spellbookModal && !spellbookModal.classList.contains('hidden')) {
                return;
            }
            if (this.spellSystem.activeSpell) {
                const gridX = Math.floor(pointer.x / CONFIG.TILE_SIZE);
                const gridY = Math.floor(pointer.y / CONFIG.TILE_SIZE);
                if (gridX >= 0 && gridX < CONFIG.GRID_WIDTH && gridY >= 0 && gridY < CONFIG.GRID_HEIGHT) {
                    this.spellSystem.executeSpellAt(gridX, gridY);
                }
            }
        });
        
        // Update UI
        this.uiManager.updateManaDisplay();
        
        // Start game
        this.turnSystem.initQueue();
        
        window.gameScene = this;
        
        // Keyboard controls
        this.input.keyboard.on('keydown-S', () => this.openSpellBook());
        this.input.keyboard.on('keydown-E', () => this.endTurn());
        this.input.keyboard.on('keydown-ESC', () => this.cancelSpell());
        
        // Listen for opponent actions
        this.pvpManager.onSpectatorData = (data) => {
            this._handleOpponentAction(data);
        };
    }

    // ============================================
    // UNIT CREATION
    // ============================================

    _createPVPUnits() {
        // Create my units
        for (const unitData of this.myArmy) {
            const unit = this.unitManager.addUnit(unitData.type, unitData.x, unitData.y);
            if (unit) {
                this._restoreUnitStats(unit, unitData);
                // Override isPlayer based on side
                unit.isPlayer = (this.playerSide === 'left');
            }
        }
        
        // Create opponent units (mirrored positions)
        for (const unitData of this.opponentArmy) {
            const mirrorX = (CONFIG.GRID_WIDTH - 1) - unitData.x;
            const unit = this.unitManager.addUnit(unitData.type, mirrorX, unitData.y);
            if (unit) {
                this._restoreUnitStats(unit, unitData);
                unit.isPlayer = (this.playerSide !== 'left');
            }
        }
    }

    _restoreUnitStats(unit, unitData) {
        if (unitData.health !== undefined) {
            unit.health = Math.min(unitData.health, unit.maxHealth);
        }
        
        if (unitData.statModifiers) {
            unit.statModifiers = unitData.statModifiers;
            if (unitData.statModifiers.damage) unit.damage += unitData.statModifiers.damage;
            if (unitData.statModifiers.maxHealth) {
                unit.maxHealth += unitData.statModifiers.maxHealth;
                unit.health += unitData.statModifiers.maxHealth;
            }
            if (unitData.statModifiers.moveRange) unit.moveRange += unitData.statModifiers.moveRange;
            if (unitData.statModifiers.initiative) unit.initiative += unitData.statModifiers.initiative;
            if (unitData.statModifiers.rangedRange) unit.rangedRange = unitData.statModifiers.rangedRange;
            
            if (unitData.statModifiers.hasDoubleStrike) unit.hasDoubleStrike = true;
            if (unitData.statModifiers.hasCleave) unit.hasCleave = true;
            if (unitData.statModifiers.hasRicochet) unit.hasRicochet = true;
            if (unitData.statModifiers.hasPiercing) unit.hasPiercing = true;
        }
        
        if (unitData.bloodlustStacks) {
            unit.bloodlustStacks = unitData.bloodlustStacks;
            unit.damage += unitData.bloodlustStacks * 15;
        }
        
        if (unitData.buffs) {
            if (unitData.buffs.hasteRounds) {
                unit.hasteRounds = unitData.buffs.hasteRounds;
                unit.moveRange += unitData.buffs.hasteValue || 0;
            }
            if (unitData.buffs.shieldRounds) {
                unit.shieldRounds = unitData.buffs.shieldRounds;
                unit.shieldValue = unitData.buffs.shieldValue || 0;
            }
            if (unitData.buffs.blessRounds) {
                unit.blessRounds = unitData.buffs.blessRounds;
                unit.blessValue = unitData.buffs.blessValue || 1;
            }
            if (unitData.buffs.regenerateRounds) {
                unit.regenerateRounds = unitData.buffs.regenerateRounds;
                unit.regenerateAmount = unitData.buffs.regenerateAmount || 0;
            }
        }
        
        unit.updateHealthBar();
    }

    _applyMagicBuffs() {
        for (const buff of this.magicBuffs) {
            if (buff.type === 'manaRegen') this.manaRegen += buff.value;
            if (buff.type === 'manaCost') this.manaCostMultiplier = Math.max(0.2, 1 - buff.value);
            if (buff.type === 'spellPower') this.spellPowerMultiplier += buff.value;
            if (buff.type === 'spellsPerRound') this.spellsPerRound += buff.value;
            if (buff.type === 'maxMana') this.maxMana += buff.value;
            if (buff.type === 'permanentBuffs') this.permanentBuffs = true;
            if (buff.type === 'armyBuffs') this.armyBuffs = true;
        }
    }

    // ============================================
    // UNIT SELECTION & CONTROL
    // ============================================

    selectUnit(unit) {
        const isMyUnit = this._isMyUnit(unit);
        
        // Handle spell targeting
        if (this.spellSystem.activeSpell) {
            const spell = SPELLS[this.spellSystem.activeSpell];
            if (spell) {
                if (spell.targetType === 'enemy' && !isMyUnit) {
                    if (['aoeDamage', 'iceStorm', 'meteor'].includes(spell.effect)) {
                        this.spellSystem.executeSpellAt(unit.gridX, unit.gridY);
                        this._syncAction('spell', { spell: this.spellSystem.activeSpell, targetX: unit.gridX, targetY: unit.gridY });
                    } else {
                        this.spellSystem.executeUnitSpell(spell, unit);
                    }
                    return;
                } else if (spell.targetType === 'ally' && isMyUnit) {
                    this.spellSystem.executeUnitSpell(spell, unit);
                    return;
                }
            }
        }

        // Control my units only
        if (isMyUnit && this.turnSystem.currentUnit === unit) {
            this.gridSystem.highlightValidMoves(unit);
            this.uiManager.updateUnitInfo(unit);
            this.selectedUnit = unit;
            
            if (unit.rangedRange > 0 && unit.canAttack()) {
                this.gridSystem.highlightRangedAttackRange(unit);
            }
        } else {
            // Show stats only
            this.uiManager.updateUnitInfo(unit);
        }
    }

    _isMyUnit(unit) {
        return (this.playerSide === 'left') ? unit.isPlayer : !unit.isPlayer;
    }

    // ============================================
    // COMBAT ACTIONS
    // ============================================

    performAttack(attacker, defender, isSecondStrike = false) {
        if (!this._isMyUnit(attacker) && !isSecondStrike) return;
        
        if (!isSecondStrike) attacker.hasAttacked = true;

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
                const damage = Math.floor(attacker.damage * attacker.blessValue);
                
                if (attacker.hasCleave) {
                    this._performCleaveAttack(attacker, defender, damage);
                } else {
                    defender.takeDamage(damage, false, attacker);
                    this.uiManager.showDamageText(defender, damage);
                    
                    this.tweens.add({
                        targets: defender.sprite,
                        alpha: 0.3,
                        duration: 50,
                        yoyo: true,
                        repeat: 2
                    });
                }
                
                if (this.selectedUnit === defender) {
                    this.uiManager.updateUnitInfo(defender);
                }

                // Double strike
                if (attacker.hasDoubleStrike && !isSecondStrike && defender.health > 0) {
                    this.time.delayedCall(300, () => {
                        this.uiManager.showBuffText(attacker, 'FRENZY!', '#9E4A4A');
                        this.performAttack(attacker, defender, true);
                    });
                }

                this.checkVictoryCondition();
            }
        });

        if (!isSecondStrike) {
            this.gridSystem.clearHighlights();
            this._syncAction('attack', { attacker: attacker.type, defender: defender.type });
        }
    }

    _performCleaveAttack(attacker, mainTarget, fullDamage) {
        mainTarget.takeDamage(fullDamage, false, attacker);
        this.uiManager.showDamageText(mainTarget, fullDamage);
        this.uiManager.showBuffText(attacker, 'CLEAVE!', '#D4A574');
        
        this.tweens.add({
            targets: mainTarget.sprite,
            alpha: 0.3,
            duration: 50,
            yoyo: true,
            repeat: 2
        });

        const cleaveDamage = Math.floor(fullDamage * 0.5);
        const enemyUnits = this.unitManager.units.filter(u => !this._isMyUnit(u) && !u.isDead);
        
        enemyUnits.forEach(enemy => {
            if (enemy === mainTarget) return;
            const dist = Math.abs(enemy.gridX - mainTarget.gridX) + Math.abs(enemy.gridY - mainTarget.gridY);
            if (dist <= 1) {
                enemy.takeDamage(cleaveDamage, false, attacker);
                this.uiManager.showDamageText(enemy, cleaveDamage);
                this.tweens.add({
                    targets: enemy.sprite,
                    alpha: 0.3,
                    duration: 50,
                    yoyo: true,
                    repeat: 1
                });
            }
        });
    }

    performRangedAttack(attacker, defender) {
        if (!this._isMyUnit(attacker)) return;
        
        attacker.hasAttacked = true;
        document.body.style.cursor = 'default';

        const isWizard = attacker.type === 'WIZARD';
        const projectile = this.add.text(
            attacker.sprite.x, attacker.sprite.y - 20,
            isWizard ? '✦' : '➤',
            { fontSize: isWizard ? '28px' : '24px', color: isWizard ? '#6B7A9A' : '#8b4513' }
        ).setOrigin(0.5);
        
        const angle = Phaser.Math.Angle.Between(
            attacker.sprite.x, attacker.sprite.y,
            defender.sprite.x, defender.sprite.y
        );
        projectile.setRotation(angle);

        this.tweens.add({
            targets: projectile,
            x: defender.sprite.x,
            y: defender.sprite.y,
            duration: isWizard ? 200 : 300,
            ease: 'Power2',
            onComplete: () => {
                projectile.destroy();
                
                if (attacker.hasPiercing) {
                    this._performPiercingAttack(attacker, defender);
                } else if (attacker.hasRicochet) {
                    this._performRicochetAttack(attacker, defender);
                } else {
                    const damage = Math.floor(attacker.damage * 0.8 * attacker.blessValue);
                    defender.takeDamage(damage, true, attacker);
                    this.uiManager.showDamageText(defender, damage);
                    this.tweens.add({
                        targets: defender.sprite,
                        alpha: 0.3,
                        duration: 50,
                        yoyo: true,
                        repeat: 2
                    });
                }

                this.checkVictoryCondition();
            }
        });

        this.gridSystem.clearHighlights();
        this._syncAction('ranged_attack', { attacker: attacker.type, defender: defender.type });
    }

    _performRicochetAttack(attacker, mainTarget) {
        const damage = Math.floor(attacker.damage * 0.8 * attacker.blessValue);
        
        mainTarget.takeDamage(damage, true, attacker);
        this.uiManager.showDamageText(mainTarget, damage);
        this.uiManager.showBuffText(attacker, 'RICOCHET!', '#6B8B5B');

        this.tweens.add({
            targets: mainTarget.sprite,
            alpha: 0.3,
            duration: 50,
            yoyo: true,
            repeat: 2
        });

        const bounceDamage = Math.floor(damage * 0.5);
        const enemyUnits = this.unitManager.units.filter(u => !this._isMyUnit(u) && !u.isDead && u !== mainTarget);
        
        enemyUnits.forEach((enemy, index) => {
            const dist = Math.abs(enemy.gridX - mainTarget.gridX) + Math.abs(enemy.gridY - mainTarget.gridY);
            if (dist <= 2) {
                this.time.delayedCall(200 * (index + 1), () => {
                    const bounceArrow = this.add.text(
                        mainTarget.sprite.x, mainTarget.sprite.y - 20,
                        '➤',
                        { fontSize: '20px', color: '#8b4513' }
                    ).setOrigin(0.5);
                    
                    const bounceAngle = Phaser.Math.Angle.Between(
                        mainTarget.sprite.x, mainTarget.sprite.y,
                        enemy.sprite.x, enemy.sprite.y
                    );
                    bounceArrow.setRotation(bounceAngle);

                    this.tweens.add({
                        targets: bounceArrow,
                        x: enemy.sprite.x,
                        y: enemy.sprite.y,
                        duration: 150,
                        onComplete: () => {
                            bounceArrow.destroy();
                            enemy.takeDamage(bounceDamage, true, attacker);
                            this.uiManager.showDamageText(enemy, bounceDamage);
                            this.tweens.add({
                                targets: enemy.sprite,
                                alpha: 0.3,
                                duration: 50,
                                yoyo: true,
                                repeat: 1
                            });
                        }
                    });
                });
            }
        });
    }

    _performPiercingAttack(attacker, target) {
        const baseDamage = Math.floor(attacker.damage * 0.8 * attacker.blessValue);
        
        const dx = target.gridX - attacker.gridX;
        const dy = target.gridY - attacker.gridY;
        const stepX = dx === 0 ? 0 : Math.sign(dx);
        const stepY = dy === 0 ? 0 : Math.sign(dy);
        
        this.uiManager.showBuffText(attacker, 'PIERCE!', '#6B7A9A');
        
        const enemyUnits = this.unitManager.units.filter(u => !this._isMyUnit(u) && !u.isDead);
        let hitCount = 0;
        
        enemyUnits.forEach(enemy => {
            const ex = enemy.gridX - attacker.gridX;
            const ey = enemy.gridY - attacker.gridY;
            const enemyStepX = ex === 0 ? 0 : Math.sign(ex);
            const enemyStepY = ey === 0 ? 0 : Math.sign(ey);
            
            if (enemyStepX === stepX && enemyStepY === stepY) {
                const isCollinear = (stepX === 0 || stepY === 0) ? 
                    (stepX === 0 ? ex === 0 : ey === 0) :
                    (Math.abs(ex * stepY - ey * stepX) <= 1);
                
                if (isCollinear) {
                    hitCount++;
                    this.time.delayedCall(hitCount * 100, () => {
                        enemy.takeDamage(baseDamage, true, attacker);
                        this.uiManager.showDamageText(enemy, baseDamage);
                        this.tweens.add({
                            targets: enemy.sprite,
                            alpha: 0.3,
                            duration: 50,
                            yoyo: true,
                            repeat: 2
                        });
                    });
                }
            }
        });
    }

    moveUnit(unit, newX, newY) {
        if (!this._isMyUnit(unit)) return;
        
        this.unitManager.updateUnitPosition(unit, newX, newY);
        unit.hasMoved = true;
        
        if (this.selectedUnit === unit) {
            this.gridSystem.highlightValidMoves(unit);
        }
        
        this._syncAction('move', { unit: unit.type, toX: newX, toY: newY });
    }

    endTurn() {
        if (this.turnSystem.currentUnit && this._isMyUnit(this.turnSystem.currentUnit)) {
            this.turnSystem.currentUnit.hasMoved = true;
            this.turnSystem.currentUnit.hasAttacked = true;
            
            this.gridSystem.clearHighlights();
            this.cancelSpell();
            this.turnSystem.nextTurn();
            
            this._syncAction('end_turn', {});
        }
    }

    // ============================================
    // SPELLS
    // ============================================

    openSpellBook() {
        if (this.turnSystem.currentUnit && !this._isMyUnit(this.turnSystem.currentUnit)) {
            this.uiManager.showFloatingText('Wait for your turn!', 400, 300, '#ff4444');
            return;
        }
        
        const modal = document.getElementById('spellbook-modal');
        const grid = document.getElementById('spell-grid');
        
        this.uiManager.updateManaDisplay();
        
        grid.innerHTML = '';
        for (const [key, spell] of Object.entries(SPELLS)) {
            const card = document.createElement('div');
            card.className = 'spell-card';
            
            const canAfford = this.mana >= Math.floor(spell.manaCost * this.manaCostMultiplier);
            if (!canAfford) card.classList.add('disabled');
            
            card.innerHTML = `
                <div style="font-size: 32px; margin-bottom: 5px;">${spell.icon}</div>
                <div style="color: #A68966; font-weight: bold;">${spell.name}</div>
                <div class="spell-type">${spell.type}</div>
                <div class="spell-desc">${spell.description}</div>
                <div class="spell-cost ${!canAfford ? 'too-expensive' : ''}">💧 ${Math.floor(spell.manaCost * this.manaCostMultiplier)} Mana</div>
            `;
            
            if (canAfford) {
                card.onclick = () => this.spellSystem.castSpell(key);
            }
            
            grid.appendChild(card);
        }
        
        modal.classList.remove('hidden');
    }

    closeSpellBook() {
        document.getElementById('spellbook-modal').classList.add('hidden');
    }

    cancelSpell() {
        if (this.spellSystem.activeSpell) {
            this.spellSystem.clearSpell();
            this.gridSystem.clearAoePreview();
            this.uiManager.showFloatingText('Spell cancelled', 400, 300, '#888888');
        }
    }

    spendMana(amount) {
        this.mana = Math.max(0, this.mana - amount);
        this.uiManager.updateManaDisplay();
    }

    // ============================================
    // SYNCHRONIZATION
    // ============================================

    async _syncAction(actionType, data) {
        if (!this.pvpManager) return;
        
        await this.pvpManager.sendBattleEvent({
            type: actionType,
            data: data,
            player: this.pvpManager.getPlayerNumber(),
            turn: this.turnSystem.roundNumber
        });
    }

    _handleOpponentAction(spectatorData) {
        if (!spectatorData || !spectatorData.lastAction) return;
        
        const action = spectatorData.lastAction;
        if (action.player === this.pvpManager.getPlayerNumber()) return;
        
        // Apply opponent action (simplified - full sync would need more work)
        console.log('[PVP] Opponent action:', action);
    }

    // ============================================
    // VICTORY CHECK
    // ============================================

    checkVictoryCondition() {
        if (this.victoryShown) return;
        
        const myUnits = this._getMyUnits();
        const opponentUnits = this._getOpponentUnits();
        
        if (opponentUnits.length === 0) {
            this._endPVPBattle(this.pvpManager.getPlayerNumber());
        } else if (myUnits.length === 0) {
            const opponentNumber = this.pvpManager.getOpponentNumber();
            this._endPVPBattle(opponentNumber);
        }
    }

    _getMyUnits() {
        return this.unitManager.units.filter(u => this._isMyUnit(u) && !u.isDead && u.health > 0);
    }

    _getOpponentUnits() {
        return this.unitManager.units.filter(u => !this._isMyUnit(u) && !u.isDead && u.health > 0);
    }

    async _endPVPBattle(winner) {
        this.victoryShown = true;
        
        if (this.onComplete) {
            this.onComplete(winner);
        }
    }
}
