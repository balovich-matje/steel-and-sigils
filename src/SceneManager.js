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
        this.permanentBuffs = false;
        this.armyBuffs = false;
        this.battleNumber = 1;
        this.victoryShown = false;
        this.magicBuffs = [];
        this.selectedUnit = null;
        this.selectedRewards = { unit: null, buff: null, magic: null };
        this.hasLootGoblin = false;
        this.lootGoblinReward = false;
        
        // PVP context
        this.isPVPContext = false;
        this.pvpManager = null;
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
        // Initialize systems
        this.gridSystem = new GridSystem(this);
        this.unitManager = new UnitManager(this);
        this.turnSystem = new TurnSystem(this);
        this.spellSystem = new SpellSystem(this);
        this.uiManager = new UIManager(this);

        // Handle PVP context
        if (data && data.isPVPContext) {
            this.isPVPContext = true;
            this.pvpManager = data.pvpManager;
        }

        // Track battle number for scaling
        if (data && data.battleNumber) {
            this.battleNumber = data.battleNumber;
        }
        
        // Restore magic buffs from previous battle
        if (data && data.magicBuffs) {
            this.magicBuffs = data.magicBuffs;
            for (const buff of this.magicBuffs) {
                if (buff.type === 'manaRegen') this.manaRegen += buff.value;
                if (buff.type === 'manaCost') this.manaCostMultiplier = Math.max(0.2, 1 - buff.value); // buff.value is reduction amount (0.2 = 20%)
                if (buff.type === 'spellPower') this.spellPowerMultiplier += buff.value;
                if (buff.type === 'spellsPerRound') this.spellsPerRound += buff.value;
                if (buff.type === 'maxMana') this.maxMana += buff.value;
                if (buff.type === 'permanentBuffs') this.permanentBuffs = true;
                if (buff.type === 'armyBuffs') this.armyBuffs = true;
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
                    
                    // Restore legendary buffs
                    if (unitData.statModifiers.hasDoubleStrike) unit.hasDoubleStrike = true;
                    if (unitData.statModifiers.hasCleave) unit.hasCleave = true;
                    if (unitData.statModifiers.hasRicochet) unit.hasRicochet = true;
                    if (unitData.statModifiers.hasPiercing) unit.hasPiercing = true;
                    
                    unit.updateHealthBar();
                }
                
                // Restore Bloodlust stacks for Berserker
                if (unitData.bloodlustStacks && unit.type === 'BERSERKER') {
                    unit.bloodlustStacks = unitData.bloodlustStacks;
                    unit.damage += unitData.bloodlustStacks * 15;
                }
                
                // Restore current health (if saved)
                if (unitData.health !== undefined) {
                    unit.health = Math.min(unitData.health, unit.maxHealth);
                    unit.updateHealthBar();
                }
                
                // Restore active buffs
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
            }
        }
        
        // Create enemy units
        this.createEnemyUnits();

        // Add click handler for spell targeting
        this.input.on('pointerdown', (pointer) => {
            // Check if spellbook modal is open - if so, don't process game clicks
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

        // Update mana display
        this.uiManager.updateManaDisplay();

        // Start the game
        this.turnSystem.initQueue();

        // Make scene accessible globally for UI buttons
        window.gameScene = this;

        // Keyboard controls
        this.input.keyboard.on('keydown-S', () => {
            this.openSpellBook();
        });
        
        this.input.keyboard.on('keydown-E', () => {
            if (this.turnSystem.currentUnit && this.turnSystem.currentUnit.isPlayer) {
                this.endTurn();
            }
        });
        
        this.input.keyboard.on('keydown-ESC', () => {
            // Check if spellbook modal is open - close it
            const spellbookModal = document.getElementById('spellbook-modal');
            if (spellbookModal && !spellbookModal.classList.contains('hidden')) {
                this.closeSpellBook();
                return;
            }
            // Otherwise cancel active spell if any
            if (this.spellSystem.activeSpell) {
                this.spellSystem.clearSpell();
                this.uiManager.showFloatingText('Spell cancelled', 400, 300, '#A68966');
            }
        });
    }

    createEnemyUnits() {
        // Check if this is a boss wave (every 5 rounds)
        const isBossWave = this.battleNumber % 5 === 0;
        
        if (isBossWave) {
            this.createBossWave();
            return;
        }
        
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
    
    createBossWave() {
        // Boss wave: Spawn a single powerful boss
        const bossTypes = ['OGRE_CHIEFTAIN', 'ORC_SHAMAN_KING', 'LOOT_GOBLIN'];
        
        // Loot Goblin has reduced spawn chance (30% chance if rolled, otherwise 50/50 between the other two)
        let selectedBoss;
        const roll = Math.random();
        if (roll < 0.3) {
            selectedBoss = 'LOOT_GOBLIN';
        } else if (roll < 0.65) {
            selectedBoss = 'OGRE_CHIEFTAIN';
        } else {
            selectedBoss = 'ORC_SHAMAN_KING';
        }
        
        const availablePositions = this.getEnemySpawnPositions();
        // Filter positions that can fit 2x2 bosses (need at least 2 columns from right edge)
        const validPositions = availablePositions.filter(pos => {
            const template = UNIT_TYPES[selectedBoss];
            const size = template.bossSize || 1;
            return pos.x <= CONFIG.GRID_WIDTH - size && pos.y <= CONFIG.GRID_HEIGHT - size;
        });
        
        if (validPositions.length === 0) {
            // Fallback to normal wave if no valid positions
            this.uiManager.showFloatingText(
                `Battle ${this.battleNumber} - No space for boss!`,
                320, 100, '#ff0000'
            );
            return;
        }
        
        // Pick a random position from valid positions
        const pos = validPositions[Math.floor(Math.random() * validPositions.length)];
        
        const boss = this.unitManager.addUnit(selectedBoss, pos.x, pos.y);
        
        if (boss) {
            // Scale boss stats based on battle number
            const statMultiplier = 1 + (this.battleNumber - 1) * 0.1;
            boss.maxHealth = Math.floor(boss.maxHealth * statMultiplier);
            boss.health = boss.maxHealth;
            boss.damage = Math.floor(boss.damage * statMultiplier);
            boss.updateHealthBar();
            
            // Mark this battle as having a loot goblin for special reward
            this.hasLootGoblin = (selectedBoss === 'LOOT_GOBLIN');
            
            // Show boss announcement
            const bossName = UNIT_TYPES[selectedBoss].name;
            const bossEmoji = UNIT_TYPES[selectedBoss].emoji;
            
            this.uiManager.showFloatingText(
                `👑 BOSS WAVE! 👑`,
                320, 80, '#FFD700'
            );
            this.uiManager.showFloatingText(
                `${bossEmoji} ${bossName} Appears!`,
                320, 120, '#ff4444'
            );
        }
    }

    getEnemySpawnPositions() {
        const positions = [];
        for (let y = 0; y < CONFIG.GRID_HEIGHT; y++) {
            for (let x = CONFIG.GRID_WIDTH - 3; x < CONFIG.GRID_WIDTH; x++) {
                // Check if position is occupied by a player unit
                const existingUnit = this.unitManager.getUnitAt(x, y);
                if (!existingUnit) {
                    positions.push({ x, y });
                }
            }
        }
        // Sort by x descending (prefer right side for bosses)
        return positions.sort((a, b) => b.x - a.x);
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
    
    // Move unit for AI without setting hasMoved (for multi-cell movement)
    moveUnitAI(unit, newX, newY) {

        this.unitManager.updateUnitPosition(unit, newX, newY);
        // Note: hasMoved is NOT set here - AI handles that separately after all movement
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
                
                // Paladin Cleave: 3x3 area damage
                if (attacker.hasCleave) {
                    this.performCleaveAttack(attacker, defender, damage);
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

                // Berserker Legendary: Double Strike
                if (attacker.hasDoubleStrike && !isSecondStrike && defender.health > 0) {
                    this.time.delayedCall(300, () => {
                        this.uiManager.showBuffText(attacker, 'FRENZY!', '#9E4A4A');
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

    performCleaveAttack(attacker, mainTarget, fullDamage) {
        // Deal full damage to main target
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

        // Deal 50% damage to adjacent units in 3x3 area
        const cleaveDamage = Math.floor(fullDamage * 0.5);
        const enemyUnits = this.unitManager.units.filter(u => !u.isPlayer && !u.isDead);
        
        enemyUnits.forEach(enemy => {
            if (enemy === mainTarget) return;
            const dist = Math.abs(enemy.gridX - mainTarget.gridX) + Math.abs(enemy.gridY - mainTarget.gridY);
            if (dist <= 1) { // Adjacent in 3x3 area (including diagonals)
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
        if (!attacker.canAttack()) return;

        attacker.hasAttacked = true;
        document.body.style.cursor = 'default';

        // Create arrow/projectile
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
                
                // Wizard Piercing: Shot goes through all enemies in line
                if (attacker.hasPiercing) {
                    this.performPiercingAttack(attacker, defender);
                }
                // Ranger Ricochet: Bounce to nearby targets
                else if (attacker.hasRicochet) {
                    this.performRicochetAttack(attacker, defender);
                }
                else {
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
    }

    performRicochetAttack(attacker, mainTarget) {
        const damage = Math.floor(attacker.damage * 0.8 * attacker.blessValue);
        
        // Hit main target
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

        // Find nearby enemies within 2 tiles to bounce to
        const bounceDamage = Math.floor(damage * 0.5);
        const enemyUnits = this.unitManager.units.filter(u => !u.isPlayer && !u.isDead && u !== mainTarget);
        
        enemyUnits.forEach((enemy, index) => {
            const dist = Math.abs(enemy.gridX - mainTarget.gridX) + Math.abs(enemy.gridY - mainTarget.gridY);
            if (dist <= 2) {
                this.time.delayedCall(200 * (index + 1), () => {
                    // Visual bounce arrow
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

    performPiercingAttack(attacker, target) {
        const baseDamage = Math.floor(attacker.damage * 0.8 * attacker.blessValue);
        
        // Hit all enemies in a line from attacker through target
        const dx = target.gridX - attacker.gridX;
        const dy = target.gridY - attacker.gridY;
        const stepX = dx === 0 ? 0 : Math.sign(dx);
        const stepY = dy === 0 ? 0 : Math.sign(dy);
        
        this.uiManager.showBuffText(attacker, 'PIERCE!', '#6B7A9A');
        
        // Find all enemies in the line of fire
        const enemyUnits = this.unitManager.units.filter(u => !u.isPlayer && !u.isDead);
        let hitCount = 0;
        
        enemyUnits.forEach(enemy => {
            // Check if enemy is in line with the shot
            const ex = enemy.gridX - attacker.gridX;
            const ey = enemy.gridY - attacker.gridY;
            
            // Must be in same direction
            const enemyStepX = ex === 0 ? 0 : Math.sign(ex);
            const enemyStepY = ey === 0 ? 0 : Math.sign(ey);
            
            if (enemyStepX === stepX && enemyStepY === stepY) {
                // Check if collinear (same ratio)
                const isCollinear = (stepX === 0 || stepY === 0) ? 
                    (stepX === 0 ? ex === 0 : ey === 0) :
                    (Math.abs(ex * stepY - ey * stepX) <= 1);
                
                if (isCollinear) {
                    hitCount++;
                    const delay = hitCount * 100;
                    
                    this.time.delayedCall(delay, () => {
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
    
    // Check if loot goblin was killed (for special reward)
    wasLootGoblinKilled() {
        // Check if this battle had a loot goblin that is now dead
        // We need to track this differently since the unit is removed from alive list
        // For now, we check if hasLootGoblin was set and there are no loot goblins in enemy units
        if (!this.hasLootGoblin) return false;
        const lootGoblins = this.unitManager.units.filter(u => u.type === 'LOOT_GOBLIN');
        const aliveLootGoblins = lootGoblins.filter(u => !u.isDead && u.health > 0);
        // If there was a loot goblin but none are alive now, it was killed
        return lootGoblins.length > 0 && aliveLootGoblins.length === 0;
    }

    showVictoryScreen(playerWon) {
        const victoryScreen = document.getElementById('victory-screen');
        const victoryText = document.getElementById('victory-text');
        const confirmBtn = document.getElementById('confirm-rewards');

        victoryText.innerHTML = playerWon ? '🎉 Victory! 🎉' : 'Defeat...';
        victoryText.style.color = playerWon ? '#A68966' : '#9E4A4A';

        if (playerWon) {
            // Check for Loot Goblin special reward
            this.lootGoblinReward = this.wasLootGoblinKilled();
            
            const canGetNewUnit = this.battleNumber >= 2 && this.battleNumber % 2 === 0;
            this.selectedRewards = { 
                unit: canGetNewUnit ? null : { id: 'skipped', effectData: null }, 
                buff: null, 
                magic: null 
            };
            
            // If loot goblin was killed, show special reward screen first
            if (this.lootGoblinReward) {
                this.showLootGoblinReward();
            } else {
                this.generateRewardChoices();
            }
            
            confirmBtn.style.display = 'block';
            document.getElementById('rewards-container').style.display = 'flex';
            document.getElementById('defeat-message').style.display = 'none';
            document.getElementById('victory-subtitle').style.display = 'block';
        } else {
            // Defeat - hide rewards, show defeat message
            document.getElementById('rewards-container').style.display = 'none';
            document.getElementById('defeat-message').style.display = 'block';
            document.getElementById('victory-subtitle').style.display = 'none';
            confirmBtn.style.display = 'none';
            
            // If in PVP context, report defeat to PVPMatchScene
            if (this.isPVPContext) {
                setTimeout(() => {
                    const pvpMatchScene = this.scene.get('PVPMatchScene');
                    if (pvpMatchScene) {
                        pvpMatchScene.reportBattleComplete(false, [], this.magicBuffs);
                    }
                }, 3000); // Give player time to see defeat message
            }
        }

        victoryScreen.classList.remove('hidden');
    }
    
    // Restore the original rewards container structure
    restoreRewardContainerStructure() {
        const rewardsContainer = document.getElementById('rewards-container');
        rewardsContainer.innerHTML = `
            <div style="width: 100%;">
                <h3 style="color: #A68966; text-align: center; margin-bottom: 10px;">⚔️ Recruit a New Unit</h3>
                <div id="reward-units" style="display: flex; gap: 15px; flex-wrap: wrap; justify-content: center;"></div>
            </div>
            
            <div style="width: 100%;">
                <h3 style="color: #8B9A6B; text-align: center; margin-bottom: 10px;">💪 Buff an Existing Unit</h3>
                <div id="reward-buffs" style="display: flex; gap: 15px; flex-wrap: wrap; justify-content: center;"></div>
            </div>
            
            <div style="width: 100%;">
                <h3 style="color: #6B7A9A; text-align: center; margin-bottom: 10px;">🧙 Spell or Mana Enhancement</h3>
                <div id="reward-magic" style="display: flex; gap: 15px; flex-wrap: wrap; justify-content: center;"></div>
            </div>
        `;
    }
    
    // Show special Loot Goblin reward - choice of 3 unit buffs
    showLootGoblinReward() {
        const rewardsContainer = document.getElementById('rewards-container');
        
        // Clear existing content and show loot goblin reward UI
        rewardsContainer.innerHTML = '';
        
        // Create loot goblin reward section
        const lootSection = document.createElement('div');
        lootSection.style.cssText = 'grid-column: 1 / -1; text-align: center; padding: 20px;';
        lootSection.innerHTML = `
            <div style="font-size: 48px; margin-bottom: 10px;">💰</div>
            <div style="color: #FFD700; font-size: 24px; font-weight: bold; text-shadow: 0 0 10px rgba(255, 215, 0, 0.5);">
                Loot Goblin Defeated!
            </div>
            <div style="color: #A68966; font-size: 16px; margin-top: 10px;">
                Choose one of these powerful buffs for your army:
            </div>
            <div style="margin-top: 20px; color: #4CAF50;">
                ✨ 3 buff choices available! ✨
            </div>
        `;
        rewardsContainer.appendChild(lootSection);
        
        // Create buff selection container
        const buffContainer = document.createElement('div');
        buffContainer.id = 'loot-goblin-buffs';
        buffContainer.className = 'reward-column';
        buffContainer.style.cssText = 'grid-column: 1 / -1; display: flex; justify-content: center; gap: 20px; flex-wrap: wrap;';
        rewardsContainer.appendChild(buffContainer);
        
        // Generate 3 random buffs (from standard buffs)
        const standardBuffs = [
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
        ];
        
        const buffOptions = standardBuffs.sort(() => 0.5 - Math.random()).slice(0, 3);
        
        buffOptions.forEach(buff => {
            const isLegendary = buff.id === 'legendary';
            const card = this.uiManager.createRewardCard('buff', buff.id, `
                <div style="font-size: 32px; margin-bottom: 5px;">${buff.icon}</div>
                <div style="color: ${isLegendary ? '#ff8c00' : '#6B8B5B'}; font-weight: bold;${isLegendary ? ' text-shadow: 0 0 6px rgba(255, 140, 0, 0.5);' : ''}">${buff.name}</div>
                <div style="font-size: 12px; color: #B8A896; margin-top: 5px;">${buff.desc}</div>
                ${isLegendary ? '<div style="font-size: 11px; color: #ff8c00; margin-top: 4px; text-shadow: 0 0 4px rgba(255, 140, 0, 0.4);">⚡ Legendary</div>' : ''}
            `, buff, isLegendary);
            
            card.onclick = () => {
                // Show unit selection for this buff
                this.showBuffTargetSelectionForLootGoblin(buff, card);
            };
            
            buffContainer.appendChild(card);
        });
        
        // Skip button
        const skipBtn = document.createElement('button');
        skipBtn.className = 'spellbook-close';
        skipBtn.style.cssText = 'grid-column: 1 / -1; margin-top: 20px;';
        skipBtn.textContent = 'Skip Bonus (Continue to Normal Rewards)';
        skipBtn.onclick = () => {
            this.lootGoblinReward = false;
            this.restoreRewardContainerStructure();
            this.generateRewardChoices();
        };
        rewardsContainer.appendChild(skipBtn);
    }
    
    // Show unit selection for Loot Goblin buff
    showBuffTargetSelectionForLootGoblin(buffData, buffCard) {
        const playerUnits = this.unitManager.getPlayerUnits();
        if (playerUnits.length === 0) return;
        
        const modal = document.createElement('div');
        modal.id = 'loot-goblin-target-modal';
        modal.className = 'spellbook-modal';
        modal.style.cssText = 'display: flex; z-index: 2000;';
        modal.innerHTML = `
            <div class="spellbook-content" style="max-width: 500px;">
                <div class="spellbook-header">
                    <h2>💰 Select Unit to Buff</h2>
                    <p style="color: #FFD700;">${buffData.icon} ${buffData.name}</p>
                    <p style="color: #8B7355; font-size: 12px;">${buffData.desc}</p>
                </div>
                <div class="spell-grid" id="loot-goblin-target-grid"></div>
                <button class="spellbook-close" onclick="this.closest('.spellbook-modal').remove()">Cancel</button>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        const grid = document.getElementById('loot-goblin-target-grid');
        playerUnits.forEach(unit => {
            const card = document.createElement('div');
            card.className = 'spell-card';
            card.innerHTML = `
                <div style="font-size: 32px; margin-bottom: 5px;">${unit.emoji}</div>
                <div style="color: #A68966; font-weight: bold;">${unit.name}</div>
                <div style="font-size: 11px; color: #B8A896; margin-top: 4px;">
                    HP: ${unit.health}/${unit.maxHealth} | DMG: ${unit.damage}<br>
                    MOV: ${unit.moveRange} | INIT: ${unit.initiative}
                </div>
            `;
            
            card.onclick = () => {
                modal.remove();
                
                // Apply the buff
                buffData.effect(unit);
                this.uiManager.showFloatingText(`${buffData.name} Applied!`, 400, 300, '#FFD700');
                
                // Mark loot goblin reward as handled and show normal rewards
                this.lootGoblinReward = false;
                this.restoreRewardContainerStructure();
                this.generateRewardChoices();
            };
            
            grid.appendChild(card);
        });
    }

    // Reward system
    generateRewardChoices() {
        const canGetNewUnit = this.battleNumber >= 2 && this.battleNumber % 2 === 0;
        
        const unitContainer = document.getElementById('reward-units');
        unitContainer.innerHTML = '';
        
        if (canGetNewUnit) {
            const recruitableUnits = ['KNIGHT', 'ARCHER', 'WIZARD', 'PALADIN', 'RANGER', 'BERSERKER', 'CLERIC', 'ROGUE', 'SORCERER'];
            const unitOptions = recruitableUnits
                .sort(() => 0.5 - Math.random())
                .slice(0, 3);
            
            // Legendary units that get special glowing border
            const legendaryUnits = ['PALADIN', 'RANGER', 'BERSERKER', 'SORCERER'];
            
            unitOptions.forEach(unitType => {
                const template = UNIT_TYPES[unitType];
                const isLegendary = legendaryUnits.includes(unitType);
                const card = this.uiManager.createRewardCard('unit', unitType, `
                    <div style="font-size: 40px; margin-bottom: 5px;">${template.emoji}</div>
                    <div style="color: ${isLegendary ? '#ff8c00' : '#A68966'}; font-weight: bold;${isLegendary ? ' text-shadow: 0 0 6px rgba(255, 140, 0, 0.5);' : ''}">${template.name}</div>
                    <div style="font-size: 12px; color: #B8A896;">
                        HP: ${template.health} | DMG: ${template.damage}<br>
                        MOV: ${template.moveRange}${template.rangedRange ? ` | RNG: ${template.rangedRange}` : ''}<br>
                        INIT: ${template.initiative}
                    </div>
                    ${isLegendary ? '<div style="font-size: 11px; color: #ff8c00; margin-top: 4px; text-shadow: 0 0 4px rgba(255, 140, 0, 0.4);">⚡ Legendary Class</div>' : ''}
                `, null, isLegendary);
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

        // Standard buffs pool
        const standardBuffs = [
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
        ];

        // 50% chance to roll a legendary buff instead of a standard one
        let buffOptions = [];
        const legendaryBuff = this.tryGenerateLegendaryBuff();
        
        if (legendaryBuff && Math.random() < 0.5) {
            // Legendary rolled - include it as one of the 3 buffs
            const shuffledStandard = [...standardBuffs].sort(() => 0.5 - Math.random());
            buffOptions = [legendaryBuff, ...shuffledStandard.slice(0, 2)];
        } else {
            // No legendary - just 3 standard buffs
            buffOptions = standardBuffs.sort(() => 0.5 - Math.random()).slice(0, 3);
        }

        const buffContainer = document.getElementById('reward-buffs');
        buffContainer.innerHTML = '';
        buffOptions.forEach(buff => {
            const isLegendary = buff.id.startsWith('legendary_');
            const card = this.uiManager.createRewardCard(
                isLegendary ? 'legendary' : 'buff', 
                buff.id, 
                `
                    <div style="font-size: 32px; margin-bottom: 5px;">${buff.icon}</div>
                    <div style="color: ${isLegendary ? '#ff8c00' : '#6B8B5B'}; font-weight: bold;${isLegendary ? ' text-shadow: 0 0 8px rgba(255, 140, 0, 0.6);' : ''}">${buff.name}</div>
                    ${isLegendary ? '<div style="font-size: 11px; color: #ff8c00; margin-top: 2px; text-shadow: 0 0 5px rgba(255, 140, 0, 0.5);">⚡ Legendary Power</div>' : ''}
                    <div style="font-size: 12px; color: #B8A896; margin-top: 5px;">${buff.desc}</div>
                `, 
                buff,
                isLegendary
            );
            
            buffContainer.appendChild(card);
        });

        // Filter out buffs that are already owned (unique buffs)
        const ownedBuffTypes = new Set(this.magicBuffs.map(b => b.type));
        const allMagicOptions = [
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
                buffType: 'manaCost', buffValue: 0.2,
                effect: () => { 
                    // Flat -20% from base, capped at 80% reduction (0.2 multiplier minimum)
                    this.manaCostMultiplier = Math.max(0.2, this.manaCostMultiplier - 0.2);
                },
                maxStacks: 4
            },
            { id: 'mana_restore', name: 'Mana Surge', icon: '✨', desc: 'Fully restore mana now & +20 max', 
                buffType: 'maxMana', buffValue: 20,
                effect: () => { this.maxMana += 20; this.mana = this.maxMana; this.uiManager.updateManaDisplay(); } 
            },
            { id: 'double_cast', name: 'Twin Cast', icon: '🔄', desc: 'Cast 2 spells per round', 
                buffType: 'spellsPerRound', buffValue: 1,
                effect: () => { this.spellsPerRound = (this.spellsPerRound || 1) + 1; } 
            },
            { id: 'permanent_buffs', name: 'Eternal Magic', icon: '♾️', desc: 'Spell buffs no longer expire', 
                buffType: 'permanentBuffs', buffValue: 1,
                effect: () => { this.permanentBuffs = true; },
                unique: true
            },
            { id: 'army_buffs', name: 'Mass Enchantment', icon: '🌟', desc: 'Spells target whole army', 
                buffType: 'armyBuffs', buffValue: 1,
                effect: () => { this.armyBuffs = true; },
                unique: true
            }
        ];
        
        // Filter out unique buffs that are already owned, and capped buffs
        const availableOptions = allMagicOptions.filter(opt => {
            if (opt.unique && ownedBuffTypes.has(opt.buffType)) return false;
            // Check for max stacks (like mana cost reduction capped at 4)
            if (opt.maxStacks) {
                const existingBuff = this.magicBuffs.find(b => b.type === opt.buffType);
                if (existingBuff && existingBuff.value >= opt.maxStacks * opt.buffValue) return false;
            }
            return true;
        });
        
        const magicOptions = availableOptions.sort(() => 0.5 - Math.random()).slice(0, 3);

        const magicContainer = document.getElementById('reward-magic');
        magicContainer.innerHTML = '';
        
        // Special legendary magic buffs
        const legendaryMagicBuffs = ['permanent_buffs', 'army_buffs'];
        
        magicOptions.forEach(magic => {
            const isLegendary = legendaryMagicBuffs.includes(magic.id);
            const card = this.uiManager.createRewardCard('magic', magic.id, `
                <div style="font-size: 32px; margin-bottom: 5px;">${magic.icon}</div>
                <div style="color: ${isLegendary ? '#ff8c00' : '#6B7A9A'}; font-weight: bold;${isLegendary ? ' text-shadow: 0 0 6px rgba(255, 140, 0, 0.5);' : ''}">${magic.name}</div>
                <div style="font-size: 12px; color: #B8A896;">${magic.desc}</div>
                ${isLegendary ? '<div style="font-size: 11px; color: #ff8c00; margin-top: 4px; text-shadow: 0 0 4px rgba(255, 140, 0, 0.4);">✨ Legendary Enhancement</div>' : ''}
            `, magic, isLegendary);
            magicContainer.appendChild(card);
        });

        this.updateConfirmButton();
    }

    // Try to generate a legendary buff (50% chance when called)
    tryGenerateLegendaryBuff() {
        const playerUnits = this.unitManager.units.filter(u => u.isPlayer);
        const availableLegendaryBuffs = [];

        // Helper to check if any unit of a type already has the buff
        const hasBuff = (unitType, buffProperty) => {
            return playerUnits.some(u => u.type === unitType && u[buffProperty]);
        };

        // Check for eligible legendary buffs based on player units
        // Filter out buffs that units already have
        if (playerUnits.some(u => u.type === 'BERSERKER') && !hasBuff('BERSERKER', 'hasDoubleStrike')) {
            availableLegendaryBuffs.push({
                id: 'legendary_frenzy',
                name: 'Blood Frenzy',
                icon: '🩸',
                desc: 'Berserker: Strikes 2 times per attack',
                unitType: 'BERSERKER',
                effect: (unit) => { 
                    unit.hasDoubleStrike = true;
                    unit.statModifiers = unit.statModifiers || {};
                    unit.statModifiers.hasDoubleStrike = true;
                }
            });
        }

        if (playerUnits.some(u => u.type === 'PALADIN') && !hasBuff('PALADIN', 'hasCleave')) {
            availableLegendaryBuffs.push({
                id: 'legendary_cleave',
                name: 'Divine Wrath',
                icon: '⚡',
                desc: 'Paladin: 3x3 cleave attack, +40 damage',
                unitType: 'PALADIN',
                effect: (unit) => { 
                    unit.hasCleave = true;
                    unit.damage += 40;
                    unit.statModifiers = unit.statModifiers || {};
                    unit.statModifiers.hasCleave = true;
                    unit.statModifiers.damage = (unit.statModifiers.damage || 0) + 40;
                }
            });
        }

        if (playerUnits.some(u => u.type === 'RANGER') && !hasBuff('RANGER', 'hasRicochet')) {
            availableLegendaryBuffs.push({
                id: 'legendary_ricochet',
                name: 'Ricochet Shot',
                icon: '🏹',
                desc: 'Ranger: Arrows bounce to nearby targets (2 range, 50% dmg), +40 damage',
                unitType: 'RANGER',
                effect: (unit) => { 
                    unit.hasRicochet = true;
                    unit.damage += 40;
                    unit.statModifiers = unit.statModifiers || {};
                    unit.statModifiers.hasRicochet = true;
                    unit.statModifiers.damage = (unit.statModifiers.damage || 0) + 40;
                }
            });
        }

        if (playerUnits.some(u => u.type === 'WIZARD') && !hasBuff('WIZARD', 'hasPiercing')) {
            availableLegendaryBuffs.push({
                id: 'legendary_piercing',
                name: 'Arcane Pierce',
                icon: '🔮',
                desc: 'Wizard: 20 range, shots pierce through enemies',
                unitType: 'WIZARD',
                effect: (unit) => { 
                    unit.hasPiercing = true;
                    unit.rangedRange = 20;
                    unit.statModifiers = unit.statModifiers || {};
                    unit.statModifiers.hasPiercing = true;
                    unit.statModifiers.rangedRange = 20;
                }
            });
        }

        if (availableLegendaryBuffs.length === 0) {
            return null;
        }

        // Return a random legendary buff
        return availableLegendaryBuffs[Math.floor(Math.random() * availableLegendaryBuffs.length)];
    }

    selectReward(category, id, cardElement, effectData) {
        if (category === 'buff') {
            this.showBuffTargetSelection(id, cardElement, effectData);
            return;
        }
        
        if (category === 'legendary') {
            this.showLegendaryTargetSelection(id, cardElement, effectData);
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

    clearBuffSelection() {
        const buffContainer = document.getElementById('reward-buffs');
        if (buffContainer) {
            buffContainer.querySelectorAll('.reward-card').forEach(c => {
                c.style.borderColor = '#555';
                c.style.transform = 'scale(1)';
                c.style.boxShadow = 'none';
            });
        }
        this.selectedRewards.buff = null;
        this.selectedRewards.legendary = null;
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
                <div style="font-size: 11px; color: #B8A896; margin-top: 4px;">
                    HP: ${unit.health}/${unit.maxHealth} | DMG: ${unit.damage}<br>
                    MOV: ${unit.moveRange} | INIT: ${unit.initiative}
                </div>
            `;
            
            card.onclick = () => {
                modal.remove();
                
                // Clear any existing buff/legendary selection
                this.clearBuffSelection();
                
                buffCard.style.borderColor = '#A68966';
                buffCard.style.transform = 'scale(1.05)';
                buffCard.style.boxShadow = '0 0 20px rgba(255,215,0,0.3)';
                
                this.selectedRewards.buff = { id: buffId, effectData: buffData, targetUnit: unit };
                this.updateConfirmButton();
            };
            grid.appendChild(card);
        });
    }

    showLegendaryTargetSelection(buffId, buffCard, buffData) {
        // Filter by unit type AND exclude units that already have this buff
        const buffPropertyMap = {
            'BERSERKER': 'hasDoubleStrike',
            'PALADIN': 'hasCleave',
            'RANGER': 'hasRicochet',
            'WIZARD': 'hasPiercing'
        };
        const buffProperty = buffPropertyMap[buffData.unitType];
        
        const playerUnits = this.unitManager.getPlayerUnits().filter(u => {
            if (u.type !== buffData.unitType) return false;
            if (buffProperty && u[buffProperty]) return false; // Already has buff
            return true;
        });
        
        if (playerUnits.length === 0) return;
        
        const modal = document.createElement('div');
        modal.id = 'legendary-target-modal';
        modal.className = 'spellbook-modal';
        modal.style.cssText = 'display: flex; z-index: 2000;';
        modal.innerHTML = `
            <div class="spellbook-content" style="max-width: 500px;">
                <div class="spellbook-header">
                    <h2 style="color: #D4A574;">⚡ Select Legendary Champion</h2>
                    <p style="color: #D4A574; text-shadow: 0 0 10px rgba(212, 165, 116, 0.5);">${buffData.icon} ${buffData.name}</p>
                    <p style="color: #8B7355; font-size: 12px;">${buffData.desc}</p>
                </div>
                <div class="spell-grid" id="legendary-target-grid"></div>
                <button class="spellbook-close" onclick="this.closest('.spellbook-modal').remove()">Cancel</button>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        const grid = document.getElementById('legendary-target-grid');
        playerUnits.forEach(unit => {
            const card = document.createElement('div');
            card.className = 'spell-card';
            card.style.border = '2px solid #8B6914';
            card.innerHTML = `
                <div style="font-size: 32px; margin-bottom: 5px;">${unit.emoji}</div>
                <div style="color: #D4A574; font-weight: bold;">${unit.name}</div>
                <div style="font-size: 11px; color: #B8A896; margin-top: 4px;">
                    HP: ${unit.health}/${unit.maxHealth} | DMG: ${unit.damage}<br>
                    MOV: ${unit.moveRange} | INIT: ${unit.initiative}
                </div>
            `;
            
            card.onclick = () => {
                modal.remove();
                
                // Clear any existing buff/legendary selection
                this.clearBuffSelection();
                
                buffCard.style.borderColor = '#D4A574';
                buffCard.style.transform = 'scale(1.05)';
                buffCard.style.boxShadow = '0 0 30px rgba(212, 165, 116, 0.5)';
                
                this.selectedRewards.legendary = { id: buffId, effectData: buffData, targetUnit: unit };
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
        // Buff or legendary counts as the buff slot
        if (this.selectedRewards.buff || this.selectedRewards.legendary) selected++;
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
        
        // Either buff or legendary must be selected
        const hasBuff = this.selectedRewards.buff || this.selectedRewards.legendary;
        if (!hasBuff || !this.selectedRewards.magic) return;
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

        // Apply regular buff (if selected)
        if (this.selectedRewards.buff) {
            const buffEffect = this.selectedRewards.buff.effectData;
            const buffTarget = this.selectedRewards.buff.targetUnit;
            if (buffEffect && buffTarget) {
                buffEffect.effect(buffTarget);
            }
        }

        // Apply legendary buff (if selected)
        if (this.selectedRewards.legendary) {
            const legendaryEffect = this.selectedRewards.legendary.effectData;
            const targetUnit = this.selectedRewards.legendary.targetUnit;
            if (legendaryEffect && targetUnit) {
                legendaryEffect.effect(targetUnit);
                this.uiManager.showFloatingText(`${this.selectedRewards.legendary.effectData.name} Acquired!`, 400, 250, '#D4A574');
            }
        }

        // Magic buffs are only added to the array here; effects applied during create()
        const magicEffect = this.selectedRewards.magic.effectData;
        if (magicEffect) {
            this.uiManager.showFloatingText(`${magicEffect.name} Acquired!`, 400, 200, '#A68966');
            
            if (magicEffect.buffType) {
                const existingBuff = this.magicBuffs.find(b => b.type === magicEffect.buffType);
                if (existingBuff && magicEffect.buffType === 'manaCost') {
                    // Flat addition for mana cost reduction (capped at 0.8 = 80%)
                    existingBuff.value = Math.min(0.8, existingBuff.value + magicEffect.buffValue);
                } else if (existingBuff && magicEffect.buffType === 'maxMana') {
                    existingBuff.value += magicEffect.buffValue;
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
            health: u.health, // Save current health
            statModifiers: u.statModifiers || null,
            bloodlustStacks: u.bloodlustStacks || 0,
            // Persist active buffs
            buffs: {
                hasteRounds: u.hasteRounds,
                hasteValue: u.hasteRounds > 0 || u.hasteRounds === -1 ? u.moveRange - UNIT_TYPES[u.type].moveRange : 0,
                shieldRounds: u.shieldRounds,
                shieldValue: u.shieldValue,
                blessRounds: u.blessRounds,
                blessValue: u.blessValue,
                regenerateRounds: u.regenerateRounds,
                regenerateAmount: u.regenerateAmount
            }
        }));
        
        const nextBattleNumber = this.battleNumber + 1;
        
        // If in PVP context, report to PVPMatchScene instead of restarting
        if (this.isPVPContext) {
            const pvpMatchScene = this.scene.get('PVPMatchScene');
            if (pvpMatchScene) {
                pvpMatchScene.reportBattleComplete(true, playerUnits, this.magicBuffs);
            }
            return;
        }
        
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
        
        // PVP mode
        this.isPVPMode = false;
        this.pvpManager = null;
    }
    
    getStartingPoints() {
        return this.isPVPMode ? 2500 : 1000;
    }

    create() {
        this.showArmySelection();
        this.gridGraphics = this.add.graphics();
        this.drawGrid();
        window.gameScene = this;
    }

    drawGrid() {
        this.gridGraphics.clear();
        
        // Determine placement zone (host=left columns 0-1, guest=right columns 8-9)
        let placementStartX = 0;
        let placementEndX = 2;
        
        if (this.isPVPMode && this.pvpManager) {
            if (!this.pvpManager.isHostPlayer()) {
                placementStartX = CONFIG.GRID_WIDTH - 2;
                placementEndX = CONFIG.GRID_WIDTH;
            }
        }
        
        for (let y = 0; y < CONFIG.GRID_HEIGHT; y++) {
            for (let x = 0; x < CONFIG.GRID_WIDTH; x++) {
                const isPlacementZone = x >= placementStartX && x < placementEndX;
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
        
        // Placement columns (host=left 0-1, guest=right 8-9)
        let placementStartX = 0;
        let placementEndX = 2;
        
        if (this.isPVPMode && this.pvpManager) {
            if (!this.pvpManager.isHostPlayer()) {
                placementStartX = CONFIG.GRID_WIDTH - 2;
                placementEndX = CONFIG.GRID_WIDTH;
            }
        }
        
        const placementBar = document.getElementById('placement-bar');
        placementBar.classList.remove('hidden');
        
        // Update placement hint
        const hintText = placementBar.querySelector('.placement-hint');
        if (hintText && this.isPVPMode) {
            const side = this.pvpManager?.isHostPlayer() ? 'LEFT' : 'RIGHT';
            hintText.textContent = `Click on the ${side} 2 columns to place units`;
        }
        
        this.updatePlacementDisplay();
        
        this.input.on('pointerdown', (pointer) => {
            // Check if spellbook modal is open - if so, don't process game clicks
            const spellbookModal = document.getElementById('spellbook-modal');
            if (spellbookModal && !spellbookModal.classList.contains('hidden')) {
                return;
            }
            if (!this.placementMode || this.unitsToPlace.length === 0) return;
            
            const gridX = Math.floor(pointer.x / CONFIG.TILE_SIZE);
            const gridY = Math.floor(pointer.y / CONFIG.TILE_SIZE);
            
            // Use dynamic placement range based on side
            if (gridX >= placementStartX && gridX < placementEndX && 
                gridY >= 0 && gridY < CONFIG.GRID_HEIGHT) {
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
            
            // Use dynamic placement range based on side
            if (gridX >= placementStartX && gridX < placementEndX && 
                gridY >= 0 && gridY < CONFIG.GRID_HEIGHT) {
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
        
        console.log('[PreGameScene] confirmPlacement called, placedUnits:', this.placedUnits);
        console.log('[PreGameScene] isPVPMode:', this.isPVPMode, 'pvpManager:', !!this.pvpManager);
        
        if (this.isPVPMode && this.pvpManager) {
            console.log('[PreGameScene] Starting PVPMatchScene with army:', this.placedUnits);
            this.scene.start('PVPMatchScene', {
                pvpManager: this.pvpManager,
                sessionKey: this.pvpManager.getSessionKey(),
                playerNumber: this.pvpManager.getPlayerNumber(),
                army: this.placedUnits
            });
        } else {
            this.scene.start('BattleScene', {
                placedUnits: this.placedUnits,
                battleNumber: 1
            });
        }
    }

    // ============================================
    // PVP METHODS
    // ============================================

    setGameMode(mode) {
        this.isPVPMode = (mode === 'pvp');
        
        const pvpMenu = document.getElementById('pvp-menu');
        const pvpWaiting = document.getElementById('pvp-waiting');
        const modePVE = document.getElementById('mode-pve');
        const modePVP = document.getElementById('mode-pvp');
        
        // Update points based on mode
        this.totalPoints = this.getStartingPoints();
        this.remainingPoints = this.totalPoints;
        
        // Reset unit counts when switching modes
        this.unitCounts = { KNIGHT: 0, ARCHER: 0, WIZARD: 0, CLERIC: 0, ROGUE: 0, PALADIN: 0, RANGER: 0, BERSERKER: 0, SORCERER: 0 };
        this.placedUnits = [];
        
        // Update UI
        document.getElementById('points-remaining').textContent = this.remainingPoints;
        document.getElementById('points-remaining').parentElement.innerHTML = 
            `💰 Points: <span id="points-remaining">${this.remainingPoints}</span>/${this.totalPoints}`;
        
        // Reset all unit count displays
        for (const type of Object.keys(this.unitCounts)) {
            const el = document.getElementById(`count-${type}`);
            if (el) el.textContent = '0';
        }
        this.updatePointsDisplay();
        
        if (this.isPVPMode) {
            pvpMenu.style.display = 'block';
            modePVP.style.background = '#4a7c59';
            modePVE.style.background = '#5D4E3E';
        } else {
            pvpMenu.style.display = 'none';
            pvpWaiting.style.display = 'none';
            modePVE.style.background = '#4a7c59';
            modePVP.style.background = '#5D4E3E';
        }
    }

    async createPVPSession() {
        try {
            if (window.loadVPScenes) await window.loadVPScenes();
            
            const { PVPManager } = await import(`./PVPManager.js?v=${Date.now()}`);
            this.pvpManager = new PVPManager(this);
            
            // Set up manual signaling callbacks
            this.pvpManager.onManualCodeReady = (code) => {
                this._showManualSignalingUI(code, 'host');
            };
            this.pvpManager.onConnected = () => {
                this._onPVPConnected();
            };
            
            const sessionKey = await this.pvpManager.createSession();
            
            // If not using manual signaling, show regular waiting UI
            if (!this.pvpManager.useManualSignaling) {
                this._showSessionInfo(sessionKey);
                document.getElementById('pvp-menu').style.display = 'none';
                document.getElementById('pvp-waiting').style.display = 'block';
                document.getElementById('pvp-session-key').textContent = sessionKey;
                document.getElementById('pvp-assigned-side').textContent = 'LEFT';
                document.getElementById('pvp-assigned-side').style.color = '#4a7cd9';
            }
            // If manual signaling, the callback will handle the UI
            
        } catch (error) {
            console.error('Failed to create session:', error);
            alert('Failed to create session: ' + error.message);
        }
    }

    _showManualSignalingUI(code, role) {
        // Hide other UI
        document.getElementById('mode-selector').style.display = 'none';
        document.getElementById('pvp-menu').style.display = 'none';
        document.getElementById('pvp-waiting').style.display = 'none';
        document.getElementById('pvp-session-info').style.display = 'none';
        
        // Create manual signaling UI
        let existing = document.getElementById('manual-signaling-ui');
        if (existing) existing.remove();
        
        const div = document.createElement('div');
        div.id = 'manual-signaling-ui';
        div.style.cssText = `
            position: fixed;
            top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(26, 28, 30, 0.98);
            display: flex; flex-direction: column;
            align-items: center; justify-content: center;
            z-index: 4000; color: #E3D5B8;
            padding: 20px;
            box-sizing: border-box;
        `;
        
        if (role === 'host') {
            div.innerHTML = `
                <div style="font-size: 48px; margin-bottom: 20px;">📋</div>
                <h2 style="color: #A68966; margin-bottom: 10px;">Manual Connection</h2>
                <p style="color: #8B7355; margin-bottom: 20px; max-width: 500px; text-align: center;">
                    Firebase is unavailable. Using manual signaling.<br>
                    Copy this code and send it to your opponent:
                </p>
                <div style="background: #2D241E; border: 2px solid #A68966; border-radius: 8px; padding: 15px; max-width: 90%; word-break: break-all;">
                    <textarea id="manual-offer-code" readonly style="
                        background: #1A1C1E; color: #4CAF50; font-family: monospace;
                        font-size: 12px; padding: 10px; border: 1px solid #4a4a4a;
                        border-radius: 4px; width: 500px; max-width: 100%; height: 120px;
                        resize: none; box-sizing: border-box;
                    ">${code}</textarea>
                </div>
                <button onclick="window.gameScene._copyManualCode('manual-offer-code')" 
                        style="margin-top: 15px; padding: 10px 20px; background: #A68966; border: none; 
                               color: #1A1C1E; border-radius: 4px; cursor: pointer; font-weight: bold;">
                    📋 Copy Code
                </button>
                <p style="color: #8B7355; margin-top: 30px; margin-bottom: 10px;">
                    Then paste your opponent's response code here:
                </p>
                <textarea id="manual-answer-input" placeholder="Paste opponent's code here..." style="
                    background: #1A1C1E; color: #E3D5B8; font-family: monospace;
                    font-size: 12px; padding: 10px; border: 1px solid #4a4a4a;
                    border-radius: 4px; width: 500px; max-width: 100%; height: 120px;
                    resize: none; box-sizing: border-box; margin-bottom: 15px;
                "></textarea>
                <button onclick="window.gameScene._submitManualAnswer()" 
                        style="padding: 12px 30px; background: #4a7cd9; border: none; 
                               color: white; border-radius: 4px; cursor: pointer; font-weight: bold;">
                    Connect
                </button>
                <button onclick="window.gameScene._cancelManualSignaling()" 
                        style="margin-top: 20px; padding: 10px 20px; background: transparent; border: 1px solid #9E4A4A; 
                               color: #9E4A4A; border-radius: 4px; cursor: pointer;">
                    Cancel
                </button>
            `;
        } else if (role === 'guest') {
            div.innerHTML = `
                <div style="font-size: 48px; margin-bottom: 20px;">📋</div>
                <h2 style="color: #A68966; margin-bottom: 10px;">Manual Connection</h2>
                <p style="color: #4CAF50; margin-bottom: 20px; font-weight: bold;">
                    ✓ Connected! Send this response code back to the host:
                </p>
                <div style="background: #2D241E; border: 2px solid #4CAF50; border-radius: 8px; padding: 15px; max-width: 90%; word-break: break-all;">
                    <textarea id="manual-answer-code" readonly style="
                        background: #1A1C1E; color: #4CAF50; font-family: monospace;
                        font-size: 12px; padding: 10px; border: 1px solid #4a4a4a;
                        border-radius: 4px; width: 500px; max-width: 100%; height: 120px;
                        resize: none; box-sizing: border-box;
                    ">${code}</textarea>
                </div>
                <button onclick="window.gameScene._copyManualCode('manual-answer-code')" 
                        style="margin-top: 15px; padding: 10px 20px; background: #A68966; border: none; 
                               color: #1A1C1E; border-radius: 4px; cursor: pointer; font-weight: bold;">
                    📋 Copy Response
                </button>
                <p style="color: #8B7355; margin-top: 20px;">
                    Waiting for host to complete connection...
                </p>
                <div style="margin-top: 20px; color: #ff9800;">
                    ⏳ Establishing P2P connection...
                </div>
            `;
        }
        
        document.body.appendChild(div);
    }

    _copyManualCode(textareaId) {
        const textarea = document.getElementById(textareaId);
        textarea.select();
        document.execCommand('copy');
        
        // Visual feedback
        const btn = event.target;
        const originalText = btn.textContent;
        btn.textContent = '✓ Copied!';
        setTimeout(() => btn.textContent = originalText, 1500);
    }

    async _submitManualAnswer() {
        const answerCode = document.getElementById('manual-answer-input').value.trim();
        if (!answerCode) {
            alert('Please paste the response code from your opponent');
            return;
        }
        
        try {
            await this.pvpManager.completeManualConnection(answerCode);
            // Connection will establish, onConnected callback will handle next steps
        } catch (error) {
            alert('Failed to connect: ' + error.message);
        }
    }

    _cancelManualSignaling() {
        if (this.pvpManager) {
            this.pvpManager.disconnect();
        }
        
        const ui = document.getElementById('manual-signaling-ui');
        if (ui) ui.remove();
        
        document.getElementById('mode-selector').style.display = 'flex';
    }

    _onPVPConnected() {
        // Hide manual signaling UI if present
        const manualUI = document.getElementById('manual-signaling-ui');
        if (manualUI) {
            manualUI.remove();
        }
        
        // Show PVP session info and let user continue with army selection
        // The confirmPlacement() function will handle transition to PVPMatchScene
        document.getElementById('pvp-waiting').style.display = 'none';
        document.getElementById('pvp-session-info').style.display = 'block';
        document.getElementById('pvp-active-key').textContent = this.pvpManager.getSessionKey();
    }
    
    _showAssignedSide(side) {

        const sideInfo = document.getElementById('pvp-side-info');
        const sideText = document.getElementById('pvp-assigned-side');
        
        if (sideInfo && sideText) {
            sideInfo.style.display = 'block';
            sideText.textContent = side.toUpperCase();
            sideText.style.color = side === 'left' ? '#4a7cd9' : '#d94a4a';
        }
    }
    
    _showSessionInfo(sessionKey) {
        // Hide mode selector and menu
        document.getElementById('mode-selector').style.display = 'none';
        document.getElementById('pvp-menu').style.display = 'none';
        
        // Show session info
        const sessionInfo = document.getElementById('pvp-session-info');
        sessionInfo.style.display = 'block';
        document.getElementById('pvp-active-key').textContent = sessionKey;
    }

    async joinPVPSession() {
        const keyInput = document.getElementById('pvp-join-key');
        const sessionKey = keyInput.value.trim();
        
        // Allow both short keys (Firebase) and long codes (manual)
        if (!sessionKey) {
            alert('Please enter a session key or connection code');
            return;
        }
        
        try {
            if (window.loadVPScenes) await window.loadVPScenes();
            
            const { PVPManager } = await import(`./PVPManager.js?v=${Date.now()}`);
            this.pvpManager = new PVPManager(this);
            
            // Set up manual signaling callback for guest
            this.pvpManager.onManualAnswerReady = (answerCode) => {
                this._showManualSignalingUI(answerCode, 'guest');
            };
            this.pvpManager.onConnected = () => {
                this._onPVPConnected();
            };
            
            await this.pvpManager.joinSession(sessionKey);
            
            // If not using manual signaling, show regular UI
            if (!this.pvpManager.useManualSignaling) {
                this._showSessionInfo(sessionKey);
                document.getElementById('pvp-assigned-side').textContent = 'RIGHT';
                document.getElementById('pvp-assigned-side').style.color = '#d94a4a';
            }
            // If manual signaling, the callback will show the answer code UI
            
        } catch (error) {
            console.error('Failed to join session:', error);
            alert(error.message || 'Failed to join session. Check the key and try again.');
        }
    }
    
    leavePVP() {
        if (this.pvpManager) {
            this.pvpManager.disconnect();
        }
        
        // Reset UI
        document.getElementById('mode-selector').style.display = 'flex';
        document.getElementById('pvp-session-info').style.display = 'none';
        document.getElementById('pvp-menu').style.display = 'none';
        document.getElementById('pvp-waiting').style.display = 'none';
        
        // Reset mode
        this.setGameMode('pve');
    }

    copySessionKey(event) {
        const key = document.getElementById('pvp-session-key').textContent;
        navigator.clipboard.writeText(key).then(() => {
            const btn = event.target;
            const originalText = btn.textContent;
            btn.textContent = '✓ Copied!';
            setTimeout(() => btn.textContent = originalText, 1500);
        });
    }
}
