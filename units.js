// ============================================
// UNIT DEFINITIONS
// ============================================

const UNIT_TYPES = {
    // Player Units
    KNIGHT: {
        name: 'Knight',
        emoji: '⚔️',
        health: 100,
        maxHealth: 100,
        damage: 25,
        moveRange: 4,
        initiative: 12,
        isPlayer: true,
        cost: 200,
        passive: {
            name: 'Heavy Armor',
            description: '-50% damage from ranged attacks',
            effect: 'rangedDefense',
            value: 0.5
        }
    },
    ARCHER: {
        name: 'Archer',
        emoji: '🏹',
        health: 60,
        maxHealth: 60,
        damage: 35,
        moveRange: 2,
        rangedRange: 6,
        initiative: 15,
        isPlayer: true,
        cost: 300
    },
    WIZARD: {
        name: 'Wizard',
        emoji: '🧙',
        health: 40,
        maxHealth: 40,
        damage: 45,
        moveRange: 2,
        rangedRange: 4,
        initiative: 10,
        isPlayer: true,
        cost: 400,
        passive: {
            name: 'Arcane Channeling',
            description: 'Each Wizard increases mana regen by +1 per turn',
            effect: 'manaRegen',
            value: 1
        }
    },
    // Additional recruitable units
    PALADIN: {
        name: 'Paladin',
        emoji: '🛡️',
        health: 150,
        maxHealth: 150,
        damage: 20,
        moveRange: 2,
        initiative: 9,
        isPlayer: true
    },
    RANGER: {
        name: 'Ranger',
        emoji: '🎯',
        health: 70,
        maxHealth: 70,
        damage: 40,
        moveRange: 3,
        rangedRange: 5,
        initiative: 13,
        isPlayer: true
    },
    BERSERKER: {
        name: 'Berserker',
        emoji: '🪓',
        health: 90,
        maxHealth: 90,
        damage: 50,
        moveRange: 3,
        initiative: 11,
        isPlayer: true
    },
    CLERIC: {
        name: 'Cleric',
        emoji: '✝️',
        health: 80,
        maxHealth: 80,
        damage: 15,
        moveRange: 2,
        initiative: 10,
        isPlayer: true
    },
    ROGUE: {
        name: 'Rogue',
        emoji: '🗡️',
        health: 55,
        maxHealth: 55,
        damage: 40,
        moveRange: 4,
        initiative: 16,
        isPlayer: true
    },
    SORCERER: {
        name: 'Sorcerer',
        emoji: '🔮',
        health: 50,
        maxHealth: 50,
        damage: 55,
        moveRange: 2,
        rangedRange: 4,
        initiative: 14,
        isPlayer: true
    },
    // Enemy unit types with point costs
    ORC_WARRIOR: {
        name: 'Orc Warrior',
        emoji: '👹',
        health: 50,
        maxHealth: 50,
        damage: 25,
        moveRange: 4,
        initiative: 10,
        isPlayer: false,
        cost: 250
    },
    ORC_BRUTE: {
        name: 'Orc Brute',
        emoji: '🐗',
        health: 200,
        maxHealth: 200,
        damage: 50,
        moveRange: 2,
        initiative: 6,
        isPlayer: false,
        cost: 500
    },
    ORC_ROGUE: {
        name: 'Orc Rogue',
        emoji: '🥷',
        health: 60,
        maxHealth: 60,
        damage: 35,
        moveRange: 6,
        initiative: 16,
        isPlayer: false,
        cost: 500,
        special: 'hitAndRun'
    }
};

// Export for module systems (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { UNIT_TYPES };
}
