// ============================================
// PVP BATTLE SCENE - Real-time WebRTC Battle
// ============================================

import { GridSystem } from './InputHandler.js';
import { UnitManager } from './EntityManager.js';
import { SpellSystem } from './SpellSystem.js';
import { UIManager } from './UIHandler.js';
import { CONFIG } from './GameConfig.js';

/**
 * PVPBattleScene - Real-time PVP using WebRTC DataChannel.
 * Host (Player 1) is on the left, Guest (Player 2) is on the right.
 */
export class PVPBattleScene extends Phaser.Scene {
    constructor() {
        super({ key: 'PVPBattleScene' });
        
        // Systems
        this.gridSystem = null;
        this.unitManager = null;
        this.spellSystem = null;
        this.uiManager = null;
        
        // PVP state
        this.pvpManager = null;
        this.playerNumber = null;
        
        // Unit-based initiative system (like PVE)
        this.turnQueue = [];
        this.currentUnit = null;
        this.roundNumber = 1;
        
        // Game state
        this.units = [];
        this.selectedUnit = null;
        this.battleEnded = false;
        this.mana = 100;
        this.maxMana = 100;
        
        // Position tracking for sync
        this.unitPositions = new Map();
    }

    init(data) {
        this.pvpManager = data.pvpManager;
        this.playerNumber = data.playerNumber;
        this.myArmy = data.myArmy;
        this.opponentArmy = data.opponentArmy;
        this.onComplete = data.onComplete;
        
        // Set up action handler
        this.pvpManager.onOpponentAction = (action) => this._applyOpponentAction(action);
    }

    preload() {
        // Load player unit images (same as PreGameScene)
        const playerUnits = ['KNIGHT', 'ARCHER', 'WIZARD', 'PALADIN', 'RANGER', 'BERSERKER', 'CLERIC', 'ROGUE', 'SORCERER'];
        for (const unitType of playerUnits) {
            const template = UNIT_TYPES[unitType];
            if (template && template.image) {
                const imageKey = unitType.toLowerCase() + '_img';
                this.load.image(imageKey, template.image);
            }
        }
    }

    create() {
        console.log('[PVPBattleScene] ==== CREATED ====');
        console.log('[PVPBattleScene] Player:', this.playerNumber, 'isHost:', this.playerNumber === 1);
        console.log('[PVPBattleScene] My army:', this.myArmy?.length, 'units');
        console.log('[PVPBattleScene] Opponent army:', this.opponentArmy?.length, 'units');
        
        window.gameScene = this;
        
        // Init systems
        this.gridSystem = new GridSystem(this);
        this.unitManager = new UnitManager(this);
        this.spellSystem = new SpellSystem(this);
        this.uiManager = new UIManager(this);
        
        this.gridSystem.create();
        
        // Create units from army data
        this._createUnits();
        
        // Show turn indicator
        this._showTurnIndicator();
        
        // Input handling
        this.input.on('pointerdown', (p) => this._onPointerDown(p));
    }

    // ============================================
    // UNIT CREATION
    // ============================================

    _createUnits() {
        const data = this.scene.settings.data;
        const myArmy = data.myArmy || [];
        const opponentArmy = data.opponentArmy || [];
        
        // Create my units
        for (const u of myArmy) {
            this._spawnUnit(u.type, u.x, u.y, this.playerNumber);
        }
        
        // Create opponent units
        const opponentNumber = this.playerNumber === 1 ? 2 : 1;
        for (const u of opponentArmy) {
            this._spawnUnit(u.type, u.x, u.y, opponentNumber);
        }
        
        // Initialize unit-based initiative turn system
        this._initTurnQueue();
    }
    
    _initTurnQueue() {
        // Sort all units by initiative (highest first)
        const aliveUnits = this.units.filter(u => !u.isDead);
        this.turnQueue = aliveUnits.sort((a, b) => b.initiative - a.initiative);
        
        console.log('[PVPBattleScene] Turn queue initialized:', this.turnQueue.map(u => `${u.name}(init:${u.initiative})`).join(', '));
        
        // Start first turn
        this._nextTurn();
    }
    
