// ============================================
// ENTITY MANAGER - Units, Unit Management, Turn System
// ============================================

import { CONFIG, SPELLS } from './GameConfig.js';
import { t } from './i18n-helper.js';

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

        // Unstable Arcana DoT tracking
        this.unstableArcanaDotRounds = 0;
        this.unstableArcanaDotAmount = 0;

        // Ogre Chieftain slow debuff tracking
        this.slowDebuffRounds = 0;
        this.slowDebuffValue = 0;

        // Void Herald slow tracking
        this.voidSlowRounds = 0;

        // Dread Knight Bleed DoT
        this.bleedRounds = 0;
        this.bleedAmount = 0;

        // Iron Colossus Stun (set by Seismic Slam; consumed at turn start)
        this.isStunned = false;

        // Permanent stat modifiers from rewards
        this.statModifiers = null;

        // Berserker Bloodlust stacks (permanent damage increase from kills)
        this.bloodlustStacks = 0;

        // Cultist Unstable Form tracking (Gibbering Horror)
        this.unstableFormRounds = 0;
        this.unstableFormType = null; // 'movement' or 'damage'

        // Summoner Lich first turn summon
        if (this.type === 'SUMMONER_LICH') {
            this.firstSummon = true;
        }
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
        // Lost Spirit: -75% all damage (Ethereal passive)
        if (this.type === 'LOST_SPIRIT') {
            amount = Math.floor(amount * 0.25);
        }

        // Banshee Sovereign: Ethereal (-75% physical) + Arcane Weakness (+50% ranged/spells)
        if (this.type === 'BANSHEE_SOVEREIGN') {
            amount = isRanged
                ? Math.floor(amount * 1.5)   // +50% from ranged & spells
                : Math.floor(amount * 0.25); // -75% from physical melee
        }

        // Apply shield if active (including permanent with rounds = -1)
        if (this.shieldRounds > 0 || this.shieldRounds === -1) {
            amount = Math.floor(amount * (1 - this.shieldValue));
        }

        // Apply Knight/Paladin ranged damage reduction
        if (isRanged && (this.type === 'KNIGHT' || this.type === 'PALADIN')) {
            // Divine Retribution removes the ranged defense and healing boost passives
            if (!this.hasDivineRetribution) {
                const template = UNIT_TYPES[this.type];
                if (template.passives) {
                    // Find passive with rangedDefense effect
                    for (const passive of template.passives) {
                        if (passive.effect === 'rangedDefense') {
                            amount = Math.floor(amount * (1 - passive.value));
                            break;
                        } else if (passive.effects && passive.effects.includes('rangedDefense')) {
                            const idx = passive.effects.indexOf('rangedDefense');
                            amount = Math.floor(amount * (1 - passive.values[idx]));
                            break;
                        }
                    }
                }
            }
        }

        // Apply Berserker Reckless passive (+50% damage taken)
        if (this.type === 'BERSERKER') {
            amount = Math.floor(amount * 1.5);
        }

        // Iron Colossus: Iron Reflection — reflects 50% of melee damage back to attacker
        if (this.type === 'IRON_COLOSSUS' && !isRanged && attacker && attacker !== this) {
            const reflected = Math.floor(amount * 0.5);
            if (reflected > 0 && attacker.health > 0) {
                attacker.health = Math.max(0, attacker.health - reflected);
                attacker.updateHealthBar();
                if (this.scene && this.scene.uiManager) {
                    this.scene.uiManager.showFloatingText(`↩ ${reflected}`, attacker.sprite.x, attacker.sprite.y - 50, '#BBBBBB');
                    this.scene.addCombatLog(`Iron Colossus reflects ${reflected} damage back to ${attacker.name}!`, 'debuff');
                }
                if (attacker.health <= 0) {
                    attacker.killedBy = this;
                    attacker.die(this.scene);
                    if (this.scene) this.scene.checkVictoryCondition();
                }
            }
        }

        const actualDamage = Math.min(amount, this.health); // Can't deal more damage than remaining health
        this.health = Math.max(0, this.health - amount);
        this.updateHealthBar();

        // Ogre Chieftain: Apply slow debuff on attack (if attacker is Ogre Chieftain)
        // Berserker's Reckless passive makes them immune to movement reduction
        if (attacker && attacker.type === 'OGRE_CHIEFTAIN' && this.health > 0 && this.type !== 'BERSERKER' && !this.hasIronWill) {
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

        // Last Stand: survive one lethal hit per battle with 1 HP
        if (this.health <= 0 && this.hasLastStand) {
            this.health = 1;
            this.hasLastStand = false; // consumed
            this.updateHealthBar();
            if (this.scene && this.scene.uiManager) {
                this.scene.uiManager.showBuffText(this, 'LAST STAND!', '#FFD700');
            }
            if (this.scene && this.scene.addCombatLog) {
                this.scene.addCombatLog(`${this.name} survived a lethal blow! (Last Stand)`, 'buff');
            }
            return amount;
        }

        if (this.health <= 0) {
            this.killedBy = attacker;
            this.die(this.scene);
        }
        return amount;
    }

    heal(amount) {
        this.health = Math.min(this.maxHealth, this.health + amount);
        this.updateHealthBar();
    }

    takeSpellDamage(amount, attacker = null) {
        // Lost Spirit: +50% spell damage
        if (this.type === 'LOST_SPIRIT') {
            amount = Math.floor(amount * 1.5);
        }

        // Iron Colossus: Magic Resonance — takes double spell damage
        if (this.type === 'IRON_COLOSSUS') {
            amount = amount * 2;
        }

        // Cultist Void-Burned Skin: 25% magic damage resistance
        const cultistTypes = ['CULTIST_ACOLYTE', 'CULTIST_NEOPHYTE', 'GIBBERING_HORROR', 'FLESH_WARPED_STALKER',
                              'OCTOTH_HROARATH', 'THE_SILENCE', 'VOID_HERALD'];
        if (cultistTypes.includes(this.type)) {
            amount = Math.floor(amount * 0.75);
        }

        // Shield applies to spell damage as well
        if (this.shieldRounds > 0 || this.shieldRounds === -1) {
            amount = Math.floor(amount * (1 - this.shieldValue));
        }

        this.health = Math.max(0, this.health - amount);
        this.updateHealthBar();

        // Last Stand: survive one lethal hit per battle with 1 HP
        if (this.health <= 0 && this.hasLastStand) {
            this.health = 1;
            this.hasLastStand = false;
            this.updateHealthBar();
            if (this.scene && this.scene.uiManager) {
                this.scene.uiManager.showBuffText(this, 'LAST STAND!', '#FFD700');
            }
            if (this.scene && this.scene.addCombatLog) {
                this.scene.addCombatLog(`${this.name} survived a lethal spell! (Last Stand)`, 'buff');
            }
            return amount;
        }

        if (this.health <= 0) {
            this.die(this.scene);
        }
        return amount;
    }

    die(scene) {
        this.isDead = true;
        this.health = 0;

        // Combat log kill entry
        if (scene && scene.addCombatLog) {
            if (this.killedBy) {
                scene.addCombatLog(`${this.killedBy.name} killed ${this.name}!`, 'kill');
            } else {
                scene.addCombatLog(`${this.name} was slain!`, 'kill');
            }
        }

        // Clear silence aura if The Silence was killed
        if (this.type === 'THE_SILENCE' && scene && scene.silenceActive) {
            scene.silenceActive = false;
            if (scene.uiManager) {
                scene.uiManager.showFloatingText('🔇 Silence lifted!', 400, 250, '#6B8B5B');
            }
            if (scene.addCombatLog) {
                scene.addCombatLog('The aura of silence dissipates as The Silence falls!', 'spell');
            }
        }

        // Bloodlust: If killed by Berserker, they get +15 permanent damage
        if (this.killedBy && this.killedBy.type === 'BERSERKER' && !this.killedBy.isDead) {
            this.killedBy.damage += 15;
            this.killedBy.bloodlustStacks += 1;
            if (scene && scene.uiManager) {
                scene.uiManager.showBuffText(this.killedBy, 'BLOODLUST!', '#9E4A4A');
                scene.uiManager.showFloatingText('+15 DMG', this.killedBy.sprite.x, this.killedBy.sprite.y - 80, '#9E4A4A');
            }
            if (scene && scene.addCombatLog) {
                scene.addCombatLog(`${this.killedBy.name} gained +15 DMG from Bloodlust! (${this.killedBy.bloodlustStacks} stacks)`, 'buff');
            }
            // Warlust mythic: each kill also grants +5 permanent Max HP
            if (this.killedBy.hasWarlust) {
                this.killedBy.maxHealth += 5;
                this.killedBy.health = Math.min(this.killedBy.health + 5, this.killedBy.maxHealth);
                this.killedBy.updateHealthBar();
                if (scene && scene.uiManager) {
                    scene.uiManager.showFloatingText('+5 HP', this.killedBy.sprite.x, this.killedBy.sprite.y - 60, '#cc4444');
                }
                if (scene && scene.addCombatLog) {
                    scene.addCombatLog(`${this.killedBy.name} gained +5 Max HP from Warlust!`, 'buff');
                }
            }
        }

        // Bone Behemoth: Bone Absorption passive
        let boneBehemothAbsorption = false;
        let absorptionBoss = null;
        if (scene && scene.unitManager && this.type !== 'BONE_BEHEMOTH') {
            absorptionBoss = scene.unitManager.units.find(
                u => u.type === 'BONE_BEHEMOTH' && !u.isDead
            );
            if (absorptionBoss) boneBehemothAbsorption = true;
        }

        let hpGain = 0;
        let dmgGain = 0;
        if (boneBehemothAbsorption) {
            hpGain = this.maxHealth;
            dmgGain = Math.floor(this.damage * 0.5);
            absorptionBoss.maxHealth += hpGain;
            absorptionBoss.health = Math.min(absorptionBoss.health + hpGain, absorptionBoss.maxHealth);
            absorptionBoss.damage += dmgGain;
            absorptionBoss.moveRange += 1;
            absorptionBoss.updateHealthBar();
            if (scene.addCombatLog) {
                scene.addCombatLog(`Bone Behemoth absorbed ${this.name}: +${hpGain} HP, +${dmgGain} DMG, +1 MOV!`, 'buff');
            }
        }

        if (this.sprite && boneBehemothAbsorption && scene) {
            // Bone-fly animation: sprite shrinks, bones fly to boss
            const deadX = this.sprite.x;
            const deadY = this.sprite.y;
            const bossX = absorptionBoss.sprite ? absorptionBoss.sprite.x : deadX;
            const bossY = absorptionBoss.sprite ? absorptionBoss.sprite.y : deadY;

            // Shrink and fade the dying unit
            scene.tweens.add({
                targets: this.sprite,
                scaleX: 0, scaleY: 0,
                alpha: 0,
                duration: 200,
                ease: 'Power2'
            });

            // Spawn bone particles that fly to the boss
            const boneCount = 7;
            const bones = [];
            for (let i = 0; i < boneCount; i++) {
                const ox = (Math.random() - 0.5) * 30;
                const oy = (Math.random() - 0.5) * 30;
                const size = 4 + Math.random() * 6;
                const bone = scene.add.rectangle(deadX + ox, deadY + oy, size, size * 0.5, 0xE8D5B7);
                bone.setAngle(Math.random() * 360);
                bone.setDepth(100);
                bones.push(bone);

                const isLast = i === boneCount - 1;
                scene.tweens.add({
                    targets: bone,
                    x: bossX + (Math.random() - 0.5) * 20,
                    y: bossY + (Math.random() - 0.5) * 20,
                    angle: bone.angle + 360 + Math.random() * 360,
                    scaleX: 0.5,
                    scaleY: 0.5,
                    duration: 400 + Math.random() * 200,
                    delay: 150 + i * 60,
                    ease: 'Power2',
                    onComplete: isLast ? () => {
                        bones.forEach(b => b.destroy());
                        if (scene.uiManager) {
                            scene.uiManager.showBuffText(absorptionBoss, 'BONE ABSORPTION!', '#E8D5B7');
                            scene.uiManager.showFloatingText(
                                `+${hpGain} HP +${dmgGain} DMG +1 MOV`,
                                bossX, bossY - 80, '#E8D5B7'
                            );
                        }
                    } : undefined
                });
            }

            // Immediate cleanup on dying sprite
            if (!this.sprite.setText) {
                this.sprite.setTint(0x666666);
            }
            this.sprite.removeInteractive();
        } else if (this.sprite) {
            // Normal death animation: fall over
            if (this.sprite.setOrigin) {
                const hOffset = this.sprite.displayHeight ? this.sprite.displayHeight / 2 : 32;
                this.sprite.setOrigin(0.5, 0.5);
                this.sprite.y -= hOffset;
            }

            const fallAngle = this.isPlayer ? -90 : 90;

            if (scene) {
                scene.tweens.add({
                    targets: this.sprite,
                    angle: fallAngle,
                    y: '+=20',
                    alpha: 0.5,
                    duration: 500,
                    ease: 'Power2'
                });
            } else {
                this.sprite.setAngle(fallAngle);
                this.sprite.y += 20;
                this.sprite.setAlpha(0.5);
            }

            if (!this.sprite.setText) {
                this.sprite.setTint(0x666666);
            }
            this.sprite.removeInteractive();
        }

        if (this.shadow) {
            this.shadow.setAlpha(0);
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

        // Void Herald death: Remove slow from all player units
        if (this.type === 'VOID_HERALD' && scene && scene.unitManager) {
            const playerUnits = scene.unitManager.getPlayerUnits();
            for (const player of playerUnits) {
                if (player.voidSlowRounds > 0) {
                    player.voidSlowRounds = 0;
                    player.moveRange = UNIT_TYPES[player.type].moveRange;
                    scene.uiManager.showBuffText(player, 'SPEED RESTORED!', '#4CAF50');
                }
            }
            scene.addCombatLog('Void Herald defeated! Movement speed restored!', 'buff');
        }

        // Check victory condition — delay to let death animation play
        if (scene && scene.unitManager) {
            const enemies = scene.unitManager.getEnemyUnits();
            const players = scene.unitManager.getPlayerUnits();

            if (enemies.length === 0 && !scene.victoryShown) {
                scene.victoryShown = true;
                scene.addCombatLog('All enemies defeated!', 'kill');
                scene.time.delayedCall(1200, () => {
                    scene.showVictoryScreen(true);
                });
            } else if (players.length === 0 && !scene.victoryShown) {
                scene.victoryShown = true;
                scene.addCombatLog('Your army has fallen...', 'kill');
                scene.time.delayedCall(1200, () => {
                    scene.showVictoryScreen(false);
                });
            }
        }
    }

    resetTurn() {
        this.hasMoved = false;
        this.hasAttacked = false;
        this.hasHealed = false;
        this.hasPulled = false;
        this.hasCastFireball = false;

        // Tower range bonus: double ranged range while on tower tile
        if (this.scene && this.scene.gridSystem) {
            const onTower = this.scene.gridSystem.isTower(this.gridX, this.gridY);
            if (onTower && this.rangedRange > 0 && !this.towerBonusApplied) {
                this.towerBaseRange = this.rangedRange;
                this.rangedRange *= 2;
                this.towerBonusApplied = true;
                this.scene.uiManager.showBuffText(this, 'TOWER!', '#DAA520');
            } else if (!onTower && this.towerBonusApplied) {
                this.rangedRange = this.towerBaseRange;
                this.towerBonusApplied = false;
            }
        }

        // Store starting position for Rogue's hit-and-run
        if (this.type === 'ROGUE' || this.type === 'ORC_ROGUE' || this.type === 'LOOT_GOBLIN') {
            this.turnStartX = this.gridX;
            this.turnStartY = this.gridY;
        }

        // Summoner Lich: Summon units at start of turn
        if (this.type === 'SUMMONER_LICH' && !this.isDead) {
            const summonCount = this.firstSummon ? 2 : 1;
            this.firstSummon = false;

            this.scene.uiManager.showBuffText(this, 'SUMMON!', '#9B59B6');

            const summonableUnits = ['SKELETON_ARCHER', 'SKELETON_SOLDIER', 'ANIMATED_ARMOR'];
            const availablePositions = [];
            // Find available adjacent spots
            for (let y = this.gridY - 1; y <= this.gridY + this.bossSize; y++) {
                for (let x = this.gridX - 1; x <= this.gridX + this.bossSize; x++) {
                    if (x < 0 || x >= this.scene.gridSystem.width || y < 0 || y >= this.scene.gridSystem.height) continue;
                    if (this.scene.unitManager.isValidPlacement(x, y)) {
                        availablePositions.push({ x, y });
                    }
                }
            }

            for (let i = 0; i < summonCount; i++) {
                if (availablePositions.length === 0) break;

                const unitType = summonableUnits[Math.floor(Math.random() * summonableUnits.length)];
                const posIndex = Math.floor(Math.random() * availablePositions.length);
                const pos = availablePositions.splice(posIndex, 1)[0];

                this.scene.unitManager.addUnit(unitType, pos.x, pos.y);
            }
            // Update turn queue with new units
            this.scene.turnSystem.updateQueue();
        }

        // Octo'th Hroa'rath: Otherworldly Aura
        if (this.type === 'OCTOTH_HROARATH' && !this.isDead) {
            this.scene.uiManager.showBuffText(this, 'AURA!', '#9B59B6');
            const adjacentUnits = this.scene.unitManager.getPlayerUnits().filter(u => {
                const dist = this.scene.turnSystem.getDistanceToUnit(this, u);
                return dist === 1;
            });
            adjacentUnits.forEach(unit => {
                unit.takeDamage(15, false, this);
                this.scene.uiManager.showDamageText(unit, 15);
            });
        }

        // Ogre Chieftain: Regenerate 10% max HP at start of turn
        if (this.type === 'OGRE_CHIEFTAIN' && !this.isDead) {
            const regenAmount = Math.floor(this.maxHealth * 0.1);
            this.heal(regenAmount);
            if (this.scene && this.scene.uiManager) {
                this.scene.uiManager.showFloatingText(`+${regenAmount} HP`, this.sprite.x, this.sprite.y - 60, '#4CAF50');
            }
        }

        // Iron Colossus: Seismic Slam — knock back and stun all player units within 2 tiles
        if (this.type === 'IRON_COLOSSUS' && !this.isDead) {
            const scene = this.scene;
            const SLAM_RANGE = 2;
            const myPositions = this.getOccupiedPositions();
            const nearby = scene.unitManager.getPlayerUnits().filter(p => {
                const minDist = Math.min(...myPositions.map(pos =>
                    Math.max(Math.abs(p.gridX - pos.x), Math.abs(p.gridY - pos.y))
                ));
                return minDist <= SLAM_RANGE;
            });
            if (nearby.length > 0) {
                scene.uiManager.showFloatingText('💥 SEISMIC SLAM!', 400, 200, '#BBBBBB');
                for (const p of nearby) {
                    if (p.hasJuggernaut) {
                        scene.uiManager.showBuffText(p, 'IMMUNE!', '#FFD700');
                        continue;
                    }
                    const cxCenter = this.gridX + 0.5;
                    const cyCenter = this.gridY + 0.5;
                    const dx = p.gridX - cxCenter;
                    const dy = p.gridY - cyCenter;
                    const dirX = dx === 0 ? 0 : (dx > 0 ? 1 : -1);
                    const dirY = dy === 0 ? 0 : (dy > 0 ? 1 : -1);
                    for (let dist = 2; dist >= 1; dist--) {
                        const nx = p.gridX + dirX * dist;
                        const ny = p.gridY + dirY * dist;
                        if (nx >= 0 && nx < scene.gridSystem.width &&
                            ny >= 0 && ny < scene.gridSystem.height &&
                            !scene.unitManager.getUnitAt(nx, ny) &&
                            !scene.gridSystem.isObstacle(nx, ny)) {
                            scene.unitManager.updateUnitPosition(p, nx, ny);
                            break;
                        }
                    }
                    p.isStunned = true;
                    scene.uiManager.showBuffText(p, 'STUNNED!', '#BBBBBB');
                }
                scene.addCombatLog(
                    `Iron Colossus shakes the ground! ${nearby.length} unit(s) knocked back and stunned for 1 turn!`,
                    'debuff'
                );
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

        // Bleed DoT (inflicted by Dread Knight)
        if (this.bleedRounds > 0) {
            const bleedDmg = this.bleedAmount;
            this.health = Math.max(0, this.health - bleedDmg);
            if (this.scene && this.scene.uiManager) {
                this.scene.uiManager.showDamageText(this, bleedDmg);
                this.scene.uiManager.showBuffText(this, 'BLEEDING!', '#CC2200');
            }
            if (this.scene) {
                this.scene.addCombatLog(`${this.name} takes ${bleedDmg} bleed damage.`, 'damage');
            }
            this.updateHealthBar();
            this.bleedRounds--;
            if (this.bleedRounds === 0) this.bleedAmount = 0;
            if (this.health <= 0) {
                this.die();
                if (this.scene) this.scene.checkVictoryCondition();
                return;
            }
        }

        // Handle Unstable Arcana DoT damage at start of turn
        if (this.unstableArcanaDotRounds > 0) {
            const dotDamage = this.unstableArcanaDotAmount;
            this.health -= dotDamage;
            if (this.scene && this.scene.uiManager) {
                this.scene.uiManager.showDamageText(this, dotDamage);
                this.scene.uiManager.showFloatingText('Burning!', this.sprite.x, this.sprite.y - 50, '#ff6600');
            }
            if (this.scene) {
                this.scene.addCombatLog(`${this.name} takes ${dotDamage} burning damage from Unstable Arcana.`, 'damage');
            }
            this.updateHealthBar();
            
            this.unstableArcanaDotRounds--;
            if (this.unstableArcanaDotRounds === 0) {
                this.unstableArcanaDotAmount = 0;
            }
            
            // Check if unit died from DoT
            if (this.health <= 0) {
                this.die();
                if (this.scene) {
                    this.scene.checkVictoryCondition();
                }
                return; // Skip rest of turn if died
            }
        }

        // Gibbering Horror: Unstable Form - randomly gain +2 MOV or +10 damage at turn start
        if (this.type === 'GIBBERING_HORROR' && !this.isDead) {
            const roll = Math.random();
            if (roll < 0.5) {
                // +2 Movement
                this.unstableFormType = 'movement';
                this.unstableFormBonus = 2;
                this.moveRange += 2;
                this.scene.uiManager.showBuffText(this, 'MUTATION: SPEED!', '#9B59B6');
                this.scene.addCombatLog(`${this.name}'s unstable form grants +2 Movement!`, 'buff');
            } else {
                // +10 Damage
                this.unstableFormType = 'damage';
                this.unstableFormBonus = 10;
                this.damage += 10;
                this.scene.uiManager.showBuffText(this, 'MUTATION: POWER!', '#9B59B6');
                this.scene.addCombatLog(`${this.name}'s unstable form grants +10 Damage!`, 'buff');
            }
            this.unstableFormRounds = 1;
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

        // Unstable Form expiration
        if (this.unstableFormRounds > 0) {
            this.unstableFormRounds--;
            if (this.unstableFormRounds === 0) {
                // Revert the buff by subtracting the bonus (preserves scaling and other modifiers)
                if (this.unstableFormType === 'movement' && this.unstableFormBonus) {
                    this.moveRange = Math.max(1, this.moveRange - this.unstableFormBonus);
                } else if (this.unstableFormType === 'damage' && this.unstableFormBonus) {
                    this.damage -= this.unstableFormBonus;
                }
                this.unstableFormType = null;
                this.unstableFormBonus = 0;
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

        // Void Herald slow decay (4 turn duration)
        if (this.voidSlowRounds > 0) {
            this.voidSlowRounds--;
            if (this.voidSlowRounds === 0) {
                this.moveRange = UNIT_TYPES[this.type].moveRange;
            }
        }
    }

    // Get base stats from template
    getBaseStats() {
        const template = UNIT_TYPES[this.type];
        return {
            health: template.health,
            maxHealth: template.maxHealth,
            damage: template.damage,
            moveRange: template.moveRange,
            initiative: template.initiative,
            rangedRange: template.rangedRange || 0
        };
    }

    // Calculate modifiers (current - base)
    // includeBuffs: if true, includes temporary buffs like Bless, Haste, etc.
    getStatModifiers(includeBuffs = false) {
        const base = this.getBaseStats();
        const mods = {
            health: this.health - base.health,
            maxHealth: this.maxHealth - base.maxHealth,
            damage: this.damage - base.damage,
            moveRange: this.moveRange - base.moveRange,
            initiative: this.initiative - base.initiative,
            rangedRange: this.rangedRange - base.rangedRange
        };
        
        // If including buffs, calculate the effective modifiers from temporary buffs
        if (includeBuffs) {
            // Bless increases damage by 50% (blessValue = 1.5 means +50%)
            if (this.blessValue > 1) {
                const blessBonus = Math.floor(this.damage * (this.blessValue - 1));
                mods.damage += blessBonus;
            }
            // Haste increases move range
            if (this.hasteRounds > 0 || this.hasteRounds === -1) {
                const hasteBonus = this.moveRange - base.moveRange - mods.moveRange;
                if (hasteBonus > 0) mods.moveRange += hasteBonus;
            }
        }
        
        return mods;
    }

    // Get HP color based on health percentage (gradient from default to red at 10%)
    getHPColor() {
        const baseMaxHealth = this.getBaseStats().maxHealth;
        const healthPercent = this.health / baseMaxHealth;
        
        // At 10% or below, return pure red
        if (healthPercent <= 0.1) {
            return '#ff0000';
        }
        
        // Interpolate between default text color (#E3D5B8) and red (#ff0000)
        // healthPercent goes from 0.1 to 1.0
        // We want t to go from 0 (red) to 1 (default)
        const t = (healthPercent - 0.1) / 0.9;
        
        const defaultR = 227, defaultG = 213, defaultB = 184;
        const redR = 255, redG = 0, redB = 0;
        
        const r = Math.round(redR + (defaultR - redR) * t);
        const g = Math.round(redG + (defaultG - redG) * t);
        const b = Math.round(redB + (redB - redB) * t);
        
        return `rgb(${r}, ${g}, ${b})`;
    }

    // Format stat value with modifier for mode 1 (base + green modifier)
    formatStatMode1(value, modifier) {
        if (modifier === 0) return value;
        const sign = modifier > 0 ? '+' : '';
        return `${value} <span style="color: #4CAF50;">${sign}${modifier}</span>`;
    }

    // Format stat value for mode 2 (current value, green if positively modified, red if negatively)
    formatStatMode2(value, modifier) {
        if (modifier === 0) return value;
        const color = modifier > 0 ? '#4CAF50' : '#ff4444';
        return `<span style="color: ${color};">${value}</span>`;
    }

    getDisplayStats(displayMode = 1) {
        const base = this.getBaseStats();
        // Mode 1 includes buffs in the modifier display
        const mods = this.getStatModifiers(displayMode === 1);
        const rangedInfo = this.rangedRange > 0 ? ` | ${t('stat.rng')}: ${this.rangedRange}` : '';
        const rangedMod = mods.rangedRange;

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
        if (this.voidSlowRounds > 0) buffs.push(`VoidSlow(${this.voidSlowRounds})`);
        if (this.unstableArcanaDotRounds > 0) buffs.push(`Burning(${this.unstableArcanaDotRounds})`);

        const buffDisplay = buffs.length > 0 ? `<br>✨ ${buffs.join(', ')}` : '';

        const template = UNIT_TYPES[this.type];
        let passiveDisplay = '';

        // Handle passives
        if (template.passives) {
            passiveDisplay = template.passives.map(p => `<br>⚔️ ${p.name}: ${p.description}`).join('');
        }

        const specialDisplay = template.special ? `<br>⚡ ${t('panel.abilities').replace('⚡ ', '')}: Hit & Run` : '';

        // Boss indicator
        const bossDisplay = this.isBoss ? `<br>👑 BOSS (${this.bossSize}x${this.bossSize})` : '';

        // HP color based on health percentage
        const hpColor = this.getHPColor();

        // Get translated unit name
        const unitName = t('unit.' + this.type.toLowerCase());

        let statsHtml;
        if (displayMode === 1) {
            // Mode 1: Base + modifiers (green)
            // For damage, include bless buff in the modifier
            const effectiveDmgMod = mods.damage;
            const dmgDisplay = this.formatStatMode1(base.damage, effectiveDmgMod);
            const movDisplay = this.formatStatMode1(base.moveRange, mods.moveRange);
            const initDisplay = this.formatStatMode1(base.initiative, mods.initiative);
            const rngDisplay = base.rangedRange > 0 ? ` | ${t('stat.rng')}: ${this.formatStatMode1(base.rangedRange, rangedMod)}` : '';
            
            statsHtml = `${t('stat.dmg')}: ${dmgDisplay} | ${t('stat.mov')}: ${movDisplay}${rngDisplay}<br>
                        ${t('stat.init')}: ${initDisplay}`;
        } else {
            // Mode 2: Current values (green if positively modified, red if negatively)
            const currentDmg = Math.floor(this.damage * this.blessValue);
            // For mode 2, we want to know if the stat is different from base
            const baseMods = this.getStatModifiers(false);
            const effectiveDmgMod = currentDmg - base.damage;
            
            // Format with color: green for positive, red for negative
            const dmgDisplay = effectiveDmgMod !== 0 
                ? `<span style="color: ${effectiveDmgMod > 0 ? '#4CAF50' : '#ff4444'};">${currentDmg}</span>`
                : `${currentDmg}`;
                
            const movDisplay = mods.moveRange !== 0
                ? `<span style="color: ${mods.moveRange > 0 ? '#4CAF50' : '#ff4444'};">${this.moveRange}</span>`
                : `${this.moveRange}`;
                
            const initDisplay = mods.initiative !== 0
                ? `<span style="color: ${mods.initiative > 0 ? '#4CAF50' : '#ff4444'};">${this.initiative}</span>`
                : `${this.initiative}`;
                
            const rngDisplay = this.rangedRange > 0 
                ? ` | ${t('stat.rng')}: ${mods.rangedRange !== 0 
                    ? `<span style="color: ${mods.rangedRange > 0 ? '#4CAF50' : '#ff4444'};">${this.rangedRange}</span>`
                    : `${this.rangedRange}`}` 
                : '';
            
            statsHtml = `${t('stat.dmg')}: ${dmgDisplay} | ${t('stat.mov')}: ${movDisplay}${rngDisplay}<br>
                        ${t('stat.init')}: ${initDisplay}`;
        }

        return `${this.emoji} ${unitName}${bossDisplay}<br>
                <span style="color: ${hpColor};">${t('stat.hp')}: ${this.health}/${this.maxHealth}</span><br>
                ${statsHtml}${buffDisplay}${passiveDisplay}${specialDisplay}`;
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
            spriteX = gridX * this.scene.tileSize + (bossSize * this.scene.tileSize) / 2;
            spriteY = gridY * this.scene.tileSize + (bossSize * this.scene.tileSize) / 2;
        } else {
            spriteX = gridX * this.scene.tileSize + this.scene.tileSize / 2;
            spriteY = gridY * this.scene.tileSize + this.scene.tileSize / 2;
        }
        // For images: position bottom 5px above tile bottom (adjusted for boss size)
        const yBottom = (gridY + bossSize) * this.scene.tileSize - 5;

        // Check if unit has an image and if it's loaded
        const imageKey = template.image ? type.toLowerCase() + '_img' : null;
        const hasImage = imageKey && this.scene.textures.exists(imageKey);

        // Shadow ellipse at the unit's feet, depth 9 (below sprite at 10)
        const shadowSize = this.scene.tileSize * (bossSize > 1 ? bossSize * 0.55 : 0.5);
        unit.shadow = this.scene.add.ellipse(spriteX, yBottom, shadowSize, shadowSize * 0.28, 0x000000, 0.32);
        unit.shadow.setDepth(9);

        if (hasImage) {
            unit.sprite = this.scene.add.image(spriteX, yBottom, imageKey);
            // Scale image to fit within tile size (64px) while preserving aspect ratio
            const texture = this.scene.textures.get(imageKey);
            const srcWidth = texture.getSourceImage().width;
            const srcHeight = texture.getSourceImage().height;
            // Target: fit within 64px tile, but allow up to 1.3x (83px) for tall units
            // For 2x2 bosses, allow larger sprites
            const maxSize = bossSize > 1 ? this.scene.tileSize * bossSize * 1.2 : this.scene.tileSize * 1.3;
            const baseScale = Math.min(maxSize / srcWidth, maxSize / srcHeight);
            // Apply additional sprite scale from unit template (e.g., Goblin Stone Thrower is 30% smaller)
            const spriteScale = template.spriteScale || 1;
            unit.sprite.setScale(baseScale * spriteScale);
            unit.sprite.setOrigin(0.5, 1.0); // Bottom center so feet are on the tile
            
            // Flip enemy units to face right-to-left, players face left-to-right
            unit.sprite.setFlipX(unit.isPlayer);
            unit.sprite.setDepth(10); // Above obstacles (5)
        } else {
            // For 2x2 bosses, use larger emoji
            const fontSize = bossSize > 1 ? '48px' : '36px';
            unit.sprite = this.scene.add.text(
                spriteX, spriteY,
                unit.emoji,
                { fontSize: fontSize, align: 'center' }
            ).setOrigin(0.5);
            
            // Flip enemy units to face right-to-left, players face left-to-right
            unit.sprite.setFlipX(unit.isPlayer);
            unit.sprite.setDepth(10); // Above obstacles (5)
        }

        unit.healthBar = this.scene.add.graphics();
        unit.updateHealthBar();

        unit.sprite.setInteractive();

        // Show stats on hover for both PVE and PVP modes
        unit.sprite.on('pointerover', () => {
            if (this.scene.uiManager) {
                this.scene.uiManager.updateUnitInfo(unit);
            }
        });

        unit.sprite.on('pointerdown', () => {
            // If a spell is selected, cast it at this unit's position
            if (this.scene.spellSystem.activeSpell) {
                this.scene.spellSystem.executeSpellAt(unit.gridX, unit.gridY);
                return;
            }

            // If a unit ability is active (e.g., Sorcerer Fireball), execute it at this unit's position
            if (this.scene.activeUnitAbility) {
                this.scene.executeUnitAbilityAt(unit.gridX, unit.gridY);
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
            // Otherwise, only select if it's the current player unit's turn
            if (unit.isPlayer && currentUnit === unit) {
                this.scene.selectUnit(unit);
            }
        });

        this.units.push(unit);
        return unit;
    }

    getUnitAt(x, y) {
        return this.units.find(u => u.occupiesTile(x, y) && !u.isDead && u.health > 0);
    }

    // Check if a position is valid for placing a unit (considers 2x2)
    isValidPlacement(x, y, bossSize = 1) {
        for (let dy = 0; dy < bossSize; dy++) {
            for (let dx = 0; dx < bossSize; dx++) {
                const checkX = x + dx;
                const checkY = y + dy;
                // Check bounds
                if (checkX < 0 || checkX >= this.scene.gridSystem.width ||
                    checkY < 0 || checkY >= this.scene.gridSystem.height) {
                    return false;
                }
                // Check obstacles
                if (this.scene.gridSystem.isObstacle(checkX, checkY)) {
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

        const newSpriteX = newX * this.scene.tileSize + (bossSize * this.scene.tileSize) / 2;
        const newYBottom = (newY + bossSize) * this.scene.tileSize - 5;

        if (hasImage) {
            unit.sprite.setPosition(newSpriteX, newYBottom);
        } else {
            unit.sprite.setPosition(
                newSpriteX,
                newY * this.scene.tileSize + (bossSize * this.scene.tileSize) / 2
            );
        }
        if (unit.shadow) {
            unit.shadow.setPosition(newSpriteX, newYBottom);
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
        const wave = this.scene.battleNumber || 1;
        this.scene.addCombatLog(`══ Wave ${wave} · Round ${this.roundNumber} ══`, 'round');
        this.updateQueue();
        this.nextTurn();
    }

    updateQueue() {
        const aliveUnits = this.scene.unitManager.getAllAliveUnits();
        const sorted = aliveUnits.sort((a, b) => b.initiative - a.initiative);
        this.turnQueue = [];
        for (const unit of sorted) {
            this.turnQueue.push({ unit, isTemporalShift: false });
            if (unit.hasTemporalShift) {
                this.turnQueue.push({ unit, isTemporalShift: true });
            }
        }
    }

    nextTurn() {
        this.turnQueue = this.turnQueue.filter(entry => !entry.unit.isDead);

        if (this.turnQueue.length === 0) {
            this.startNewRound();
            return;
        }

        const entry = this.turnQueue.shift();
        this.currentUnit = entry.unit;
        this.currentUnitIsTemporalShift = entry.isTemporalShift;

        if (this.currentUnit.isDead) {
            this.nextTurn();
            return;
        }

        this.currentUnit.resetTurn();
        this.updateTurnDisplay();

        // Iron Colossus Stun: unit loses its turn (Juggernaut: immune)
        if (this.currentUnit.isStunned && !this.currentUnit.hasJuggernaut) {
            this.currentUnit.isStunned = false;
            this.scene.uiManager.showBuffText(this.currentUnit, 'STUNNED!', '#BBBBBB');
            this.scene.addCombatLog(`${this.currentUnit.name} is stunned and loses their turn!`, 'debuff');
            this.scene.time.delayedCall(400, () => this.nextTurn());
            return;
        }

        if (!this.currentUnit.isPlayer) {
            this.scene.time.delayedCall(500, () => this.executeAITurn());
        } else {
            this.scene.selectUnit(this.currentUnit);
            // Re-enable spellbook button for player's turn
            this.scene.spellSystem.resetSpellButton();
        }

        // Ensure ability button updates properly on turn start
        this.scene.uiManager.updateAbilityButton();
    }

    startNewRound() {
        this.roundNumber++;
        const wave = this.scene.battleNumber || 1;
        this.scene.addCombatLog(`══ Wave ${wave} · Round ${this.roundNumber} ══`, 'round');
        this.scene.regenerateMana();
        this.scene.spellsCastThisRound = 0;
        // Reset spell button at start of new round
        this.scene.spellSystem.resetSpellButton();

        // Apply The Silence aura immediately at round start so no unit can cast before its turn
        const silence = this.scene.unitManager.units.find(u => u.type === 'THE_SILENCE' && !u.isDead);
        if (silence) {
            this.scene.silenceActive = true;
        }

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

        // Handle special boss AI
        if (unit.type === 'ORC_SHAMAN_KING') {
            this.executeShamanKingTurn(playerUnits);
            return;
        }

        if (unit.type === 'OCTOTH_HROARATH') {
            this.executeOctothTurn(playerUnits);
            return;
        }

        if (unit.type === 'THE_SILENCE') {
            this.executeSilenceTurn(playerUnits);
            return;
        }

        if (unit.type === 'VOID_HERALD') {
            this.executeVoidHeraldTurn(playerUnits);
            return;
        }

        // Banshee Sovereign: apply Wailing Screech at the start of every turn,
        // then fall through to default move+attack AI
        if (unit.type === 'BANSHEE_SOVEREIGN') {
            this.executeBansheeWail(playerUnits);
        }

        // Dread Knight: falls through to default AI — cleave + bleed are handled inside performAttack

        // Default AI for all other units
        this.executeDefaultAITurn(playerUnits);
    }

    executeDefaultAITurn(playerUnits) {
        const unit = this.currentUnit;

        if (playerUnits.length === 0) return;

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

        // Move towards player - use A* pathfinding to find best path around obstacles
        const path = this.findPath(unit, nearest.gridX, nearest.gridY);

        if (path && path.length > 1) {
            // Path[0] is current position, path[1] is next step
            // Take up to moveRange steps
            const stepsToTake = Math.min(unit.moveRange, path.length - 1);

            for (let i = 1; i <= stepsToTake; i++) {
                const nextStep = path[i];
                this.scene.moveUnitAI(unit, nextStep.x, nextStep.y);
            }
        }

        // Mark unit as having moved after all movement is complete
        unit.hasMoved = true;

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

    executeOctothTurn(playerUnits) {
        const unit = this.currentUnit;
        const scene = this.scene;

        // 1. Try to pull a unit
        if (unit.canMove()) { // Use 'canMove' as a proxy for "hasn't done a major action"
            const pullableTargets = playerUnits.filter(p => {
                const dist = this.getDistanceToUnit(unit, p);
                return dist > 1 && dist <= 4;
            });

            if (pullableTargets.length > 0) {
                // Find nearest pullable target
                const targetToPull = pullableTargets.sort((a, b) => this.getDistanceToUnit(unit, a) - this.getDistanceToUnit(unit, b))[0];

                // Find an empty adjacent spot to pull the target to
                let pullToPos = null;
                const adjacentSpots = [];
                for (let y = unit.gridY - 1; y <= unit.gridY + unit.bossSize; y++) {
                    for (let x = unit.gridX - 1; x <= unit.gridX + unit.bossSize; x++) {
                        if (x < 0 || x >= this.scene.gridSystem.width || y < 0 || y >= this.scene.gridSystem.height) continue;
                        if (this.isValidMoveForUnit(targetToPull, x, y)) {
                            adjacentSpots.push({ x, y });
                        }
                    }
                }

                if (adjacentSpots.length > 0) {
                    // Find the adjacent spot closest to the target's original position
                    pullToPos = adjacentSpots.sort((a, b) =>
                        (Math.abs(a.x - targetToPull.gridX) + Math.abs(a.y - targetToPull.gridY)) -
                        (Math.abs(b.x - targetToPull.gridX) + Math.abs(b.y - targetToPull.gridY))
                    )[0];
                }

                if (pullToPos) {
                    unit.hasMoved = true; // The pull is the move action
                    scene.uiManager.showBuffText(unit, 'PULL!', '#9B59B6');

                    // Visual effect for pull
                    const tendril = scene.add.line(0, 0, unit.sprite.x, unit.sprite.y, targetToPull.sprite.x, targetToPull.sprite.y, 0x9B59B6, 0.8).setOrigin(0);
                    tendril.setLineWidth(4);
                    scene.tweens.add({ targets: tendril, alpha: 0, duration: 500, onComplete: () => tendril.destroy() });

                    // Move the unit
                    scene.unitManager.updateUnitPosition(targetToPull, pullToPos.x, pullToPos.y);

                    // Attack after pull
                    if (unit.canAttack()) {
                        scene.time.delayedCall(400, () => {
                            scene.performAttack(unit, targetToPull);
                        });
                    }

                    scene.time.delayedCall(1200, () => this.nextTurn());
                    return;
                }
            }
        }

        // 2. If no pull was made, execute default AI
        this.executeDefaultAITurn(playerUnits);
    }

    // The Silence AI: Pure melee fighter, applies silence aura at fight start
    executeSilenceTurn(playerUnits) {
        const unit = this.currentUnit;
        const scene = this.scene;

        // Apply silence on first turn (only once per battle)
        if (!unit.silenceApplied) {
            unit.silenceApplied = true;
            scene.silenceActive = true;
            scene.uiManager.showFloatingText('🔇 AURA OF SILENCE! Spells disabled!', 400, 200, '#9B59B6');
            scene.addCombatLog('The Silence emanates an aura that blocks all spellcasting!', 'spell');
        }

        // Find nearest player
        let nearest = null;
        let minDist = Infinity;
        for (const player of playerUnits) {
            const dist = this.getDistanceToUnit(unit, player);
            if (dist < minDist) {
                minDist = dist;
                nearest = player;
            }
        }

        // If adjacent, melee attack
        if (minDist === 1 && unit.canAttack()) {
            scene.performAttack(unit, nearest);
            scene.time.delayedCall(800, () => this.nextTurn());
            return;
        }

        // Move towards nearest player
        if (unit.canMove()) {
            const path = this.findPath(unit, nearest.gridX, nearest.gridY);
            if (path && path.length > 1) {
                // Move one step along path
                const nextStep = path[1];
                scene.moveUnitAI(unit, nextStep.x, nextStep.y);

                // Check if now adjacent and can attack
                const newDist = this.getDistanceToUnit(unit, nearest);
                if (newDist === 1 && unit.canAttack()) {
                    scene.time.delayedCall(400, () => {
                        scene.performAttack(unit, nearest);
                    });
                }
            }
            unit.hasMoved = true;
        }

        scene.time.delayedCall(1200, () => this.nextTurn());
    }

    // Void Herald AI: Mass slow at start, casts voidball each turn targeting grouped enemies
    executeBansheeWail(playerUnits) {
        const unit = this.currentUnit;
        const scene = this.scene;
        const WAIL_RANGE = 4;

        const affected = playerUnits.filter(p => {
            const dist = Math.max(Math.abs(p.gridX - unit.gridX), Math.abs(p.gridY - unit.gridY));
            return dist <= WAIL_RANGE;
        });

        if (affected.length > 0) {
            scene.uiManager.showFloatingText('👻 WAILING SCREECH!', 400, 200, '#8B8BCC');
            for (const p of affected) {
                p.isWailed = true;
                scene.uiManager.showBuffText(p, 'WAILED!', '#8B8BCC');
            }
            scene.addCombatLog(
                `Banshee Sovereign wails! ${affected.length} unit(s) silenced — next attack deals no damage.`,
                'debuff'
            );
        }
    }

    executeVoidHeraldTurn(playerUnits) {
        const unit = this.currentUnit;
        const scene = this.scene;

        // Apply mass slow on first turn (4 turn duration or until boss dies)
        if (!unit.voidSlowApplied) {
            unit.voidSlowApplied = true;
            scene.uiManager.showFloatingText('🌑 VOID SLOW! Movement reduced!', 400, 200, '#6B5B8B');

            for (const player of playerUnits) {
                // Berserker's Reckless passive: immune to movement reduction
                // Iron Will: immune to all movement changes
                if (player.type === 'BERSERKER' || player.hasIronWill) continue;
                // Reduce movement by 3, minimum 1
                const slowAmount = 3;
                player.moveRange = Math.max(1, player.moveRange - slowAmount);
                player.voidSlowRounds = 4; // Lasts 4 turns or until boss dies
                scene.uiManager.showBuffText(player, 'SLOWED!', '#6B5B8B');
            }
            scene.addCombatLog('Void Herald slows all enemies with void energy!', 'debuff');
        }

        // Find best target for voidball - prioritize grouped enemies
        let bestTarget = null;
        let maxHits = 0;
        const voidballRange = 6;

        for (const player of playerUnits) {
            const dist = this.getDistanceToUnit(unit, player);
            if (dist <= voidballRange) {
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

        // Cast voidball (38 damage fireball-like) if we have a target
        if (bestTarget && unit.canAttack()) {
            unit.hasAttacked = true;
            scene.uiManager.showBuffText(unit, 'VOIDBALL!', '#6B5B8B');

            // Visual effect - purple fireball
            const projectile = scene.add.text(
                unit.sprite.x, unit.sprite.y - 20,
                '🌑',
                { fontSize: '32px' }
            ).setOrigin(0.5);

            const angle = Phaser.Math.Angle.Between(
                unit.sprite.x, unit.sprite.y,
                bestTarget.sprite.x, bestTarget.sprite.y
            );
            projectile.setRotation(angle);

            scene.tweens.add({
                targets: projectile,
                x: bestTarget.sprite.x,
                y: bestTarget.sprite.y,
                duration: 300,
                ease: 'Power2',
                onComplete: () => {
                    projectile.destroy();

                    // Deal 38 damage in 3x3 AoE
                    const voidDamage = 38;
                    for (const player of playerUnits) {
                        const aoeDist = Math.abs(player.gridX - bestTarget.gridX) + Math.abs(player.gridY - bestTarget.gridY);
                        if (aoeDist <= 1) {
                            player.takeDamage(voidDamage, true, unit);
                            scene.uiManager.showDamageText(player, voidDamage);
                        }
                    }
                    scene.addCombatLog(`Void Herald casts Voidball for ${voidDamage} damage!`, 'spell');
                }
            });

            scene.time.delayedCall(1000, () => this.nextTurn());
            return;
        }

        // Move to get in range
        if (unit.canMove()) {
            // Find nearest player to move towards
            let nearest = null;
            let minDist = Infinity;
            for (const player of playerUnits) {
                const dist = this.getDistanceToUnit(unit, player);
                if (dist < minDist) {
                    minDist = dist;
                    nearest = player;
                }
            }

            const path = this.findPath(unit, nearest.gridX, nearest.gridY);
            if (path && path.length > 1) {
                const nextStep = path[1];
                scene.moveUnitAI(unit, nextStep.x, nextStep.y);
            }
            unit.hasMoved = true;
        }

        scene.time.delayedCall(1200, () => this.nextTurn());
    }

    // Calculate distance from a unit to another unit (accounting for 2x2 bosses)
    getDistanceToUnit(fromUnit, toUnit) {
        // Chebyshev distance: diagonals count as 1 (allows diagonal attacks)
        if (fromUnit.bossSize === 1 && toUnit.bossSize === 1) {
            return Math.max(Math.abs(toUnit.gridX - fromUnit.gridX), Math.abs(toUnit.gridY - fromUnit.gridY));
        }

        // For 2x2 units, find minimum Chebyshev distance between any occupied tiles
        const fromPositions = fromUnit.getOccupiedPositions();
        const toPositions = toUnit.getOccupiedPositions();

        let minDist = Infinity;
        for (const fromPos of fromPositions) {
            for (const toPos of toPositions) {
                const dist = Math.max(Math.abs(toPos.x - fromPos.x), Math.abs(toPos.y - fromPos.y));
                minDist = Math.min(minDist, dist);
            }
        }
        return minDist;
    }

    // Check if a move is valid for a unit (accounting for 2x2, towers, flying)
    isValidMoveForUnit(unit, x, y) {
        const bossSize = unit.bossSize || 1;
        const gs = this.scene.gridSystem;

        for (let dy = 0; dy < bossSize; dy++) {
            for (let dx = 0; dx < bossSize; dx++) {
                const checkX = x + dx;
                const checkY = y + dy;

                // Check bounds
                if (checkX < 0 || checkX >= gs.width || checkY < 0 || checkY >= gs.height) {
                    return false;
                }

                // Tower: only ranged units can enter
                if (gs.isTower(checkX, checkY)) {
                    if (!unit.rangedRange || unit.rangedRange <= 0) return false;
                } else if (gs.isObstacle(checkX, checkY)) {
                    // Flying units can pass through walls but NOT stop on them
                    // (handled in pathfinding — this function checks the destination)
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

    // A* Pathfinding implementation for AI
    findPath(unit, targetX, targetY) {
        const startX = unit.gridX;
        const startY = unit.gridY;
        const bossSize = unit.bossSize || 1;

        // Open set contains the nodes to be evaluated
        // Store as objects: {x, y, g, h, f, parent}
        const openSet = [{ x: startX, y: startY, g: 0, h: this.heuristic(startX, startY, targetX, targetY), f: 0 }];
        const closedSet = new Set();
        const cameFrom = new Map();

        openSet[0].f = openSet[0].g + openSet[0].h;

        while (openSet.length > 0) {
            // Get node with lowest f score
            openSet.sort((a, b) => a.f - b.f);
            const current = openSet.shift();

            // If we're adjacent to the target, we've found a path
            const dist = this.getDistanceToCoords(current.x, current.y, bossSize, targetX, targetY);
            if (dist <= 1) {
                return this.reconstructPath(cameFrom, current);
            }

            closedSet.add(`${current.x},${current.y}`);

            const neighbors = [
                { x: current.x + 1, y: current.y },
                { x: current.x - 1, y: current.y },
                { x: current.x, y: current.y + 1 },
                { x: current.x, y: current.y - 1 }
            ];

            for (const neighbor of neighbors) {
                if (closedSet.has(`${neighbor.x},${neighbor.y}`)) continue;

                // Flying units can traverse wall tiles (but not stop on them)
                if (!this.isValidMoveForUnit(unit, neighbor.x, neighbor.y)) {
                    if (unit.canFly && this.scene.gridSystem.isWall(neighbor.x, neighbor.y)) {
                        // Allow traversal — pathfinding will continue through the wall
                    } else {
                        continue;
                    }
                }

                const tentativeG = current.g + 1;
                let openNeighbor = openSet.find(n => n.x === neighbor.x && n.y === neighbor.y);

                if (!openNeighbor) {
                    openNeighbor = {
                        x: neighbor.x,
                        y: neighbor.y,
                        g: tentativeG,
                        h: this.heuristic(neighbor.x, neighbor.y, targetX, targetY),
                        f: 0
                    };
                    openNeighbor.f = openNeighbor.g + openNeighbor.h;
                    openSet.push(openNeighbor);
                    cameFrom.set(`${neighbor.x},${neighbor.y}`, current);
                } else if (tentativeG < openNeighbor.g) {
                    openNeighbor.g = tentativeG;
                    openNeighbor.f = openNeighbor.g + openNeighbor.h;
                    cameFrom.set(`${neighbor.x},${neighbor.y}`, current);
                }
            }
        }

        return null; // No path found
    }

    heuristic(x1, y1, x2, y2) {
        // Manhattan distance as heuristic
        return Math.abs(x1 - x2) + Math.abs(y1 - y2);
    }

    reconstructPath(cameFrom, current) {
        const path = [current];
        while (cameFrom.has(`${current.x},${current.y}`)) {
            current = cameFrom.get(`${current.x},${current.y}`);
            path.unshift(current);
        }
        return path;
    }

    getDistanceToCoords(fromX, fromY, bossSize, toX, toY) {
        let minDist = Infinity;
        for (let dy = 0; dy < bossSize; dy++) {
            for (let dx = 0; dx < bossSize; dx++) {
                const dist = Math.abs(toX - (fromX + dx)) + Math.abs(toY - (fromY + dy));
                minDist = Math.min(minDist, dist);
            }
        }
        return minDist;
    }

    // Orc Shaman King AI: Chain Lightning main skill, run away from melee, maintain distance
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

        // PRIORITY 1: If enemy within 2 tiles, RUN AWAY before casting
        if (minDist <= 2 && unit.canMove()) {
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
                // Prioritize escaping melee range
                let score = 0;
                if (distToNearest >= 3 && distToNearest <= unit.rangedRange) {
                    score = 200; // Ideal range - preferred
                } else if (distToNearest > unit.rangedRange) {
                    score = 150; // Too far but safe
                } else if (distToNearest > 2) {
                    score = 100; // Getting away from melee
                } else {
                    score = -100; // Still in danger zone
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

            // Move away from enemies
            if (bestX !== unit.gridX || bestY !== unit.gridY) {
                const dx = Math.sign(bestX - unit.gridX);
                const dy = Math.sign(bestY - unit.gridY);

                if (dx !== 0 && this.isValidMoveForUnit(unit, unit.gridX + dx, unit.gridY)) {
                    scene.moveUnitAI(unit, unit.gridX + dx, unit.gridY);
                } else if (dy !== 0 && this.isValidMoveForUnit(unit, unit.gridX, unit.gridY + dy)) {
                    scene.moveUnitAI(unit, unit.gridX, unit.gridY + dy);
                }
                unit.hasMoved = true;

                // Show escape text
                scene.uiManager.showBuffText(unit, 'RETREAT!', '#9B59B6');
            } else {
                unit.hasMoved = true;
            }

            // Re-check distance after moving
            const newDist = this.getDistanceToUnit(unit, nearest);

            // If still in melee range and can attack, use melee as last resort
            if (newDist <= 1 && unit.canAttack()) {
                scene.performAttack(unit, nearest);
                scene.time.delayedCall(800, () => this.nextTurn());
                return;
            }
        }

        // PRIORITY 2: Cast Chain Lightning as MAIN skill (if mana available)
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

            // Cast chain lightning even with 0 chains - it's his main skill
            if (bestTarget) {
                unit.hasAttacked = true;
                scene.uiManager.showBuffText(unit, 'CHAIN LIGHTNING!', '#9B59B6');
                scene.spendMana(manaCost);
                this.castChainLightning(unit, bestTarget);
                scene.time.delayedCall(1000, () => this.nextTurn());
                return;
            }
        }

        // PRIORITY 3: Cast Fireball as secondary option
        const fireballCost = Math.floor(SPELLS.fireball.manaCost * scene.manaCostMultiplier);
        if (scene.mana >= fireballCost && unit.canAttack()) {
            let bestTarget = null;
            let maxHits = 0;

            for (const player of playerUnits) {
                const dist = this.getDistanceToUnit(unit, player);
                if (dist <= unit.rangedRange) {
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

            if (bestTarget && maxHits >= 1) {
                unit.hasAttacked = true;
                scene.uiManager.showBuffText(unit, 'FIREBALL!', '#E74C3C');
                scene.spendMana(fireballCost);
                this.castFireball(unit, bestTarget);
                scene.time.delayedCall(1000, () => this.nextTurn());
                return;
            }
        }

        // PRIORITY 4: Ranged attack if available
        const newMinDist = this.getDistanceToUnit(unit, nearest);
        if (unit.rangedRange > 0 && newMinDist <= unit.rangedRange && newMinDist > 1 && unit.canAttack()) {
            scene.performRangedAttack(unit, nearest);
            scene.time.delayedCall(800, () => this.nextTurn());
            return;
        }

        // PRIORITY 5: Maintain optimal distance (3 to rangedRange tiles away)
        if (unit.canMove() && !unit.hasMoved) {
            let bestX = unit.gridX;
            let bestY = unit.gridY;
            let bestScore = -Infinity;

            const visited = new Set([`${unit.gridX},${unit.gridY}`]);
            const queue = [{ x: unit.gridX, y: unit.gridY, moves: 0 }];

            while (queue.length > 0) {
                const { x, y, moves } = queue.shift();

                const distToNearest = Math.abs(nearest.gridX - x) + Math.abs(nearest.gridY - y);
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

            if (bestX !== unit.gridX || bestY !== unit.gridY) {
                const dx = Math.sign(bestX - unit.gridX);
                const dy = Math.sign(bestY - unit.gridY);

                if (dx !== 0 && this.isValidMoveForUnit(unit, unit.gridX + dx, unit.gridY)) {
                    scene.moveUnitAI(unit, unit.gridX + dx, unit.gridY);
                } else if (dy !== 0 && this.isValidMoveForUnit(unit, unit.gridX, unit.gridY + dy)) {
                    scene.moveUnitAI(unit, unit.gridX, unit.gridY + dy);
                }
            }
            unit.hasMoved = true;
        }

        // Final attack check after moving
        const finalDist = this.getDistanceToUnit(unit, nearest);
        if (unit.canAttack() && finalDist <= unit.rangedRange && finalDist > 1) {
            scene.time.delayedCall(400, () => {
                scene.performRangedAttack(unit, nearest);
            });
        } else if (unit.canAttack() && finalDist === 1) {
            // Melee as last resort
            scene.time.delayedCall(400, () => {
                scene.performAttack(unit, nearest);
            });
        }

        scene.time.delayedCall(1200, () => this.nextTurn());
    }

    // Cast chain lightning from a boss unit
    castChainLightning(caster, target) {
        const scene = this.scene;
        const power = Math.floor(SPELLS.chain_lightning.power * scene.spellPowerMultiplier);
        const chains = SPELLS.chain_lightning.chains;

        // Face the target
        // Base images face LEFT by default
        // flipX = true means face RIGHT, flipX = false means face LEFT
        if (caster.sprite) {
            const shouldFaceRight = target.gridX > caster.gridX;
            caster.sprite.setFlipX(shouldFaceRight);
        }

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

        // Face the target
        // Base images face LEFT by default
        // flipX = true means face RIGHT, flipX = false means face LEFT
        if (caster.sprite) {
            const shouldFaceRight = target.gridX > caster.gridX;
            caster.sprite.setFlipX(shouldFaceRight);
        }

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
        // turnQueue entries are now {unit, isTemporalShift} objects
        const currentEntry = { unit: this.currentUnit, isTemporalShift: this.currentUnitIsTemporalShift || false };
        const displayQueue = [currentEntry, ...this.turnQueue.slice(0, 7)];

        let html = '';
        displayQueue.forEach((entry, index) => {
            if (!entry || !entry.unit || entry.unit.isDead) return;
            const isActive = index === 0;
            const activeClass = isActive ? 'active' : '';
            const temporalShiftClass = entry.isTemporalShift ? 'temporal-shift' : '';
            html += `
                <div class="initiative-unit ${activeClass} ${temporalShiftClass}">
                    <div class="unit-emoji">${entry.unit.emoji}</div>
                </div>
            `;
        });

        queueEl.innerHTML = html;
    }
}