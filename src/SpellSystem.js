// ============================================
// SPELL SYSTEM - Spell casting and effects
// ============================================

import { SPELLS, CONFIG } from './GameConfig.js';
import { t } from './i18n-helper.js';

export class SpellSystem {
    constructor(scene) {
        this.scene = scene;
        this.activeSpell = null;
        this.teleportUnit = null;
    }

    castSpell(spellId) {
        const spell = SPELLS[spellId];
        if (!spell) return;

        // Check if silence is active
        if (this.scene.silenceActive) {
            this.scene.uiManager.showFloatingText(
                t('combat.silenced'),
                400, 300, '#9B59B6'
            );
            return;
        }

        // Check spells per round limit
        if (this.scene.spellsCastThisRound >= this.scene.spellsPerRound) {
            this.scene.uiManager.showFloatingText(
                t('error.spells_per_round', this.scene.spellsPerRound),
                400, 300, '#ff4444'
            );
            return;
        }

        // Check mana (with cost multiplier)
        const actualCost = Math.floor(spell.manaCost * (this.scene.manaCostMultiplier || 1));
        if (this.scene.mana < actualCost) {
            this.scene.uiManager.showFloatingText(t('error.no_mana'), 400, 300, '#ff4444');
            return;
        }

        // Set active spell based on target type
        switch (spell.targetType) {
            case 'tile':
                this.activeSpell = spellId;
                document.body.style.cursor = 'crosshair';
                this.scene.closeSpellBook();
                this.scene.uiManager.showFloatingText(t('combat.select_target_area'), 400, 300, '#A68966');
                break;
            case 'enemy':
                if (spell.effect === 'aoeDamage' || spell.effect === 'iceStorm' || spell.effect === 'meteor') {
                    // AoE spells now target enemies
                    this.activeSpell = spellId;
                    document.body.style.cursor = 'crosshair';
                    this.scene.closeSpellBook();
                    this.scene.uiManager.showFloatingText(t('combat.select_target_enemy'), 400, 300, '#A68966');
                } else {
                    // Single target damage spells
                    this.activeSpell = spellId;
                    document.body.style.cursor = 'crosshair';
                    this.scene.closeSpellBook();
                    this.scene.uiManager.showFloatingText(t('combat.select_target_enemy'), 400, 300, '#A68966');
                }
                break;
            case 'ally':
                this.activeSpell = spellId;
                document.body.style.cursor = 'crosshair';
                this.scene.closeSpellBook();
                this.scene.uiManager.showFloatingText(t('combat.select_friendly_unit'), 400, 300, '#A68966');
                break;
            case 'ally_then_tile':
                // For teleport - first select unit
                this.activeSpell = spellId;
                document.body.style.cursor = 'crosshair';
                this.scene.closeSpellBook();
                this.scene.uiManager.showFloatingText(t('combat.select_unit_teleport'), 400, 300, '#A68966');
                break;
        }
    }

    executeSpellAt(gridX, gridY) {
        if (!this.activeSpell) return;
        
        // Prevent double execution from multiple event handlers
        if (this._executingSpell) return;
        this._executingSpell = true;

        const spell = SPELLS[this.activeSpell];
        const unit = this.scene.unitManager.getUnitAt(gridX, gridY);

        switch (spell.targetType) {
            case 'tile':
                this.executeTileSpell(spell, gridX, gridY);
                break;
            case 'enemy':
                // Check if this is an AoE spell - can be cast on any tile
                if (spell.effect === 'aoeDamage' || spell.effect === 'iceStorm' || spell.effect === 'meteor') {
                    this.executeTileSpell(spell, gridX, gridY);
                } else if (unit && !unit.isPlayer) {
                    // Single target spells need an enemy unit
                    this.executeUnitSpell(spell, unit);
                }
                break;
            case 'ally':
                if (unit && unit.isPlayer) {
                    this.executeUnitSpell(spell, unit);
                }
                break;
            case 'ally_then_tile':
                if (unit && unit.isPlayer && !this.teleportUnit) {
                    this.teleportUnit = unit;
                    this.scene.uiManager.showFloatingText(t('combat.select_destination'), 400, 300, '#A68966');
                    this._executingSpell = false;
                    return;
                } else if (this.teleportUnit && !unit) {
                    this.executeTeleport(this.teleportUnit, gridX, gridY);
                }
                break;
        }
        
        // Reset execution flag after a short delay
        this.scene.time.delayedCall(100, () => {
            this._executingSpell = false;
        });
    }

