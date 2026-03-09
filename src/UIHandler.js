// ============================================
// UI HANDLER - HUD, Buttons, Text Overlays
// ============================================

// Note: UNIT_TYPES is available globally from units.js (loaded as script tag)

// ============================================
// UI MANAGER
// ============================================
export class UIManager {
    constructor(scene) {
        this.scene = scene;
    }

    // Update mana display in all locations
    updateManaDisplay() {
        const currentEl = document.getElementById('mana-current');
        const maxEl = document.getElementById('mana-max');
        const spellbookManaEl = document.getElementById('spellbook-mana');
        const spellbookMaxManaEl = document.getElementById('spellbook-max-mana');

        if (currentEl) currentEl.textContent = this.scene.mana;
        if (maxEl) maxEl.textContent = this.scene.maxMana;
        if (spellbookManaEl) spellbookManaEl.textContent = this.scene.mana;
        if (spellbookMaxManaEl) spellbookMaxManaEl.textContent = this.scene.maxMana;

        const display = document.getElementById('mana-display');
        if (display) {
            if (this.scene.mana < 20) {
                display.classList.add('low');
            } else {
                display.classList.remove('low');
            }
        }
    }

    // Update magic buffs panel
    updateMagicBuffsDisplay() {
        const buffsList = document.getElementById('magic-buffs-list');
        if (!buffsList) return;

        if (!this.scene.magicBuffs || this.scene.magicBuffs.length === 0) {
            buffsList.innerHTML = '<div style="color: #B8A896; font-style: italic; text-align: center;">No active buffs</div>';
            return;
        }

        let html = '';
        for (const buff of this.scene.magicBuffs) {
            let valueText = '';
            if (buff.type === 'manaRegen') valueText = `+${buff.value} regen`;
            else if (buff.type === 'manaCost') valueText = `-${Math.round(buff.value * 100)}% mana cost`;
            else if (buff.type === 'spellPower') valueText = `+${Math.round(buff.value * 100)}% damage`;
            else if (buff.type === 'spellsPerRound') valueText = `+${buff.value} spell/round`;
            else if (buff.type === 'maxMana') valueText = `+${buff.value} max mana`;
            else if (buff.type === 'permanentBuffs') valueText = `Permanent buffs`;
            else if (buff.type === 'armyBuffs') valueText = `Army-wide spells`;

            html += `
                <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px; padding: 3px 6px; background: rgba(166, 137, 102, 0.15); border-radius: 4px;">
                    <span style="font-size: 14px;">${buff.icon}</span>
                    <span style="color: #E3D5B8;">${valueText}</span>
                </div>
            `;
        }
        buffsList.innerHTML = html;
    }

    // Update unit info panel and ability button
    updateUnitInfo(unit) {
        const infoPanel = document.getElementById('unit-info');
        if (infoPanel) {
            infoPanel.innerHTML = unit.getDisplayStats();
        }
    }

    // Updates the unique ability button state, only call this on active unit selection/turn changes
    updateAbilityButton() {
        const abilityBtn = document.getElementById('unit-ability-btn');
        const abilityNameSpan = document.getElementById('unit-ability-name');

        if (abilityBtn && abilityNameSpan && this.scene.turnSystem) {
            const unit = this.scene.turnSystem.currentUnit;

            // Check if it's the player's turn and the current unit is selected
            const isTurn = unit &&
                unit.isPlayer &&
                !unit.hasMoved &&
                !unit.hasAttacked;

            let canUseAbility = false;

            if (unit) {
                if (unit.type === 'CLERIC') {
                    canUseAbility = isTurn && !unit.hasHealed;
                } else if (unit.type === 'OCTO') {
                    canUseAbility = isTurn && !unit.hasPulled;
                } else if (unit.type === 'SORCERER') {
                    canUseAbility = isTurn && !unit.hasCastFireball;
                }
            }

            abilityNameSpan.innerHTML = '<span style="color: #FFD700;">U</span>nique ability';

            if (canUseAbility) {
                abilityBtn.disabled = false;
                abilityBtn.style.filter = 'none';
                abilityBtn.style.opacity = '1';
                abilityBtn.style.background = '#2D241E';
                abilityBtn.style.borderColor = '#A68966';
                abilityBtn.style.color = '#E3D5B8';
                abilityBtn.title = '';
            } else {
                abilityBtn.disabled = true;
                abilityBtn.style.filter = 'grayscale(100%)';
                abilityBtn.style.opacity = '0.5';
                abilityBtn.style.background = '#3c3c3c';
                abilityBtn.style.borderColor = '#555';
                abilityBtn.style.color = '#888';

                if (unit && unit.isPlayer) {
                    if (unit.hasMoved && unit.hasAttacked) abilityBtn.title = 'Unit has already acted';
                    else if (unit.type === 'CLERIC' && unit.hasHealed) abilityBtn.title = 'Heal already used this turn';
                    else if (unit.type === 'OCTO' && unit.hasPulled) abilityBtn.title = 'Pull already used this turn';
                    else if (unit.type === 'SORCERER' && unit.hasCastFireball) abilityBtn.title = 'Fireball already used this turn';
                    else abilityBtn.title = 'Ability not available';
                } else {
                    abilityBtn.title = '';
                }
            }
        }
    }

