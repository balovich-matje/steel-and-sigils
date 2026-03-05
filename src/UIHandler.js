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
            else if (buff.type === 'manaCost') valueText = `${Math.round((1 - buff.value) * 100)}% cost reduction`;
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
            } else {
                abilityBtn.disabled = true;
                abilityBtn.style.filter = 'grayscale(100%)';
                abilityBtn.style.opacity = '0.5';
                abilityBtn.style.background = '#3c3c3c';
                abilityBtn.style.borderColor = '#555';
                abilityBtn.style.color = '#888';
            }
        }
    }

    // Show floating text effect
    showFloatingText(text, x, y, color = '#ffffff') {
        const floatingText = this.scene.add.text(
            x, y,
            text,
            { fontSize: '20px', color: color, fontStyle: 'bold' }
        ).setOrigin(0.5);

        this.scene.tweens.add({
            targets: floatingText,
            y: y - 50,
            alpha: 0,
            duration: 1000,
            onComplete: () => floatingText.destroy()
        });
    }

    // Show damage number
    showDamageText(unit, damage) {
        const text = this.scene.add.text(
            unit.sprite.x, unit.sprite.y - 40,
            `-${damage}`,
            { fontSize: '24px', color: '#ff0000', fontStyle: 'bold' }
        ).setOrigin(0.5);

        this.scene.tweens.add({
            targets: text,
            y: text.y - 40,
            alpha: 0,
            duration: 800,
            onComplete: () => text.destroy()
        });
    }

    // Show heal number
    showHealText(unit, amount) {
        const text = this.scene.add.text(
            unit.sprite.x, unit.sprite.y - 40,
            `+${amount}`,
            { fontSize: '24px', color: '#00ff00', fontStyle: 'bold' }
        ).setOrigin(0.5);

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
            { fontSize: '18px', color: color, fontStyle: 'bold' }
        ).setOrigin(0.5);

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