    getSpellDamage(basePower) {
        let multiplier = this.scene.spellPowerMultiplier || 1;

        // Check for Sorcerer passive: army-wide spell damage boost +50% per Sorcerer
        const playerUnits = this.scene.unitManager.getPlayerUnits();
        const sorcererCount = playerUnits.filter(u => u.type === 'SORCERER' && u.health > 0).length;
        if (sorcererCount > 0) {
            multiplier += sorcererCount * 0.5;
        }

        let damage = Math.floor(basePower * multiplier);

        // Dread Knight Aura of Dread: the currently acting player unit deals ×0.5 spell damage if within 2 tiles
        const currentUnit = this.scene.turnSystem ? this.scene.turnSystem.currentUnit : null;
        if (currentUnit && currentUnit.isPlayer && this.scene.getDreadKnightAuraMultiplier) {
            const auraMult = this.scene.getDreadKnightAuraMultiplier(currentUnit);
            if (auraMult < 1) {
                damage = Math.floor(damage * auraMult);
            }
        }

        return damage;
    }

    executeTileSpell(spell, centerX, centerY) {
        const actualCost = Math.floor(spell.manaCost * (this.scene.manaCostMultiplier || 1));
        this.scene.spendMana(actualCost);
        this.scene.addCombatLog(`Hero cast ${spell.name}!`, 'spell');
        this.scene.spellsCastThisRound++;

        // Face towards the target tile (only for unit abilities, not hero spells)
        // Hero spells should not rotate the active unit
        const castingUnit = this.scene.turnSystem?.currentUnit;
        const isUnitAbility = castingUnit && this.activeSpell && 
            (this.activeSpell.name === 'Fireball' || this.activeSpell.name === 'Fire Ball');
        
        if (isUnitAbility && castingUnit.sprite) {
            const casterX = castingUnit.gridX;
            const shouldFaceRight = centerX > casterX;
            castingUnit.sprite.setFlipX(shouldFaceRight);
        }

        switch (spell.effect) {
            case 'aoeDamage':
                // Hero spells (from spellbook) come from top of screen
                this.createHeroFireball(centerX, centerY, () => {
                    this.executeAoEDamage(spell, centerX, centerY, 1);
                });
                break;
            case 'meteor':
                this.executeAoEDamage(spell, centerX, centerY, 2);
                break;
            case 'iceStorm':
                this.executeIceStorm(spell, centerX, centerY);
                break;
            default:
                // Refund mana if spell effect not handled
                console.warn(`Unhandled spell effect in executeTileSpell: ${spell.effect}`);
                this.scene.mana += actualCost;
                this.scene.uiManager.updateManaDisplay();
                this.scene.uiManager.showFloatingText(t('error.spell_failed'), 400, 300, '#ff4444');
                break;
        }

        this.clearSpell();

        // Restore highlights if the current unit can still act
        const restoredUnit = this.scene.turnSystem?.currentUnit;
        if (restoredUnit && restoredUnit.isPlayer && (restoredUnit.canMove() || restoredUnit.canAttack())) {
            this.scene.gridSystem.highlightValidMoves(restoredUnit);
        } else {
            this.scene.gridSystem.clearHighlights();
        }
    }

    executeUnitSpell(spell, unit) {
        const actualCost = Math.floor(spell.manaCost * (this.scene.manaCostMultiplier || 1));
        this.scene.spendMana(actualCost);
        this.scene.spellsCastThisRound++;
        this.scene.addCombatLog(`Hero cast ${spell.name}!`, 'spell');

        // Note: Hero spells from spellbook should not cause unit rotation
        // Only unit abilities (like Sorcerer Fireball) should have rotation animations

        // If armyBuffs is enabled and this is a buff spell, apply to whole army
        const isBuffSpell = ['haste', 'shield', 'bless', 'regenerate', 'heal'].includes(spell.effect);
        if (this.scene.armyBuffs && isBuffSpell) {
            const playerUnits = this.scene.unitManager.getPlayerUnits().filter(u => u.health > 0);
            for (const targetUnit of playerUnits) {
                switch (spell.effect) {
                    case 'heal':
                        this.executeHeal(spell, targetUnit);
                        break;
                    case 'haste':
                        this.executeHaste(spell, targetUnit);
                        break;
                    case 'shield':
                        this.executeShield(spell, targetUnit);
                        break;
                    case 'bless':
                        this.executeBless(spell, targetUnit);
                        break;
                    case 'regenerate':
                        this.executeRegenerate(spell, targetUnit);
                        break;
                }
            }
        } else {
            // Single target
            let spellHandled = true;
            switch (spell.effect) {
                case 'singleDamage':
                    this.executeSingleDamage(spell, unit);
                    break;
                case 'heal':
                    this.executeHeal(spell, unit);
                    break;
                case 'haste':
                    this.executeHaste(spell, unit);
                    break;
                case 'shield':
                    this.executeShield(spell, unit);
                    break;
                case 'bless':
                    this.executeBless(spell, unit);
                    break;
                case 'regenerate':
                    this.executeRegenerate(spell, unit);
                    break;
                case 'chainLightning':
                    this.executeChainLightning(spell, unit);
                    break;
                default:
                    spellHandled = false;
                    console.warn(`Unhandled spell effect in executeUnitSpell: ${spell.effect}`);
                    this.scene.mana += actualCost;
                    this.scene.uiManager.updateManaDisplay();
                    this.scene.uiManager.showFloatingText(t('error.spell_failed'), 400, 300, '#ff4444');
                    break;
            }
        }

        this.clearSpell();

        // Restore highlights if the current unit can still act
        const currentUnit = this.scene.turnSystem?.currentUnit;
        if (currentUnit && currentUnit.isPlayer && (currentUnit.canMove() || currentUnit.canAttack())) {
            this.scene.gridSystem.highlightValidMoves(currentUnit);
        } else {
            this.scene.gridSystem.clearHighlights();
        }
    }

