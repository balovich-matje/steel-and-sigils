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
        rarity: 'common',
        cost: 200,
        passives: [
            {
                name: 'Heavy Armor',
                description: '-50% damage from ranged attacks',
                effect: 'rangedDefense',
                value: 0.5
            }
        ]
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
        rarity: 'common',
        cost: 250
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
        rarity: 'uncommon',
        cost: 400,
        passives: [
            {
                name: 'Arcane Channeling',
                description: 'Each Wizard increases mana regen by +2 per turn',
                effect: 'manaRegen',
                value: 2
            }
        ]
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
        rarity: 'rare',
        cost: 750,
        passives: [
            {
                name: 'Divine Protection',
                description: '-50% ranged damage taken, +50% healing received',
                effects: ['rangedDefense', 'healingBoost'],
                values: [0.5, 0.5]
            }
        ]
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
        rarity: 'rare',
        cost: 700,
        passives: [
            {
                name: 'Eagle Eye',
                description: '10 tile range'
            }
        ]
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
        rarity: 'rare',
        cost: 650,
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
        rarity: 'uncommon',
        cost: 400,
        passives: [
            {
                name: 'Blessed Touch',
                description: 'Can cast Heal once per turn. Army-wide +50% healing.'
            }
        ]
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
        rarity: 'uncommon',
        cost: 450,
        passives: [
            {
                name: 'Shadow Step',
                description: 'Returns to starting position after attack'
            }
        ]
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
        rarity: 'rare',
        cost: 750,
        passives: [
            {
                name: 'Arcane Mastery',
                description: '+50% spell damage'
            }
        ]
    },
    // Enemy unit types with point costs
    ORC_WARRIOR: {
        name: 'Orc Warrior',
        emoji: '👹',
        image: 'images/enemy/greenskin/orc_warrior.png',
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
        image: 'images/enemy/greenskin/orc_brute.png',
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
        image: 'images/enemy/greenskin/orc_rogue.png',
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
        image: 'images/enemy/greenskin/goblin_stone_thrower.png',
        health: 40,
        maxHealth: 40,
        damage: 15,
        moveRange: 6,
        rangedRange: 4,
        initiative: 12,
        isPlayer: false,
        cost: 200,
        spriteScale: 0.7
    },
    // Boss Units
    OGRE_CHIEFTAIN: {
        name: 'Ogre Chieftain',
        emoji: '👑',
        image: 'images/enemy/greenskin/ogre_chieftain.png',
        health: 500,
        maxHealth: 500,
        damage: 80,
        moveRange: 3,
        initiative: 8,
        isPlayer: false,
        cost: 1500,
        isBoss: true,
        bossSize: 2, // 2x2 cells
        passives: [
            {
                name: 'Brutal Regeneration',
                description: 'Regenerates 10% max HP per turn. Attacks slow enemies by 0.5 MOV for 2 turns.',
                effect: 'regenerationAndSlow',
                value: 0.1
            }
        ]
    },
    ORC_SHAMAN_KING: {
        name: 'Orc Shaman King',
        emoji: '🔮',
        image: 'images/enemy/greenskin/orc_shaman_king.png',
        health: 350,
        maxHealth: 350,
        damage: 40,
        moveRange: 4,
        rangedRange: 6,
        initiative: 14,
        isPlayer: false,
        cost: 1200,
        isBoss: true,
        bossSize: 2, // 2x2 cells
        passives: [
            {
                name: 'Arcane Mastery',
                description: 'Casts Chain Lightning and Fireball spells. Keeps distance from enemies.',
                effect: 'spellcaster',
                spells: ['chain_lightning', 'fireball']
            }
        ]
    },
    LOOT_GOBLIN: {
        name: 'Loot Goblin',
        emoji: '💰',
        image: 'images/enemy/greenskin/loot_goblin.png',
        health: 150,
        maxHealth: 150,
        damage: 50,
        moveRange: 8,
        rangedRange: 4,
        initiative: 18,
        isPlayer: false,
        cost: 800,
        isBoss: true,
        bossSize: 1, // 1x1 cell
        isRare: true, // Reduced spawn chance
        passives: [
            {
                name: 'Hit and Run',
                description: 'Returns to starting position after attacking. Drops legendary loot on death.',
                effect: 'hitAndRun'
            }
        ]
    },
    SUMMONER_LICH: {
        name: 'Summoner Lich',
        emoji: '💀👑',
        image: 'images/enemy/dungeon/summoner_lich.png',
        health: 300, maxHealth: 300,
        damage: 10, moveRange: 1, rangedRange: 6, initiative: 7,
        isPlayer: false, cost: 2000,
        isBoss: true, bossSize: 2,
        passives: [{ name: 'Summon Undead', description: 'Summons 1 undead ally per turn (2 on first turn).' }]
    },
    BANSHEE_SOVEREIGN: {
        name: 'Banshee Sovereign',
        emoji: '👻',
        image: 'images/enemy/dungeon/banshee_sovereign.png',
        health: 450, maxHealth: 450,
        damage: 60, moveRange: 4, initiative: 13,
        isPlayer: false, cost: 2000,
        isBoss: true, bossSize: 2,
        canFly: true,
        passives: [
            { name: 'Ethereal', description: 'Takes 75% less damage from physical attacks.' },
            { name: 'Arcane Weakness', description: 'Takes 50% more damage from ranged attacks and spells.' },
            { name: "Wailing Screech", description: 'At the start of her turn, silences all player units within 4 tiles — their next attack deals no damage.' }
        ]
    },
    DREAD_KNIGHT: {
        name: 'Dread Knight',
        emoji: '🗡️',
        image: 'images/enemy/dungeon/dread_knight.png',
        health: 400, maxHealth: 400,
        damage: 75, moveRange: 3, initiative: 7,
        isPlayer: false, cost: 2000,
        isBoss: true, bossSize: 2,
        passives: [
            { name: 'Aura of Dread', description: 'All player units within 2 tiles of the Dread Knight deal ×0.5 damage (melee, ranged and spells).' },
            { name: 'Cleave', description: 'Each attack also strikes up to 2 units adjacent to the main target.' },
            { name: 'Bleed', description: 'Every hit inflicts Bleed — 33% of attack damage per turn for 3 turns.' }
        ]
    },
    IRON_COLOSSUS: {
        name: 'Iron Colossus',
        emoji: '🤖',
        image: 'images/enemy/dungeon/iron_colossus.png',
        health: 500, maxHealth: 500,
        damage: 70, moveRange: 2, initiative: 5,
        isPlayer: false, cost: 2000,
        isBoss: true, bossSize: 2,
        passives: [
            { name: 'Iron Reflection', description: 'Reflects 50% of received melee damage back to the attacker.' },
            { name: 'Magic Resonance', description: 'Takes double damage from all spells.' },
            { name: 'Seismic Slam', description: 'At the start of its turn, knocks back all player units within 2 tiles and stuns them for 1 turn.' }
        ]
    },
    BONE_BEHEMOTH: {
        name: 'Bone Behemoth',
        emoji: '💀',
        image: 'images/enemy/dungeon/bone_behemoth.png',
        health: 280, maxHealth: 280,
        damage: 45, moveRange: 2, initiative: 9,
        isPlayer: false, cost: 2000,
        isBoss: true, bossSize: 2,
        passives: [
            { name: 'Bone Absorption', description: 'When any unit dies, absorbs their bones: gains full Max HP and heals, plus 50% of their damage and +1 movement.' }
        ]
    },
    OCTOTH_HROARATH: {
        name: "Octo'th Hroa'rath",
        emoji: '🦑',
        image: 'images/enemy/cultist/octoth_hroarath.png',
        health: 250, maxHealth: 250,
        damage: 75, moveRange: 4, initiative: 10,
        isPlayer: false, cost: 2500,
        isBoss: true, bossSize: 2,
        passives: [
            { name: 'Otherworldly Aura', description: 'Deals 15 damage to adjacent units at start of turn.' },
            { name: 'Tendril Pull', description: 'Pulls distant enemies into melee range.' }
        ]
    },
    THE_SILENCE: {
        name: "The Silence",
        emoji: '🤐',
        image: 'images/enemy/cultist/the_silence.png',
        health: 400, maxHealth: 400,
        damage: 55, moveRange: 3, initiative: 8,
        isPlayer: false, cost: 2200,
        isBoss: true, bossSize: 2,
        passives: [
            { name: 'Aura of Silence', description: 'All spellcasting is disabled during the fight. Melee only!' }
        ]
    },
    VOID_HERALD: {
        name: "Void Herald",
        emoji: '🌑',
        image: 'images/enemy/cultist/void_herald.png',
        health: 320, maxHealth: 320,
        damage: 35, moveRange: 4, rangedRange: 6, initiative: 12,
        isPlayer: false, cost: 2400,
        isBoss: true, bossSize: 2,
        passives: [
            { name: 'Void Slow', description: 'Reduces all enemy movement by 3 at fight start (min 1).' },
            { name: 'Voidball', description: 'Casts 38 damage voidball each turn.' }
        ]
    },
    // ============================================
    // NEW FACTION: DUNGEON DWELLERS
    // ============================================
    ANIMATED_ARMOR: {
        name: 'Animated Armor',
        emoji: '🤖',
        image: 'images/enemy/dungeon/animated_armor.png',
        health: 220, maxHealth: 220,
        damage: 45, moveRange: 2, initiative: 5,
        isPlayer: false, cost: 550,
        isBoss: false
    },
    SKELETON_ARCHER: {
        name: 'Skeleton Archer',
        emoji: '💀🏹',
        image: 'images/enemy/dungeon/skeleton_archer.png',
        health: 50, maxHealth: 50,
        damage: 30, moveRange: 2, initiative: 14,
        isPlayer: false, cost: 300,
        rangedRange: 6
    },
    SKELETON_SOLDIER: {
        name: 'Skeleton Soldier',
        emoji: '💀⚔️',
        image: 'images/enemy/dungeon/skeleton_soldier.png',
        health: 90, maxHealth: 90,
        damage: 25, moveRange: 4, initiative: 11,
        isPlayer: false, cost: 250,
        passives: [
            { name: 'Shielded', description: 'Takes 50% less damage from ranged attacks.', effect: 'rangedDefense', value: 0.5 }
        ]
    },
    LOST_SPIRIT: {
        name: 'Lost Spirit',
        emoji: '👻',
        image: 'images/enemy/dungeon/lost_spirit.png',
        health: 70, maxHealth: 70,
        damage: 50, moveRange: 6, initiative: 15,
        isPlayer: false, cost: 800,
        isRare: true,
        canFly: true,
        passives: [
            { name: 'Ethereal', description: 'Takes 75% less damage from physical attacks.' },
            { name: 'Arcane Weakness', description: 'Takes 50% more damage from spells.' }
        ]
    },

    // ============================================
    // NEW FACTION: OLD GOD WORSHIPPERS
    // ============================================
    CULTIST_ACOLYTE: {
        name: 'Cultist Acolyte',
        emoji: '👤',
        image: 'images/enemy/cultist/acolyte.png',
        health: 40, maxHealth: 40,
        damage: 20, moveRange: 5, initiative: 14,
        isPlayer: false, cost: 150,
        passives: [
            { name: 'Void-Burned Skin', description: '25% damage resistance to all magic damage.' }
        ]
    },
    CULTIST_NEOPHYTE: {
        name: 'Cultist Neophyte',
        emoji: '🤫',
        image: 'images/enemy/cultist/neophyte.png',
        health: 35, maxHealth: 35,
        damage: 15, moveRange: 4, initiative: 13,
        isPlayer: false, cost: 200,
        rangedRange: 4,
        passives: [
            { name: 'Void-Burned Skin', description: '25% damage resistance to all magic damage.' }
        ]
    },
    GIBBERING_HORROR: {
        name: 'Gibbering Horror',
        emoji: '🐙',
        image: 'images/enemy/cultist/gibbering_horror.png',
        health: 80, maxHealth: 80,
        damage: 40, moveRange: 5, initiative: 15,
        isPlayer: false, cost: 500,
        rangedRange: 5,
        passives: [
            { name: 'Void-Burned Skin', description: '25% damage resistance to all magic damage.' },
            { name: 'Unstable Form', description: 'At start of turn, randomly gain +2 MOV or +10 damage for this turn.' }
        ]
    },
    FLESH_WARPED_STALKER: {
        name: 'Flesh-warped Stalker',
        emoji: '🦎',
        image: 'images/enemy/cultist/flesh_warped_stalker.png',
        health: 70, maxHealth: 70,
        damage: 40, moveRange: 7, initiative: 17,
        isPlayer: false, cost: 550,
        passives: [
            { name: 'Void-Burned Skin', description: '25% damage resistance to all magic damage.' },
            { name: 'Feast of Flesh', description: 'Landing a killing blow completely refreshes this unit\'s turn.' }
        ]
    }
};

// Export for module systems (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { UNIT_TYPES };
}