    // Show floating text effect
    showFloatingText(text, x, y, color = '#ffffff') {
        const floatingText = this.scene.add.text(
            x, y,
            text,
            { 
                fontSize: '20px', 
                color: color, 
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 2,
                shadow: { offsetX: 1, offsetY: 1, color: '#000000', blur: 3, fill: true }
            }
        ).setOrigin(0.5);
        floatingText.setDepth(100); // On top of everything

        this.scene.tweens.add({
            targets: floatingText,
            y: y - 50,
            alpha: 0,
            duration: 1000,
            onComplete: () => floatingText.destroy()
        });
    }

    // Show damage number with color gradient based on damage amount
    showDamageText(unit, damage) {
        // Determine color based on damage thresholds
        let color;
        if (damage >= 200) {
            color = '#ff2222'; // Red for massive damage
        } else if (damage >= 100) {
            // Lerp from orange to red (100-199)
            const t = (damage - 100) / 100;
            const r = 255;
            const g = Math.floor(140 * (1 - t) + 34 * t);
            const b = Math.floor(0 * (1 - t) + 34 * t);
            color = `rgb(${r},${g},${b})`;
        } else if (damage >= 50) {
            // Lerp from yellow to orange (50-99)
            const t = (damage - 50) / 50;
            const r = 255;
            const g = Math.floor(220 * (1 - t) + 140 * t);
            const b = Math.floor(50 * (1 - t));
            color = `rgb(${r},${g},${b})`;
        } else {
            // Lerp from white to yellow (0-49)
            const t = Math.min(damage, 49) / 49;
            const r = 255;
            const g = Math.floor(255 * (1 - t) + 220 * t);
            const b = Math.floor(255 * (1 - t) + 50 * t);
            color = `rgb(${r},${g},${b})`;
        }

        const fontSize = Math.min(24 + Math.floor(damage / 25) * 2, 36);

        const text = this.scene.add.text(
            unit.sprite.x, unit.sprite.y - 40,
            `-${damage}`,
            {
                fontSize: `${fontSize}px`,
                color: color,
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 3,
                shadow: { offsetX: 1, offsetY: 1, color: '#000000', blur: 4, fill: true }
            }
        ).setOrigin(0.5);
        text.setDepth(100); // On top of everything

        this.scene.tweens.add({
            targets: text,
            y: text.y - 50,
            alpha: 0,
            duration: 1200,
            ease: 'Power2',
            onComplete: () => text.destroy()
        });
    }

    // Show heal number
    showHealText(unit, amount) {
        const text = this.scene.add.text(
            unit.sprite.x, unit.sprite.y - 40,
            `+${amount}`,
            { 
                fontSize: '24px', 
                color: '#00ff00', 
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 3,
                shadow: { offsetX: 1, offsetY: 1, color: '#000000', blur: 4, fill: true }
            }
        ).setOrigin(0.5);
        text.setDepth(100); // On top of everything

        this.scene.tweens.add({
            targets: text,
            y: text.y - 40,
            alpha: 0,
            duration: 800,
            onComplete: () => text.destroy()
        });
    }

