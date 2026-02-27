// ============================================
// SCENE MANAGER - Phaser Scenes
// ============================================

import { CONFIG, SPELLS } from './GameConfig.js';

// Note: UNIT_TYPES is available globally from units.js (loaded as script tag)
import { UnitManager, TurnSystem } from './EntityManager.js';
import { GridSystem } from './InputHandler.js';
import { SpellSystem } from './SpellSystem.js';
import { UIManager } from './UIHandler.js';

// ============================================
// BATTLE SCENE
// ============================================
export class BattleScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BattleScene' });
        this.mana = 100;
        this.maxMana = 100;
        this.manaRegen = 1;
        this.manaCostMultiplier = 1;
        this.spellPowerMultiplier = 1;
        this.spellsPerRound = 1;
        this.spellsCastThisRound = 0;
        this.battleNumber = 1;
        this.victoryShown = false;
        this.magicBuffs = [];
        this.selectedUnit = null;
        this.selectedRewards = { unit: null, buff: null, magic: null };
    }

    preload() {
        // Load player unit images
        const playerUnits = ['KNIGHT', 'ARCHER', 'WIZARD', 'PALADIN', 'RANGER', 'BERSERKER', 'CLERIC', 'ROGUE', 'SORCERER'];
        for (const unitType of playerUnits) {
            const template = UNIT_TYPES[unitType];
            if (template && template.image) {
                const imageKey = unitType.toLowerCase() + '_img';
                this.load.image(imageKey, template.image);
            }
        }
        
        // Load enemy unit images
        const enemyUnits = ['ORC_WARRIOR', 'ORC_BRUTE', 'ORC_ROGUE', 'GOBLIN_STONE_THROWER'];
        for (const unitType of enemyUnits) {
            const template = UNIT_TYPES[unitType];
            if (template && template.image) {
                const imageKey = unitType.toLowerCase() + '_img';
                this.load.image(imageKey, template.image);
            }
        }
    }

    create(data) {
        // Initialize systems
        this.gridSystem = new GridSystem(this);
        this.unitManager = new UnitManager(this);
        this.turnSystem = new TurnSystem(this);
        this.spellSystem = new SpellSystem(this);
        this.uiManager = new UIManager(this);

        // Track battle number for scaling
        if (data && data.battleNumber) {
            this.battleNumber = data.battleNumber;
        }
        
        // Restore magic buffs from previous battle
        if (data && data.magicBuffs) {
            this.magicBuffs = data.magicBuffs;
            for (const buff of this.magicBuffs) {
                if (buff.type === 'manaRegen') this.manaRegen += buff.value;
                if (buff.type === 'manaCost') this.manaCostMultiplier *= buff.value;
                if (buff.type === 'spellPower') this.spellPowerMultiplier += buff.value;
                if (buff.type === 'spellsPerRound') this.spellsPerRound += buff.value;
                if (buff.type === 'maxMana') this.maxMana += buff.value;
            }
        }
        
        // Update magic buffs display
        this.uiManager.updateMagicBuffsDisplay();
        
        // Reset victory flag
        this.victoryShown = false;

        // Create game elements
        this.gridSystem.create();
        
        // Create player units from placement data
        if (data && data.placedUnits) {
            for (const unitData of data.placedUnits) {
                const unit = this.unitManager.addUnit(unitData.type, unitData.x, unitData.y);
                // Apply permanent stat modifiers if they exist
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
                    unit.updateHealthBar();
                }
                
                // Restore Bloodlust stacks for Berserker
                if (unitData.bloodlustStacks && unit.type === 'BERSERKER') {
                    unit.bloodlustStacks = unitData.bloodlustStacks;
                    unit.damage += unitData.bloodlustStacks * 15;
                }
            }
        }
        
        // Create enemy units
        this.createEnemyUnits();

        // Add click handler for spell targeting
        this.input.on('pointerdown', (pointer) => {
            if (this.spellSystem.activeSpell) {
                const gridX = Math.floor(pointer.x / CONFIG.TILE_SIZE);
                const gridY = Math.floor(pointer.y / CONFIG.TILE_SIZE);
                if (gridX >= 0 && gridX < CONFIG.GRID_WIDTH && gridY >= 0 && gridY < CONFIG.GRID_HEIGHT) {
                    this.spellSystem.executeSpellAt(gridX, gridY);
                }
            }
        });

        // Update mana display
        this.uiManager.updateManaDisplay();

        // Start the game
        this.turnSystem.initQueue();

        // Make scene accessible globally for UI buttons
        window.gameScene = this;
    }

    createEnemyUnits() {
        const totalPoints = 1000 + (this.battleNumber - 1) * 250;
        const enemyTypes = ['ORC_WARRIOR', 'ORC_BRUTE', 'ORC_ROGUE', 'GOBLIN_STONE_THROWER'];
        
        let remainingPoints = totalPoints;
        const spawnedEnemies = [];
        const availablePositions = this.getEnemySpawnPositions();
        
        const statMultiplier = 1 + (this.battleNumber - 1) * 0.15;

        while (remainingPoints >= 200 && availablePositions.length > 0) {
            const affordable = enemyTypes.filter(type => UNIT_TYPES[type].cost <= remainingPoints);
            if (affordable.length === 0) break;
            
            const type = affordable[Math.floor(Math.random() * affordable.length)];
            const pos = availablePositions.pop();
            
            const unit = this.unitManager.addUnit(type, pos.x, pos.y);
            
            if (unit) {
                unit.maxHealth = Math.floor(unit.maxHealth * statMultiplier);
                unit.health = unit.maxHealth;
                unit.damage = Math.floor(unit.damage * statMultiplier);
                unit.updateHealthBar();
                
                remainingPoints -= UNIT_TYPES[type].cost;
                spawnedEnemies.push(type);
            }
        }
        
        if (this.battleNumber > 1) {
            this.uiManager.showFloatingText(
                `Battle ${this.battleNumber} - ${spawnedEnemies.length} enemies!`,
                320, 100, '#A68966'
            );
        } else {
            this.uiManager.showFloatingText(
                `Battle 1 - Defeat the orc horde!`,
                320, 100, '#A68966'
            );
        }
    }

    getEnemySpawnPositions() {
        const positions = [];
        for (let y = 0; y < CONFIG.GRID_HEIGHT; y++) {
            for (let x = CONFIG.GRID_WIDTH - 3; x < CONFIG.GRID_WIDTH; x++) {
                positions.push({ x, y });
            }
        }
        return positions.sort(() => 0.5 - Math.random());
    }

    regenerateMana() {
        const wizardCount = this.unitManager.getPlayerUnits().filter(u => u.type === 'WIZARD').length;
        const totalRegen = this.manaRegen + wizardCount;
        
        if (this.mana < this.maxMana) {
            this.mana = Math.min(this.maxMana, this.mana + totalRegen);
            this.uiManager.updateManaDisplay();
        }
        
        if (totalRegen > this.manaRegen) {
            this.uiManager.showFloatingText(
                `+${totalRegen} Mana (${this.manaRegen} + ${wizardCount} from Wizards)`, 
                320, 50, '#4A729E'
            );
        }
    }

    spendMana(amount) {
        this.mana = Math.max(0, this.mana - amount);
        this.uiManager.updateManaDisplay();
    }

    // Unit selection and movement
    selectUnit(unit) {
        // Handle spell targeting on units
        if (this.spellSystem.activeSpell) {
            const spell = SPELLS[this.spellSystem.activeSpell];
            if (spell) {
                if (spell.targetType === 'enemy' && !unit.isPlayer) {
                    if (spell.effect === 'aoeDamage' || spell.effect === 'iceStorm' || spell.effect === 'meteor') {
                        this.spellSystem.executeSpellAt(unit.gridX, unit.gridY);
                    } else {
                        this.spellSystem.executeUnitSpell(spell, unit);
                    }
                    return;
                } else if (spell.targetType === 'ally' && unit.isPlayer) {
                    this.spellSystem.executeUnitSpell(spell, unit);
                    return;
                } else if (spell.targetType === 'ally_then_tile' && unit.isPlayer && !this.spellSystem.teleportUnit) {
                    this.spellSystem.teleportUnit = unit;
                    this.uiManager.showFloatingText('Now select destination', 400, 300, '#A68966');
                    return;
                }
            }
        }

        this.gridSystem.highlightValidMoves(unit);
        this.uiManager.updateUnitInfo(unit);
        this.selectedUnit = unit;

        // Auto-highlight ranged targets if this is the current unit and can attack
        if (this.turnSystem.currentUnit === unit && 
            unit.isPlayer && 
            unit.rangedRange > 0 && 
            unit.canAttack()) {
            this.gridSystem.highlightRangedAttackRange(unit);
        }
    }

    moveUnit(unit, newX, newY) {
        this.unitManager.updateUnitPosition(unit, newX, newY);
        unit.hasMoved = true;
        
        // Recalculate valid moves
        if (this.selectedUnit === unit) {
            this.gridSystem.highlightValidMoves(unit);
        }
    }

    // Combat
    performAttack(attacker, defender, isSecondStrike = false) {
        if (!isSecondStrike && !attacker.canAttack()) return;

        if (!isSecondStrike) {
            attacker.hasAttacked = true;
        }

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
                defender.takeDamage(damage, false, attacker);
                
                if (this.selectedUnit === defender) {
                    this.uiManager.updateUnitInfo(defender);
                }
                
                this.uiManager.showDamageText(defender, damage);

                this.tweens.add({
                    targets: defender.sprite,
                    alpha: 0.3,
                    duration: 50,
                    yoyo: true,
                    repeat: 2
                });

                // Berserker: Strike twice
                if (attacker.type === 'BERSERKER' && !isSecondStrike && defender.health > 0) {
                    this.time.delayedCall(300, () => {
                        this.uiManager.showBuffText(attacker, 'FURY!', '#ff0000');
                        this.performAttack(attacker, defender, true);
                    });
                }

                // Rogue: Hit and run
                if (attacker.type === 'ROGUE' && attacker.turnStartX !== undefined) {
                    this.time.delayedCall(400, () => {
                        if (!attacker.isDead && attacker.health > 0) {
                            this.uiManager.showBuffText(attacker, 'VANISH!', '#6B5B8B');
                            this.unitManager.updateUnitPosition(attacker, attacker.turnStartX, attacker.turnStartY);
                        }
                    });
                }

                this.checkVictoryCondition();
            }
        });

        if (!isSecondStrike) {
            this.gridSystem.clearHighlights();
        }
    }

    performRangedAttack(attacker, defender) {
        if (!attacker.canAttack()) return;

        attacker.hasAttacked = true;
        document.body.style.cursor = 'default';

        // Create arrow projectile
        const arrow = this.add.text(
            attacker.sprite.x, attacker.sprite.y - 20,
            '➤',
            { fontSize: '24px', color: '#8b4513' }
        ).setOrigin(0.5);
        
        const angle = Phaser.Math.Angle.Between(
            attacker.sprite.x, attacker.sprite.y,
            defender.sprite.x, defender.sprite.y
        );
        arrow.setRotation(angle);

        this.tweens.add({
            targets: arrow,
            x: defender.sprite.x,
            y: defender.sprite.y,
            duration: 300,
            ease: 'Power2',
            onComplete: () => {
                arrow.destroy();
                
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

                this.checkVictoryCondition();
            }
        });

        this.gridSystem.clearHighlights();
    }

    // UI Methods
    openSpellBook() {
        const modal = document.getElementById('spellbook-modal');
        const grid = document.getElementById('spell-grid');
        
        this.uiManager.updateManaDisplay();
        
        grid.innerHTML = '';
        for (const [key, spell] of Object.entries(SPELLS)) {
            const card = document.createElement('div');
            card.className = 'spell-card';
            
            const canAfford = this.mana >= Math.floor(spell.manaCost * this.manaCostMultiplier);
            if (!canAfford) {
                card.classList.add('disabled');
            }
            
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

    // Victory/Defeat
    checkVictoryCondition() {
        if (this.victoryShown) return;
        
        const playerUnits = this.unitManager.getPlayerUnits();
        const enemyUnits = this.unitManager.getEnemyUnits();
        
        if (enemyUnits.length === 0) {
            this.victoryShown = true;
            this.showVictoryScreen(true);
        } else if (playerUnits.length === 0) {
            this.victoryShown = true;
            this.showVictoryScreen(false);
        }
    }

    showVictoryScreen(playerWon) {
        const victoryScreen = document.getElementById('victory-screen');
        const victoryText = document.getElementById('victory-text');

        victoryText.innerHTML = playerWon ? '🎉 Victory! 🎉' : 'Defeat...';
        victoryText.style.color = playerWon ? '#A68966' : '#9E4A4A';

        if (playerWon) {
            const canGetNewUnit = this.battleNumber >= 2 && this.battleNumber % 2 === 0;
            this.selectedRewards = { 
                unit: canGetNewUnit ? null : { id: 'skipped', effectData: null }, 
                buff: null, 
                magic: null 
            };
            this.generateRewardChoices();
        } else {
            document.getElementById('reward-units').innerHTML = 
                '<button class="spell-button" onclick="location.reload()">Try Again</button>';
        }

        victoryScreen.classList.remove('hidden');
    }

    // Reward system
    generateRewardChoices() {
        const canGetNewUnit = this.battleNumber >= 2 && this.battleNumber % 2 === 0;
        
        const unitContainer = document.getElementById('reward-units');
        unitContainer.innerHTML = '';
        
        if (canGetNewUnit) {
            const recruitableUnits = ['PALADIN', 'RANGER', 'BERSERKER', 'CLERIC', 'ROGUE', 'SORCERER'];
            const unitOptions = recruitableUnits
                .sort(() => 0.5 - Math.random())
                .slice(0, 3);
            
            unitOptions.forEach(unitType => {
                const template = UNIT_TYPES[unitType];
                const card = this.uiManager.createRewardCard('unit', unitType, `
                    <div style="font-size: 40px; margin-bottom: 5px;">${template.emoji}</div>
                    <div style="color: #A68966; font-weight: bold;">${template.name}</div>
                    <div style="font-size: 12px; color: #B8A896;">
                        HP: ${template.health} | DMG: ${template.damage}<br>
                        MOV: ${template.moveRange}${template.rangedRange ? ` | RNG: ${template.rangedRange}` : ''}<br>
                        INIT: ${template.initiative}
                    </div>
                `);
                unitContainer.appendChild(card);
            });
        } else {
            const roundMsg = this.battleNumber === 1 ? 'First victory! No new unit yet.' : `Victory! New unit available in round ${this.battleNumber + 1}.`;
            unitContainer.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; color: #8B7355; padding: 20px;">
                    <div style="font-size: 24px; margin-bottom: 10px;">📦</div>
                    <div>${roundMsg}</div>
                    <div style="font-size: 11px; margin-top: 5px;">(New units every 2 rounds)</div>
                </div>
            `;
        }

        const buffOptions = [
            { 
                id: 'veteran', name: 'Veteran Training', icon: '⚔️', desc: '+10 Damage', 
                effect: (unit) => { 
                    unit.damage += 10; 
                    unit.statModifiers = unit.statModifiers || {};
                    unit.statModifiers.damage = (unit.statModifiers.damage || 0) + 10;
                } 
            },
            { 
                id: 'toughness', name: 'Enhanced Toughness', icon: '💪', desc: '+30 Max HP', 
                effect: (unit) => { 
                    unit.maxHealth += 30; unit.health += 30;
                    unit.statModifiers = unit.statModifiers || {};
                    unit.statModifiers.maxHealth = (unit.statModifiers.maxHealth || 0) + 30;
                    unit.updateHealthBar();
                } 
            },
            { 
                id: 'agility', name: 'Greater Agility', icon: '💨', desc: '+1 Movement', 
                effect: (unit) => { 
                    unit.moveRange += 1; 
                    unit.statModifiers = unit.statModifiers || {};
                    unit.statModifiers.moveRange = (unit.statModifiers.moveRange || 0) + 1;
                } 
            },
            { 
                id: 'precision', name: 'Precision Strikes', icon: '🎯', desc: '+5 Initiative & +5 Damage', 
                effect: (unit) => { 
                    unit.initiative += 5; unit.damage += 5; 
                    unit.statModifiers = unit.statModifiers || {};
                    unit.statModifiers.initiative = (unit.statModifiers.initiative || 0) + 5;
                    unit.statModifiers.damage = (unit.statModifiers.damage || 0) + 5;
                } 
            },
            { 
                id: 'ranged', name: 'Ranged Training', icon: '🏹', desc: 'Gain Ranged Attack (Range 3)', 
                effect: (unit) => { 
                    if (!unit.rangedRange) unit.rangedRange = 3; else unit.rangedRange += 2; 
                    unit.statModifiers = unit.statModifiers || {};
                    unit.statModifiers.rangedRange = unit.rangedRange;
                } 
            },
            { 
                id: 'legendary', name: 'Legendary Status', icon: '⭐', desc: '+20 HP, +5 DMG, +1 MOV', 
                effect: (unit) => { 
                    unit.maxHealth += 20; unit.health += 20; unit.damage += 5; unit.moveRange += 1;
                    unit.statModifiers = unit.statModifiers || {};
                    unit.statModifiers.maxHealth = (unit.statModifiers.maxHealth || 0) + 20;
                    unit.statModifiers.damage = (unit.statModifiers.damage || 0) + 5;
                    unit.statModifiers.moveRange = (unit.statModifiers.moveRange || 0) + 1;
                    unit.updateHealthBar();
                } 
            }
        ].sort(() => 0.5 - Math.random()).slice(0, 3);

        const buffContainer = document.getElementById('reward-buffs');
        buffContainer.innerHTML = '';
        buffOptions.forEach(buff => {
            const card = this.uiManager.createRewardCard('buff', buff.id, `
                <div style="font-size: 32px; margin-bottom: 5px;">${buff.icon}</div>
                <div style="color: #6B8B5B; font-weight: bold;">${buff.name}</div>
                <div style="font-size: 12px; color: #B8A896;">${buff.desc}</div>
            `, buff);
            buffContainer.appendChild(card);
        });

        const magicOptions = [
            { id: 'mana_max', name: 'Expanded Mana Pool', icon: '💧', desc: '+30 Max Mana', 
                buffType: 'maxMana', buffValue: 30,
                effect: () => { this.maxMana += 30; this.mana = this.maxMana; this.uiManager.updateManaDisplay(); } 
            },
            { id: 'mana_regen', name: 'Mana Flow', icon: '🌊', desc: '+2 Mana Regen per turn', 
                buffType: 'manaRegen', buffValue: 2,
                effect: () => { this.manaRegen += 2; } 
            },
            { id: 'spell_power', name: 'Arcane Power', icon: '🔮', desc: '+20% Spell Damage', 
                buffType: 'spellPower', buffValue: 0.2,
                effect: () => { this.spellPowerMultiplier = (this.spellPowerMultiplier || 1) + 0.2; } 
            },
            { id: 'spell_efficiency', name: 'Efficient Casting', icon: '⚡', desc: '-20% Mana Cost for all spells', 
                buffType: 'manaCost', buffValue: 0.8,
                effect: () => { this.manaCostMultiplier = (this.manaCostMultiplier || 1) * 0.8; } 
            },
            { id: 'mana_restore', name: 'Mana Surge', icon: '✨', desc: 'Fully restore mana now & +20 max', 
                buffType: 'maxMana', buffValue: 20,
                effect: () => { this.maxMana += 20; this.mana = this.maxMana; this.uiManager.updateManaDisplay(); } 
            },
            { id: 'double_cast', name: 'Twin Cast', icon: '🔄', desc: 'Cast 2 spells per round', 
                buffType: 'spellsPerRound', buffValue: 1,
                effect: () => { this.spellsPerRound = (this.spellsPerRound || 1) + 1; } 
            }
        ].sort(() => 0.5 - Math.random()).slice(0, 3);

        const magicContainer = document.getElementById('reward-magic');
        magicContainer.innerHTML = '';
        magicOptions.forEach(magic => {
            const card = this.uiManager.createRewardCard('magic', magic.id, `
                <div style="font-size: 32px; margin-bottom: 5px;">${magic.icon}</div>
                <div style="color: #6B7A9A; font-weight: bold;">${magic.name}</div>
                <div style="font-size: 12px; color: #B8A896;">${magic.desc}</div>
            `, magic);
            magicContainer.appendChild(card);
        });

        this.updateConfirmButton();
    }

    selectReward(category, id, cardElement, effectData) {
        if (category === 'buff') {
            this.showBuffTargetSelection(id, cardElement, effectData);
            return;
        }
        
        const container = document.getElementById(`reward-${category === 'magic' ? 'magic' : 'units'}`);
        container.querySelectorAll('.reward-card').forEach(c => {
            c.style.borderColor = '#555';
            c.style.transform = 'scale(1)';
            c.style.boxShadow = 'none';
        });
        
        cardElement.style.borderColor = '#A68966';
        cardElement.style.transform = 'scale(1.05)';
        cardElement.style.boxShadow = '0 0 20px rgba(255,215,0,0.3)';
        
        this.selectedRewards[category] = { id, effectData };
        this.updateConfirmButton();
    }

    showBuffTargetSelection(buffId, buffCard, buffData) {
        const playerUnits = this.unitManager.getPlayerUnits();
        if (playerUnits.length === 0) return;
        
        const modal = document.createElement('div');
        modal.id = 'buff-target-modal';
        modal.className = 'spellbook-modal';
        modal.style.cssText = 'display: flex; z-index: 2000;';
        modal.innerHTML = `
            <div class="spellbook-content" style="max-width: 500px;">
                <div class="spellbook-header">
                    <h2>💪 Select Unit to Buff</h2>
                    <p style="color: #6B8B5B;">${buffData.icon} ${buffData.name}</p>
                    <p style="color: #8B7355; font-size: 12px;">${buffData.desc}</p>
                </div>
                <div class="spell-grid" id="buff-target-grid"></div>
                <button class="spellbook-close" onclick="this.closest('.spellbook-modal').remove()">Cancel</button>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        const grid = document.getElementById('buff-target-grid');
        playerUnits.forEach(unit => {
            const card = document.createElement('div');
            card.className = 'spell-card';
            card.innerHTML = `
                <div style="font-size: 32px; margin-bottom: 5px;">${unit.emoji}</div>
                <div style="color: #A68966; font-weight: bold;">${unit.name}</div>
                <div style="font-size: 11px; color: #B8A896;">HP: ${unit.health}/${unit.maxHealth}</div>
            `;
            
            card.onclick = () => {
                modal.remove();
                
                const buffContainer = document.getElementById('reward-buffs');
                buffContainer.querySelectorAll('.reward-card').forEach(c => {
                    c.style.borderColor = '#555';
                    c.style.transform = 'scale(1)';
                    c.style.boxShadow = 'none';
                });
                
                buffCard.style.borderColor = '#A68966';
                buffCard.style.transform = 'scale(1.05)';
                buffCard.style.boxShadow = '0 0 20px rgba(255,215,0,0.3)';
                
                this.selectedRewards.buff = { id: buffId, effectData: buffData, targetUnit: unit };
                this.updateConfirmButton();
            };
            grid.appendChild(card);
        });
    }

    updateConfirmButton() {
        const btn = document.getElementById('confirm-rewards');
        const canGetNewUnit = this.battleNumber >= 2 && this.battleNumber % 2 === 0;
        
        let required = 2;
        if (canGetNewUnit) required = 3;
        
        let selected = 0;
        if (this.selectedRewards.buff) selected++;
        if (this.selectedRewards.magic) selected++;
        if (canGetNewUnit && this.selectedRewards.unit) selected++;
        
        btn.disabled = selected < required;
        btn.textContent = `Confirm Choices (${selected}/${required})`;
        
        if (selected === required) {
            btn.style.background = '#3E5D3E';
        } else {
            btn.style.background = '#3D3D3D';
        }
    }

    confirmRewards() {
        const canGetNewUnit = this.battleNumber >= 2 && this.battleNumber % 2 === 0;
        
        if (!this.selectedRewards.buff || !this.selectedRewards.magic) return;
        if (canGetNewUnit && !this.selectedRewards.unit) return;

        if (canGetNewUnit && this.selectedRewards.unit) {
            const unitType = this.selectedRewards.unit.id;
            let spawnX = 0, spawnY = 3;
            for (let y = 0; y < CONFIG.GRID_HEIGHT; y++) {
                if (!this.unitManager.getUnitAt(0, y)) {
                    spawnY = y;
                    break;
                }
            }
            this.unitManager.addUnit(unitType, spawnX, spawnY);
        }

        const buffEffect = this.selectedRewards.buff.effectData;
        const buffTarget = this.selectedRewards.buff.targetUnit;
        if (buffEffect && buffTarget) {
            buffEffect.effect(buffTarget);
        }

        const magicEffect = this.selectedRewards.magic.effectData;
        if (magicEffect) {
            magicEffect.effect();
            this.uiManager.showFloatingText(`${magicEffect.name} Acquired!`, 400, 200, '#A68966');
            
            if (magicEffect.buffType) {
                const existingBuff = this.magicBuffs.find(b => b.type === magicEffect.buffType);
                if (existingBuff && magicEffect.buffType === 'manaCost') {
                    existingBuff.value *= magicEffect.buffValue;
                } else if (existingBuff) {
                    existingBuff.value += magicEffect.buffValue;
                } else {
                    this.magicBuffs.push({
                        type: magicEffect.buffType,
                        value: magicEffect.buffValue,
                        name: magicEffect.name,
                        icon: magicEffect.icon
                    });
                }
                this.uiManager.updateMagicBuffsDisplay();
            }
        }

        this.nextBattle();
    }

    nextBattle() {
        document.getElementById('victory-screen').classList.add('hidden');
        document.getElementById('ui-panel').classList.remove('hidden');
        document.getElementById('placement-bar').classList.add('hidden');
        
        const playerUnits = this.unitManager.getPlayerUnits().map(u => ({
            type: u.type,
            x: u.gridX,
            y: u.gridY,
            statModifiers: u.statModifiers || null,
            bloodlustStacks: u.bloodlustStacks || 0
        }));
        
        const nextBattleNumber = this.battleNumber + 1;
        
        this.scene.restart({
            battleNumber: nextBattleNumber,
            placedUnits: playerUnits,
            magicBuffs: this.magicBuffs
        });
    }

    endTurn() {
        if (this.turnSystem.currentUnit && this.turnSystem.currentUnit.isPlayer) {
            // Mark unit as done for this turn
            this.turnSystem.currentUnit.hasMoved = true;
            this.turnSystem.currentUnit.hasAttacked = true;
            
            this.gridSystem.clearHighlights();
            this.cancelSpell();
            this.turnSystem.nextTurn();
        }
    }

    cancelSpell() {
        if (this.spellSystem.activeSpell) {
            this.spellSystem.clearSpell();
            this.gridSystem.clearAoePreview();
            this.uiManager.showFloatingText('Spell cancelled', 400, 300, '#888888');
        }
    }
}

// ============================================
// PRE-GAME SCENE
// ============================================
export class PreGameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'PreGameScene' });
        this.totalPoints = 1000;
        this.remainingPoints = 1000;
        this.unitCounts = { KNIGHT: 0, ARCHER: 0, WIZARD: 0, CLERIC: 0, ROGUE: 0, PALADIN: 0, RANGER: 0, BERSERKER: 0, SORCERER: 0 };
        this.placedUnits = [];
        this.placementMode = false;
        this.unitsToPlace = [];
    }

    create() {
        this.showArmySelection();
        this.gridGraphics = this.add.graphics();
        this.drawGrid();
        window.gameScene = this;
    }

    drawGrid() {
        this.gridGraphics.clear();
        for (let y = 0; y < CONFIG.GRID_HEIGHT; y++) {
            for (let x = 0; x < CONFIG.GRID_WIDTH; x++) {
                const isPlacementZone = x < 2;
                const baseColor = (x + y) % 2 === 0 ? CONFIG.COLORS.GRASS : CONFIG.COLORS.GRASS_DARK;
                // Make placement zone brighter
                const alpha = isPlacementZone ? 0.6 : 0.2;
                this.gridGraphics.fillStyle(baseColor, alpha);
                this.gridGraphics.fillRect(x * CONFIG.TILE_SIZE, y * CONFIG.TILE_SIZE, CONFIG.TILE_SIZE - 2, CONFIG.TILE_SIZE - 2);
                
                // Add border highlight for placement zone
                if (isPlacementZone) {
                    this.gridGraphics.lineStyle(2, 0xA68966, 0.5);
                    this.gridGraphics.strokeRect(
                        x * CONFIG.TILE_SIZE + 2,
                        y * CONFIG.TILE_SIZE + 2,
                        CONFIG.TILE_SIZE - 4,
                        CONFIG.TILE_SIZE - 4
                    );
                }
            }
        }
    }

    showArmySelection() {
        document.getElementById('pregame-screen').classList.remove('hidden');
        this.updatePointsDisplay();
    }

    updatePointsDisplay() {
        document.getElementById('points-remaining').textContent = this.remainingPoints;
        
        const confirmBtn = document.getElementById('confirm-army');
        const totalUnits = Object.values(this.unitCounts).reduce((a, b) => a + b, 0);
        confirmBtn.textContent = `Confirm Army (${totalUnits} units)`;
        confirmBtn.disabled = totalUnits === 0;
    }

    updateUnitCount(type, delta) {
        const cost = UNIT_TYPES[type].cost;
        const newCount = this.unitCounts[type] + delta;
        
        if (newCount < 0) return;
        if (delta > 0 && this.remainingPoints < cost) return;
        
        this.unitCounts[type] = newCount;
        this.remainingPoints -= delta * cost;
        
        document.getElementById(`count-${type}`).textContent = newCount;
        this.updatePointsDisplay();
    }

    confirmArmySelection() {
        document.getElementById('pregame-screen').classList.add('hidden');
        
        this.unitsToPlace = [];
        for (const [type, count] of Object.entries(this.unitCounts)) {
            for (let i = 0; i < count; i++) {
                this.unitsToPlace.push(type);
            }
        }
        
        this.startPlacementPhase();
    }

    startPlacementPhase() {
        this.placementMode = true;
        this.placedUnits = [];
        
        const placementBar = document.getElementById('placement-bar');
        placementBar.classList.remove('hidden');
        
        this.updatePlacementDisplay();
        
        this.input.on('pointerdown', (pointer) => {
            if (!this.placementMode || this.unitsToPlace.length === 0) return;
            
            const gridX = Math.floor(pointer.x / CONFIG.TILE_SIZE);
            const gridY = Math.floor(pointer.y / CONFIG.TILE_SIZE);
            
            if (gridX >= 0 && gridX < 2 && gridY >= 0 && gridY < CONFIG.GRID_HEIGHT) {
                const isOccupied = this.placedUnits.some(u => u.x === gridX && u.y === gridY);
                
                if (!isOccupied) {
                    const unitType = this.unitsToPlace.shift();
                    this.placedUnits.push({ type: unitType, x: gridX, y: gridY });
                    
                    const x = gridX * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
                    const y = gridY * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
                    
                    const text = this.add.text(x, y, UNIT_TYPES[unitType].emoji, {
                        fontSize: '36px'
                    }).setOrigin(0.5);
                    
                    this.updatePlacementDisplay();
                }
            }
        });
        
        this.input.on('pointermove', (pointer) => {
            if (!this.placementMode) return;
            this.drawGrid();
            
            const gridX = Math.floor(pointer.x / CONFIG.TILE_SIZE);
            const gridY = Math.floor(pointer.y / CONFIG.TILE_SIZE);
            
            if (gridX >= 0 && gridX < 2 && gridY >= 0 && gridY < CONFIG.GRID_HEIGHT) {
                const isOccupied = this.placedUnits.some(u => u.x === gridX && u.y === gridY);
                
                this.gridGraphics.fillStyle(isOccupied ? 0x9E4A4A : 0x6B8B5B, 0.5);
                this.gridGraphics.fillRect(
                    gridX * CONFIG.TILE_SIZE + 4,
                    gridY * CONFIG.TILE_SIZE + 4,
                    CONFIG.TILE_SIZE - 8,
                    CONFIG.TILE_SIZE - 8
                );
            }
        });
    }

    updatePlacementDisplay() {
        const remaining = this.unitsToPlace.length;
        const currentUnit = remaining > 0 ? UNIT_TYPES[this.unitsToPlace[0]].name : 'Done';
        const currentEmoji = remaining > 0 ? UNIT_TYPES[this.unitsToPlace[0]].emoji : '✓';
        
        document.getElementById('current-placement-unit').textContent = `${currentEmoji} ${currentUnit}`;
        document.getElementById('placement-remaining').textContent = remaining;
        document.getElementById('confirm-placement').disabled = remaining > 0;
    }

    confirmPlacement() {
        this.placementMode = false;
        document.getElementById('placement-bar').classList.add('hidden');
        
        this.scene.start('BattleScene', {
            placedUnits: this.placedUnits,
            battleNumber: 1
        });
    }
}