    _nextTurn() {
        // Remove dead units from queue
        this.turnQueue = this.turnQueue.filter(u => !u.isDead);
        
        if (this.turnQueue.length === 0) {
            this._startNewRound();
            return;
        }
        
        this.currentUnit = this.turnQueue.shift();
        
        if (this.currentUnit.isDead) {
            this._nextTurn();
            return;
        }
        
        this.currentUnit.resetTurn();
        this._showTurnIndicator();
        
        // If it's not this player's unit, wait for opponent's action
        if (this.currentUnit.owner !== this.playerNumber) {
            console.log('[PVPBattleScene] Waiting for opponent to move:', this.currentUnit.name);
            this._deselect();
        } else {
            console.log('[PVPBattleScene] Your turn:', this.currentUnit.name);
            this.selectUnit(this.currentUnit);
        }
    }
    
    _startNewRound() {
        this.roundNumber++;
        this.regenerateMana();
        
        // Reset turn queue with all alive units sorted by initiative
        const aliveUnits = this.units.filter(u => !u.isDead);
        this.turnQueue = aliveUnits.sort((a, b) => b.initiative - a.initiative);
        
        console.log('[PVPBattleScene] Starting new round:', this.roundNumber);
        
        this._nextTurn();
    }

    _spawnUnit(type, x, y, owner) {
        const unit = this.unitManager.addUnit(type, x, y);
        unit.owner = owner;
        unit.alive = true;
        
        if (unit.sprite) {
            // Flip sprite for Player 2 (right side) to face left
            if (owner === 2) {
                unit.sprite.setFlipX(true);
            }
            
            // Remove any existing listeners and add our own
            unit.sprite.removeAllListeners('pointerdown');
            unit.sprite.removeAllListeners('pointerover');
            unit.sprite.setInteractive();
            unit.sprite.on('pointerdown', () => this._onUnitClick(unit));
            // Show stats on hover
            unit.sprite.on('pointerover', () => this._onUnitHover(unit));
        }
        
        this.units.push(unit);
        this.unitPositions.set(`${x},${y}`, unit);
        return unit;
    }
    
    _onUnitHover(unit) {
        // Show unit stats on hover - stats persist until another unit is hovered
        this.uiManager.updateUnitInfo(unit);
    }

    _getUnitAt(x, y) {
        return this.unitPositions.get(`${x},${y}`);
    }

    // ============================================
    // INPUT HANDLING
    // ============================================

    _onPointerDown(pointer) {
        if (this.battleEnded || !this._isMyTurn()) return;
        
        const x = Math.floor(pointer.x / CONFIG.TILE_SIZE);
        const y = Math.floor(pointer.y / CONFIG.TILE_SIZE);
        
        if (x < 0 || x >= CONFIG.GRID_WIDTH || y < 0 || y >= CONFIG.GRID_HEIGHT) return;
        
        // Handle spell
        if (this.spellSystem.activeSpell) {
            this._castSpell(x, y);
            return;
        }
        
        const unit = this._getUnitAt(x, y);
        if (unit) {
            this._onUnitClick(unit);
        } else if (this.selectedUnit) {
            this._tryMove(x, y);
        } else {
            this._deselect();
        }
    }

    _onUnitClick(unit) {
        if (!this._isMyTurn()) return;
        
        // Select my unit
        if (unit.owner === this.playerNumber && unit.alive) {
            this._selectUnit(unit);
            return;
        }
        
        // Attack enemy
        if (unit.owner !== this.playerNumber && this.selectedUnit) {
            this._tryAttack(this.selectedUnit, unit);
        }
    }

    // ============================================
    // SELECTION & MOVEMENT
    // ============================================

    // Called by GridSystem when a unit is clicked
    selectUnit(unit) {
        // Only allow selecting own units on your turn
        if (unit.owner !== this.playerNumber) return;
        if (!this._isMyTurn()) return;
        this._selectUnit(unit);
    }