    // Show buff text
    showBuffText(unit, message, color) {
        const text = this.scene.add.text(
            unit.sprite.x, unit.sprite.y - 60,
            message,
            { 
                fontSize: '20px', 
                color: color, 
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 3,
                shadow: { offsetX: 1, offsetY: 1, color: '#000000', blur: 4, fill: true }
            }
        ).setOrigin(0.5);
        text.setDepth(100); // On top of everything

        this.scene.tweens.add({
            targets: text,
            y: text.y - 40,
            alpha: 0,
            duration: 1000,
            onComplete: () => text.destroy()
        });
    }

    // Create reward card HTML element
    createRewardCard(category, id, innerHTML, effectData = null, rarity = 'common') {
        const card = document.createElement('div');
        card.className = rarity === 'legendary' ? 'reward-card legendary-card' : rarity === 'epic' ? 'reward-card specialist-card' : rarity === 'mythic' ? 'reward-card mythic-card' : 'reward-card';
        card.dataset.category = category;
        card.dataset.id = id;

        if (rarity === 'legendary') {
            // Legendary styling with animated glow - inline styles for base, animation from CSS
            card.style.cssText = `
                border: 2px solid #ff8c00;
                border-radius: 4px;
                padding: 15px;
                min-width: 150px;
                text-align: center;
                cursor: pointer;
                transition: all 0.15s;
                color: #E3D5B8;
                background: linear-gradient(135deg, #2D241E 0%, #3D2814 100%);
            `;
        } else if (rarity === 'epic') {
            // Epic styling with purple aura
            card.style.cssText = `
                border: 2px solid #8B5B9B;
                border-radius: 4px;
                padding: 15px;
                min-width: 150px;
                text-align: center;
                cursor: pointer;
                transition: all 0.15s;
                color: #E3D5B8;
                background: linear-gradient(135deg, #2D241E 0%, #302438 100%);
            `;
        } else if (rarity === 'mythic') {
            // Mythic styling with red aura
            card.style.cssText = `
                border: 2px solid #e50000;
                border-radius: 4px;
                padding: 15px;
                min-width: 150px;
                text-align: center;
                cursor: pointer;
                transition: all 0.15s;
                color: #E3D5B8;
                background: linear-gradient(135deg, #2D1A1A 0%, #3D0000 100%);
            `;
        } else {
            card.style.cssText = `
                background: #2D241E;
                border: 2px solid #A68966;
                border-radius: 4px;
                padding: 15px;
                min-width: 150px;
                text-align: center;
                cursor: pointer;
                transition: all 0.15s;
                color: #E3D5B8;
                box-shadow: 0 2px 8px rgba(0,0,0,0.4);
            `;
        }

        card.innerHTML = innerHTML;

        // Add hover effect via JS since inline styles don't support :hover
        card.onmouseenter = () => {
            if (rarity === 'legendary') {
                card.style.background = 'linear-gradient(135deg, #3D342E 0%, #4D3820 100%)';
            } else if (rarity === 'epic') {
                card.style.background = 'linear-gradient(135deg, #3D342E 0%, #4D3840 100%)';
            } else if (rarity === 'mythic') {
                card.style.background = 'linear-gradient(135deg, #3D2A2A 0%, #5D0000 100%)';
            } else {
                card.style.background = '#3D342E';
                card.style.borderColor = '#B69976';
                card.style.boxShadow = 'inset 0 2px 8px rgba(0,0,0,0.3)';
            }
        };
        card.onmouseleave = () => {
            if (rarity === 'legendary') {
                card.style.background = 'linear-gradient(135deg, #2D241E 0%, #3D2814 100%)';
            } else if (rarity === 'epic') {
                card.style.background = 'linear-gradient(135deg, #2D241E 0%, #302438 100%)';
            } else if (rarity === 'mythic') {
                card.style.background = 'linear-gradient(135deg, #2D1A1A 0%, #3D0000 100%)';
            } else {
                card.style.background = '#2D241E';
                card.style.borderColor = '#A68966';
                card.style.boxShadow = '0 2px 8px rgba(0,0,0,0.4)';
            }
        };

        card.onclick = () => this.scene.selectReward(category, id, card, effectData);

        return card;
    }
}