    executeAoEDamage(spell, centerX, centerY, radius) {
        const targets = [];

        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                const x = centerX + dx;
                const y = centerY + dy;
                const unit = this.scene.unitManager.getUnitAt(x, y);
                if (unit && !unit.isPlayer) {
                    targets.push(unit);
                }
            }
        }

        // Visual effect
        if (spell.effect === 'meteor') {
            this.createMeteorEffect(centerX, centerY);
        } else {
            this.createExplosionEffect(centerX, centerY, radius);
        }

        const damage = this.getSpellDamage(spell.power);
        for (const unit of targets) {
            this.scene.time.delayedCall(200, () => {
                const actualSpellDmg = unit.takeSpellDamage(damage);
                this.scene.uiManager.showDamageText(unit, actualSpellDmg);
                this.scene.addCombatLog(`${spell.name} hit ${unit.name} dealing ${actualSpellDmg} damage.`, 'damage');
                this.scene.checkVictoryCondition();
            });
        }
    }

    executeIceStorm(spell, centerX, centerY) {
        const targets = [];

        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const x = centerX + dx;
                const y = centerY + dy;
                const unit = this.scene.unitManager.getUnitAt(x, y);
                if (unit && !unit.isPlayer) {
                    targets.push(unit);
                }
            }
        }

        // Use enhanced hero ice storm animation
        this.createHeroIceStorm(centerX, centerY, () => {
            const damage = this.getSpellDamage(spell.power);
            for (const unit of targets) {
                const actualIceDmg = unit.takeSpellDamage(damage);
                unit.iceSlowRounds = 2;
                unit.moveRange = Math.max(1, unit.moveRange - 1);
                this.scene.uiManager.showDamageText(unit, actualIceDmg);
                this.scene.addCombatLog(`${spell.name} hit ${unit.name} dealing ${actualIceDmg} damage.`, 'damage');
                this.scene.uiManager.showBuffText(unit, 'SLOWED!', '#5B6B8B');
                this.scene.checkVictoryCondition();
            }
        });
    }

    executeSingleDamage(spell, unit) {
        // Use enhanced hero lightning animation
        this.createHeroLightningBolt(unit, () => {
            const damage = this.getSpellDamage(spell.power);
            const actualSingleDmg = unit.takeSpellDamage(damage);
            this.scene.uiManager.showDamageText(unit, actualSingleDmg);
            this.scene.addCombatLog(`${spell.name} hit ${unit.name} dealing ${actualSingleDmg} damage.`, 'damage');
            this.scene.checkVictoryCondition();
        });
    }

    executeHeal(spell, unit) {
        // Calculate heal amount with Cleric/Paladin passive bonus
        let healAmount = spell.power;
        const playerUnits = this.scene.unitManager.getPlayerUnits();
        const clericCount = playerUnits.filter(u => (u.type === 'CLERIC' || u.type === 'PALADIN') && u.health > 0).length;
        if (clericCount > 0) {
            healAmount = Math.floor(healAmount * (1 + clericCount * 0.5));
        }

        // Apply global healing multiplier from spell buffs
        const healingMult = this.scene.healingPowerMultiplier || 1;
        healAmount = Math.floor(healAmount * healingMult);

        unit.heal(healAmount);
        this.createHealEffect(unit);
        this.scene.uiManager.showHealText(unit, healAmount);
        this.scene.addCombatLog(`${unit.name} was healed for ${healAmount} HP.`, 'heal');
    }

    executeHaste(spell, unit) {
        // Only apply the movement bonus if haste is not already active (hasteRounds 0 = inactive).
        // Recasting on an already-hasted unit just refreshes the duration without stacking the bonus.
        if (unit.hasteRounds === 0) {
            unit.moveRange += spell.power;
        }
        // If permanentBuffs is enabled, duration is -1 (permanent), otherwise use spell duration
        unit.hasteRounds = this.scene.permanentBuffs ? -1 : spell.duration;
        this.scene.uiManager.showBuffText(unit, 'HASTE!', '#ffff00');
        this.scene.addCombatLog(`${unit.name} gained HASTE! (+${spell.power} Move).`, 'buff');
    }

    executeShield(spell, unit) {
        unit.shieldValue = spell.power;
        unit.shieldRounds = this.scene.permanentBuffs ? -1 : spell.duration;
        this.scene.uiManager.showBuffText(unit, 'SHIELD!', '#4A5E7E');
        this.scene.addCombatLog(`${unit.name} gained SHIELD! (-${Math.floor(spell.power * 100)}% damage taken).`, 'buff');
    }

    executeBless(spell, unit) {
        unit.blessValue = spell.power;
        unit.blessRounds = this.scene.permanentBuffs ? -1 : spell.duration;
        this.scene.uiManager.showBuffText(unit, 'BLESSED!', '#A68966');
        this.scene.addCombatLog(`${unit.name} gained BLESS! (+${Math.floor((spell.power - 1) * 100)}% DMG).`, 'buff');
    }

    executeRegenerate(spell, unit) {
        unit.regenerateAmount = spell.power;
        unit.regenerateRounds = this.scene.permanentBuffs ? -1 : spell.duration;
        this.scene.uiManager.showBuffText(unit, 'REGENERATE!', '#00ff00');
        this.scene.addCombatLog(`${unit.name} gained REGENERATE! (${spell.power} HP/turn).`, 'buff');
    }

    executeTeleport(unit, newX, newY) {
        const spell = SPELLS[this.activeSpell];
        const actualCost = Math.floor(spell.manaCost * (this.scene.manaCostMultiplier || 1));
        this.scene.spendMana(actualCost);
        this.scene.spellsCastThisRound++;

        this.createTeleportEffect(unit);
        this.scene.unitManager.updateUnitPosition(unit, newX, newY);
        this.scene.uiManager.showBuffText(unit, 'TELEPORT!', '#6B5B8B');
        this.scene.addCombatLog(`${unit.name} was teleported.`, 'spell');

        this.teleportUnit = null;
    }

    executeChainLightning(spell, initialTarget) {
        const targets = [initialTarget];
        const allEnemies = this.scene.unitManager.getEnemyUnits();

        // Find nearby enemies to chain to
        for (const enemy of allEnemies) {
            if (targets.length >= spell.chains + 1) break;
            if (targets.includes(enemy)) continue;

            for (const target of targets) {
                const dist = Math.abs(enemy.gridX - target.gridX) + Math.abs(enemy.gridY - target.gridY);
                if (dist <= 2) {
                    targets.push(enemy);
                    break;
                }
            }
        }

        // Use enhanced hero chain lightning animation
        this.createHeroChainLightning(targets, spell);
    }

    clearSpell() {
        this.activeSpell = null;
        this.teleportUnit = null;
        document.body.style.cursor = 'default';

        // Check if player can cast more spells this round and update button state
        this.resetSpellButton();
    }

    resetSpellButton() {
        // Enable/disable spellbook button based on spells cast this round
        const spellbookBtn = document.getElementById('spellbook-btn');
        if (spellbookBtn) {
            const canCast = this.scene.spellsCastThisRound < this.scene.spellsPerRound;
            spellbookBtn.disabled = !canCast;
            spellbookBtn.style.opacity = canCast ? '1' : '0.5';
            spellbookBtn.style.cursor = canCast ? 'pointer' : 'not-allowed';
        }
    }

    // Visual Effects
    createExplosionEffect(gridX, gridY, radius) {
        const tileSize = this.scene.tileSize;
        const x = gridX * tileSize + tileSize / 2;
        const y = gridY * tileSize + tileSize / 2;
        const scale = radius === 2 ? 5 : 3;

        // Core explosion - bright white/yellow center
        const core = this.scene.add.circle(x, y, 15, 0xffffaa);
        core.setDepth(16);
        this.scene.tweens.add({
            targets: core,
            scale: scale * 0.8,
            alpha: 0,
            duration: 300,
            onComplete: () => core.destroy()
        });

        // Main explosion - orange
        const explosion = this.scene.add.circle(x, y, 25, 0xff6600);
        explosion.setDepth(15);
        this.scene.tweens.add({
            targets: explosion,
            scale: scale,
            alpha: 0,
            duration: 500,
            onComplete: () => explosion.destroy()
        });

        // Outer fire ring - red
        const fireRing = this.scene.add.circle(x, y, 30, 0xff2200);
        fireRing.setDepth(14);
        fireRing.setAlpha(0.7);
        this.scene.tweens.add({
            targets: fireRing,
            scale: scale * 1.2,
            alpha: 0,
            duration: 600,
            onComplete: () => fireRing.destroy()
        });

        // Fire particles shooting outward
        const particleCount = radius === 2 ? 16 : 12;
        for (let i = 0; i < particleCount; i++) {
            const angle = (i / particleCount) * Math.PI * 2;
            const distance = 40 * (radius === 2 ? 1.5 : 1);
            
            // Randomize colors between yellow, orange, and red
            const colors = [0xffaa00, 0xff6600, 0xff3300, 0xff4400];
            const color = colors[Math.floor(Math.random() * colors.length)];
            
            const particle = this.scene.add.circle(x, y, 6 + Math.random() * 4, color);
            particle.setDepth(15);
            
            this.scene.tweens.add({
                targets: particle,
                x: x + Math.cos(angle) * distance,
                y: y + Math.sin(angle) * distance,
                scale: { from: 1, to: 0.3 },
                alpha: { from: 1, to: 0 },
                duration: 400 + Math.random() * 200,
                ease: 'Power2',
                onComplete: () => particle.destroy()
            });
        }

        // Smoke puffs rising up
        for (let i = 0; i < 5; i++) {
            const smoke = this.scene.add.circle(
                x + (Math.random() - 0.5) * 30, 
                y + (Math.random() - 0.5) * 10, 
                8 + Math.random() * 6, 
                0x444444
            );
            smoke.setDepth(14);
            smoke.setAlpha(0.5);
            
            this.scene.tweens.add({
                targets: smoke,
                y: y - 60 - Math.random() * 40,
                x: x + (Math.random() - 0.5) * 40,
                scale: { from: 0.5, to: 1.5 },
                alpha: { from: 0.5, to: 0 },
                duration: 800 + Math.random() * 400,
                delay: i * 100,
                onComplete: () => smoke.destroy()
            });
        }

        // Screen shake for impact
        this.scene.cameras.main.shake(100, 0.005 * (radius === 2 ? 2 : 1));
    }

    createMeteorEffect(gridX, gridY) {
        const tileSize = this.scene.tileSize;
        const x = gridX * tileSize + tileSize / 2;
        const y = gridY * tileSize + tileSize / 2;

        const meteor = this.scene.add.circle(x, y - 200, 30, 0xff3300);
        meteor.setDepth(15);
        this.scene.tweens.add({
            targets: meteor,
            y: y,
            duration: 600,
            ease: 'Power2',
            onComplete: () => {
                meteor.destroy();
                this.createExplosionEffect(gridX, gridY, 2);
            }
        });
    }

    createIceEffect(gridX, gridY) {
        const tileSize = this.scene.tileSize;
        const x = gridX * tileSize + tileSize / 2;
        const y = gridY * tileSize + tileSize / 2;

        for (let i = 0; i < 6; i++) {
            const crystal = this.scene.add.polygon(x, y, [0, -15, 10, 0, 0, 15, -10, 0], 0x87ceeb);
            crystal.setAlpha(0.7);
            crystal.setDepth(15);
            const angle = (i / 6) * Math.PI * 2;

            this.scene.tweens.add({
                targets: crystal,
                x: x + Math.cos(angle) * 40,
                y: y + Math.sin(angle) * 40,
                scale: 0,
                rotation: Math.PI,
                duration: 600,
                onComplete: () => crystal.destroy()
            });
        }
    }

    createLightningEffect(unit) {
        const bolt = this.scene.add.text(unit.sprite.x, unit.sprite.y - 100, '⚡', {
            fontSize: '60px',
            color: '#ffff00'
        }).setOrigin(0.5);
        bolt.setDepth(15);

        this.scene.tweens.add({
            targets: bolt,
            y: unit.sprite.y,
            alpha: 0,
            duration: 200,
            onComplete: () => bolt.destroy()
        });
    }

    createHealEffect(unit) {
        const heart = this.scene.add.text(unit.sprite.x, unit.sprite.y, '💚', {
            fontSize: '40px'
        }).setOrigin(0.5);
        heart.setDepth(15);

        this.scene.tweens.add({
            targets: heart,
            y: unit.sprite.y - 50,
            alpha: 0,
            scale: 1.5,
            duration: 800,
            onComplete: () => heart.destroy()
        });
    }

    createTeleportEffect(unit) {
        const portal = this.scene.add.circle(unit.sprite.x, unit.sprite.y, 30, 0x9932cc);
        portal.setAlpha(0.5);
        portal.setDepth(15);

        this.scene.tweens.add({
            targets: portal,
            scale: 2,
            alpha: 0,
            duration: 500,
            onComplete: () => portal.destroy()
        });
    }

    /**
     * Create a hero fireball that drops from the top of the screen
     * @param {number} targetGridX - Target grid X coordinate
     * @param {number} targetGridY - Target grid Y coordinate
     * @param {Function} onComplete - Callback when animation completes
     */
    createHeroFireball(targetGridX, targetGridY, onComplete) {
        const tileSize = this.scene.tileSize;
        const targetX = targetGridX * tileSize + tileSize / 2;
        const targetY = targetGridY * tileSize + tileSize / 2;
        
        // Start from top of screen, slightly offset for dramatic effect
        const startX = targetX + (Math.random() - 0.5) * 40;
        const startY = -50;
        
        // Create the falling fireball with trail effect
        const fireball = this.scene.add.circle(startX, startY, 15, 0xff4500);
        fireball.setDepth(20);
        
        // Inner bright core
        const core = this.scene.add.circle(startX, startY, 10, 0xffaa00);
        core.setDepth(21);
        
        // Trail particles
        const trail = [];
        
        // Animate falling
        this.scene.tweens.add({
            targets: fireball,
            x: targetX,
            y: targetY,
            duration: 500,
            ease: 'Power2',
            onUpdate: (tween, target) => {
                // Sync core position
                core.x = fireball.x;
                core.y = fireball.y;
                
                // Add trail particles
                if (Math.random() < 0.3) {
                    const trailParticle = this.scene.add.circle(fireball.x, fireball.y + 10, 6, 0xff6600);
                    trailParticle.setDepth(19);
                    trailParticle.setAlpha(0.7);
                    trail.push(trailParticle);
                    
                    this.scene.tweens.add({
                        targets: trailParticle,
                        alpha: 0,
                        scale: 0.5,
                        duration: 300,
                        onComplete: () => {
                            trailParticle.destroy();
                            const idx = trail.indexOf(trailParticle);
                            if (idx > -1) trail.splice(idx, 1);
                        }
                    });
                }
            },
            onComplete: () => {
                fireball.destroy();
                core.destroy();
                
                // Clean up any remaining trail particles
                trail.forEach(p => p.destroy());
                
                if (onComplete) onComplete();
            }
        });
    }

    /**
     * Create an enhanced lightning bolt from the sky for hero spells
     * @param {Unit} unit - Target unit to strike
     * @param {Function} onComplete - Callback when animation completes
     */
    createHeroLightningBolt(unit, onComplete) {
        const tileSize = this.scene.tileSize;
        const targetX = unit.sprite.x;
        const targetY = unit.sprite.y;
        const startY = -100;
        
        // Build up charge at target location
        const charge = this.scene.add.circle(targetX, targetY, 20, 0xffff00);
        charge.setDepth(20);
        charge.setAlpha(0);
        
        this.scene.tweens.add({
            targets: charge,
            alpha: { from: 0, to: 0.8 },
            scale: { from: 0.5, to: 1.5 },
            duration: 300,
            yoyo: true,
            onComplete: () => charge.destroy()
        });
        
        // Delay then strike
        this.scene.time.delayedCall(300, () => {
            // Main lightning bolt - thick white core
            const bolt = this.scene.add.rectangle(targetX, (startY + targetY) / 2, 8, targetY - startY, 0xffffff);
            bolt.setDepth(25);
            
            // Outer glow - blue/purple
            const glow = this.scene.add.rectangle(targetX, (startY + targetY) / 2, 16, targetY - startY, 0x6666ff);
            glow.setDepth(24);
            glow.setAlpha(0.7);
            
            // Electric branches
            const branches = [];
            for (let i = 0; i < 4; i++) {
                const side = i % 2 === 0 ? -1 : 1;
                const branchY = targetY - 50 - Math.random() * 100;
                const branch = this.scene.add.rectangle(
                    targetX + side * (10 + Math.random() * 20),
                    branchY,
                    3,
                    40 + Math.random() * 30,
                    0x8888ff
                );
                branch.setDepth(23);
                branch.setRotation(side * (0.3 + Math.random() * 0.3));
                branch.setAlpha(0);
                branches.push(branch);
                
                this.scene.tweens.add({
                    targets: branch,
                    alpha: { from: 0, to: 0.9 },
                    duration: 50,
                    yoyo: true,
                    delay: Math.random() * 100
                });
            }
            
            // Flash effect
            const flash = this.scene.add.rectangle(targetX, targetY, 100, 100, 0xffffff);
            flash.setDepth(30);
            flash.setAlpha(0.8);
            
            this.scene.tweens.add({
                targets: flash,
                alpha: 0,
                duration: 150,
                onComplete: () => flash.destroy()
            });
            
            // Fade out bolt
            this.scene.tweens.add({
                targets: [bolt, glow],
                alpha: 0,
                duration: 200,
                delay: 100,
                onComplete: () => {
                    bolt.destroy();
                    glow.destroy();
                    branches.forEach(b => b.destroy());
                    
                    // Impact sparks
                    for (let i = 0; i < 8; i++) {
                        const angle = (i / 8) * Math.PI * 2;
                        const spark = this.scene.add.circle(targetX, targetY, 3, 0xffff00);
                        spark.setDepth(22);
                        
                        this.scene.tweens.add({
                            targets: spark,
                            x: targetX + Math.cos(angle) * 30,
                            y: targetY + Math.sin(angle) * 30,
                            alpha: 0,
                            duration: 200,
                            onComplete: () => spark.destroy()
                        });
                    }
                    
                    if (onComplete) onComplete();
                }
            });
            
            // Screen shake
            this.scene.cameras.main.shake(150, 0.008);
        });
    }

    /**
     * Create an enhanced ice storm effect for hero spells
     * @param {number} centerX - Center grid X
     * @param {number} centerY - Center grid Y
     * @param {Function} onComplete - Callback when damage should be applied
     */
    createHeroIceStorm(centerX, centerY, onComplete) {
        const tileSize = this.scene.tileSize;
        const x = centerX * tileSize + tileSize / 2;
        const y = centerY * tileSize + tileSize / 2;
        
        // Frost cloud forming above
        const cloud = this.scene.add.circle(x, y - 80, 40, 0xaaddff);
        cloud.setDepth(15);
        cloud.setAlpha(0.3);
        
        this.scene.tweens.add({
            targets: cloud,
            y: y - 40,
            alpha: { from: 0.3, to: 0.6 },
            scale: { from: 1, to: 1.5 },
            duration: 400,
            onComplete: () => {
                // Ice shards falling
                const shards = [];
                for (let i = 0; i < 12; i++) {
                    const offsetX = (Math.random() - 0.5) * tileSize * 2;
                    const offsetY = (Math.random() - 0.5) * tileSize * 2;
                    const shardX = x + offsetX;
                    const shardY = y - 60 + offsetY * 0.3;
                    
                    const shard = this.scene.add.polygon(
                        shardX, shardY,
                        [0, -12, 6, 0, 0, 12, -6, 0],
                        0x87ceeb
                    );
                    shard.setDepth(18);
                    shards.push(shard);
                    
                    this.scene.tweens.add({
                        targets: shard,
                        y: y + offsetY,
                        rotation: Math.random() * Math.PI * 2,
                        duration: 300 + Math.random() * 200,
                        ease: 'Power2',
                        onComplete: () => {
                            // Shard impact
                            const impact = this.scene.add.circle(shard.x, shard.y, 8, 0xaaddff);
                            impact.setDepth(16);
                            impact.setAlpha(0.8);
                            
                            this.scene.tweens.add({
                                targets: impact,
                                scale: 2,
                                alpha: 0,
                                duration: 200,
                                onComplete: () => impact.destroy()
                            });
                            
                            shard.destroy();
                        }
                    });
                }
                
                // Frost ring expanding
                const frostRing = this.scene.add.circle(x, y, 20, 0xaaddff);
                frostRing.setDepth(14);
                frostRing.setStrokeStyle(3, 0x87ceeb);
                frostRing.setFillStyle(0xaaddff, 0.3);
                
                this.scene.tweens.add({
                    targets: frostRing,
                    scale: { from: 0.5, to: 2.5 },
                    alpha: { from: 1, to: 0 },
                    duration: 600,
                    onComplete: () => frostRing.destroy()
                });
                
                // Snow particles
                for (let i = 0; i < 20; i++) {
                    const snowX = x + (Math.random() - 0.5) * tileSize * 3;
                    const snowY = y - 40 + (Math.random() - 0.5) * tileSize;
                    const snow = this.scene.add.circle(snowX, snowY, 2 + Math.random() * 3, 0xffffff);
                    snow.setDepth(17);
                    snow.setAlpha(0.8);
                    
                    this.scene.tweens.add({
                        targets: snow,
                        y: y + 40,
                        x: snowX + (Math.random() - 0.5) * 20,
                        alpha: 0,
                        duration: 500 + Math.random() * 300,
                        onComplete: () => snow.destroy()
                    });
                }
                
                cloud.destroy();
                if (onComplete) onComplete();
            }
        });
    }

    /**
     * Create an enhanced chain lightning effect for hero spells
     * @param {Array} targets - Array of target units
     * @param {Object} spell - Spell data
     */
    createHeroChainLightning(targets, spell) {
        const damage = this.getSpellDamage(spell.power);
        
        // Strike first target from sky
        this.createHeroLightningBolt(targets[0], () => {
            const actualChainDmg = targets[0].takeSpellDamage(damage);
            this.scene.uiManager.showDamageText(targets[0], actualChainDmg);
            this.scene.addCombatLog(`Chain Lightning hit ${targets[0].name} dealing ${actualChainDmg} damage.`, 'damage');
            this.scene.checkVictoryCondition();
            
            // Chain to subsequent targets with arc animation
            for (let i = 1; i < targets.length; i++) {
                const prevTarget = targets[i - 1];
                const currentTarget = targets[i];
                
                this.scene.time.delayedCall(i * 300, () => {
                    // Create lightning arc between targets
                    this.createLightningArc(prevTarget, currentTarget, () => {
                        const actualChainDmg = currentTarget.takeSpellDamage(damage);
                        this.scene.uiManager.showDamageText(currentTarget, actualChainDmg);
                        this.scene.addCombatLog(`Chain Lightning hit ${currentTarget.name} dealing ${actualChainDmg} damage.`, 'damage');
                        this.scene.checkVictoryCondition();
                    });
                });
            }
        });
    }

    /**
     * Create a lightning arc between two units
     * @param {Unit} fromUnit - Source unit
     * @param {Unit} toUnit - Target unit
     * @param {Function} onComplete - Callback when arc completes
     */
    createLightningArc(fromUnit, toUnit, onComplete) {
        const startX = fromUnit.sprite.x;
        const startY = fromUnit.sprite.y;
        const endX = toUnit.sprite.x;
        const endY = toUnit.sprite.y;
        
        const distance = Phaser.Math.Distance.Between(startX, startY, endX, endY);
        const angle = Phaser.Math.Angle.Between(startX, startY, endX, endY);
        const midX = (startX + endX) / 2;
        const midY = (startY + endY) / 2;
        
        // Main arc - jagged lightning
        const arcSegments = [];
        const segments = 5;
        
        for (let i = 0; i < segments; i++) {
            const t1 = i / segments;
            const t2 = (i + 1) / segments;
            
            const segStartX = startX + (endX - startX) * t1;
            const segStartY = startY + (endY - startY) * t1;
            const segEndX = startX + (endX - startX) * t2;
            const segEndY = startY + (endY - startY) * t2;
            
            // Add some jitter to middle points
            const jitterX = i < segments - 1 ? (Math.random() - 0.5) * 20 : 0;
            const jitterY = i < segments - 1 ? (Math.random() - 0.5) * 20 : 0;
            
            const seg = this.scene.add.line(
                0, 0,
                segStartX, segStartY,
                segEndX + jitterX, segEndY + jitterY,
                0xffff00
            );
            seg.setDepth(25);
            seg.setLineWidth(4);
            arcSegments.push(seg);
        }
        
        // Glow effect underneath
        const glow = this.scene.add.line(0, 0, startX, startY, endX, endY, 0x6666ff);
        glow.setDepth(24);
        glow.setLineWidth(10);
        glow.setAlpha(0.5);
        
        // Flash at target
        const flash = this.scene.add.circle(endX, endY, 30, 0xffffff);
        flash.setDepth(26);
        flash.setAlpha(0.6);
        
        this.scene.tweens.add({
            targets: flash,
            alpha: 0,
            duration: 150,
            onComplete: () => flash.destroy()
        });
        
        // Fade out arc
        this.scene.tweens.add({
            targets: [...arcSegments, glow],
            alpha: 0,
            duration: 200,
            delay: 100,
            onComplete: () => {
                arcSegments.forEach(s => s.destroy());
                glow.destroy();
                
                // Sparks at target
                for (let i = 0; i < 6; i++) {
                    const sparkAngle = (i / 6) * Math.PI * 2;
                    const spark = this.scene.add.circle(endX, endY, 2, 0xffff00);
                    spark.setDepth(22);
                    
                    this.scene.tweens.add({
                        targets: spark,
                        x: endX + Math.cos(sparkAngle) * 20,
                        y: endY + Math.sin(sparkAngle) * 20,
                        alpha: 0,
                        duration: 150,
                        onComplete: () => spark.destroy()
                    });
                }
                
                if (onComplete) onComplete();
            }
        });
    }
}
