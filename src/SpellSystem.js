// ============================================
// SPELL SYSTEM - Spell casting and effects
// ============================================

import { SPELLS, CONFIG } from './GameConfig.js';
export class SpellSystem {
    constructor(scene) {
        this.scene = scene;
        this.activeSpell = null;
        this.teleportUnit = null;
    }

    castSpell(spellId) {
        const spell = SPELLS[spellId];
        if (!spell) return;

        // Check spells per round limit
        if (this.scene.spellsCastThisRound >= this.scene.spellsPerRound) {
            this.scene.uiManager.showFloatingText(
                `Can only cast ${this.scene.spellsPerRound} spell(s) per round!`, 
                400, 300, '#ff4444'
            );
            return;
        }

        // Check mana (with cost multiplier)
        const actualCost = Math.floor(spell.manaCost * (this.scene.manaCostMultiplier || 1));
        if (this.scene.mana < actualCost) {
            this.scene.uiManager.showFloatingText('Not enough mana!', 400, 300, '#ff4444');
            return;
        }

        // Set active spell based on target type
        switch (spell.targetType) {
            case 'tile':
                this.activeSpell = spellId;
                document.body.style.cursor = 'crosshair';
                this.scene.closeSpellBook();
                this.scene.uiManager.showFloatingText('Select target area', 400, 300, '#A68966');
                break;
            case 'enemy':
                if (spell.effect === 'aoeDamage' || spell.effect === 'iceStorm' || spell.effect === 'meteor') {
                    // AoE spells now target enemies
                    this.activeSpell = spellId;
                    document.body.style.cursor = 'crosshair';
                    this.scene.closeSpellBook();
                    this.scene.uiManager.showFloatingText('Select an enemy to target', 400, 300, '#A68966');
                } else {
                    // Single target damage spells
                    this.activeSpell = spellId;
                    document.body.style.cursor = 'crosshair';
                    this.scene.closeSpellBook();
                    this.scene.uiManager.showFloatingText('Select target enemy', 400, 300, '#A68966');
                }
                break;
            case 'ally':
                this.activeSpell = spellId;
                document.body.style.cursor = 'crosshair';
                this.scene.closeSpellBook();
                this.scene.uiManager.showFloatingText('Select friendly unit', 400, 300, '#A68966');
                break;
            case 'ally_then_tile':
                // For teleport - first select unit
                this.activeSpell = spellId;
                document.body.style.cursor = 'crosshair';
                this.scene.closeSpellBook();
                this.scene.uiManager.showFloatingText('Select a unit to teleport', 400, 300, '#A68966');
                break;
        }
    }

