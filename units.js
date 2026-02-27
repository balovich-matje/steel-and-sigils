// ============================================
// UNIT DEFINITIONS
// ============================================

const UNIT_TYPES = {
    // Player Units
    KNIGHT: {
        name: 'Knight',
        emoji: '⚔️',
        image: 'images/player/knight.png',
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
        image: 'images/player/archer.png',
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
        image: 'images/player/wizard.png',
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
    PALADIN: {
        name: 'Paladin',
        emoji: '🛡️',
        image: 'images/player/paladin.png',
        health: 150,
        maxHealth: 150,
        damage: 50,
        moveRange: 4,
        initiative: 9,
        isPlayer: true,
        cost: 800,
        passive: {
            name: 'Divine Protection',
            description: '-50% ranged damage taken, +50% healing received',
            effects: ['rangedDefense', 'healingBoost'],
            values: [0.5, 0.5]
        }
    },
    RANGER: {
        name: 'Ranger',
        emoji: '🎯',
        image: 'images/player/ranger.png',
        health: 70,
        maxHealth: 70,
        damage: 50,
        moveRange: 2,
        rangedRange: 10,
        initiative: 13,
        isPlayer: true,
        cost: 800,
        passive: {
            name: 'Eagle Eye',
            description: '10 tile range'
        }
    },
    BERSERKER: {
        name: 'Berserker',
        emoji: '🪓',
        image: 'images/player/berserker.png',
        health: 90,
        maxHealth: 90,
        damage: 50,
        moveRange: 4,
        initiative: 11,
        isPlayer: true,
        cost: 800,
        passives: [
            {
                name: 'Reckless',
                description: 'Damage taken is +50%'
            },
            {
                name: 'Bloodlust',
                description: 'Killing blow permanently increases damage by 15'
            }
        ]
    },
    CLERIC: {
        name: 'Cleric',
        emoji: '✝️',
        image: 'images/player/cleric.png',
        health: 80,
        maxHealth: 80,
        damage: 15,
        moveRange: 2,
        rangedRange: 4,
        initiative: 10,
        isPlayer: true,
        cost: 500,
        passive: {
            name: 'Blessed Touch',
            description: '+50% healing done, ranged attacks (4 tiles)'
        }
    },
    ROGUE: {
        name: 'Rogue',
        emoji: '🗡️',
        image: 'images/player/rogue.png',
        health: 55,
        maxHealth: 55,
        damage: 40,
        moveRange: 8,
        initiative: 16,
        isPlayer: true,
        cost: 500,
        passive: {
            name: 'Shadow Step',
            description: 'Returns to starting position after attack'
        }
    },
    SORCERER: {
        name: 'Sorcerer',
        emoji: '🔮',
        image: 'images/player/sorcerer.png',
        health: 50,
        maxHealth: 50,
        damage: 55,
        moveRange: 2,
        rangedRange: 4,
        initiative: 14,
        isPlayer: true,
        cost: 800,
        passive: {
            name: 'Arcane Mastery',
            description: '+50% spell damage'
        }
    },
    // Enemy unit types with point costs
    ORC_WARRIOR: {
        name: 'Orc Warrior',
        emoji: '👹',
        image: 'images/enemy/orc_warrior.png',
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
        image: 'images/enemy/orc_brute.png',
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
        image: 'images/enemy/orc_rogue.png',
        health: 60,
        maxHealth: 60,
        damage: 35,
        moveRange: 6,
        initiative: 16,
        isPlayer: false,
        cost: 500,
        special: 'hitAndRun'
    },
    GOBLIN_STONE_THROWER: {
        name: 'Goblin Stone Thrower',
        emoji: '🪨',
        image: 'images/enemy/goblin_stone_thrower.png',
        health: 40,
        maxHealth: 40,
        damage: 15,
        moveRange: 3,
        rangedRange: 4,
        initiative: 12,
        isPlayer: false,
        cost: 200
    }
};

// Export for module systems (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { UNIT_TYPES };
}
