// ============================================
// SCENE MANAGER - Phaser Scenes
// ============================================

import { CONFIG, SPELLS } from './GameConfig.js';

// Note: UNIT_TYPES is available globally from units.js (loaded as script tag)
import { UnitManager, TurnSystem } from './EntityManager.js';
import { GridSystem } from './InputHandler.js';
import { SpellSystem } from './SpellSystem.js';
import { UIManager } from './UIHandler.js';

const ENEMY_FACTIONS = {
    GREENSKIN_HORDE: ['ORC_WARRIOR', 'ORC_BRUTE', 'ORC_ROGUE', 'GOBLIN_STONE_THROWER'],
    DUNGEON_DWELLERS: ['ANIMATED_ARMOR', 'SKELETON_ARCHER', 'SKELETON_SOLDIER', 'LOST_SPIRIT'],
    OLD_GOD_WORSHIPPERS: ['CULTIST_ACOLYTE', 'CULTIST_NEOPHYTE', 'GIBBERING_HORROR', 'FLESH_WARPED_STALKER']
};

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
        this.currentEnemyFaction = 'GREENSKIN_HORDE';
        this.victoryShown = false;
        this.magicBuffs = [];
        this.selectedUnit = null;
        this.selectedRewards = { unit: null, buff: null, magic: null };
        this.hasLootGoblin = false;
        this.lootGoblinReward = false;
        this.spellHotkeyListeners = [];

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
            'OGRE_CHIEFTAIN', 'ORC_SHAMAN_KING', 'LOOT_GOBLIN',
            // Dungeon Dwellers
            'ANIMATED_ARMOR', 'SKELETON_ARCHER', 'SKELETON_SOLDIER', 'LOST_SPIRIT', 'SUMMONER_LICH',
            // Old God Worshippers
            'CULTIST_ACOLYTE', 'CULTIST_NEOPHYTE', 'GIBBERING_HORROR', 'FLESH_WARPED_STALKER', "OCTOTH_HROARATH"
        ];
        for (const unitType of enemyUnits) {
            const template = UNIT_TYPES[unitType];
            if (template && template.image) {
                const imageKey = unitType.toLowerCase() + '_img';
                this.load.image(imageKey, template.image);
            }
        }
    }

    create(data) {
        document.getElementById('ui-panel').classList.remove('hidden');
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

        // Determine enemy faction for this run
        if (this.battleNumber === 1) {
            const factions = Object.keys(ENEMY_FACTIONS);
            this.currentEnemyFaction = factions[Math.floor(Math.random() * factions.length)];
        } else if (data && data.currentEnemyFaction) {
            this.currentEnemyFaction = data.currentEnemyFaction;
        } else {
            // Fallback for safety
            this.currentEnemyFaction = 'GREENSKIN_HORDE';
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
                    if (unitData.statModifiers.hasBackstab) unit.hasBackstab = true;

                    // Restore mythic buffs
                    if (unitData.statModifiers.hasDivineRetribution) unit.hasDivineRetribution = true;
                    if (unitData.statModifiers.hasArcaneFocus) unit.hasArcaneFocus = true;

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

        // Add click handler for spell targeting and abilities
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
            } else if (this.activeUnitAbility) {
                const gridX = Math.floor(pointer.x / CONFIG.TILE_SIZE);
                const gridY = Math.floor(pointer.y / CONFIG.TILE_SIZE);
                if (gridX >= 0 && gridX < CONFIG.GRID_WIDTH && gridY >= 0 && gridY < CONFIG.GRID_HEIGHT) {
                    this.executeUnitAbilityAt(gridX, gridY);
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

        this.input.keyboard.on('keydown-U', () => {
            if (this.turnSystem.currentUnit && this.turnSystem.currentUnit.isPlayer) {
                const abilityBtn = document.getElementById('unit-ability-btn');
                if (abilityBtn && !abilityBtn.disabled) {
                    this.useUnitAbility();
                }
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
            } else if (this.activeUnitAbility) {
                this.activeUnitAbility = null;
                document.body.style.cursor = 'default';
                this.gridSystem.highlightValidMoves(this.turnSystem.currentUnit);
                this.uiManager.showFloatingText('Ability cancelled', 400, 300, '#A68966');
            }
        });
    }

    useUnitAbility() {
        if (!this.turnSystem || !this.turnSystem.currentUnit) return;
        const unit = this.turnSystem.currentUnit;

        if (unit.type === 'CLERIC' && !unit.hasHealed) {
            this.activeUnitAbility = 'HEAL';
            this.uiManager.showFloatingText('Select target to Heal', 400, 300, '#6B8B5B');
            document.body.style.cursor = 'crosshair';

            // Highlight allies
            this.gridSystem.highlightGraphics.clear();
            const allies = this.unitManager.getPlayerUnits();
            allies.forEach(ally => {
                if (!ally.isDead) {
                    this.gridSystem.highlightGraphics.fillStyle(0x00ff00, 0.4);
                    this.gridSystem.highlightGraphics.fillRect(
                        ally.gridX * CONFIG.TILE_SIZE + 4,
                        ally.gridY * CONFIG.TILE_SIZE + 4,
                        CONFIG.TILE_SIZE - 8,
                        CONFIG.TILE_SIZE - 8
                    );
                }
            });
        }
        else if (unit.type === 'OCTO' && !unit.hasPulled) {
            this.activeUnitAbility = 'PULL';
            this.uiManager.showFloatingText('Select target to Pull', 400, 300, '#8B5A2B');
            document.body.style.cursor = 'crosshair';
        }
    }

    // Process unit abilities
    executeUnitAbilityAt(gridX, gridY) {
        if (!this.activeUnitAbility || !this.turnSystem.currentUnit) return;

        const unit = this.turnSystem.currentUnit;
        const target = this.unitManager.getUnitAt(gridX, gridY);

        if (this.activeUnitAbility === 'HEAL') {
            if (target && target.isPlayer && !target.isDead) {
                // Cleric Heal: restore based on SPELLS.heal.power and passive bonuses
                let healAmount = SPELLS.heal.power;
                const playerUnits = this.unitManager.getPlayerUnits();
                const clericCount = playerUnits.filter(u => (u.type === 'CLERIC' || u.type === 'PALADIN') && u.health > 0).length;
                if (clericCount > 0) {
                    healAmount = Math.floor(healAmount * (1 + clericCount * 0.5));
                }
                target.health = Math.min(target.maxHealth, target.health + healAmount);
                target.updateHealthBar();
                this.uiManager.showHealText(target, healAmount);

                // End ability mode
                unit.hasHealed = true;
                this.activeUnitAbility = null;
                document.body.style.cursor = 'default';
                this.gridSystem.highlightValidMoves(unit);
                this.uiManager.updateUnitInfo(unit);
            } else {
                this.uiManager.showFloatingText('Invalid target', 400, 300, '#ff0000');
            }
        }
        else if (this.activeUnitAbility === 'PULL') {
            // (Implementation for Octo pull can be added here or kept as is in Octo's AI)
            this.activeUnitAbility = null;
            document.body.style.cursor = 'default';
        }
    }

    createEnemyUnits() {
        // Check if this is a boss wave (every 5 rounds)
        const isBossWave = this.battleNumber % 5 === 0;

        if (isBossWave) {
            this.createBossWave();
            return;
        }

        const totalPoints = 1000 + (this.battleNumber - 1) * 250;
        const enemyTypes = ENEMY_FACTIONS[this.currentEnemyFaction];

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
                `Battle 1 - Defeat the enemy!`,
                320, 100, '#A68966'
            );
        }
    }

    createBossWave() {
        let selectedBoss;
        if (this.currentEnemyFaction === 'DUNGEON_DWELLERS') {
            selectedBoss = 'SUMMONER_LICH';
        } else if (this.currentEnemyFaction === 'OLD_GOD_WORSHIPPERS') {
            selectedBoss = 'OCTOTH_HROARATH';
        } else {
            // Default to Greenskin Horde bosses
            const bossTypes = ['OGRE_CHIEFTAIN', 'ORC_SHAMAN_KING', 'LOOT_GOBLIN'];
            const roll = Math.random();
            if (roll < 0.3) {
                selectedBoss = 'LOOT_GOBLIN';
            } else {
                selectedBoss = roll < 0.65 ? 'OGRE_CHIEFTAIN' : 'ORC_SHAMAN_KING';
            }
        }

        const availablePositions = this.getEnemySpawnPositions();
        // Filter positions that can fit 2x2 bosses (need at least 2 columns from right edge)
        const validPositions = availablePositions.filter(pos => {
            const template = UNIT_TYPES[selectedBoss];
            const size = template.bossSize || 1;
            // Check if the entire boss area is within bounds and unoccupied
            return this.unitManager.isValidPlacement(pos.x, pos.y, size);
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
        // Start from the right edge and look for at least 6 available spots
        // If the rightmost columns are blocked by players, expand the search to the left
        const minRequired = 6;
        const positions = [];

        // Search in columns from right to left, 2 at a time
        for (let searchCol = CONFIG.GRID_WIDTH - 2; searchCol >= 0; searchCol -= 2) {
            const currentPair = [];
            for (let y = 0; y < CONFIG.GRID_HEIGHT; y++) {
                for (let x = Math.max(0, searchCol); x < Math.min(CONFIG.GRID_WIDTH, searchCol + 2); x++) {
                    const existingUnit = this.unitManager.getUnitAt(x, y);
                    if (!existingUnit) {
                        currentPair.push({ x, y });
                    }
                }
            }

            // Randomize this pair of columns
            for (let i = currentPair.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [currentPair[i], currentPair[j]] = [currentPair[j], currentPair[i]];
            }

            positions.push(...currentPair);

            // If we have enough positions to fill a wave, we can stop
            if (positions.length >= minRequired) break;
        }

        return positions;
    }

    regenerateMana() {
        const wizardCount = this.unitManager.getPlayerUnits().filter(u => u.type === 'WIZARD').length;
        this.baseManaRegen = this.baseManaRegen || 1; // Default to 1
        const totalRegen = this.baseManaRegen + wizardCount;

        if (this.mana < this.maxMana) {
            this.mana = Math.min(this.maxMana, this.mana + totalRegen);
            this.uiManager.updateManaDisplay();
        }

        if (totalRegen > this.baseManaRegen) {
            this.uiManager.showFloatingText(
                `+${totalRegen} Mana (${this.baseManaRegen} + ${wizardCount} from Wizards)`,
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

        // Auto-end turn if unit has moved and attacked
        if (unit.hasMoved && unit.isPlayer && this.turnSystem.currentUnit === unit) {
            let shouldEndTurn = false;

            if (unit.hasAttacked) {
                shouldEndTurn = true;
            } else {
                // Check if unit has any valid attacks
                const enemies = this.unitManager.getEnemyUnits();
                let hasValidTarget = false;

                for (const enemy of enemies) {
                    const dist = this.gridSystem.getDistanceBetweenUnits(unit, enemy);
                    // Can melee attack
                    if (dist === 1) {
                        hasValidTarget = true;
                        break;
                    }
                    // Can ranged attack
                    if (unit.rangedRange > 0 && dist <= unit.rangedRange && dist > 1) {
                        hasValidTarget = true;
                        break;
                    }
                }

                // Check for unused abilities (like Octo pull)
                const hasUnusedAbility = (unit.type === 'OCTO' && !unit.hasPulled) ||
                    (unit.type === 'CLERIC' && !unit.hasHealed);

                if (!hasValidTarget && !hasUnusedAbility) {
                    shouldEndTurn = true;
                }
            }

            if (shouldEndTurn) {
                this.time.delayedCall(300, () => {
                    this.endTurn();
                });
            }
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
                let damage = Math.floor(attacker.damage * attacker.blessValue);

                // Rogue legendary perk: Backstab (4x damage if attacking from behind)
                if (attacker.type === 'ROGUE' && attacker.hasBackstab) {
                    // Check if attacking from behind (same X but behind in Y relative to center of board, or same Y but behind in X)
                    // Simplified: check if attacker's direction matches target's forward direction (usually right to left for enemies)
                    // Enemies face left, so behind them is to their right (attacker.gridX > defender.gridX)
                    const isBehindEnemy = (!defender.isPlayer && attacker.gridX > defender.gridX);
                    // Players face right, so behind them is to their left (attacker.gridX < defender.gridX)
                    const isBehindPlayer = (defender.isPlayer && attacker.gridX < defender.gridX);

                    if (isBehindEnemy || isBehindPlayer) {
                        damage *= 4;
                        this.uiManager.showBuffText(attacker, 'BACKSTAB!', '#6B5B8B');
                    }
                }

                // Paladin Cleave: 3x3 area damage
                if (attacker.hasCleave && !isSecondStrike) {
                    this.performCleaveAttack(attacker, defender, damage);
                } else if (!attacker.hasCleave) {
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

                // Paladin Mythic: Divine Retribution (Melee Retaliation)
                // Assuming it's a melee attack if the distance is 1. (Ranged attacks use performRangedAttack typically, but let's be safe)
                const distToDefender = this.gridSystem.getDistanceBetweenUnits(attacker, defender);
                console.log(`[Divine Retribution Check] attacker: ${attacker.type}, defender: ${defender.type}, dist: ${distToDefender}, hasMythic: ${defender.hasDivineRetribution}, defenderHealth: ${defender.health}, attackerHealth: ${attacker.health}, isSecondStrike: ${isSecondStrike}`);

                if (distToDefender <= 1 && defender.hasDivineRetribution && defender.health > 0 && !isSecondStrike && attacker.health > 0) {
                    console.log(`[Divine Retribution Triggered] ${defender.type} retaliates against ${attacker.type}!`);
                    this.time.delayedCall(200, () => {
                        this.performRetaliation(defender, attacker);
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

                            // Auto-end turn if unit has moved and attacked (checked again since Vanish moves them)
                            if (attacker.hasMoved && attacker.hasAttacked && attacker.isPlayer && this.turnSystem.currentUnit === attacker) {
                                this.time.delayedCall(300, () => {
                                    this.endTurn();
                                });
                            }
                        }
                    });
                } else if (attacker.hasMoved && attacker.hasAttacked && attacker.isPlayer && this.turnSystem.currentUnit === attacker) {
                    // Normal auto-end turn 
                    this.time.delayedCall(300, () => {
                        this.endTurn();
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

    performRetaliation(retaliator, target) {
        if (retaliator.isDead || target.isDead) return;

        // Divine Retribution retaliation is x2 damage
        const damage = Math.floor(retaliator.damage * retaliator.blessValue * 2);

        // Visual lunge for retaliation
        const originalX = retaliator.sprite.x;
        const originalY = retaliator.sprite.y;
        const targetX = target.sprite.x;
        const targetY = target.sprite.y;

        const lungeX = originalX + (targetX - originalX) * 0.3;
        const lungeY = originalY + (targetY - originalY) * 0.3;

        this.tweens.add({
            targets: retaliator.sprite,
            x: lungeX,
            y: lungeY,
            duration: 100,
            yoyo: true,
            onComplete: () => {
                this.uiManager.showBuffText(retaliator, 'RETRIBUTION!', '#ff3333');

                if (retaliator.hasCleave) {
                    this.performCleaveAttack(retaliator, target, damage);
                } else {
                    target.takeDamage(damage, false, retaliator);
                    this.uiManager.showDamageText(target, damage);

                    this.tweens.add({
                        targets: target.sprite,
                        alpha: 0.3,
                        duration: 50,
                        yoyo: true,
                        repeat: 2
                    });
                }

                if (this.selectedUnit === target) {
                    this.uiManager.updateUnitInfo(target);
                }

                this.checkVictoryCondition();
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

        this.uiManager.showBuffText(attacker, 'PIERCE!', '#6B7A9A');

        const dx = target.gridX - attacker.gridX;
        const dy = target.gridY - attacker.gridY;
        if (dx === 0 && dy === 0) return;

        const length = Math.max(Math.abs(dx), Math.abs(dy));
        const stepX = dx / length;
        const stepY = dy / length;

        let currX = attacker.gridX + stepX;
        let currY = attacker.gridY + stepY;

        const path = [];
        while (currX >= -0.5 && currX < CONFIG.GRID_WIDTH + 0.5 && currY >= -0.5 && currY < CONFIG.GRID_HEIGHT + 0.5) {
            const gx = Math.round(currX);
            const gy = Math.round(currY);

            if (gx >= 0 && gx < CONFIG.GRID_WIDTH && gy >= 0 && gy < CONFIG.GRID_HEIGHT) {
                if (path.length === 0 || path[path.length - 1].x !== gx || path[path.length - 1].y !== gy) {
                    path.push({ x: gx, y: gy });
                }
            }

            currX += stepX;
            currY += stepY;
        }

        let hitCount = 0;
        for (const p of path) {
            const enemy = this.unitManager.getUnitAt(p.x, p.y);
            if (enemy && !enemy.isPlayer && !enemy.isDead) {
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
    }

    // UI Methods
    openSpellBook() {
        const modal = document.getElementById('spellbook-modal');
        if (!modal.classList.contains('hidden')) return;

        this.uiManager.updateManaDisplay();

        // Define categories with styles
        this.spellBookPages = [
            {
                name: 'Destructo',
                icon: '🔥',
                filter: (s) => ['singleDamage', 'aoeDamage', 'meteor', 'iceStorm', 'chainLightning'].includes(s.effect),
                style: { bg: '#2a1f1f', header: '#ff4444' }
            },
            {
                name: 'Restoratio',
                icon: '💚',
                filter: (s) => ['heal', 'regenerate', 'cure'].includes(s.effect),
                style: { bg: '#2a3a2a', header: '#44ff44' }
            },
            {
                name: 'Benedictio',
                icon: '🛡️',
                filter: (s) => ['haste', 'shield', 'bless'].includes(s.effect),
                style: { bg: '#2D241E', header: '#A68966' }
            },
            {
                name: 'Utilitas',
                icon: '✨',
                filter: (s) => !['singleDamage', 'aoeDamage', 'meteor', 'iceStorm', 'chainLightning', 'heal', 'regenerate', 'cure', 'haste', 'shield', 'bless'].includes(s.effect),
                style: { bg: '#2D241E', header: '#A68966' }
            }
        ];

        // Initialize page if not set
        if (this.currentSpellPage === undefined) this.currentSpellPage = 0;

        this.renderSpellBookPage();
        modal.classList.remove('hidden');

        // Add navigation listeners
        this.input.keyboard.on('keydown-LEFT', this.prevSpellPage, this);
        this.input.keyboard.on('keydown-RIGHT', this.nextSpellPage, this);
    }

    closeSpellBook() {
        document.getElementById('spellbook-modal').classList.add('hidden');
        this.input.keyboard.off('keydown-LEFT', this.prevSpellPage, this);
        this.input.keyboard.off('keydown-RIGHT', this.nextSpellPage, this);
        this._clearSpellHotkeys();
    }

    _clearSpellHotkeys() {
        if (this.spellHotkeyListeners && this.spellHotkeyListeners.length > 0) {
            this.spellHotkeyListeners.forEach(listener => {
                this.input.keyboard.off(`keydown-${listener.key}`, listener.callback);
            });
        }
        this.spellHotkeyListeners = [];
    }

    prevSpellPage() {
        if (!this.spellBookPages) return;
        this.currentSpellPage = (this.currentSpellPage - 1 + this.spellBookPages.length) % this.spellBookPages.length;
        this.renderSpellBookPage();
    }

    nextSpellPage() {
        if (!this.spellBookPages) return;
        this.currentSpellPage = (this.currentSpellPage + 1) % this.spellBookPages.length;
        this.renderSpellBookPage();
    }

    renderSpellBookPage() {
        const grid = document.getElementById('spell-grid');
        const header = document.querySelector('.spellbook-header');
        const content = document.querySelector('.spellbook-content');
        const page = this.spellBookPages[this.currentSpellPage];

        grid.innerHTML = '';

        // Clear any hotkeys from the previous page
        this._clearSpellHotkeys();

        // Remove old navigation bar if it exists to prevent duplication
        const oldNav = document.getElementById('spellbook-nav');
        if (oldNav) oldNav.remove();

        // Apply page style
        content.style.backgroundColor = page.style.bg;
        content.style.transition = 'background-color 0.3s ease';

        // Create top navigation container
        const topNav = document.createElement('div');
        topNav.id = 'spellbook-nav';
        topNav.style.cssText = 'display: flex; justify-content: center; align-items: center; gap: 15px; margin-top: 15px; padding-bottom: 10px; border-bottom: 1px solid #5D4E3E;';

        // Left Arrow
        const leftArrow = document.createElement('span');
        leftArrow.innerHTML = '↶';
        leftArrow.style.cssText = 'cursor: pointer; font-size: 24px; user-select: none; padding: 0 10px; color: #8B7355;';
        leftArrow.onclick = () => this.prevSpellPage();
        topNav.appendChild(leftArrow);

        // Category tabs
        this.spellBookPages.forEach((p, i) => {
            const tab = document.createElement('div');
            tab.innerHTML = `${p.icon} ${p.name}`;
            tab.style.cssText = 'cursor: pointer; padding: 5px 10px; border-radius: 4px; transition: all 0.2s ease; user-select: none; font-family: serif;';
            tab.onclick = () => {
                this.currentSpellPage = i;
                this.renderSpellBookPage();
            };

            if (i === this.currentSpellPage) {
                tab.style.transform = 'scale(1.2)';
                tab.style.color = p.style.header;
                tab.style.background = 'rgba(0,0,0,0.3)';
                tab.style.fontWeight = 'bold';
                tab.style.textShadow = `0 0 8px ${p.style.header}`;
            } else {
                tab.style.color = '#8B7355';
                tab.style.transform = 'scale(1.0)';
            }
            topNav.appendChild(tab);
        });

        // Right Arrow
        const rightArrow = document.createElement('span');
        rightArrow.innerHTML = '↷';
        rightArrow.style.cssText = 'cursor: pointer; font-size: 24px; user-select: none; padding: 0 10px; color: #8B7355;';
        rightArrow.onclick = () => this.nextSpellPage();
        topNav.appendChild(rightArrow);

        header.appendChild(topNav);

        // Filter and render spells
        let spellCount = 0;
        const usedHotkeys = new Set(); // Prevent duplicate hotkeys on the same page

        for (const [key, spell] of Object.entries(SPELLS)) {
            if (page.filter(spell)) {
                spellCount++;
                const card = document.createElement('div');
                card.className = 'spell-card';

                const canAfford = this.mana >= Math.floor(spell.manaCost * this.manaCostMultiplier);
                if (!canAfford) {
                    card.classList.add('disabled');
                }

                let displayName = spell.name;
                const hotkey = spell.name.charAt(0).toUpperCase();

                // Assign hotkey if affordable and not already used on this page
                if (canAfford && /^[A-Z]$/.test(hotkey) && !usedHotkeys.has(hotkey)) {
                    usedHotkeys.add(hotkey);
                    displayName = `<span style="color: #FFD700;">${hotkey}</span>${spell.name.substring(1)}`;

                    // Register listener with a specific callback function
                    const spellKey = key; // Capture key for the closure
                    const hotkeyCallback = () => {
                        // Double-check if spellbook is open and mana is sufficient
                        const modal = document.getElementById('spellbook-modal');
                        if (!modal.classList.contains('hidden') && this.mana >= Math.floor(SPELLS[spellKey].manaCost * this.manaCostMultiplier)) {
                            this.spellSystem.castSpell(spellKey);
                        }
                    };
                    this.input.keyboard.on(`keydown-${hotkey}`, hotkeyCallback);
                    this.spellHotkeyListeners.push({ key: hotkey, callback: hotkeyCallback });
                }

                card.innerHTML = `
                    <div style="font-size: 32px; margin-bottom: 5px;">${spell.icon}</div>
                    <div style="color: ${page.style.header}; font-weight: bold;">${displayName}</div>
                    <div class="spell-type">${spell.type}</div>
                    <div class="spell-desc">${spell.description}</div>
                    <div class="spell-cost ${!canAfford ? 'too-expensive' : ''}">💧 ${Math.floor(spell.manaCost * this.manaCostMultiplier)} Mana</div>
                `;

                if (canAfford) {
                    card.onclick = () => this.spellSystem.castSpell(key);
                }

                grid.appendChild(card);
            }
        }

        if (spellCount === 0) {
            const emptyMsg = document.createElement('div');
            emptyMsg.style.gridColumn = '1 / -1';
            emptyMsg.style.textAlign = 'center';
            emptyMsg.style.color = '#888';
            emptyMsg.style.padding = '40px';
            emptyMsg.textContent = 'No spells known in this school.';
            grid.appendChild(emptyMsg);
        }
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

        // Generate 3 random buffs (weighted by rarity)
        const buffOptions = this.getRandomBuffs(3);

        buffOptions.forEach(buff => {
            const card = this.uiManager.createRewardCard(buff.rarity === 'epic' ? 'epic' : 'buff', buff.id, `
                <div style="font-size: 32px; margin-bottom: 5px;">${buff.icon}</div>
                <div style="color: ${buff.rarity === 'epic' ? '#9B6BAB' : '#6B8B5B'}; font-weight: bold;${buff.rarity === 'epic' ? ' text-shadow: 0 0 6px rgba(139, 91, 155, 0.5);' : ''}">${buff.name}</div>
                <div style="font-size: 12px; color: #B8A896; margin-top: 5px;">${buff.desc}</div>
                ${buff.rarity === 'epic' ? '<div style="font-size: 11px; color: #9B6BAB; margin-top: 4px; text-shadow: 0 0 4px rgba(139, 91, 155, 0.4);">⚡ Epic Power</div>' : ''}
            `, buff, buff.rarity);

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
    getRandomBuffs(count) {
        const commonBuffs = [
            {
                id: 'veteran', name: 'Veteran Training', icon: '⚔️', desc: '+10 Damage', rarity: 'common',
                effect: (unit) => {
                    unit.damage += 10;
                    unit.statModifiers = unit.statModifiers || {};
                    unit.statModifiers.damage = (unit.statModifiers.damage || 0) + 10;
                }
            },
            {
                id: 'toughness', name: 'Enhanced Toughness', icon: '💪', desc: '+30 Max HP', rarity: 'common',
                effect: (unit) => {
                    unit.maxHealth += 30; unit.health += 30;
                    unit.statModifiers = unit.statModifiers || {};
                    unit.statModifiers.maxHealth = (unit.statModifiers.maxHealth || 0) + 30;
                    unit.updateHealthBar();
                }
            },
            {
                id: 'agility', name: 'Greater Agility', icon: '💨', desc: '+1 Movement', rarity: 'common',
                effect: (unit) => {
                    unit.moveRange += 1;
                    unit.statModifiers = unit.statModifiers || {};
                    unit.statModifiers.moveRange = (unit.statModifiers.moveRange || 0) + 1;
                }
            },
            {
                id: 'precision', name: 'Precision Strikes', icon: '🎯', desc: '+5 Initiative & +5 Damage', rarity: 'common',
                effect: (unit) => {
                    unit.initiative += 5; unit.damage += 5;
                    unit.statModifiers = unit.statModifiers || {};
                    unit.statModifiers.initiative = (unit.statModifiers.initiative || 0) + 5;
                    unit.statModifiers.damage = (unit.statModifiers.damage || 0) + 5;
                }
            },
            {
                id: 'ranged', name: 'Ranged Training', icon: '🏹', desc: 'Gain Ranged Attack (Range 3)', rarity: 'common',
                effect: (unit) => {
                    if (!unit.rangedRange) unit.rangedRange = 3; else unit.rangedRange += 2;
                    unit.statModifiers = unit.statModifiers || {};
                    unit.statModifiers.rangedRange = unit.rangedRange;
                }
            }
        ];

        const epicBuffs = [
            {
                id: 'champion_favor', name: "Champion's Favor", icon: '⭐', desc: '+20 HP, +5 DMG, +1 MOV', rarity: 'epic',
                effect: (unit) => {
                    unit.maxHealth += 20; unit.health += 20; unit.damage += 5; unit.moveRange += 1;
                    unit.statModifiers = unit.statModifiers || {};
                    unit.statModifiers.maxHealth = (unit.statModifiers.maxHealth || 0) + 20;
                    unit.statModifiers.damage = (unit.statModifiers.damage || 0) + 5;
                    unit.statModifiers.moveRange = (unit.statModifiers.moveRange || 0) + 1;
                    unit.updateHealthBar();
                }
            },
            {
                id: 'obsidian_armor', name: 'Obsidian Armor', icon: '⬛', desc: 'Max HP x2, Movement -2', rarity: 'epic',
                effect: (unit) => {
                    const hpDiff = unit.maxHealth;
                    unit.maxHealth += hpDiff;
                    unit.health += hpDiff;
                    unit.moveRange = Math.max(1, unit.moveRange - 2);
                    unit.statModifiers = unit.statModifiers || {};
                    unit.statModifiers.maxHealth = (unit.statModifiers.maxHealth || 0) + hpDiff;
                    unit.statModifiers.moveRange = (unit.statModifiers.moveRange || 0) - 2;
                    unit.updateHealthBar();
                }
            },
            {
                id: 'glass_cannon', name: 'Glass Cannon', icon: '💥', desc: 'Damage x2, Max HP x0.5', rarity: 'epic',
                effect: (unit) => {
                    const dmgDiff = unit.damage;
                    const hpDiff = -Math.floor(unit.maxHealth * 0.5);
                    unit.damage += dmgDiff;
                    unit.maxHealth += hpDiff;
                    unit.health = Math.min(unit.health, unit.maxHealth);
                    unit.statModifiers = unit.statModifiers || {};
                    unit.statModifiers.damage = (unit.statModifiers.damage || 0) + dmgDiff;
                    unit.statModifiers.maxHealth = (unit.statModifiers.maxHealth || 0) + hpDiff;
                    unit.updateHealthBar();
                }
            },
            {
                id: 'temporal_shift', name: 'Temporal Shift', icon: '⏳', desc: '2 turns per round. Damage x0.5', rarity: 'epic',
                effect: (unit) => {
                    unit.hasTemporalShift = true;
                    const dmgDiff = -Math.floor(unit.damage * 0.5);
                    unit.damage += dmgDiff;
                    unit.statModifiers = unit.statModifiers || {};
                    unit.statModifiers.damage = (unit.statModifiers.damage || 0) + dmgDiff;
                }
            }
        ];

        const available = [];
        commonBuffs.forEach(b => available.push({ buff: b, weight: 80 }));
        epicBuffs.forEach(b => available.push({ buff: b, weight: 20 }));

        const result = [];
        for (let i = 0; i < count; i++) {
            if (available.length === 0) break;
            const totalWeight = available.reduce((sum, item) => sum + item.weight, 0);
            let rand = Math.random() * totalWeight;
            for (let j = 0; j < available.length; j++) {
                rand -= available[j].weight;
                if (rand <= 0) {
                    result.push(available[j].buff);
                    available.splice(j, 1);
                    break;
                }
            }
        }
        return result;
    }

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

        // 50% chance to roll a legendary OR mythic buff instead of a standard one
        let buffOptions = [];

        // Priority to mythic if both could theoretically spawn (though usually they shouldn't conflict heavily)
        let specialBuff = this.tryGenerateMythicBuff() || this.tryGenerateLegendaryBuff();

        if (specialBuff && Math.random() < 0.5) {
            // Special buff rolled - include it as one of the 3 buffs
            buffOptions = [specialBuff, ...this.getRandomBuffs(2)];
        } else {
            // No special - just 3 standard/epic buffs
            buffOptions = this.getRandomBuffs(3);
        }

        const buffContainer = document.getElementById('reward-buffs');
        buffContainer.innerHTML = '';
        buffOptions.forEach(buff => {
            const isMythic = buff.id.startsWith('mythic_');
            const isLegendary = buff.id.startsWith('legendary_');
            const rarity = isMythic ? 'mythic' : (isLegendary ? 'legendary' : (buff.rarity || 'common'));

            const nameColor = rarity === 'mythic' ? '#ff3333' : (rarity === 'legendary' ? '#ff8c00' : (rarity === 'epic' ? '#9B6BAB' : '#6B8B5B'));
            const textShadow = rarity === 'mythic' ? ' text-shadow: 0 0 8px rgba(255, 26, 26, 0.6);' : (rarity === 'legendary' ? ' text-shadow: 0 0 8px rgba(255, 140, 0, 0.6);' : (rarity === 'epic' ? ' text-shadow: 0 0 6px rgba(139, 91, 155, 0.5);' : ''));

            let rarityLabel = '';
            if (rarity === 'mythic') {
                rarityLabel = '<div style="font-size: 11px; color: #ff3333; margin-top: 2px; text-shadow: 0 0 5px rgba(255, 26, 26, 0.5);">🔥 Mythic Power</div>';
            } else if (rarity === 'legendary') {
                rarityLabel = '<div style="font-size: 11px; color: #ff8c00; margin-top: 2px; text-shadow: 0 0 5px rgba(255, 140, 0, 0.5);">⚡ Legendary Power</div>';
            } else if (rarity === 'epic') {
                rarityLabel = '<div style="font-size: 11px; color: #9B6BAB; margin-top: 2px; text-shadow: 0 0 4px rgba(139, 91, 155, 0.4);">⚡ Epic Power</div>';
            }

            const card = this.uiManager.createRewardCard(
                rarity === 'legendary' ? 'legendary' : (rarity === 'epic' ? 'epic' : 'buff'),
                buff.id,
                `
                    <div style="font-size: 32px; margin-bottom: 5px;">${buff.icon}</div>
                    <div style="color: ${nameColor}; font-weight: bold;${textShadow}">${buff.name}</div>
                    ${rarityLabel}
                    <div style="font-size: 12px; color: #B8A896; margin-top: 5px;">${buff.desc}</div>
                `,
                buff,
                rarity
            );

            buffContainer.appendChild(card);
        });

        // Filter out buffs that are already owned (unique buffs)
        const ownedBuffTypes = new Set(this.magicBuffs.map(b => b.type));
        const allMagicOptions = [
            {
                id: 'mana_max', name: 'Expanded Mana Pool', icon: '💧', desc: '+50 Max Mana',
                buffType: 'maxMana', buffValue: 50,
                effect: () => { this.maxMana += 50; this.mana += 50; this.uiManager.updateManaDisplay(); }
            },
            {
                id: 'mana_regen', name: 'Mana Flow', icon: '🌊', desc: '+2 Base Mana Regen per round',
                buffType: 'manaRegen', buffValue: 2,
                effect: () => { this.baseManaRegen = (this.baseManaRegen || 1) + 2; }
            },
            {
                id: 'spell_power', name: 'Arcane Power', icon: '🔮', desc: '+25% Spell Damage',
                buffType: 'spellPower', buffValue: 0.25,
                effect: () => { this.spellPowerMultiplier = (this.spellPowerMultiplier || 1) + 0.25; }
            },
            {
                id: 'healing_surge', name: 'Healing Surge', icon: '💖', desc: '+35% Healing Spell Power',
                buffType: 'healingPower', buffValue: 0.35,
                effect: () => { this.healingPowerMultiplier = (this.healingPowerMultiplier || 1) + 0.35; }
            },
            {
                id: 'spell_efficiency', name: 'Efficient Casting', icon: '⚡', desc: '-20% Mana Cost for all spells',
                buffType: 'manaCost', buffValue: 0.2,
                effect: () => {
                    // Flat -20% from base, capped at 80% reduction (0.2 multiplier minimum)
                    this.manaCostMultiplier = Math.max(0.2, this.manaCostMultiplier - 0.2);
                },
                maxStacks: 4
            },
            {
                id: 'mana_restore', name: 'Mana Surge', icon: '✨', desc: 'Fully restore all missing mana instantly',
                buffType: 'manaRestore', buffValue: 1,
                effect: () => { this.mana = this.maxMana; this.uiManager.updateManaDisplay(); }
            },
            {
                id: 'double_cast', name: 'Twin Cast', icon: '🔄', desc: '+1 spell per round',
                buffType: 'spellsPerRound', buffValue: 1,
                effect: () => { this.spellsPerRound = (this.spellsPerRound || 1) + 1; }
            },
            {
                id: 'permanent_buffs', name: 'Eternal Magic', icon: '♾️', desc: 'Spell buffs no longer expire',
                buffType: 'permanentBuffs', buffValue: 1,
                effect: () => { this.permanentBuffs = true; },
                unique: true
            },
            {
                id: 'army_buffs', name: 'Mass Enchantment', icon: '🌟', desc: 'Spells target whole army',
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

        if (playerUnits.some(u => u.type === 'SORCERER') && !hasBuff('SORCERER', 'hasPiercing')) {
            availableLegendaryBuffs.push({
                id: 'legendary_piercing',
                name: 'Arcane Pierce',
                icon: '🔮',
                desc: 'Sorcerer: Infinite range, shots pierce all units in path',
                unitType: 'SORCERER',
                effect: (unit) => {
                    unit.hasPiercing = true;
                    unit.rangedRange = 999;
                    unit.statModifiers = unit.statModifiers || {};
                    unit.statModifiers.hasPiercing = true;
                    unit.statModifiers.rangedRange = 999;
                }
            });
        }

        if (playerUnits.some(u => u.type === 'ROGUE') && !hasBuff('ROGUE', 'hasBackstab')) {
            availableLegendaryBuffs.push({
                id: 'legendary_backstab',
                name: 'Shadow Strike',
                icon: '🗡️',
                desc: 'Rogue: 4x damage when attacking from behind (or side)',
                unitType: 'ROGUE',
                effect: (unit) => {
                    unit.hasBackstab = true;
                    unit.statModifiers = unit.statModifiers || {};
                    unit.statModifiers.hasBackstab = true;
                }
            });
        }

        if (availableLegendaryBuffs.length === 0) {
            return null;
        }

        // Return a random legendary buff
        return availableLegendaryBuffs[Math.floor(Math.random() * availableLegendaryBuffs.length)];
    }

    // Try to generate a mythic buff (can only appear if a legendary was already obtained)
    tryGenerateMythicBuff() {
        const playerUnits = this.unitManager.units.filter(u => u.isPlayer);
        const availableMythicBuffs = [];

        const hasProperty = (unitType, buffProperty) => {
            return playerUnits.some(u => u.type === unitType && u[buffProperty]);
        };

        // Paladin mythic requires the unit to have the Paladin Legendary `hasCleave`
        if (hasProperty('PALADIN', 'hasCleave') && !hasProperty('PALADIN', 'hasDivineRetribution')) {
            availableMythicBuffs.push({
                id: 'mythic_divine_retribution',
                name: 'Divine Retribution',
                icon: '✨',
                desc: 'Paladin: Removes passive debuffs. Unlimited retaliation vs melee (x2 DMG).',
                unitType: 'PALADIN',
                rarity: 'mythic',
                effect: (unit) => {
                    unit.hasDivineRetribution = true;
                    // Reset the default passive debuffs
                    const defIndex = Object.keys(unit.statModifiers || {}).indexOf('rangedDefense');
                    if (unit.statModifiers && unit.statModifiers.rangedDefense) {
                        delete unit.statModifiers.rangedDefense;
                    }
                    if (unit.statModifiers && unit.statModifiers.healingBoost) {
                        delete unit.statModifiers.healingBoost;
                    }
                    unit.statModifiers = unit.statModifiers || {};
                    unit.statModifiers.hasDivineRetribution = true;
                }
            });
        }

        // Sorcerer mythic requires the unit to have Sorcerer Legendary (Placeholder, assuming we just check if it's there or give it to them if they have none for now)
        // Wait, Sorcerer doesn't have a legendary yet. The prompt specifies: "acquired for a unit that already owns a legendary perk". But we have no Sorcerer legendary!
        // We will assume that they must have some generic legendary/epic perk or we will just make it available if they are a Sorcerer since Sorcerer's only get Epic standard buffs right now
        // Let's restrict it to if the Sorcerer has at least one epic buff? Actually standard legendary perks didn't exist for sorcerer yet. I will check for 'hasArcaneFocus' logic to prevent dupes.
        if (playerUnits.some(u => u.type === 'SORCERER') && !hasProperty('SORCERER', 'hasArcaneFocus')) {
            // Note: If you want this to STRICTLY require a legendary perk first, we'd have to create a Sorcerer legendary perk. For now we just make them eligible if they exist.
            availableMythicBuffs.push({
                id: 'mythic_arcane_focus',
                name: 'Arcane Focus',
                icon: '🔥',
                desc: 'Sorcerer: Consecutive casts of same spell increase its DMG by 50%.',
                unitType: 'SORCERER',
                rarity: 'mythic',
                effect: (unit) => {
                    unit.hasArcaneFocus = true;
                    unit.statModifiers = unit.statModifiers || {};
                    unit.statModifiers.hasArcaneFocus = true;
                }
            });
        }

        if (availableMythicBuffs.length === 0) {
            return null;
        }

        return availableMythicBuffs[Math.floor(Math.random() * availableMythicBuffs.length)];
    }

    selectReward(category, id, cardElement, effectData) {
        if (category === 'buff' || category === 'epic') {
            this.showBuffTargetSelection(id, cardElement, effectData);
            return;
        }

        if (category === 'legendary' || category === 'mythic') {
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
        const buffIdToProperty = {
            'legendary_frenzy': 'hasDoubleStrike',
            'legendary_cleave': 'hasCleave',
            'legendary_ricochet': 'hasRicochet',
            'legendary_piercing': 'hasPiercing',
            'legendary_backstab': 'hasBackstab',
            'mythic_divine_retribution': 'hasDivineRetribution',
            'mythic_arcane_focus': 'hasArcaneFocus'
        };
        const buffProperty = buffIdToProperty[buffId];

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

                const isMythic = buffData.rarity === 'mythic';
                buffCard.style.borderColor = isMythic ? '#ff3333' : '#D4A574';
                buffCard.style.transform = 'scale(1.05)';
                buffCard.style.boxShadow = isMythic ? '0 0 30px rgba(255, 51, 51, 0.5)' : '0 0 30px rgba(212, 165, 116, 0.5)';

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
            magicBuffs: this.magicBuffs,
            currentEnemyFaction: this.currentEnemyFaction
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
            this.uiManager.updateAbilityButton();
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
        this.unitCounts = {};
        this.placedUnits = [];
        this.placementMode = false;
        this.selectedPlacementUnit = null;

        // PVP context
        this.isPVPMode = false;
        this.pvpManager = null;
    }

    getStartingPoints() {
        return this.isPVPMode ? 2500 : 1000;
    }

    create() {
        this.resetUnitCounts();
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

    resetUnitCounts() {
        this.unitCounts = { KNIGHT: 0, ARCHER: 0, WIZARD: 0, CLERIC: 0, ROGUE: 0, PALADIN: 0, RANGER: 0, BERSERKER: 0, SORCERER: 0 };
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
        this.startPlacementPhase();
    }

    startPlacementPhase() {
        document.getElementById('ui-panel').classList.add('hidden');
        this.placementMode = true;
        this.placedUnits = [];
        this.selectedPlacementUnit = null;

        // Determine placement zone
        let placementStartX = 0;
        let placementEndX = 2;
        let initialPlacementX = 0;

        if (this.isPVPMode && this.pvpManager && !this.pvpManager.isHostPlayer()) {
            placementStartX = CONFIG.GRID_WIDTH - 2;
            placementEndX = CONFIG.GRID_WIDTH;
            initialPlacementX = CONFIG.GRID_WIDTH - 1;
        }

        // Auto-place units
        for (const [type, count] of Object.entries(this.unitCounts)) {
            for (let i = 0; i < count; i++) {
                // Find first available Y in the initial column
                let spawnY = -1;
                for (let y = 0; y < CONFIG.GRID_HEIGHT; y++) {
                    const isOccupied = this.placedUnits.some(u => u.x === initialPlacementX && u.y === y);
                    if (!isOccupied) {
                        spawnY = y;
                        break;
                    }
                }

                if (spawnY !== -1) {
                    const x = initialPlacementX * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
                    const y = spawnY * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
                    const sprite = this.add.text(x, y, UNIT_TYPES[type].emoji, { fontSize: '36px' }).setOrigin(0.5);
                    this.placedUnits.push({ type, x: initialPlacementX, y: spawnY, sprite });
                }
            }
        }

        const placementBar = document.getElementById('placement-bar');
        placementBar.classList.remove('hidden');

        document.getElementById('confirm-placement').disabled = false;

        this.input.on('pointerdown', (pointer) => {
            if (!this.placementMode) return;

            const gridX = Math.floor(pointer.x / CONFIG.TILE_SIZE);
            const gridY = Math.floor(pointer.y / CONFIG.TILE_SIZE);

            const inPlacementZone = gridX >= placementStartX && gridX < placementEndX;
            if (!inPlacementZone) {
                if (this.selectedPlacementUnit) {
                    this.selectedPlacementUnit.sprite.setAlpha(1.0);
                    this.selectedPlacementUnit = null;
                    this.drawGrid();
                }
                return;
            }

            if (this.selectedPlacementUnit) {
                // Try to place the selected unit
                const isOccupied = this.placedUnits.some(u => u.x === gridX && u.y === gridY);
                if (!isOccupied) {
                    // Move the unit
                    this.selectedPlacementUnit.x = gridX;
                    this.selectedPlacementUnit.y = gridY;
                    this.selectedPlacementUnit.sprite.setPosition(
                        gridX * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2,
                        gridY * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2
                    );
                    this.selectedPlacementUnit.sprite.setAlpha(1.0);
                    this.selectedPlacementUnit = null;
                    this.drawGrid();
                } else {
                    // Clicked on another unit, just cancel selection for now
                    this.selectedPlacementUnit.sprite.setAlpha(1.0);
                    this.selectedPlacementUnit = null;
                    this.drawGrid();
                }
            } else {
                // Try to select a unit
                const unitToSelect = this.placedUnits.find(u => u.x === gridX && u.y === gridY);
                if (unitToSelect) {
                    this.selectedPlacementUnit = unitToSelect;
                    this.selectedPlacementUnit.sprite.setAlpha(0.5);
                }
            }
        });

        this.input.on('pointermove', (pointer) => {
            if (!this.placementMode || !this.selectedPlacementUnit) return;
            this.drawGrid();

            const gridX = Math.floor(pointer.x / CONFIG.TILE_SIZE);
            const gridY = Math.floor(pointer.y / CONFIG.TILE_SIZE);

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

    randomizePlacement() {
        if (!this.placementMode || !this.placedUnits.length) return;

        // Determine placement zone
        let placementStartX = 0;
        let placementEndX = 2;

        if (this.isPVPMode && this.pvpManager && !this.pvpManager.isHostPlayer()) {
            placementStartX = CONFIG.GRID_WIDTH - 2;
            placementEndX = CONFIG.GRID_WIDTH;
        }

        // Get all available cells in the zone
        const availableCells = [];
        for (let y = 0; y < CONFIG.GRID_HEIGHT; y++) {
            for (let x = placementStartX; x < placementEndX; x++) {
                availableCells.push({ x, y });
            }
        }

        // Shuffle the cells (Fisher-Yates shuffle)
        for (let i = availableCells.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [availableCells[i], availableCells[j]] = [availableCells[j], availableCells[i]];
        }

        // Assign each unit a new random cell
        this.placedUnits.forEach((unit, index) => {
            if (availableCells[index]) {
                const newPos = availableCells[index];
                unit.x = newPos.x;
                unit.y = newPos.y;
                unit.sprite.setPosition(
                    newPos.x * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2,
                    newPos.y * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2
                );
            }
        });

        // If a unit was selected, deselect it
        if (this.selectedPlacementUnit) {
            this.selectedPlacementUnit.sprite.setAlpha(1.0);
            this.selectedPlacementUnit = null;
        }
        this.drawGrid(); // Redraw grid to clear any highlights
    }

    confirmPlacement() {
        this.placementMode = false;
        document.getElementById('placement-bar').classList.add('hidden');

        // Clean up sprites before passing data to next scene
        const finalPlacement = this.placedUnits.map(u => ({ type: u.type, x: u.x, y: u.y }));
        this.placedUnits.forEach(u => u.sprite.destroy());
        this.placedUnits = [];

        if (this.isPVPMode && this.pvpManager) {
            this.scene.start('PVPMatchScene', {
                pvpManager: this.pvpManager,
                sessionKey: this.pvpManager.getSessionKey(),
                playerNumber: this.pvpManager.getPlayerNumber(),
                army: finalPlacement
            });
        } else {
            this.scene.start('BattleScene', {
                placedUnits: finalPlacement,
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
        this.resetUnitCounts();
        this.placedUnits = []; // Should already be empty but just in case

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