    _selectUnit(unit) {
        this._deselect();
        this.selectedUnit = unit;
        
        if (unit.sprite) unit.sprite.setTint(0xFFFF00);
        
        // Show move range using GridSystem's built-in method
        this.gridSystem.highlightValidMoves(unit);
    }

    _deselect() {
        if (this.selectedUnit?.sprite) {
            this.selectedUnit.sprite.clearTint();
        }
        this.selectedUnit = null;
        this.gridSystem.clearHighlights();
    }

    // Called by GridSystem when a valid move is clicked
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
        
        // Update tracking
        this.unitPositions.delete(`${fromX},${fromY}`);
        this.unitManager.updateUnitPosition(unit, tx, ty);
        this.unitPositions.set(`${tx},${ty}`, unit);
        unit.hasMoved = true;
        
        // Sync
        this._syncAction({ type: 'move', fromX, fromY, toX: tx, toY: ty });
        
        this._deselect();
    }

    // ============================================
    // COMBAT
    // ============================================

    _tryAttack(attacker, target) {
        const range = attacker.rangedRange || 1;
        const dist = Math.abs(target.gridX - attacker.gridX) + Math.abs(target.gridY - attacker.gridY);
        if (dist > range) return;
        
        const damage = attacker.damage;
        
        // Apply
        target.health -= damage;
        this.uiManager.showFloatingText(`-${damage}`, target.sprite.x, target.sprite.y - 40, '#ff4444');
        
        // Animation
        if (attacker.sprite) {
            this.tweens.add({
                targets: attacker.sprite,
                x: attacker.sprite.x + (target.gridX - attacker.gridX) * 15,
                y: attacker.sprite.y + (target.gridY - attacker.gridY) * 15,
                duration: 100, yoyo: true
            });
        }
        
        if (target.health <= 0) {
            this._killUnit(target);
        }
        
        // Sync
        this._syncAction({
            type: 'attack',
            attackerX: attacker.gridX, attackerY: attacker.gridY,
            targetX: target.gridX, targetY: target.gridY,
            damage
        });
        
        this._deselect();
        this._checkWin();
    }

    _killUnit(unit) {
        unit.alive = false;
        this.unitPositions.delete(`${unit.gridX},${unit.gridY}`);
        
        if (unit.sprite) {
            this.tweens.add({
                targets: unit.sprite, alpha: 0, duration: 500,
                onComplete: () => unit.sprite.setVisible(false)
            });
        }
        
        const idx = this.units.indexOf(unit);
        if (idx > -1) this.units.splice(idx, 1);
    }

    // ============================================
    // SPELLS
    // ============================================

    _castSpell(x, y) {
        const spell = this.spellSystem.activeSpell;
        const caster = this.selectedUnit;
        if (!spell || !caster) return;
        if (this.mana < spell.manaCost) return;
        
        this.mana -= spell.manaCost;
        
        // Apply effect (simplified)
        if (spell.type === 'damage') {
            const target = this._getUnitAt(x, y);
            if (target) {
                target.health -= spell.power;
                this.uiManager.showFloatingText(`-${spell.power}`, target.sprite.x, target.sprite.y - 40, '#ff8800');
                if (target.health <= 0) this._killUnit(target);
            }
        }
        
        // Sync
        this._syncAction({
            type: 'spell',
            spell: spell.name,
            casterX: caster.gridX, casterY: caster.gridY,
            targetX: x, targetY: y
        });
        
        this.spellSystem.activeSpell = null;
        document.getElementById('active-spell-display')?.classList.add('hidden');
        this._deselect();
        this._checkWin();
    }

    // ============================================
    // SYNC
    // ============================================

    _syncAction(action) {
        this.pvpManager.sendAction(action);
    }

    _applyOpponentAction(action) {

        
        switch (action.type) {
            case 'move':
                this._applyMove(action);
                break;
            case 'attack':
                this._applyAttack(action);
                break;
            case 'spell':
                this._applySpell(action);
                break;
            case 'end_turn':
                this._nextTurn();
                break;
        }
    }

    _applyMove(a) {
        const unit = this._getUnitAt(a.fromX, a.fromY);
        if (unit) {
            this.unitPositions.delete(`${a.fromX},${a.fromY}`);
            this.unitManager.updateUnitPosition(unit, a.toX, a.toY);
            this.unitPositions.set(`${a.toX},${a.toY}`, unit);
        }
    }

    _applyAttack(a) {
        const attacker = this._getUnitAt(a.attackerX, a.attackerY);
        const target = this._getUnitAt(a.targetX, a.targetY);
        if (target) {
            target.health -= a.damage;
            this.uiManager.showFloatingText(`-${a.damage}`, target.sprite.x, target.sprite.y - 40, '#ff4444');
            if (target.health <= 0) this._killUnit(target);
            this._checkWin();
        }
    }

    _applySpell(a) {
        // Simplified - just apply damage at target location
        const target = this._getUnitAt(a.targetX, a.targetY);
        if (target) {
            target.health -= 20;
            this.uiManager.showFloatingText(`-20`, target.sprite.x, target.sprite.y - 40, '#ff8800');
            if (target.health <= 0) this._killUnit(target);
            this._checkWin();
        }
    }

    // ============================================
    // TURN SYSTEM
    // ============================================

    _isMyTurn() {
        // It's my turn if the current unit belongs to me
        return this.currentUnit && this.currentUnit.owner === this.playerNumber;
    }

    _showTurnIndicator() {
        const existing = document.getElementById('turn-indicator');
        if (existing) existing.remove();
        
        if (!this.currentUnit) return;
        
        const isMyTurn = this._isMyTurn();
        const div = document.createElement('div');
        div.id = 'turn-indicator';
        div.style.cssText = `
            position: fixed; top: 80px; left: 50%; transform: translateX(-50%);
            background: ${isMyTurn ? 'rgba(76, 175, 80, 0.9)' : 'rgba(158, 74, 74, 0.9)'};
            color: #fff; padding: 10px 30px; border-radius: 8px;
            font-size: 18px; font-weight: bold; z-index: 2000;
        `;
        
        // Show which unit's turn it is
        const unitName = this.currentUnit.name;
        const unitEmoji = this.currentUnit.emoji;
        if (isMyTurn) {
            div.textContent = `⚔️ Your Turn: ${unitEmoji} ${unitName}`;
        } else {
            div.textContent = `⏳ Opponent's Turn: ${unitEmoji} ${unitName}`;
        }
        
        document.body.appendChild(div);
        
        // Also update initiative queue display (using existing PVE element)
        this._updateInitiativeBar();
    }
    
    _updateInitiativeBar() {
        const queueEl = document.getElementById('initiative-queue');
        if (!queueEl) return;
        
        // Build queue: current unit + next up to 7 units (same as PVE)
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

    endTurn() {
        if (!this._isMyTurn()) return;
        if (!this.currentUnit) return;
        
        this._syncAction({ type: 'end_turn' });
        this._nextTurn();
    }

    // ============================================
    // WIN/LOSS
    // ============================================

    _checkWin() {
        const myUnits = this.units.filter(u => u.owner === this.playerNumber && u.alive);
        const theirUnits = this.units.filter(u => u.owner !== this.playerNumber && u.alive);
        
        if (theirUnits.length === 0) this._endBattle(this.playerNumber);
        else if (myUnits.length === 0) this._endBattle(this.playerNumber === 1 ? 2 : 1);
    }

    _endBattle(winner) {
        if (this.battleEnded) return;
        this.battleEnded = true;
        
        if (this.onComplete) this.onComplete(winner);
    }

    // ============================================
    // CLEANUP
    // ============================================

    shutdown() {
        document.getElementById('turn-indicator')?.remove();
    }
}
