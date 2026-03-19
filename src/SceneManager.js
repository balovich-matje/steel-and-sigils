// ============================================
// SCENE MANAGER - Phaser Scenes
// ============================================

import { CONFIG, SPELLS, STAGES } from './GameConfig.js';
import { t } from './i18n-helper.js';
import { initDebug } from './debug.js';

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
        this.combatLog = [];
        this.combatLogOpen = false;
        this.currentStage = null;
        this.tileSize = CONFIG.TILE_SIZE || 64;
        this.silenceActive = false; // The Silence boss ability
        this.lastBossSpawned = null; // Tracks last boss to prevent back-to-back repeats
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
            'CULTIST_ACOLYTE', 'CULTIST_NEOPHYTE', 'GIBBERING_HORROR', 'FLESH_WARPED_STALKER', "OCTOTH_HROARATH",
            'THE_SILENCE', 'VOID_HERALD'
        ];
        for (const unitType of enemyUnits) {
            const template = UNIT_TYPES[unitType];
            if (template && template.image) {
                const imageKey = unitType.toLowerCase() + '_img';
                this.load.image(imageKey, template.image);
            }
        }

        // Load wall/obstacle images
        this.load.image('wall_img', 'images/obstacles/wall.png');
        this.load.image('rock_img', 'images/obstacles/rock.png');
        this.load.image('wall_large_img', 'images/obstacles/wall_large.png');
        this.load.image('rock_large_img', 'images/obstacles/rock_large.png');
        // Mountain Pass rock variations
        this.load.image('rock_tall_img', 'images/obstacles/rock_tall.png');
        this.load.image('rock_wide_img', 'images/obstacles/rock_wide.png');
        this.load.image('rock_jagged_img', 'images/obstacles/rock_jagged.png');
        
        // Load tile background images
        // Forest grass tiles (random selection for variety)
        this.load.image('grass1', 'images/tiles/grass1.png');
        this.load.image('grass2', 'images/tiles/grass2.png');
        this.load.image('grass3', 'images/tiles/grass3.png');
        this.load.image('dirt_tile', 'images/tiles/dirt.png');
        this.load.image('rock_tile', 'images/tiles/rock.png');
    }

    create(data) {
        document.getElementById('left-panel').classList.remove('hidden', 'collapsed');
        document.getElementById('right-panel').classList.remove('hidden', 'collapsed');
        // Ensure language toggle is hidden during gameplay
        const langToggle = document.getElementById('lang-toggle-container');
        if (langToggle) {
            langToggle.style.display = 'none';
        }
        
        // Initialize systems
        this.unitManager = new UnitManager(this);
        this.turnSystem = new TurnSystem(this);
        this.spellSystem = new SpellSystem(this);
        this.uiManager = new UIManager(this);

        // Determine stage for this run
        if (data && data.stageId) {
            this.currentStage = STAGES[data.stageId];
        } else {
            // Default to forest or random choice if starting fresh (though usually randomizer is in SceneManager)
            this.currentStage = STAGES.forest;
        }

        // Calculate dynamic tile size to fit map in canvas
        this.tileSize = CONFIG.getTileSize(this.currentStage.width, this.currentStage.height);

        // Initialize grid with stage dimensions and dynamic tile size
        this.gridSystem = new GridSystem(this, this.currentStage.width, this.currentStage.height, this.tileSize);
        this.gridSystem.create();

        // NOTE: Obstacles are now generated after player units are placed
        // to avoid spawning rocks on top of existing units

        // Track battle number for scaling
        if (data && data.battleNumber) {
            this.battleNumber = data.battleNumber;
        }

        // Restore last boss to enforce no-repeat rule
        if (data && data.lastBossSpawned) {
            this.lastBossSpawned = data.lastBossSpawned;
        }

        // Determine enemy faction for this run
        if (data && data.selectedEnemyFaction) {
            // Use faction selected in pre-game
            this.currentEnemyFaction = data.selectedEnemyFaction;
        } else if (data && data.currentEnemyFaction) {
            // Continue with same faction from previous battle
            this.currentEnemyFaction = data.currentEnemyFaction;
        } else if (this.battleNumber === 1) {
            // Random faction for battle 1 (fallback if no selection made)
            const factions = Object.keys(ENEMY_FACTIONS);
            this.currentEnemyFaction = factions[Math.floor(Math.random() * factions.length)];
        } else {
            // Fallback for safety
            this.currentEnemyFaction = 'GREENSKIN_HORDE';
        }

        // Restore magic buffs from previous battle
        if (data && data.magicBuffs) {
            this.magicBuffs = data.magicBuffs;
            for (const buff of this.magicBuffs) {
                if (buff.type === 'manaRegen') this.baseManaRegen = (this.baseManaRegen || 1) + buff.value;
                if (buff.type === 'manaCost') this.manaCostMultiplier = Math.max(0.2, this.manaCostMultiplier - buff.value);
                if (buff.type === 'spellPower') this.spellPowerMultiplier += buff.value;
                if (buff.type === 'healingPower') this.healingPowerMultiplier = (this.healingPowerMultiplier || 1) + buff.value;
                if (buff.type === 'spellsPerRound') this.spellsPerRound += buff.value;
                if (buff.type === 'maxMana') { this.maxMana += buff.value; }
                if (buff.type === 'permanentBuffs') this.permanentBuffs = true;
                if (buff.type === 'armyBuffs') this.armyBuffs = true;
                // manaRestore is a one-time effect, don't restore it
            }
        }

        // Update magic buffs display
        this.uiManager.updateMagicBuffsDisplay();

        // Reset victory flag
        this.victoryShown = false;

        // Create game elements
        this.gridSystem.create();

        // Center camera on the game world
        this.centerCameraOnMap();

        // Create player units from placement data
        if (data && data.placedUnits) {
            for (const unitData of data.placedUnits) {
                const unit = this.unitManager.addUnit(unitData.type, unitData.x, unitData.y);
                if (!unit) continue; // Skip if unit couldn't be created
                
                // Apply permanent stat modifiers if they exist
                if (unitData.statModifiers) {
                    unit.statModifiers = unitData.statModifiers;
                    if (unitData.statModifiers.damage) unit.damage += unitData.statModifiers.damage;
                    if (unitData.statModifiers.maxHealth) {
                        unit.maxHealth += unitData.statModifiers.maxHealth;
                        unit.health += unitData.statModifiers.maxHealth;
                    }
                    if (unitData.statModifiers.moveRange) {
                        // Berserker is immune to movement reduction — only apply positive modifiers
                        const movAdj = unit.type === 'BERSERKER'
                            ? Math.max(0, unitData.statModifiers.moveRange)
                            : unitData.statModifiers.moveRange;
                        unit.moveRange += movAdj;
                    }
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
                    if (unitData.statModifiers.hasUnstableArcana) unit.hasUnstableArcana = true;
                    if (unitData.statModifiers.hasTemporalShift) unit.hasTemporalShift = true;
                    if (unitData.statModifiers.hasSilverArrows) unit.hasSilverArrows = true;
                    if (unitData.statModifiers.hasWarlust) unit.hasWarlust = true;

                    unit.updateHealthBar();
                }

                // Restore Bloodlust stacks for Berserker
                if (unitData.bloodlustStacks && unit.type === 'BERSERKER') {
                    unit.bloodlustStacks = unitData.bloodlustStacks;
                    unit.damage += unitData.bloodlustStacks * 15;
                    // Warlust mythic: also restore HP bonus per stack
                    if (unit.hasWarlust) {
                        const hpBonus = unitData.bloodlustStacks * 5;
                        unit.maxHealth += hpBonus;
                        unit.health = Math.min(unit.health + hpBonus, unit.maxHealth);
                        unit.updateHealthBar();
                    }
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
                    if (unitData.buffs.unstableArcanaDotRounds) {
                        unit.unstableArcanaDotRounds = unitData.buffs.unstableArcanaDotRounds;
                        unit.unstableArcanaDotAmount = unitData.buffs.unstableArcanaDotAmount || 0;
                    }
                }
            }
        }

        // Generate obstacles after player units are placed (so rocks avoid unit positions)
        // and before enemy units are created (so enemies avoid rock positions)
        // Use saved obstacles from previous battle if available (persist across battles on same map)
        if (this.currentStage.hasObstacles) {
            const savedObstacles = data && data.savedObstacles ? data.savedObstacles : null;
            this.generateObstacles(savedObstacles);
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
            
            // Convert screen coordinates to world coordinates
            const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
            
            if (this.spellSystem.activeSpell) {
                const gridX = Math.floor(worldPoint.x / this.tileSize);
                const gridY = Math.floor(worldPoint.y / this.tileSize);
                if (gridX >= 0 && gridX < this.gridSystem.width && gridY >= 0 && gridY < this.gridSystem.height) {
                    this.spellSystem.executeSpellAt(gridX, gridY);
                }
            } else if (this.activeUnitAbility) {
                const gridX = Math.floor(worldPoint.x / this.tileSize);
                const gridY = Math.floor(worldPoint.y / this.tileSize);
                if (gridX >= 0 && gridX < this.gridSystem.width && gridY >= 0 && gridY < this.gridSystem.height) {
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
        initDebug(this);

        // Keyboard controls
        this.input.keyboard.on('keydown-S', () => {
            if (this.victoryShown) return;
            this.openSpellBook();
        });

        this.input.keyboard.on('keydown-E', () => {
            if (this.victoryShown) return;
            if (this.turnSystem.currentUnit && this.turnSystem.currentUnit.isPlayer) {
                this.endTurn();
            }
        });

        this.input.keyboard.on('keydown-U', () => {
            if (this.victoryShown) return;
            if (this.turnSystem.currentUnit && this.turnSystem.currentUnit.isPlayer) {
                const abilityBtn = document.getElementById('unit-ability-btn');
                if (abilityBtn && !abilityBtn.disabled) {
                    this.useUnitAbility();
                }
            }
        });

        this.input.keyboard.on('keydown-ESC', () => {
            if (this.victoryShown) return;
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

    centerCameraOnMap() {
        // Calculate the actual world bounds based on the grid
        const mapWidth = this.currentStage.width * this.tileSize;
        const mapHeight = this.currentStage.height * this.tileSize;
        
        // Center the camera on the map
        this.cameras.main.centerOn(mapWidth / 2, mapHeight / 2);
    }

    useUnitAbility() {
        if (!this.turnSystem || !this.turnSystem.currentUnit) return;

        // Check if silence is active
        if (this.silenceActive) {
            this.uiManager.showFloatingText(
                '🔇 Abilities are silenced!',
                400, 300, '#9B59B6'
            );
            return;
        }

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
                        ally.gridX * this.tileSize + 4,
                        ally.gridY * this.tileSize + 4,
                        this.tileSize - 8,
                        this.tileSize - 8
                    );
                }
            });
        }
        else if (unit.type === 'SORCERER' && !unit.hasCastFireball) {
            this.activeUnitAbility = 'SORCERER_FIREBALL';
            this.uiManager.showFloatingText('Select target for Fireball', 400, 300, '#FF4500');
            document.body.style.cursor = 'crosshair';
        }
    }

    // Process unit abilities
    executeUnitAbilityAt(gridX, gridY) {
        if (!this.activeUnitAbility || !this.turnSystem.currentUnit) return;
        
        // Prevent double execution from multiple event handlers
        if (this._executingAbility) return;
        this._executingAbility = true;

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
                this.addCombatLog(`${unit.name} used Heal on ${target.name} restoring ${healAmount} HP.`, 'heal');

                // End ability mode
                unit.hasHealed = true;
                this.activeUnitAbility = null;
                document.body.style.cursor = 'default';
                this.gridSystem.highlightValidMoves(unit);
                this.uiManager.updateUnitInfo(unit);
            } else {
                this.uiManager.showFloatingText('Invalid target', 400, 300, '#ff0000');
            }
            
            // Reset execution flag
            this._executingAbility = false;
        }
        else if (this.activeUnitAbility === 'PULL') {
            // (Implementation for Octo pull can be added here or kept as is in Octo's AI)
            this.activeUnitAbility = null;
            document.body.style.cursor = 'default';
            
            // Reset execution flag
            this._executingAbility = false;
        }
        else if (this.activeUnitAbility === 'SORCERER_FIREBALL') {
            // Sorcerer Fireball: cast fireball with army-wide passive boost
            const spell = SPELLS.fireball;
            
            // Clear ability flag immediately to prevent double execution
            this.activeUnitAbility = null;
            
            // Check for Unstable Arcana mythic perk on this specific unit
            const hasUnstableArcana = unit.hasUnstableArcana;
            let unstableArcanaRoll = null;
            let damageMultiplier = 1;
            let rollDescription = '';
            
            if (hasUnstableArcana) {
                // Roll for Unstable Arcana effect:
                // 25% double damage (0-24)
                // 5% quad damage (25-29)
                // 50% lingering DoT (30-79)
                // 20% misspell (80-99)
                const roll = Math.random() * 100;
                
                if (roll < 25) {
                    unstableArcanaRoll = 'double';
                    damageMultiplier = 2;
                    rollDescription = 'Double Damage!';
                } else if (roll < 30) {
                    unstableArcanaRoll = 'quad';
                    damageMultiplier = 4;
                    rollDescription = 'QUAD DAMAGE!';
                } else if (roll < 80) {
                    unstableArcanaRoll = 'dot';
                    damageMultiplier = 1;
                    rollDescription = 'Lingering Burn';
                } else {
                    unstableArcanaRoll = 'misspell';
                    damageMultiplier = 0.1;
                    rollDescription = 'Misspell...';
                }
            }
            
            // Create fireball projectile animation
            this.createFireballProjectile(unit, gridX, gridY, () => {
                // Callback after animation completes
                this.executeSorcererFireball(spell, gridX, gridY, unit, damageMultiplier, unstableArcanaRoll);
                
                if (hasUnstableArcana) {
                    this.addCombatLog(`${unit.name} cast Fireball! (${rollDescription})`, 'ability');
                    this.uiManager.showFloatingText(rollDescription, gridX * this.tileSize + this.tileSize/2, gridY * this.tileSize - 30, 
                        unstableArcanaRoll === 'misspell' ? '#888888' : 
                        unstableArcanaRoll === 'quad' ? '#ff3333' : 
                        unstableArcanaRoll === 'double' ? '#ff8c00' : '#ff6600');
                } else {
                    this.addCombatLog(`${unit.name} cast Fireball!`, 'ability');
                }
                
                // End ability mode
                unit.hasCastFireball = true;
                document.body.style.cursor = 'default';
                this.gridSystem.highlightValidMoves(unit);
                this.uiManager.updateUnitInfo(unit);
                
                // Reset execution flag
                this._executingAbility = false;
            });
            return;
        }
        
        // Reset execution flag after a short delay for other abilities
        this.time.delayedCall(100, () => {
            this._executingAbility = false;
        });
    }

    // Execute Sorcerer Fireball with Unstable Arcana support
    executeSorcererFireball(spell, centerX, centerY, castingUnit, damageMultiplier, unstableArcanaRoll) {
        const radius = 1; // 3x3 area
        const targets = [];

        // Find all targets in the AoE
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                const x = centerX + dx;
                const y = centerY + dy;
                const unit = this.unitManager.getUnitAt(x, y);
                if (unit && !unit.isPlayer) {
                    targets.push(unit);
                }
            }
        }

        // Create explosion effect
        this.spellSystem.createExplosionEffect(centerX, centerY, radius);

        // Calculate base damage with Sorcerer passive boost
        let baseDamage = spell.power;
        const playerUnits = this.unitManager.getPlayerUnits();
        const sorcererCount = playerUnits.filter(u => u.type === 'SORCERER' && u.health > 0).length;
        if (sorcererCount > 0) {
            baseDamage = Math.floor(baseDamage * (1 + sorcererCount * 0.5));
        }

        // Apply Unstable Arcana multiplier
        const finalDamage = Math.floor(baseDamage * damageMultiplier);

        // Apply damage to all targets
        for (const unit of targets) {
            this.time.delayedCall(200, () => {
                const actualDamage = unit.takeSpellDamage(finalDamage);
                this.uiManager.showDamageText(unit, actualDamage);
                
                let damageText = `${spell.name} hit ${unit.name} dealing ${actualDamage} damage.`;
                if (unstableArcanaRoll) {
                    const effectNames = {
                        'double': 'Double Damage',
                        'quad': 'QUAD DAMAGE',
                        'dot': 'Lingering Burn',
                        'misspell': 'Misspell'
                    };
                    damageText += ` [${effectNames[unstableArcanaRoll]}]`;
                }
                this.addCombatLog(damageText, 'damage');

                // Apply DoT if rolling the DoT effect (and target is still alive)
                if (unstableArcanaRoll === 'dot' && unit.health > 0) {
                    // DoT does 50% of initial damage at the start of each turn for 2 turns
                    const dotAmount = Math.floor(finalDamage * 0.5);
                    unit.unstableArcanaDotAmount = dotAmount;
                    unit.unstableArcanaDotRounds = 2;
                    this.uiManager.showFloatingText(`Burning!`, unit.sprite.x, unit.sprite.y - 40, '#ff6600');
                    this.addCombatLog(`${unit.name} is burning for ${dotAmount} damage for 2 turns!`, 'buff');
                }

                this.checkVictoryCondition();
            });
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
        let availablePositions = this.getEnemySpawnPositions();
        
        // Filter out positions that have obstacles (rocks)
        availablePositions = availablePositions.filter(pos => {
            return !this.gridSystem.isObstacle(pos.x, pos.y);
        });

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
                t('combat.enemies', this.battleNumber, spawnedEnemies.length),
                320, 100, '#A68966'
            );
        } else {
            this.uiManager.showFloatingText(
                t('combat.defeat_enemy'),
                320, 100, '#A68966'
            );
        }
    }

    createBossWave() {
        let selectedBoss;
        if (this.currentEnemyFaction === 'DUNGEON_DWELLERS') {
            // Only one dungeon boss - always Summoner Lich
            selectedBoss = 'SUMMONER_LICH';
        } else if (this.currentEnemyFaction === 'OLD_GOD_WORSHIPPERS') {
            const cultistBosses = ['OCTOTH_HROARATH', 'THE_SILENCE', 'VOID_HERALD'];
            selectedBoss = cultistBosses[Math.floor(Math.random() * cultistBosses.length)];
            // No back-to-back: if same as last time, pick uniformly from the others
            if (selectedBoss === this.lastBossSpawned) {
                const others = cultistBosses.filter(b => b !== this.lastBossSpawned);
                selectedBoss = others[Math.floor(Math.random() * others.length)];
            }
        } else {
            // GREENSKIN_HORDE: weighted selection (30% Loot Goblin, 35%/35% the other two)
            const bossPool = ['OGRE_CHIEFTAIN', 'ORC_SHAMAN_KING', 'LOOT_GOBLIN'];
            const roll = Math.random();
            if (roll < 0.3) {
                selectedBoss = 'LOOT_GOBLIN';
            } else {
                selectedBoss = roll < 0.65 ? 'OGRE_CHIEFTAIN' : 'ORC_SHAMAN_KING';
            }
            // No back-to-back: if same as last time, pick uniformly from the others
            if (selectedBoss === this.lastBossSpawned) {
                const others = bossPool.filter(b => b !== this.lastBossSpawned);
                selectedBoss = others[Math.floor(Math.random() * others.length)];
            }
        }

        const availablePositions = this.getEnemySpawnPositions();
        // Filter positions that can fit 2x2 bosses (need at least 2 columns from right edge)
        // AND are not blocked by obstacles
        let validPositions = availablePositions.filter(pos => {
            const template = UNIT_TYPES[selectedBoss];
            const size = template.bossSize || 1;
            // Check if the entire boss area is within bounds and unoccupied
            if (!this.unitManager.isValidPlacement(pos.x, pos.y, size)) {
                return false;
            }
            // Check that no tile in the boss area has an obstacle
            for (let dy = 0; dy < size; dy++) {
                for (let dx = 0; dx < size; dx++) {
                    if (this.gridSystem.isObstacle(pos.x + dx, pos.y + dy)) {
                        return false;
                    }
                }
            }
            return true;
        });

        if (validPositions.length === 0) {
            // Fallback to normal wave if no valid positions
            this.uiManager.showFloatingText(
                t('combat.no_space_boss', this.battleNumber),
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

            // Track last boss spawned to prevent back-to-back repeats
            this.lastBossSpawned = selectedBoss;

            // Mark this battle as having a loot goblin for special reward
            this.hasLootGoblin = (selectedBoss === 'LOOT_GOBLIN');

            // Show boss announcement
            const bossName = t('unit.' + selectedBoss.toLowerCase());
            const bossEmoji = UNIT_TYPES[selectedBoss].emoji;

            this.uiManager.showFloatingText(
                t('combat.boss_wave'),
                320, 80, '#FFD700'
            );
            this.uiManager.showFloatingText(
                t('combat.boss_appears', bossEmoji, bossName),
                320, 120, '#ff4444'
            );
        }
    }

    generateObstacles(savedObstacles = null) {
        if (!this.currentStage || !this.currentStage.hasObstacles) return;

        // Clear any existing obstacles first
        this.clearObstacles();
        
        // If we have saved obstacles from a previous battle, restore them
        if (savedObstacles && savedObstacles.length > 0) {
            for (const obs of savedObstacles) {
                this.gridSystem.addObstacle(obs.x, obs.y, obs.type || 'wall');
            }
            return;
        }

        // Mountain Pass: Use random rock generation with constraints
        if (this.currentStage.obstacleType === 'mountain') {
            this.generateMountainObstacles();
            return;
        }

        // Ruins of a Castle logic:
        // Generate only 2-3 wall pieces around player area
        // Each wall must have minimum 2-cell gap between them
        const size = this.currentStage.width;
        const playerArea = this.currentStage.playerArea;
        
        // Possible wall positions - around the player area but not inside
        // Define positions on each side of player area (one cell outside)
        const candidatePositions = [];
        
        // Top side (above player area)
        for (let x = playerArea.x1; x < playerArea.x2; x++) {
            const y = playerArea.y1 - 1;
            if (y >= 0 && this.isValidWallPosition(x, y, playerArea)) {
                candidatePositions.push({ x, y });
            }
        }
        
        // Bottom side (below player area)
        for (let x = playerArea.x1; x < playerArea.x2; x++) {
            const y = playerArea.y2;
            if (y < size && this.isValidWallPosition(x, y, playerArea)) {
                candidatePositions.push({ x, y });
            }
        }
        
        // Left side (left of player area)
        for (let y = playerArea.y1; y < playerArea.y2; y++) {
            const x = playerArea.x1 - 1;
            if (x >= 0 && this.isValidWallPosition(x, y, playerArea)) {
                candidatePositions.push({ x, y });
            }
        }
        
        // Right side (right of player area)
        for (let y = playerArea.y1; y < playerArea.y2; y++) {
            const x = playerArea.x2;
            if (x < size && this.isValidWallPosition(x, y, playerArea)) {
                candidatePositions.push({ x, y });
            }
        }
        
        // Shuffle candidate positions
        for (let i = candidatePositions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [candidatePositions[i], candidatePositions[j]] = [candidatePositions[j], candidatePositions[i]];
        }
        
        // Place 2-3 walls with minimum 2-cell gap
        const numWalls = 2 + Math.floor(Math.random() * 2); // 2 or 3 walls
        const placedWalls = [];
        
        for (const pos of candidatePositions) {
            if (placedWalls.length >= numWalls) break;
            
            // Check minimum 2-cell gap from all placed walls
            let minDistance = Infinity;
            for (const placed of placedWalls) {
                const dist = Math.abs(pos.x - placed.x) + Math.abs(pos.y - placed.y);
                minDistance = Math.min(minDistance, dist);
            }
            
            // Place if gap >= 2 cells (or it's the first wall)
            if (placedWalls.length === 0 || minDistance >= 2) {
                this.gridSystem.addObstacle(pos.x, pos.y, 'wall');
                placedWalls.push(pos);
            }
        }
    }
    
    // Helper to check if position is valid for wall placement
    isValidWallPosition(x, y, playerArea) {
        // Must be within bounds
        if (x < 0 || x >= this.currentStage.width || y < 0 || y >= this.currentStage.height) {
            return false;
        }
        // Must not be inside player area
        if (x >= playerArea.x1 && x < playerArea.x2 && y >= playerArea.y1 && y < playerArea.y2) {
            return false;
        }
        return true;
    }

    clearObstacles() {
        // Clear the obstacles Set in gridSystem
        if (this.gridSystem) {
            this.gridSystem.obstacles.clear();
            // Also clear any wall images that were created
            if (this.gridSystem.wallImages) {
                for (const wallImg of this.gridSystem.wallImages) {
                    if (wallImg.image && wallImg.image.destroy) {
                        wallImg.image.destroy();
                    }
                }
                this.gridSystem.wallImages = [];
            }
        }
    }

    generateMountainObstacles() {
        // Mountain Pass: Generate rocks ONLY on the top and bottom edges
        // 90% on row 0 and row 10 (last row)
        // 75% on row 1 and row 9 (second row)
        // 25% on row 2 and row 8 (third row)
        // NO rocks in the middle (rows 3-7)
        // Rocks never spawn on player or enemy spawn areas
        const width = this.gridSystem.width;
        const height = this.gridSystem.height;
        const playerArea = this.currentStage.playerArea;

        // Define enemy spawn zone - rightmost 3 columns
        const spawnStartX = width - 3;
        const spawnEndX = width;

        const obstacles = [];

        // Helper to check if position is in player spawn area (keep clear)
        const isPlayerSpawn = (x, y) => {
            return x >= playerArea.x1 && x < playerArea.x2 &&
                   y >= playerArea.y1 && y < playerArea.y2;
        };

        // Helper to check if position is in enemy spawn zone (keep clear)
        const isEnemySpawn = (x, y) => {
            return x >= spawnStartX && x < spawnEndX;
        };

        // Rock density by row - only edges
        const getRockChance = (y) => {
            if (y === 0 || y === height - 1) return 0.98;  // First/last row: 98% (almost solid)
            if (y === 1 || y === height - 2) return 0.88;  // Second row: 88%
            if (y === 2 || y === height - 3) return 0.35;  // Third row: 35%
            return 0;  // Middle rows: no rocks
        };

        // Generate rocks only on edge rows
        for (let y = 0; y < height; y++) {
            const chance = getRockChance(y);
            if (chance === 0) continue;  // Skip middle rows

            for (let x = 0; x < width; x++) {
                // Skip player spawn area
                if (isPlayerSpawn(x, y)) continue;
                
                // Skip enemy spawn zone
                if (isEnemySpawn(x, y)) continue;

                // Random placement based on row density
                if (Math.random() < chance) {
                    // Random rock variation
                    const rockTypes = ['rock', 'rock_tall', 'rock_wide', 'rock_jagged'];
                    const rockType = rockTypes[Math.floor(Math.random() * rockTypes.length)];
                    obstacles.push({ x, y, type: rockType });
                }
            }
        }
        
        // Add all rocks to the grid
        for (const obs of obstacles) {
            this.gridSystem.addObstacle(obs.x, obs.y, obs.type || 'rock');
        }
    }
    
    // Count reachable cells from a starting position
    countReachable(width, height, obstacles, startX, startY) {
        const obstacleSet = new Set(obstacles.map(o => `${o.x},${o.y}`));
        const visited = new Set();
        const queue = [[startX, startY]];
        visited.add(`${startX},${startY}`);
        
        const directions = [[0,1], [0,-1], [1,0], [-1,0]];
        
        while (queue.length > 0) {
            const [cx, cy] = queue.shift();
            
            for (const [dx, dy] of directions) {
                const nx = cx + dx;
                const ny = cy + dy;
                
                if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                    const key = `${nx},${ny}`;
                    if (!visited.has(key) && !obstacleSet.has(key)) {
                        visited.add(key);
                        queue.push([nx, ny]);
                    }
                }
            }
        }
        
        return visited.size;
    }

    getEnemySpawnPositions() {
        const positions = [];

        if (this.currentStage.spawnLogic === 'perimeter') {
            const width = this.currentStage.width;
            const height = this.currentStage.height;
            const pSize = 2; // Perimeter depth

            // Top area
            for (let y = 0; y < pSize; y++) {
                for (let x = 0; x < width; x++) {
                    positions.push({ x, y });
                }
            }
            // Bottom area
            for (let y = height - pSize; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    positions.push({ x, y });
                }
            }
            // Left area (excluding corners already added)
            for (let y = pSize; y < height - pSize; y++) {
                for (let x = 0; x < pSize; x++) {
                    positions.push({ x, y });
                }
            }
            // Right area (excluding corners already added)
            for (let y = pSize; y < height - pSize; y++) {
                for (let x = width - pSize; x < width; x++) {
                    positions.push({ x, y });
                }
            }
        } else if (this.currentStage.spawnLogic === 'right_flank') {
            // Mountain Pass: Fixed 3x6 spawn zone on RIGHT side
            // Position: x = width-3 to width-1, y = middle rows
            const width = this.gridSystem.width;
            const height = this.gridSystem.height;
            
            // Calculate the 6-row spawn zone in the middle of the map
            const spawnZoneHeight = 6;
            const spawnStartY = Math.floor((height - spawnZoneHeight) / 2); // Center vertically
            const spawnEndY = spawnStartY + spawnZoneHeight;
            const spawnStartX = width - 3; // Right side, 3 columns wide
            const spawnEndX = width;
            
            // Fixed spawn zone: 3 wide x 6 tall on the right side
            for (let y = spawnStartY; y < spawnEndY; y++) {
                for (let x = spawnStartX; x < spawnEndX; x++) {
                    positions.push({ x, y });
                }
            }
        } else {
            // Default Forest spawning (right side columns)
            const searchWidth = 2;
            for (let x = this.gridSystem.width - searchWidth; x < this.gridSystem.width; x++) {
                for (let y = 0; y < this.gridSystem.height; y++) {
                    positions.push({ x, y });
                }
            }
        }

        // Shuffle positions
        for (let i = positions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [positions[i], positions[j]] = [positions[j], positions[i]];
        }

        return positions;
    }

    regenerateMana() {
        const wizardCount = this.unitManager.getPlayerUnits().filter(u => u.type === 'WIZARD').length;
        this.baseManaRegen = this.baseManaRegen || 1; // Default to 1
        const totalRegen = this.baseManaRegen + (wizardCount * 2);

        if (this.mana < this.maxMana) {
            this.mana = Math.min(this.maxMana, this.mana + totalRegen);
            this.uiManager.updateManaDisplay();
        }

        if (totalRegen > this.baseManaRegen) {
            this.uiManager.showFloatingText(
                t('mana.regen', totalRegen, this.baseManaRegen, wizardCount * 2),
                320, 50, '#4A729E'
            );
        }
    }

    spendMana(amount) {
        this.mana = Math.max(0, this.mana - amount);
        this.uiManager.updateManaDisplay();
    }

    // Combat Log System
    addCombatLog(message, type = 'info') {
        const colorMap = {
            'round': '#A68966',
            'damage': '#ff6644',
            'spell': '#6B8BDB',
            'heal': '#6B8B5B',
            'buff': '#9B6BAB',
            'kill': '#ff2222',
            'ability': '#FF8C00',
            'info': '#B8A896'
        };
        // Translate message if it's a translation key
        const translatedMessage = message.startsWith('log.') || message.startsWith('combat.') || message.startsWith('error.') || message.startsWith('status.') ? t(message) : message;
        const color = colorMap[type] || '#B8A896';
        this.combatLog.push({ message: translatedMessage, color, type });

        // Update modal content (for backwards compatibility)
        const content = document.getElementById('combat-log-content');
        if (content) {
            const entry = document.createElement('div');
            entry.style.cssText = `color: ${color}; margin-bottom: 3px; border-bottom: 1px solid rgba(166, 137, 102, 0.15); padding-bottom: 3px;`;
            entry.textContent = translatedMessage;
            content.appendChild(entry);
            content.scrollTop = content.scrollHeight;
        }

        // Update new panel content
        const panelContent = document.getElementById('combat-log-panel-content');
        if (panelContent) {
            const entry = document.createElement('div');
            entry.style.cssText = `color: ${color}; margin-bottom: 3px; border-bottom: 1px solid rgba(166, 137, 102, 0.15); padding-bottom: 3px;`;
            entry.textContent = translatedMessage;
            panelContent.appendChild(entry);
            panelContent.scrollTop = panelContent.scrollHeight;
        }
    }

    toggleCombatLog() {
        // Now toggles the view in the right panel instead of a modal
        toggleRightPanelView();
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
                    (unit.type === 'CLERIC' && !unit.hasHealed) ||
                    (unit.type === 'SORCERER' && !unit.hasCastFireball);

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

        // Face the target
        this.faceTarget(attacker, defender);

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
                        this.addCombatLog(`${attacker.name} dealt melee attack to ${defender.name} dealing ${damage} damage. Backstab!`, 'damage');
                    }
                }

                // Paladin Cleave: 3x3 area damage
                if (attacker.hasCleave && !isSecondStrike) {
                    this.performCleaveAttack(attacker, defender, damage);
                } else if (!attacker.hasCleave) {
                    const actualDmg = defender.takeDamage(damage, false, attacker);
                    this.uiManager.showDamageText(defender, actualDmg);
                    if (!(attacker.type === 'ROGUE' && attacker.hasBackstab)) {
                        this.addCombatLog(`${attacker.name} dealt melee attack to ${defender.name} dealing ${actualDmg} damage.`, 'damage');
                    }

                    this.tweens.add({
                        targets: defender.sprite,
                        alpha: 0.3,
                        duration: 50,
                        yoyo: true,
                        repeat: 2
                    });

                    // Flesh-warped Stalker: Feast of Flesh - refresh turn on kill
                    if (attacker.type === 'FLESH_WARPED_STALKER' && defender.isDead && !attacker.isDead) {
                        attacker.hasMoved = false;
                        attacker.hasAttacked = false;
                        this.uiManager.showBuffText(attacker, 'FEAST!', '#8B0000');
                        this.addCombatLog(`${attacker.name} feasts on ${defender.name}'s flesh and gains another turn!`, 'buff');
                        
                        // Re-insert the Stalker at the front of the turn queue for an immediate extra turn
                        // Only do this for AI units (player units are handled by the input system)
                        if (!attacker.isPlayer && this.turnSystem.currentUnit === attacker) {
                            // Insert at the front of the queue
                            this.turnSystem.turnQueue.unshift({ unit: attacker, isTemporalShift: false });
                        }
                        
                        // Update UI to show the unit can act again
                        if (this.turnSystem.currentUnit === attacker) {
                            this.gridSystem.highlightValidMoves(attacker);
                        }
                    }
                }

                // Paladin Mythic: Divine Retribution (Melee Retaliation)
                // Assuming it's a melee attack if the distance is 1. (Ranged attacks use performRangedAttack typically, but let's be safe)
                const distToDefender = this.gridSystem.getDistanceBetweenUnits(attacker, defender);

                if (distToDefender <= 1 && defender.hasDivineRetribution && defender.health > 0 && !isSecondStrike && attacker.health > 0) {
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
                            this.addCombatLog(`${attacker.name} used Vanish and returned to their starting position.`, 'info');

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

                // Restore original facing after attack completes
                this.time.delayedCall(500, () => {
                    this.restoreFacing(attacker);
                });

                this.checkVictoryCondition();
            }
        });

        if (!isSecondStrike) {
            // Keep highlights active if unit can still act
            if (attacker.canMove() || attacker.canAttack()) {
                this.gridSystem.highlightValidMoves(attacker);
            } else {
                this.gridSystem.clearHighlights();
            }
        }
    }

    performCleaveAttack(attacker, mainTarget, fullDamage) {
        // Deal full damage to main target
        const actualCleave = mainTarget.takeDamage(fullDamage, false, attacker);
        this.uiManager.showDamageText(mainTarget, actualCleave);
        this.uiManager.showBuffText(attacker, 'CLEAVE!', '#D4A574');
        this.addCombatLog(`${attacker.name} dealt melee attack to ${mainTarget.name} dealing ${actualCleave} damage. Cleave!`, 'damage');

        this.tweens.add({
            targets: mainTarget.sprite,
            alpha: 0.3,
            duration: 50,
            yoyo: true,
            repeat: 2
        });

        // Deal 50% damage to all units in 3x3 area around the main target
        const cleaveDamage = Math.floor(fullDamage * 0.5);
        const enemyUnits = this.unitManager.units.filter(u => !u.isPlayer && !u.isDead);

        enemyUnits.forEach(enemy => {
            if (enemy === mainTarget) return;
            // Chebyshev distance: true 3x3 box (includes diagonals)
            if (Math.abs(enemy.gridX - mainTarget.gridX) <= 1 && Math.abs(enemy.gridY - mainTarget.gridY) <= 1) {
                const actualCleaveSplash = enemy.takeDamage(cleaveDamage, false, attacker);
                this.uiManager.showDamageText(enemy, actualCleaveSplash);
                this.addCombatLog(`${attacker.name} cleave hit ${enemy.name} dealing ${actualCleaveSplash} damage.`, 'damage');
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
                    const actualRetDmg = target.takeDamage(damage, false, retaliator);
                    this.uiManager.showDamageText(target, actualRetDmg);
                    this.addCombatLog(`${retaliator.name} dealt melee attack to ${target.name} dealing ${actualRetDmg} damage. Divine Retribution!`, 'damage');

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

        // Face the target
        this.faceTarget(attacker, defender);

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
                    const silverBonus = attacker.hasSilverArrows
                        ? Math.floor(defender.maxHealth * (UNIT_TYPES[defender.type]?.isBoss ? 0.05 : 0.25))
                        : 0;
                    const actualRangedDmg = defender.takeDamage(damage + silverBonus, true, attacker);
                    this.uiManager.showDamageText(defender, actualRangedDmg);
                    this.addCombatLog(`${attacker.name} dealt ranged attack to ${defender.name} dealing ${actualRangedDmg} damage.`, 'damage');

                    this.tweens.add({
                        targets: defender.sprite,
                        alpha: 0.3,
                        duration: 50,
                        yoyo: true,
                        repeat: 2
                    });
                }

                this.checkVictoryCondition();

                // Restore original facing after ranged attack completes
                this.time.delayedCall(200, () => {
                    this.restoreFacing(attacker);
                });
            }
        });

        // Keep highlights active if unit can still act
        if (attacker.canMove() || attacker.canAttack()) {
            this.gridSystem.highlightValidMoves(attacker);
        } else {
            this.gridSystem.clearHighlights();
        }
    }

    /**
     * Create a fireball projectile that flies from caster to target
     * @param {Unit} caster - The unit casting the fireball
     * @param {number} targetGridX - Target grid X coordinate
     * @param {number} targetGridY - Target grid Y coordinate
     * @param {Function} onComplete - Callback when animation completes
     */
    createFireballProjectile(caster, targetGridX, targetGridY, onComplete) {
        // Fireball is always a fireball projectile - separate from piercing ranged attacks
        const targetX = targetGridX * this.tileSize + this.tileSize / 2;
        const targetY = targetGridY * this.tileSize + this.tileSize / 2;
        
        // Face the target
        this.faceTarget(caster, { gridX: targetGridX, gridY: targetGridY });
        
        // Create fireball projectile (glowing orange/red ball)
        const fireball = this.add.circle(caster.sprite.x, caster.sprite.y - 20, 12, 0xff4500);
        fireball.setDepth(15);
        
        // Add an inner glow
        const fireballGlow = this.add.circle(caster.sprite.x, caster.sprite.y - 20, 8, 0xffaa00);
        fireballGlow.setDepth(16);
        
        // Animate both together
        const duration = 400;
        
        this.tweens.add({
            targets: fireball,
            x: targetX,
            y: targetY,
            duration: duration,
            ease: 'Power2',
            onUpdate: (tween) => {
                // Sync glow position with fireball
                fireballGlow.x = fireball.x;
                fireballGlow.y = fireball.y;
            },
            onComplete: () => {
                fireball.destroy();
                fireballGlow.destroy();
                if (onComplete) onComplete();
                
                // Restore original facing after animation
                this.time.delayedCall(200, () => {
                    this.restoreFacing(caster);
                });
            }
        });
    }

    /**
     * Create a piercing purple ray animation for sorcerer with piercing perk
     * @param {Unit} caster - The unit casting
     * @param {number} targetGridX - Target grid X coordinate
     * @param {number} targetGridY - Target grid Y coordinate
     * @param {Function} onComplete - Callback when animation completes
     */
    createPiercingRay(caster, targetGridX, targetGridY, onComplete) {
        const startX = caster.sprite.x;
        const startY = caster.sprite.y - 20;
        const targetX = targetGridX * this.tileSize + this.tileSize / 2;
        const targetY = targetGridY * this.tileSize + this.tileSize / 2;
        
        // Face the target
        this.faceTarget(caster, { gridX: targetGridX, gridY: targetGridY });
        
        // Calculate angle and distance
        const angle = Phaser.Math.Angle.Between(startX, startY, targetX, targetY);
        const distance = Phaser.Math.Distance.Between(startX, startY, targetX, targetY);
        
        // Create the main purple ray (a long thin rectangle rotated toward target)
        const rayWidth = distance;
        const rayHeight = 12;
        const ray = this.add.rectangle(
            startX + Math.cos(angle) * distance / 2,
            startY + Math.sin(angle) * distance / 2,
            rayWidth,
            rayHeight,
            0x9b59b6 // Purple
        );
        ray.setRotation(angle);
        ray.setDepth(15);
        ray.setAlpha(0);
        
        // Inner bright core
        const coreRay = this.add.rectangle(
            startX + Math.cos(angle) * distance / 2,
            startY + Math.sin(angle) * distance / 2,
            rayWidth,
            rayHeight * 0.5,
            0xe74c3c // Bright pink/red
        );
        coreRay.setRotation(angle);
        coreRay.setDepth(16);
        coreRay.setAlpha(0);
        
        // Energy pulse at the start
        const startPulse = this.add.circle(startX, startY, 20, 0x9b59b6);
        startPulse.setDepth(17);
        
        // Animate the ray shooting out
        this.tweens.add({
            targets: [ray, coreRay],
            alpha: { from: 0, to: 1 },
            duration: 100,
            onComplete: () => {
                // Fade out
                this.tweens.add({
                    targets: [ray, coreRay],
                    alpha: 0,
                    duration: 300,
                    delay: 100,
                    onComplete: () => {
                        ray.destroy();
                        coreRay.destroy();
                        if (onComplete) onComplete();
                        
                        // Restore original facing after animation
                        this.time.delayedCall(200, () => {
                            this.restoreFacing(caster);
                        });
                    }
                });
            }
        });
        
        // Pulse animation at start point
        this.tweens.add({
            targets: startPulse,
            scale: { from: 0.5, to: 1.5 },
            alpha: { from: 1, to: 0 },
            duration: 300,
            onComplete: () => startPulse.destroy()
        });
        
        // Add purple sparkles along the ray
        const sparkles = 10;
        for (let i = 0; i < sparkles; i++) {
            const t = (i + 1) / (sparkles + 1);
            const sparkleX = startX + Math.cos(angle) * distance * t;
            const sparkleY = startY + Math.sin(angle) * distance * t;
            
            const sparkle = this.add.circle(sparkleX, sparkleY, 4, 0xffffff);
            sparkle.setDepth(16);
            sparkle.setAlpha(0);
            
            this.tweens.add({
                targets: sparkle,
                alpha: { from: 0, to: 1 },
                scale: { from: 0, to: 1.5 },
                duration: 150,
                delay: i * 30,
                yoyo: true,
                onComplete: () => sparkle.destroy()
            });
        }
    }

    /**
     * Make a unit face towards a target temporarily
     * @param {Unit} unit - The unit to rotate
     * @param {Unit} target - The target to face towards
     */
    faceTarget(unit, target) {
        if (!unit.sprite || !target) return;
        
        // Save original facing if not already saved
        if (unit._originalFlipX === undefined) {
            unit._originalFlipX = unit.sprite.flipX;
        }
        
        // Determine direction based on grid positions
        // Base images face LEFT by default
        // flipX = true means face RIGHT, flipX = false means face LEFT
        // If target is to the right (higher X), we need flipX = true to face right
        // If target is to the left (lower X), we need flipX = false to face left
        const shouldFaceRight = target.gridX > unit.gridX;
        unit.sprite.setFlipX(shouldFaceRight);
    }

    /**
     * Restore unit's original facing direction
     * @param {Unit} unit - The unit to restore
     */
    restoreFacing(unit) {
        if (!unit.sprite || unit._originalFlipX === undefined) return;
        
        unit.sprite.setFlipX(unit._originalFlipX);
        delete unit._originalFlipX;
    }

    performRicochetAttack(attacker, mainTarget) {
        const damage = Math.floor(attacker.damage * 0.8 * attacker.blessValue);

        // Silver Arrows mythic: +25% of target's max HP as bonus damage (5% vs bosses)
        const silverBonus = (target) => attacker.hasSilverArrows
            ? Math.floor(target.maxHealth * (UNIT_TYPES[target.type]?.isBoss ? 0.05 : 0.25))
            : 0;

        // Hit main target
        const actualRicochetDmg = mainTarget.takeDamage(damage + silverBonus(mainTarget), true, attacker);
        this.uiManager.showDamageText(mainTarget, actualRicochetDmg);
        this.uiManager.showBuffText(attacker, 'RICOCHET!', '#6B8B5B');
        this.addCombatLog(`${attacker.name} dealt ranged attack to ${mainTarget.name} dealing ${actualRicochetDmg} damage. Ricochet!`, 'damage');

        this.tweens.add({
            targets: mainTarget.sprite,
            alpha: 0.3,
            duration: 50,
            yoyo: true,
            repeat: 2
        });

        // Chain ricochet: each bounce finds ONE new target within 2 tiles of the last hit,
        // never revisiting already-hit units. All bounces deal the same damage (50% of base).
        const hitTargets = new Set([mainTarget]);
        const bounceDamage = Math.floor(damage * 0.5);

        const bounceToNext = (lastHit, delay) => {
            const candidates = this.unitManager.units.filter(u =>
                !u.isPlayer && !u.isDead && !hitTargets.has(u) &&
                Math.abs(u.gridX - lastHit.gridX) + Math.abs(u.gridY - lastHit.gridY) <= 2
            );
            if (candidates.length === 0) return;

            const nextTarget = candidates[Math.floor(Math.random() * candidates.length)];
            hitTargets.add(nextTarget);

            this.time.delayedCall(delay, () => {
                if (nextTarget.isDead) return;

                const bounceArrow = this.add.text(
                    lastHit.sprite.x, lastHit.sprite.y - 20,
                    '➤',
                    { fontSize: '20px', color: '#8b4513' }
                ).setOrigin(0.5);

                const bounceAngle = Phaser.Math.Angle.Between(
                    lastHit.sprite.x, lastHit.sprite.y,
                    nextTarget.sprite.x, nextTarget.sprite.y
                );
                bounceArrow.setRotation(bounceAngle);

                this.tweens.add({
                    targets: bounceArrow,
                    x: nextTarget.sprite.x,
                    y: nextTarget.sprite.y,
                    duration: 150,
                    onComplete: () => {
                        bounceArrow.destroy();
                        if (nextTarget.isDead) return;
                        const actualBounceDmg = nextTarget.takeDamage(bounceDamage + silverBonus(nextTarget), true, attacker);
                        this.uiManager.showDamageText(nextTarget, actualBounceDmg);
                        this.addCombatLog(`${attacker.name} ricochet hit ${nextTarget.name} dealing ${actualBounceDmg} damage.`, 'damage');
                        this.tweens.add({
                            targets: nextTarget.sprite,
                            alpha: 0.3,
                            duration: 50,
                            yoyo: true,
                            repeat: 1
                        });
                        this.checkVictoryCondition();
                        // Continue chain from the newly hit target, damage halves each bounce
                        bounceToNext(nextTarget, 350);
                    }
                });
            });
        };

        bounceToNext(mainTarget, 200);
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
        const gridWidth = this.gridSystem.width;
        const gridHeight = this.gridSystem.height;
        while (currX >= -0.5 && currX < gridWidth + 0.5 && currY >= -0.5 && currY < gridHeight + 0.5) {
            const gx = Math.round(currX);
            const gy = Math.round(currY);

            if (gx >= 0 && gx < gridWidth && gy >= 0 && gy < gridHeight) {
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
                    const actualPierceDmg = enemy.takeDamage(baseDamage, true, attacker);
                    this.uiManager.showDamageText(enemy, actualPierceDmg);
                    this.addCombatLog(`${attacker.name} pierce hit ${enemy.name} dealing ${actualPierceDmg} damage.`, 'damage');
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

        // Check if silence is active
        if (this.silenceActive) {
            this.uiManager.showFloatingText(
                '🔇 Spells are silenced!',
                400, 300, '#9B59B6'
            );
            return;
        }

        this.uiManager.updateManaDisplay();

        // Define categories with styles
        // Note: translations already include emojis, so we don't use separate icon property
        this.spellBookPages = [
            {
                name: t('school.destructo'),
                filter: (s) => ['singleDamage', 'aoeDamage', 'meteor', 'iceStorm', 'chainLightning'].includes(s.effect),
                style: { bg: '#2a1f1f', header: '#ff4444' }
            },
            {
                name: t('school.restoratio'),
                filter: (s) => ['heal', 'regenerate', 'cure'].includes(s.effect),
                style: { bg: '#2a3a2a', header: '#44ff44' }
            },
            {
                name: t('school.benedictio'),
                filter: (s) => ['haste', 'shield', 'bless'].includes(s.effect),
                style: { bg: '#2D241E', header: '#A68966' }
            },
            {
                name: t('school.utilitas'),
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
            tab.innerHTML = p.name;
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

                const spellName = t('spell.' + spell.id);
                const spellType = t('spell.type.' + spell.type.toLowerCase().replace(/ /g, '_'));
                const spellDesc = t('spell.desc.' + spell.id);
                let displaySpellName = spellName;
                const hotkey = spellName.charAt(0).toUpperCase();

                // Assign hotkey if affordable and not already used on this page
                if (canAfford && /^[A-ZА-Я]$/.test(hotkey) && !usedHotkeys.has(hotkey)) {
                    usedHotkeys.add(hotkey);
                    displaySpellName = `<span style="color: #FFD700;">${hotkey}</span>${spellName.substring(1)}`;

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
                    <div style="color: ${page.style.header}; font-weight: bold;">${displaySpellName}</div>
                    <div class="spell-type">${spellType}</div>
                    <div class="spell-desc">${spellDesc}</div>
                    <div class="spell-cost ${!canAfford ? 'too-expensive' : ''}">💧 ${Math.floor(spell.manaCost * this.manaCostMultiplier)} ${t('panel.mana').replace('💧 ', '')}</div>
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
            emptyMsg.textContent = t('spellbook.no_spells');
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
            // Clear silence if it was active
            if (this.silenceActive) {
                this.silenceActive = false;
                this.uiManager.showFloatingText('🔇 Silence lifted!', 400, 250, '#6B8B5B');
            }
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

        victoryText.innerHTML = playerWon ? t('victory.title') : t('defeat.title');
        victoryText.style.color = playerWon ? '#A68966' : '#9E4A4A';
        // Update i18n text if available
        if (typeof window !== 'undefined' && window.i18n) {
            window.i18n.updatePage();
        }

        if (playerWon) {
            // Check for Loot Goblin special reward
            this.lootGoblinReward = this.wasLootGoblinKilled();

            const canGetNewUnit = this.battleNumber >= 2 && this.battleNumber % 2 === 0;
            this.selectedRewards = {
                unit: canGetNewUnit ? null : { id: 'skipped', effectData: null },
                buff: null,
                magic: null
            };

            // Always rebuild the rewards container structure to get correct DOM elements
            this.restoreRewardContainerStructure();

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
        }

        victoryScreen.classList.remove('hidden');
    }

    // Restore the original rewards container structure
    restoreRewardContainerStructure() {
        const rewardsContainer = document.getElementById('rewards-container');
        rewardsContainer.innerHTML = `
            <div id="reward-units-section" style="width: 100%;">
                <h3 style="color: #A68966; text-align: center; margin-bottom: 6px; font-size: 15px;" data-i18n="reward.recruit">⚔️ Recruit a New Unit</h3>
                <div style="display: flex; gap: 12px; flex-wrap: wrap; justify-content: center; align-items: center;">
                    <div id="reward-units" style="display: flex; gap: 12px; flex-wrap: wrap; justify-content: center;"></div>
                    <div id="discard-units-wrapper" style="display: none;">
                        <button id="discard-units-btn" style="background: rgba(45,36,30,0.9); border: 2px solid #5D4E3E; color: #8B7355; padding: 10px 14px; border-radius: 4px; cursor: pointer; font-size: 12px; line-height: 1.4; max-width: 120px; text-align: center;">
                            🔄 Discard units<br>for bonus buff
                        </button>
                    </div>
                </div>
            </div>

            <div id="reward-buffs-bonus-section" style="display: none; width: 100%;">
                <h3 style="color: #8B9A6B; text-align: center; margin-bottom: 6px; font-size: 15px;">💪 Bonus Buff</h3>
                <div id="reward-buffs-bonus" style="display: flex; gap: 12px; flex-wrap: wrap; justify-content: center;"></div>
            </div>

            <div style="width: 100%;">
                <h3 style="color: #8B9A6B; text-align: center; margin-bottom: 6px; font-size: 15px;" data-i18n="reward.buff">💪 Buff an Existing Unit</h3>
                <div id="reward-buffs" style="display: flex; gap: 12px; flex-wrap: wrap; justify-content: center;"></div>
            </div>

            <div style="width: 100%;">
                <h3 style="color: #6B7A9A; text-align: center; margin-bottom: 6px; font-size: 15px;" data-i18n="reward.magic">🧙 Spell or Mana Enhancement</h3>
                <div id="reward-magic" style="display: flex; gap: 12px; flex-wrap: wrap; justify-content: center;"></div>
            </div>
        `;
    }

    // Show special Loot Goblin reward - 4 choices of 3 buffs each (2x2 grid)
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
                ${t('loot_goblin.title')}
            </div>
            <div style="color: #A68966; font-size: 16px; margin-top: 10px;">
                ${t('loot_goblin.subtitle')}
            </div>
            <div style="margin-top: 20px; color: #4CAF50;">
                ${t('loot_goblin.buff_sets')}
            </div>
        `;
        rewardsContainer.appendChild(lootSection);

        // Track used legendary/mythic buffs to prevent duplicates
        const usedLegendaryBuffs = new Set();
        const usedMythicBuffs = new Set();

        // Create 4 choice slots in a 2x2 grid
        const choicesContainer = document.createElement('div');
        choicesContainer.style.cssText = 'grid-column: 1 / -1; display: grid; grid-template-columns: 1fr 1fr; gap: 30px; padding: 20px;';
        rewardsContainer.appendChild(choicesContainer);

        // Generate 4 choice slots
        for (let choiceIndex = 0; choiceIndex < 4; choiceIndex++) {
            const choiceSlot = document.createElement('div');
            choiceSlot.style.cssText = 'background: rgba(45, 36, 30, 0.6); border: 2px solid #5D4E3E; border-radius: 8px; padding: 15px;';
            choiceSlot.innerHTML = `<div style="color: #A68966; text-align: center; margin-bottom: 10px; font-weight: bold;">Choice ${choiceIndex + 1}</div>`;
            
            const buffsContainer = document.createElement('div');
            buffsContainer.style.cssText = 'display: flex; flex-direction: column; gap: 10px;';
            
            // Generate buff options for this choice (3 buffs like regular rewards)
            const buffOptions = this.generateLootGoblinBuffChoice(usedLegendaryBuffs, usedMythicBuffs);
            
            buffOptions.forEach(buff => {
                const isMythic = buff.rarity === 'mythic';
                const isLegendary = buff.rarity === 'legendary' || buff.id.startsWith('legendary_');
                const isEpic = buff.rarity === 'epic';
                const rarity = isMythic ? 'mythic' : (isLegendary ? 'legendary' : (isEpic ? 'epic' : 'common'));
                
                const nameColor = rarity === 'mythic' ? '#ff3333' : (rarity === 'legendary' ? '#ff8c00' : (rarity === 'epic' ? '#9B6BAB' : '#6B8B5B'));
                const textShadow = rarity === 'mythic' ? ' text-shadow: 0 0 8px rgba(255, 26, 26, 0.6);' : (rarity === 'legendary' ? ' text-shadow: 0 0 8px rgba(255, 140, 0, 0.6);' : (rarity === 'epic' ? ' text-shadow: 0 0 6px rgba(139, 91, 155, 0.5);' : ''));
                
                let rarityLabel = '';
                if (rarity === 'mythic') {
                    rarityLabel = '<div style="font-size: 10px; color: #ff3333; margin-top: 2px; text-shadow: 0 0 5px rgba(255, 26, 26, 0.5);">🔥 Mythic</div>';
                } else if (rarity === 'legendary') {
                    rarityLabel = '<div style="font-size: 10px; color: #ff8c00; margin-top: 2px; text-shadow: 0 0 5px rgba(255, 140, 0, 0.5);">⚡ Legendary</div>';
                } else if (rarity === 'epic') {
                    rarityLabel = '<div style="font-size: 10px; color: #9B6BAB; margin-top: 2px; text-shadow: 0 0 4px rgba(139, 91, 155, 0.4);">⚡ Epic</div>';
                }
                
                const card = this.uiManager.createRewardCard(rarity === 'mythic' ? 'mythic' : (rarity === 'legendary' ? 'legendary' : (rarity === 'epic' ? 'epic' : 'buff')), buff.id, `
                    <div style="font-size: 24px; margin-bottom: 3px;">${buff.icon}</div>
                    <div style="color: ${nameColor}; font-weight: bold; font-size: 13px;${textShadow}">${buff.name}</div>
                    ${rarityLabel}
                    <div style="font-size: 11px; color: #B8A896; margin-top: 3px;">${buff.desc}</div>
                `, buff, rarity);

                card.onclick = () => {
                    // Show unit selection for this buff
                    this.showBuffTargetSelectionForLootGoblin(buff, card);
                };

                buffsContainer.appendChild(card);
            });
            
            choiceSlot.appendChild(buffsContainer);
            choicesContainer.appendChild(choiceSlot);
        }

        // Skip button
        const skipBtn = document.createElement('button');
        skipBtn.className = 'spellbook-close';
        skipBtn.style.cssText = 'grid-column: 1 / -1; margin-top: 20px;';
        skipBtn.textContent = t('loot_goblin.skip');
        skipBtn.onclick = () => {
            this.lootGoblinReward = false;
            this.restoreRewardContainerStructure();
            this.generateRewardChoices();
        };
        rewardsContainer.appendChild(skipBtn);
    }

    // Generate a single buff choice for Loot Goblin (3 buffs like regular rewards, with used buff tracking)
    generateLootGoblinBuffChoice(usedLegendaryBuffs, usedMythicBuffs) {
        const buffOptions = [];
        
        // Try to get a special buff (legendary or mythic) with 50% chance
        let specialBuff = null;
        
        // Priority to mythic if eligible, then legendary
        const mythicBuff = this.tryGenerateMythicBuffForLootGoblin(usedMythicBuffs);
        if (mythicBuff && !usedMythicBuffs.has(mythicBuff.id) && Math.random() < 0.5) {
            specialBuff = mythicBuff;
            usedMythicBuffs.add(specialBuff.id);
        } else {
            const legendaryBuff = this.tryGenerateLegendaryBuffForLootGoblin(usedLegendaryBuffs);
            if (legendaryBuff && !usedLegendaryBuffs.has(legendaryBuff.id) && Math.random() < 0.5) {
                specialBuff = legendaryBuff;
                usedLegendaryBuffs.add(specialBuff.id);
            }
        }
        
        if (specialBuff) {
            buffOptions.push(specialBuff);
        }
        
        // Fill remaining slots with regular buffs
        const regularBuffs = this.getRandomBuffs(3 - buffOptions.length);
        buffOptions.push(...regularBuffs);
        
        // Shuffle so special buff isn't always first
        for (let i = buffOptions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [buffOptions[i], buffOptions[j]] = [buffOptions[j], buffOptions[i]];
        }
        
        return buffOptions;
    }

    // Try to generate a legendary buff for Loot Goblin (respects used buffs)
    tryGenerateLegendaryBuffForLootGoblin(usedBuffs) {
        const playerUnits = this.unitManager.units.filter(u => u.isPlayer);
        const availableLegendaryBuffs = [];

        const hasBuff = (unitType, buffProperty) => {
            return playerUnits.some(u => u.type === unitType && u[buffProperty]);
        };

        if (playerUnits.some(u => u.type === 'BERSERKER') && !hasBuff('BERSERKER', 'hasDoubleStrike') && !usedBuffs.has('legendary_frenzy')) {
            availableLegendaryBuffs.push({
                id: 'legendary_frenzy',
                name: 'Blood Frenzy',
                icon: '🩸',
                desc: 'Berserker: Strikes 2 times per attack',
                unitType: 'BERSERKER',
                rarity: 'legendary',
                effect: (unit) => {
                    unit.hasDoubleStrike = true;
                    unit.statModifiers = unit.statModifiers || {};
                    unit.statModifiers.hasDoubleStrike = true;
                }
            });
        }

        if (playerUnits.some(u => u.type === 'PALADIN') && !hasBuff('PALADIN', 'hasCleave') && !usedBuffs.has('legendary_cleave')) {
            availableLegendaryBuffs.push({
                id: 'legendary_cleave',
                name: 'Divine Wrath',
                icon: '⚡',
                desc: 'Paladin: 3x3 cleave attack, +40 damage',
                unitType: 'PALADIN',
                rarity: 'legendary',
                effect: (unit) => {
                    unit.hasCleave = true;
                    unit.damage += 40;
                    unit.statModifiers = unit.statModifiers || {};
                    unit.statModifiers.hasCleave = true;
                    unit.statModifiers.damage = (unit.statModifiers.damage || 0) + 40;
                }
            });
        }

        if (playerUnits.some(u => u.type === 'RANGER') && !hasBuff('RANGER', 'hasRicochet') && !usedBuffs.has('legendary_ricochet')) {
            availableLegendaryBuffs.push({
                id: 'legendary_ricochet',
                name: 'Ricochet Shot',
                icon: '🏹',
                desc: 'Ranger: Arrows bounce to nearby targets (2 range, 50% dmg), +40 damage',
                unitType: 'RANGER',
                rarity: 'legendary',
                effect: (unit) => {
                    unit.hasRicochet = true;
                    unit.damage += 40;
                    unit.statModifiers = unit.statModifiers || {};
                    unit.statModifiers.hasRicochet = true;
                    unit.statModifiers.damage = (unit.statModifiers.damage || 0) + 40;
                }
            });
        }

        if (playerUnits.some(u => u.type === 'SORCERER') && !hasBuff('SORCERER', 'hasPiercing') && !usedBuffs.has('legendary_piercing')) {
            availableLegendaryBuffs.push({
                id: 'legendary_piercing',
                name: 'Arcane Pierce',
                icon: '🔮',
                desc: 'Sorcerer: Infinite range, shots pierce all units in path',
                unitType: 'SORCERER',
                rarity: 'legendary',
                effect: (unit) => {
                    unit.hasPiercing = true;
                    unit.rangedRange = 999;
                    unit.statModifiers = unit.statModifiers || {};
                    unit.statModifiers.hasPiercing = true;
                    unit.statModifiers.rangedRange = 999;
                }
            });
        }

        if (playerUnits.some(u => u.type === 'ROGUE') && !hasBuff('ROGUE', 'hasBackstab') && !usedBuffs.has('legendary_backstab')) {
            availableLegendaryBuffs.push({
                id: 'legendary_backstab',
                name: 'Shadow Strike',
                icon: '🗡️',
                desc: 'Rogue: 4x damage when attacking from behind (or side)',
                unitType: 'ROGUE',
                rarity: 'legendary',
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

        return availableLegendaryBuffs[Math.floor(Math.random() * availableLegendaryBuffs.length)];
    }

    // Try to generate a mythic buff for Loot Goblin (respects used buffs)
    tryGenerateMythicBuffForLootGoblin(usedBuffs) {
        const playerUnits = this.unitManager.units.filter(u => u.isPlayer);
        const availableMythicBuffs = [];

        const hasProperty = (unitType, buffProperty) => {
            return playerUnits.some(u => u.type === unitType && u[buffProperty]);
        };

        if (hasProperty('PALADIN', 'hasCleave') && !hasProperty('PALADIN', 'hasDivineRetribution') && !usedBuffs.has('mythic_divine_retribution')) {
            availableMythicBuffs.push({
                id: 'mythic_divine_retribution',
                name: 'Divine Retribution',
                icon: '✨',
                desc: 'Paladin: Removes passive debuffs. Unlimited retaliation vs melee (x2 DMG).',
                unitType: 'PALADIN',
                rarity: 'mythic',
                effect: (unit) => {
                    unit.hasDivineRetribution = true;
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

        if (playerUnits.some(u => u.type === 'SORCERER') && hasProperty('SORCERER', 'hasPiercing') && !hasProperty('SORCERER', 'hasUnstableArcana') && !usedBuffs.has('mythic_unstable_arcana')) {
            availableMythicBuffs.push({
                id: 'mythic_unstable_arcana',
                name: 'Unstable Arcana',
                icon: '🔥',
                desc: 'Sorcerer Fireball: 25% 2x dmg, 5% 4x dmg, 50% lingering DoT (50% dmg for 2 turns), 20% 0.1x dmg.',
                unitType: 'SORCERER',
                rarity: 'mythic',
                effect: (unit) => {
                    unit.hasUnstableArcana = true;
                    unit.statModifiers = unit.statModifiers || {};
                    unit.statModifiers.hasUnstableArcana = true;
                }
            });
        }

        if (playerUnits.some(u => u.type === 'RANGER') && hasProperty('RANGER', 'hasRicochet') && !hasProperty('RANGER', 'hasSilverArrows') && !usedBuffs.has('mythic_silver_arrows')) {
            availableMythicBuffs.push({
                id: 'mythic_silver_arrows',
                name: 'Silver Arrows',
                icon: '🏹',
                desc: 'Ranger: Each hit deals +25% of target\'s max HP as bonus damage (5% vs bosses). Works with Ricochet.',
                unitType: 'RANGER',
                rarity: 'mythic',
                effect: (unit) => {
                    unit.hasSilverArrows = true;
                    unit.statModifiers = unit.statModifiers || {};
                    unit.statModifiers.hasSilverArrows = true;
                }
            });
        }

        // Berserker mythic requires the unit to have Berserker Legendary `hasDoubleStrike`
        if (playerUnits.some(u => u.type === 'BERSERKER') && hasProperty('BERSERKER', 'hasDoubleStrike') && !hasProperty('BERSERKER', 'hasWarlust') && !usedBuffs.has('mythic_warlust')) {
            availableMythicBuffs.push({
                id: 'mythic_warlust',
                name: 'Warlust',
                icon: '💀',
                desc: 'Berserker: Each kill also grants +5 permanent Max HP (on top of Bloodlust\'s +15 DMG).',
                unitType: 'BERSERKER',
                rarity: 'mythic',
                effect: (unit) => {
                    unit.hasWarlust = true;
                    unit.statModifiers = unit.statModifiers || {};
                    unit.statModifiers.hasWarlust = true;
                }
            });
        }

        if (availableMythicBuffs.length === 0) {
            return null;
        }

        return availableMythicBuffs[Math.floor(Math.random() * availableMythicBuffs.length)];
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
                    <h2>${t('loot_goblin.select_unit')}</h2>
                    <p style="color: #FFD700;">${buffData.icon} ${buffData.name}</p>
                    <p style="color: #8B7355; font-size: 12px;">${buffData.desc}</p>
                </div>
                <div class="spell-grid" id="loot-goblin-target-grid"></div>
                <button class="spellbook-close" onclick="this.closest('.spellbook-modal').remove()">${t('loot_goblin.cancel')}</button>
            </div>
        `;

        document.body.appendChild(modal);

        const grid = document.getElementById('loot-goblin-target-grid');
        playerUnits.forEach(unit => {
            const card = document.createElement('div');
            card.className = 'unit-select-card';
            card.innerHTML = `
                <div style="font-size: 28px; margin-bottom: 5px;">${unit.emoji}</div>
                <div style="color: #A68966; font-weight: bold; font-size: 14px;">${unit.name}</div>
                <div style="font-size: 11px; color: #B8A896; margin-top: 4px; line-height: 1.4;">
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
                    unit.statModifiers = unit.statModifiers || {};
                    unit.statModifiers.maxHealth = (unit.statModifiers.maxHealth || 0) + hpDiff;
                    // Berserker's Reckless passive: immune to movement reduction
                    if (unit.type !== 'BERSERKER') {
                        unit.moveRange = Math.max(1, unit.moveRange - 2);
                        unit.statModifiers.moveRange = (unit.statModifiers.moveRange || 0) - 2;
                    }
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
                    unit.statModifiers.hasTemporalShift = true;
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
                const unitName = t('unit.' + unitType.toLowerCase());
                const card = this.uiManager.createRewardCard('unit', unitType, `
                    <div style="font-size: 40px; margin-bottom: 5px;">${template.emoji}</div>
                    <div style="color: ${isLegendary ? '#ff8c00' : '#A68966'}; font-weight: bold;${isLegendary ? ' text-shadow: 0 0 6px rgba(255, 140, 0, 0.5);' : ''}">${unitName}</div>
                    <div style="font-size: 12px; color: #B8A896;">
                        ${t('stat.hp')}: ${template.health} | ${t('stat.dmg')}: ${template.damage}<br>
                        ${t('stat.mov')}: ${template.moveRange}${template.rangedRange ? ` | ${t('stat.rng')}: ${template.rangedRange}` : ''}<br>
                        ${t('stat.init')}: ${template.initiative}
                    </div>
                    ${isLegendary ? `<div style="font-size: 11px; color: #ff8c00; margin-top: 4px; text-shadow: 0 0 4px rgba(255, 140, 0, 0.4);">⚡ ${t('reward.legendary')}</div>` : ''}
                `, null, isLegendary);
                unitContainer.appendChild(card);
            });

            // Show the discard button with two-click confirmation
            const discardWrapper = document.getElementById('discard-units-wrapper');
            const discardBtn = document.getElementById('discard-units-btn');
            if (discardWrapper && discardBtn) {
                discardWrapper.style.display = 'flex';
                let confirmPending = false;
                discardBtn.onclick = () => {
                    if (!confirmPending) {
                        confirmPending = true;
                        discardBtn.textContent = '⚠️ Confirm? This cannot be undone.';
                        discardBtn.style.color = '#d94a4a';
                        discardBtn.style.borderColor = '#d94a4a';
                    } else {
                        this.discardUnitsForBonusBuff();
                    }
                };
            }
        } else {
            const roundMsg = this.battleNumber === 1 ? t('reward.no_unit_round1') : t('reward.no_unit_later', this.battleNumber + 1);
            unitContainer.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; color: #8B7355; padding: 20px;">
                    <div style="font-size: 24px; margin-bottom: 10px;">📦</div>
                    <div>${roundMsg}</div>
                    <div style="font-size: 11px; margin-top: 5px;">(${t('reward.new_unit_every2')})</div>
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
        this.renderBuffCards(buffOptions, buffContainer);

        // Filter out buffs that are already owned (unique buffs)
        const ownedBuffTypes = new Set(this.magicBuffs.map(b => b.type));
        const allMagicOptions = [
            {
                id: 'mana_max', name: 'Expanded Mana Pool', icon: '💧', desc: '+50 Max Mana',
                buffType: 'maxMana', buffValue: 50,
                effect: () => { this.uiManager.updateManaDisplay(); }
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
        // Update i18n for dynamically created content
        if (typeof window !== 'undefined' && window.i18n) {
            window.i18n.updatePage();
        }
    }

    // Render buff option cards into a container element
    renderBuffCards(buffOptions, container) {
        container.innerHTML = '';
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
                rarity === 'mythic' ? 'mythic' : (rarity === 'legendary' ? 'legendary' : (rarity === 'epic' ? 'epic' : 'buff')),
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
            container.appendChild(card);
        });
    }

    // Discard unit picks in exchange for a second buff row
    discardUnitsForBonusBuff() {
        // Mark unit as skipped so confirmRewards won't try to spawn one
        this.selectedRewards.unit = { id: 'skipped' };

        // Hide unit section
        const unitSection = document.getElementById('reward-units-section');
        if (unitSection) unitSection.style.display = 'none';

        // Generate and show a bonus buff row
        let specialBuff = this.tryGenerateMythicBuff() || this.tryGenerateLegendaryBuff();
        let bonusBuffOptions;
        if (specialBuff && Math.random() < 0.5) {
            bonusBuffOptions = [specialBuff, ...this.getRandomBuffs(2)];
        } else {
            bonusBuffOptions = this.getRandomBuffs(3);
        }

        const bonusSection = document.getElementById('reward-buffs-bonus-section');
        const bonusContainer = document.getElementById('reward-buffs-bonus');
        if (bonusSection && bonusContainer) {
            bonusSection.style.display = 'block';
            this.renderBuffCards(bonusBuffOptions, bonusContainer);
        }

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

        // Sorcerer mythic requires the unit to have Sorcerer Legendary `hasPiercing`
        if (playerUnits.some(u => u.type === 'SORCERER') && hasProperty('SORCERER', 'hasPiercing') && !hasProperty('SORCERER', 'hasUnstableArcana')) {
            availableMythicBuffs.push({
                id: 'mythic_unstable_arcana',
                name: 'Unstable Arcana',
                icon: '🔥',
                desc: 'Sorcerer Fireball: 25% 2x dmg, 5% 4x dmg, 50% lingering DoT (50% dmg for 2 turns), 20% 0.1x dmg.',
                unitType: 'SORCERER',
                rarity: 'mythic',
                effect: (unit) => {
                    unit.hasUnstableArcana = true;
                    unit.statModifiers = unit.statModifiers || {};
                    unit.statModifiers.hasUnstableArcana = true;
                }
            });
        }

        // Ranger mythic requires the unit to have Ranger Legendary `hasRicochet`
        if (playerUnits.some(u => u.type === 'RANGER') && hasProperty('RANGER', 'hasRicochet') && !hasProperty('RANGER', 'hasSilverArrows')) {
            availableMythicBuffs.push({
                id: 'mythic_silver_arrows',
                name: 'Silver Arrows',
                icon: '🏹',
                desc: 'Ranger: Each hit deals +25% of target\'s max HP as bonus damage (5% vs bosses). Works with Ricochet.',
                unitType: 'RANGER',
                rarity: 'mythic',
                effect: (unit) => {
                    unit.hasSilverArrows = true;
                    unit.statModifiers = unit.statModifiers || {};
                    unit.statModifiers.hasSilverArrows = true;
                }
            });
        }

        // Berserker mythic requires the unit to have Berserker Legendary `hasDoubleStrike`
        if (playerUnits.some(u => u.type === 'BERSERKER') && hasProperty('BERSERKER', 'hasDoubleStrike') && !hasProperty('BERSERKER', 'hasWarlust')) {
            availableMythicBuffs.push({
                id: 'mythic_warlust',
                name: 'Warlust',
                icon: '💀',
                desc: 'Berserker: Each kill also grants +5 permanent Max HP (on top of Bloodlust\'s +15 DMG).',
                unitType: 'BERSERKER',
                rarity: 'mythic',
                effect: (unit) => {
                    unit.hasWarlust = true;
                    unit.statModifiers = unit.statModifiers || {};
                    unit.statModifiers.hasWarlust = true;
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
                    <h2>${t('loot_goblin.select_unit')}</h2>
                    <p style="color: #6B8B5B;">${buffData.icon} ${buffData.name}</p>
                    <p style="color: #8B7355; font-size: 12px;">${buffData.desc}</p>
                </div>
                <div class="spell-grid" id="buff-target-grid"></div>
                <button class="spellbook-close" onclick="this.closest('.spellbook-modal').remove()">${t('loot_goblin.cancel')}</button>
            </div>
        `;

        document.body.appendChild(modal);

        const grid = document.getElementById('buff-target-grid');
        playerUnits.forEach(unit => {
            const card = document.createElement('div');
            card.className = 'unit-select-card';
            card.innerHTML = `
                <div style="font-size: 28px; margin-bottom: 5px;">${unit.emoji}</div>
                <div style="color: #A68966; font-weight: bold; font-size: 14px;">${unit.name}</div>
                <div style="font-size: 11px; color: #B8A896; margin-top: 4px; line-height: 1.4;">
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
            'mythic_unstable_arcana': 'hasUnstableArcana',
            'mythic_silver_arrows': 'hasSilverArrows',
            'mythic_warlust': 'hasWarlust'
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
                    <h2 style="color: #D4A574;">${t('loot_goblin.select_legendary')}</h2>
                    <p style="color: #D4A574; text-shadow: 0 0 10px rgba(212, 165, 116, 0.5);">${buffData.icon} ${buffData.name}</p>
                    <p style="color: #8B7355; font-size: 12px;">${buffData.desc}</p>
                </div>
                <div class="spell-grid" id="legendary-target-grid"></div>
                <button class="spellbook-close" onclick="this.closest('.spellbook-modal').remove()">${t('loot_goblin.cancel')}</button>
            </div>
        `;

        document.body.appendChild(modal);

        const grid = document.getElementById('legendary-target-grid');
        playerUnits.forEach(unit => {
            const card = document.createElement('div');
            card.className = 'unit-select-card';
            card.style.cssText = 'border: 2px solid #8B6914;';
            card.innerHTML = `
                <div style="font-size: 28px; margin-bottom: 5px;">${unit.emoji}</div>
                <div style="color: #D4A574; font-weight: bold; font-size: 14px;">${unit.name}</div>
                <div style="font-size: 11px; color: #B8A896; margin-top: 4px; line-height: 1.4;">
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

    // Helper: Find an empty cell near a target position
    findEmptyCellNear(targetX, targetY, maxRadius = 5) {
        const width = this.gridSystem.width;
        const height = this.gridSystem.height;
        
        // Check the target position first
        if (!this.unitManager.getUnitAt(targetX, targetY) && !this.gridSystem.isObstacle(targetX, targetY)) {
            return { x: targetX, y: targetY };
        }
        
        // Spiral search outward
        for (let radius = 1; radius <= maxRadius; radius++) {
            // Check all positions at this radius
            for (let dx = -radius; dx <= radius; dx++) {
                for (let dy = -radius; dy <= radius; dy++) {
                    // Only check the perimeter of the square at this radius
                    if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;
                    
                    const x = targetX + dx;
                    const y = targetY + dy;
                    
                    if (x >= 0 && x < width && y >= 0 && y < height) {
                        if (!this.unitManager.getUnitAt(x, y) && !this.gridSystem.isObstacle(x, y)) {
                            return { x, y };
                        }
                    }
                }
            }
        }
        
        return null; // No empty cell found
    }

    confirmRewards() {
        const canGetNewUnit = this.battleNumber >= 2 && this.battleNumber % 2 === 0;

        // Either buff or legendary must be selected
        const hasBuff = this.selectedRewards.buff || this.selectedRewards.legendary;
        if (!hasBuff || !this.selectedRewards.magic) return;
        if (canGetNewUnit && !this.selectedRewards.unit) return;

        if (canGetNewUnit && this.selectedRewards.unit && this.selectedRewards.unit.id !== 'skipped') {
            const unitType = this.selectedRewards.unit.id;
            let spawnX, spawnY;
            
            // Map-specific spawn areas
            const stage = this.currentStage;
            if (stage.id === 'forest') {
                // Whispering Woods: spawn in player area (left side)
                const playerArea = stage.playerArea;
                spawnX = playerArea.x1;
                spawnY = Math.floor((playerArea.y1 + playerArea.y2) / 2);
            } else if (stage.id === 'ruins') {
                // Ruins: spawn in center 5x5 area
                const centerX = Math.floor(stage.width / 2);
                const centerY = Math.floor(stage.height / 2);
                spawnX = centerX - 2 + Math.floor(Math.random() * 5);
                spawnY = centerY - 2 + Math.floor(Math.random() * 5);
            } else if (stage.id === 'mountain') {
                // Mountain: spawn in left area (rows 3-8)
                spawnX = 0;
                spawnY = 3 + Math.floor(Math.random() * 6); // rows 3-8
            } else {
                // Default: left side
                spawnX = 0;
                spawnY = Math.floor(stage.height / 2);
            }
            
            // Find an empty cell near the target position
            const emptyCell = this.findEmptyCellNear(spawnX, spawnY, 5);
            if (emptyCell) {
                this.unitManager.addUnit(unitType, emptyCell.x, emptyCell.y);
            } else {
                // Fallback: find any empty cell on the map
                for (let y = 0; y < stage.height; y++) {
                    for (let x = 0; x < stage.width; x++) {
                        if (!this.unitManager.getUnitAt(x, y) && !this.gridSystem.isObstacle(x, y)) {
                            this.unitManager.addUnit(unitType, x, y);
                            break;
                        }
                    }
                }
            }
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

        // Apply magic buff effect
        const magicEffect = this.selectedRewards.magic.effectData;
        if (magicEffect) {
            this.uiManager.showFloatingText(`${magicEffect.name} Acquired!`, 400, 200, '#A68966');

            // Fire the effect immediately for one-time effects like Mana Surge
            if (magicEffect.effect) {
                magicEffect.effect();
            }

            if (magicEffect.buffType) {
                // Don't store one-time effects in the persistent buff list
                if (magicEffect.buffType === 'manaRestore') {
                    // Already fired effect() above, don't persist
                } else {
                    const existingBuff = this.magicBuffs.find(b => b.type === magicEffect.buffType);
                    if (existingBuff && magicEffect.buffType === 'manaCost') {
                        existingBuff.value = Math.min(0.8, existingBuff.value + magicEffect.buffValue);
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
                }
                this.uiManager.updateMagicBuffsDisplay();
            }
        }

        this.nextBattle();
    }

    nextBattle() {
        document.getElementById('victory-screen').classList.add('hidden');
        document.getElementById('left-panel').classList.remove('hidden', 'collapsed');
        document.getElementById('right-panel').classList.remove('hidden', 'collapsed');
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
                regenerateAmount: u.regenerateAmount,
                unstableArcanaDotRounds: u.unstableArcanaDotRounds,
                unstableArcanaDotAmount: u.unstableArcanaDotAmount
            }
        }));

        const nextBattleNumber = this.battleNumber + 1;
        
        // Save obstacles to persist across battles on the same map
        const savedObstacles = this.gridSystem.wallImages ? this.gridSystem.wallImages.map(w => ({
            x: w.x,
            y: w.y,
            type: w.type || 'wall'
        })) : null;

        this.scene.restart({
            battleNumber: nextBattleNumber,
            placedUnits: playerUnits,
            magicBuffs: this.magicBuffs,
            selectedEnemyFaction: this.currentEnemyFaction,
            stageId: this.currentStage.id,
            savedObstacles: savedObstacles,
            lastBossSpawned: this.lastBossSpawned
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
        this.currentStage = STAGES.forest; // Default
        this.selectedStageId = 'forest';
        this.selectedEnemyFaction = 'random'; // Default to random
        this.tileSize = this.tileSize;
    }

    getStartingPoints() {
        return this.currentStage.startingPoints || 1000;
    }

    create(data) {
        // Use selected stage or default
        if (data && data.stageId) {
            this.selectedStageId = data.stageId;
        }
        this.currentStage = STAGES[this.selectedStageId];
        this.totalPoints = this.getStartingPoints();
        this.remainingPoints = this.totalPoints;

        // Calculate dynamic tile size to fit map in canvas
        this.tileSize = CONFIG.getTileSize(this.currentStage.width, this.currentStage.height);



        this.setupStageSelection();
        this.resetUnitCounts();
        this.showArmySelection();
        
        this.gridGraphics = this.add.graphics();
        this.drawGrid();
        window.gameScene = this;
    }

    setupStageSelection() {
        // Setup stage selection button listeners
        const stageButtons = document.querySelectorAll('.stage-btn');
        stageButtons.forEach(btn => {
            btn.onclick = () => {
                const stageId = btn.dataset.stage;
                this.selectStage(stageId);
            };
        });
    }

    selectStage(stageId) {
        this.selectedStageId = stageId;
        this.currentStage = STAGES[stageId];
        this.totalPoints = this.getStartingPoints();
        
        // Recalculate tile size for new stage
        this.tileSize = CONFIG.getTileSize(this.currentStage.width, this.currentStage.height);
        
        // Update UI
        document.querySelectorAll('.stage-btn').forEach(btn => {
            if (btn.dataset.stage === stageId) {
                btn.classList.add('active');
                btn.style.background = '#4a7c59';
            } else {
                btn.classList.remove('active');
                btn.style.background = '#2D241E';
            }
        });

        // Reset unit counts when changing stage (since points change)
        this.resetUnitCounts();
        this.remainingPoints = this.totalPoints;
        this.updatePointsDisplay();
        
        // Redraw grid for new stage
        this.drawGrid();
    }

    drawGrid() {
        this.gridGraphics.clear();

        const gridWidth = this.currentStage.width;
        const gridHeight = this.currentStage.height;
        const { x1: placementStartX, x2: placementEndX, y1: placementStartY, y2: placementEndY } = this.currentStage.playerArea;

        // Determine colors based on stage
        const isRuins = this.currentStage.id === 'ruins';
        const colorA = isRuins ? CONFIG.COLORS.DIRT : CONFIG.COLORS.GRASS;
        const colorB = isRuins ? CONFIG.COLORS.DIRT_DARK : CONFIG.COLORS.GRASS_DARK;

        const tileSize = this.tileSize;

        for (let y = 0; y < gridHeight; y++) {
            for (let x = 0; x < gridWidth; x++) {
                const isPlacementZone = x >= placementStartX && x < placementEndX && y >= placementStartY && y < placementEndY;
                const baseColor = (x + y) % 2 === 0 ? colorA : colorB;
                // Make placement zone brighter
                const alpha = isPlacementZone ? 0.6 : 0.2;
                this.gridGraphics.fillStyle(baseColor, alpha);
                this.gridGraphics.fillRect(x * tileSize, y * tileSize, tileSize - 2, tileSize - 2);

                // Add border highlight for placement zone
                if (isPlacementZone) {
                    this.gridGraphics.lineStyle(2, 0xA68966, 0.5);
                    this.gridGraphics.strokeRect(
                        x * tileSize + 2,
                        y * tileSize + 2,
                        tileSize - 4,
                        tileSize - 4
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
        document.getElementById('points-total').textContent = this.totalPoints;

        const confirmBtn = document.getElementById('confirm-army');
        const totalUnits = Object.values(this.unitCounts).reduce((a, b) => a + b, 0);
        confirmBtn.textContent = t('army.confirm.units', totalUnits);
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
        document.getElementById('left-panel').classList.add('hidden');
        document.getElementById('right-panel').classList.add('hidden');
        document.getElementById('left-panel').classList.remove('collapsed');
        document.getElementById('right-panel').classList.remove('collapsed');
        this.placementMode = true;
        // Hide language toggle when game starts
        const langToggle = document.getElementById('lang-toggle-container');
        if (langToggle) {
            langToggle.style.display = 'none';
        }
        this.placedUnits = [];
        this.selectedPlacementUnit = null;

        const tileSize = this.tileSize;
        const gridHeight = this.currentStage.height;
        const { x1: placementStartX, x2: placementEndX, y1: placementStartY, y2: placementEndY } = this.currentStage.playerArea;
        let initialPlacementX = placementStartX;


        // Auto-place units
        for (const [type, count] of Object.entries(this.unitCounts)) {
            for (let i = 0; i < count; i++) {
                // Find first available Y in the initial column
                let spawnY = -1;
                for (let y = placementStartY; y < placementEndY; y++) {
                    const isOccupied = this.placedUnits.some(u => u.x === initialPlacementX && u.y === y);
                    if (!isOccupied) {
                        spawnY = y;
                        break;
                    }
                }

                if (spawnY !== -1) {
                    const x = initialPlacementX * tileSize + tileSize / 2;
                    const y = spawnY * tileSize + tileSize / 2;
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

            // Convert screen coordinates to world coordinates (accounting for camera zoom)
            const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
            const gridX = Math.floor(worldPoint.x / tileSize);
            const gridY = Math.floor(worldPoint.y / tileSize);

            const inPlacementZone = gridX >= placementStartX && gridX < placementEndX && gridY >= placementStartY && gridY < placementEndY;
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
                        gridX * tileSize + tileSize / 2,
                        gridY * tileSize + tileSize / 2
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

            // Convert screen coordinates to world coordinates (accounting for camera zoom)
            const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
            const gridX = Math.floor(worldPoint.x / tileSize);
            const gridY = Math.floor(worldPoint.y / tileSize);

            if (gridX >= placementStartX && gridX < placementEndX &&
                gridY >= placementStartY && gridY < placementEndY) {
                const isOccupied = this.placedUnits.some(u => u.x === gridX && u.y === gridY);

                this.gridGraphics.fillStyle(isOccupied ? 0x9E4A4A : 0x6B8B5B, 0.5);
                this.gridGraphics.fillRect(
                    gridX * tileSize + 4,
                    gridY * tileSize + 4,
                    tileSize - 8,
                    tileSize - 8
                );
            }
        });
    }

    randomizePlacement() {
        if (!this.placementMode || !this.placedUnits.length) return;

        const { x1: placementStartX, x2: placementEndX, y1: placementStartY, y2: placementEndY } = this.currentStage.playerArea;

        // Get all available cells in the zone
        const availableCells = [];
        for (let y = placementStartY; y < placementEndY; y++) {
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
        const tileSize = this.tileSize;
        this.placedUnits.forEach((unit, index) => {
            if (availableCells[index]) {
                const newPos = availableCells[index];
                unit.x = newPos.x;
                unit.y = newPos.y;
                unit.sprite.setPosition(
                    newPos.x * tileSize + tileSize / 2,
                    newPos.y * tileSize + tileSize / 2
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

    selectEnemyFaction(factionId) {
        this.selectedEnemyFaction = factionId;
    }

    confirmPlacement() {
        this.placementMode = false;
        document.getElementById('placement-bar').classList.add('hidden');

        // Clean up sprites before passing data to next scene
        const finalPlacement = this.placedUnits.map(u => ({ type: u.type, x: u.x, y: u.y }));
        this.placedUnits.forEach(u => u.sprite.destroy());
        this.placedUnits = [];

        // Determine the actual faction to use
        let enemyFaction = this.selectedEnemyFaction;
        if (enemyFaction === 'random' || !enemyFaction) {
            const factions = Object.keys(ENEMY_FACTIONS);
            enemyFaction = factions[Math.floor(Math.random() * factions.length)];
        } else {
            // Map the faction ID to the actual faction key
            const factionMap = {
                'greenskin': 'GREENSKIN_HORDE',
                'dungeon': 'DUNGEON_DWELLERS',
                'cultist': 'OLD_GOD_WORSHIPPERS'
            };
            enemyFaction = factionMap[enemyFaction] || 'GREENSKIN_HORDE';
        }

        this.scene.start('BattleScene', {
            placedUnits: finalPlacement,
            battleNumber: 1,
            stageId: this.currentStage.id,
            selectedEnemyFaction: enemyFaction
        });
    }
}
