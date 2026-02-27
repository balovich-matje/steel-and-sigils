// ============================================
// GAME CONFIGURATION & CONSTANTS
// ============================================

export const CONFIG = {
    GRID_WIDTH: 10,
    GRID_HEIGHT: 8,
    TILE_SIZE: 64,
    COLORS: {
        GRASS: 0x4a7c59,
        GRASS_DARK: 0x3d6b4a,
        HIGHLIGHT_MOVE: 0x4a90d9,
        HIGHLIGHT_ATTACK: 0xd94a4a,
        HIGHLIGHT_SELECTED: 0xffd700,
        PLAYER_SIDE: 0x4a7cd9,
        ENEMY_SIDE: 0xd94a4a
    }
};

// ============================================
// SPELL DATABASE
// ============================================

export const SPELLS = {
    fireball: {
        id: 'fireball',
        name: 'Fireball',
        icon: '🔥',
        type: 'AoE Damage',
        manaCost: 25,
        description: 'Explodes in a 3x3 area dealing 30 damage to all enemies',
        targetType: 'enemy',
        effect: 'aoeDamage',
        power: 30,
        range: 5
    },
    lightning_bolt: {
        id: 'lightning_bolt',
        name: 'Lightning Bolt',
        icon: '⚡',
        type: 'Single Damage',
        manaCost: 15,
        description: 'Strikes a single enemy for 45 damage',
        targetType: 'enemy',
        effect: 'singleDamage',
        power: 45,
        range: 6
    },
    heal: {
        id: 'heal',
        name: 'Heal',
        icon: '💚',
        type: 'Heal',
        manaCost: 20,
        description: 'Restores 40 HP to a friendly unit',
        targetType: 'ally',
        effect: 'heal',
        power: 40,
        range: 5
    },
    haste: {
        id: 'haste',
        name: 'Haste',
        icon: '💨',
        type: 'Buff',
        manaCost: 15,
        description: 'Increases movement range by 2 for 3 turns',
        targetType: 'ally',
        effect: 'haste',
        power: 2,
        duration: 3,
        range: 5
    },
    shield: {
        id: 'shield',
        name: 'Shield',
        icon: '🛡️',
        type: 'Buff',
        manaCost: 15,
        description: 'Reduces damage taken by 50% for 2 turns',
        targetType: 'ally',
        effect: 'shield',
        power: 0.5,
        duration: 2,
        range: 5
    },
    ice_storm: {
        id: 'ice_storm',
        name: 'Ice Storm',
        icon: '❄️',
        type: 'AoE Damage',
        manaCost: 30,
        description: 'Deals 20 damage and reduces enemy movement by 1 for 2 turns',
        targetType: 'enemy',
        effect: 'iceStorm',
        power: 20,
        range: 4
    },
    meteor: {
        id: 'meteor',
        name: 'Meteor',
        icon: '☄️',
        type: 'Heavy AoE',
        manaCost: 50,
        description: 'Devastating 5x5 area attack dealing 60 damage',
        targetType: 'enemy',
        effect: 'meteor',
        power: 60,
        range: 6
    },
    bless: {
        id: 'bless',
        name: 'Bless',
        icon: '✨',
        type: 'Buff',
        manaCost: 25,
        description: 'Increases damage dealt by 50% for 3 turns',
        targetType: 'ally',
        effect: 'bless',
        power: 1.5,
        duration: 3,
        range: 5
    },
    cure_wounds: {
        id: 'cure_wounds',
        name: 'Cure Wounds',
        icon: '💗',
        type: 'Strong Heal',
        manaCost: 35,
        description: 'Powerful healing that restores 80 HP',
        targetType: 'ally',
        effect: 'heal',
        power: 80,
        range: 4
    },
    teleport: {
        id: 'teleport',
        name: 'Teleport',
        icon: '🌀',
        type: 'Utility',
        manaCost: 30,
        description: 'Instantly moves a unit to any empty tile within range 8',
        targetType: 'ally_then_tile',
        effect: 'teleport',
        power: 0,
        range: 8
    },
    chain_lightning: {
        id: 'chain_lightning',
        name: 'Chain Lightning',
        icon: '⚡',
        type: 'Multi Damage',
        manaCost: 40,
        description: 'Hits target and chains to 2 nearby enemies for 35 damage each',
        targetType: 'enemy',
        effect: 'chainLightning',
        power: 35,
        chains: 2,
        range: 5
    },
    regenerate: {
        id: 'regenerate',
        name: 'Regenerate',
        icon: '🌿',
        type: 'HoT',
        manaCost: 25,
        description: 'Heals 15 HP at the start of each turn for 4 turns',
        targetType: 'ally',
        effect: 'regenerate',
        power: 15,
        duration: 4,
        range: 5
    }
};