    executeSpellAt(gridX, gridY) {
        if (!this.activeSpell) return;
        
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
                    this.scene.uiManager.showFloatingText('Now select destination', 400, 300, '#A68966');
                    return;
                } else if (this.teleportUnit && !unit) {
                    this.executeTeleport(this.teleportUnit, gridX, gridY);
                }
                break;
        }
    }

    getSpellDamage(basePower) {
        let multiplier = this.scene.spellPowerMultiplier || 1;
        
        // Check for Sorcerer passive
        const playerUnits = this.scene.unitManager.getPlayerUnits();
        const sorcererCount = playerUnits.filter(u => u.type === 'SORCERER' && u.health > 0).length;
        if (sorcererCount > 0) {
            multiplier += sorcererCount * 0.5;
        }
        
        return Math.floor(basePower * multiplier);
    }

    executeTileSpell(spell, centerX, centerY) {
        const actualCost = Math.floor(spell.manaCost * (this.scene.manaCostMultiplier || 1));
        this.scene.spendMana(actualCost);
        this.scene.spellsCastThisRound++;

        switch (spell.effect) {
            case 'aoeDamage':
                this.executeAoEDamage(spell, centerX, centerY, 1);
                break;
            case 'meteor':
                this.executeAoEDamage(spell, centerX, centerY, 2);
                break;
            case 'iceStorm':
                this.executeIceStorm(spell, centerX, centerY);
                break;
        }

        this.clearSpell();
    }

    executeUnitSpell(spell, unit) {
        const actualCost = Math.floor(spell.manaCost * (this.scene.manaCostMultiplier || 1));
        this.scene.spendMana(actualCost);
        this.scene.spellsCastThisRound++;

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
            }
        }

        this.clearSpell();
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
                unit.takeDamage(damage);
                this.scene.uiManager.showDamageText(unit, damage);
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

        this.createIceEffect(centerX, centerY);

        const damage = this.getSpellDamage(spell.power);
        for (const unit of targets) {
            this.scene.time.delayedCall(200, () => {
                unit.takeDamage(damage);
                unit.iceSlowRounds = 2;
                unit.moveRange = Math.max(1, unit.moveRange - 1);
                this.scene.uiManager.showDamageText(unit, damage);
                this.scene.uiManager.showBuffText(unit, 'SLOWED!', '#5B6B8B');
                this.scene.checkVictoryCondition();
            });
        }
    }

    executeSingleDamage(spell, unit) {
        this.createLightningEffect(unit);
        
        const damage = this.getSpellDamage(spell.power);
        this.scene.time.delayedCall(200, () => {
            unit.takeDamage(damage);
            this.scene.uiManager.showDamageText(unit, damage);
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
        
        unit.heal(healAmount);
        this.createHealEffect(unit);
        this.scene.uiManager.showHealText(unit, healAmount);
    }

    executeHaste(spell, unit) {
        unit.moveRange += spell.power;
        // If permanentBuffs is enabled, duration is -1 (permanent), otherwise use spell duration
        unit.hasteRounds = this.scene.permanentBuffs ? -1 : spell.duration;
        this.scene.uiManager.showBuffText(unit, 'HASTE!', '#ffff00');
    }

    executeShield(spell, unit) {
        unit.shieldValue = spell.power;
        unit.shieldRounds = this.scene.permanentBuffs ? -1 : spell.duration;
        this.scene.uiManager.showBuffText(unit, 'SHIELD!', '#4A5E7E');
    }

    executeBless(spell, unit) {
        unit.blessValue = spell.power;
        unit.blessRounds = this.scene.permanentBuffs ? -1 : spell.duration;
        this.scene.uiManager.showBuffText(unit, 'BLESSED!', '#A68966');
    }

    executeRegenerate(spell, unit) {
        unit.regenerateAmount = spell.power;
        unit.regenerateRounds = this.scene.permanentBuffs ? -1 : spell.duration;
        this.scene.uiManager.showBuffText(unit, 'REGENERATE!', '#00ff00');
    }

    executeTeleport(unit, newX, newY) {
        const spell = SPELLS[this.activeSpell];
        const actualCost = Math.floor(spell.manaCost * (this.scene.manaCostMultiplier || 1));
        this.scene.spendMana(actualCost);
        this.scene.spellsCastThisRound++;
        
        this.createTeleportEffect(unit);
        this.scene.unitManager.updateUnitPosition(unit, newX, newY);
        this.scene.uiManager.showBuffText(unit, 'TELEPORT!', '#6B5B8B');
        
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

        const damage = this.getSpellDamage(spell.power);
        targets.forEach((unit, index) => {
            this.scene.time.delayedCall(index * 300, () => {
                this.createLightningEffect(unit);
                unit.takeDamage(damage);
                this.scene.uiManager.showDamageText(unit, damage);
                this.scene.checkVictoryCondition();
            });
        });
    }

    clearSpell() {
        this.activeSpell = null;
        this.teleportUnit = null;
        document.body.style.cursor = 'default';
        
        // Disable spellbook button after casting (until next turn)
        const spellbookBtn = document.getElementById('spellbook-btn');
        if (spellbookBtn) {
            spellbookBtn.disabled = true;
            spellbookBtn.style.opacity = '0.5';
            spellbookBtn.style.cursor = 'not-allowed';
        }
    }
    
    resetSpellButton() {
        // Re-enable spellbook button at start of new turn
        const spellbookBtn = document.getElementById('spellbook-btn');
        if (spellbookBtn) {
            spellbookBtn.disabled = false;
            spellbookBtn.style.opacity = '1';
            spellbookBtn.style.cursor = 'pointer';
        }
    }

    // Visual Effects
    createExplosionEffect(gridX, gridY, radius) {
        const x = gridX * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
        const y = gridY * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
        const scale = radius === 2 ? 5 : 3;

        const explosion = this.scene.add.circle(x, y, 20, 0xff6600);
        
        this.scene.tweens.add({
            targets: explosion,
            scale: scale,
            alpha: 0,
            duration: 500,
            onComplete: () => explosion.destroy()
        });

        for (let i = 0; i < 8; i++) {
            const particle = this.scene.add.circle(x, y, 5, 0xffaa00);
            const angle = (i / 8) * Math.PI * 2;
            this.scene.tweens.add({
                targets: particle,
                x: x + Math.cos(angle) * 50 * (radius === 2 ? 1.5 : 1),
                y: y + Math.sin(angle) * 50 * (radius === 2 ? 1.5 : 1),
                alpha: 0,
                duration: 400,
                onComplete: () => particle.destroy()
            });
        }
    }

    createMeteorEffect(gridX, gridY) {
        const x = gridX * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
        const y = gridY * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;

        const meteor = this.scene.add.circle(x, y - 200, 30, 0xff3300);
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
        const x = gridX * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
        const y = gridY * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;

        for (let i = 0; i < 6; i++) {
            const crystal = this.scene.add.polygon(x, y, [0, -15, 10, 0, 0, 15, -10, 0], 0x87ceeb);
            crystal.setAlpha(0.7);
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

        this.scene.tweens.add({
            targets: portal,
            scale: 2,
            alpha: 0,
            duration: 500,
            onComplete: () => portal.destroy()
        });
    }
}
