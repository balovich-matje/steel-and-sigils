// ============================================
// SAVE MANAGER - Persistent meta-progression
// ============================================
// Loaded as a regular script (not ES6 module) so it's available
// to both inline HTML scripts and ES6 module code via globals.

const _SMS_KEY = 'sns_meta';
const _SMS_VERSION = 1;

const SaveManager = {
    _defaults() {
        return {
            version: _SMS_VERSION,
            currency: 0,
            upgrades: { meleeHp: 0, spellDmg: 0, movespeed: 0, startingBalance: 0, unitDamage: 0 }
        };
    },

    load() {
        try {
            const raw = localStorage.getItem(_SMS_KEY);
            if (!raw) return this._defaults();
            const data = JSON.parse(raw);
            if (!data || data.version !== _SMS_VERSION) return this._defaults();
            // Ensure all upgrade keys exist (forward-compat for future upgrades)
            data.upgrades = Object.assign({ meleeHp: 0, spellDmg: 0, movespeed: 0, startingBalance: 0, unitDamage: 0 }, data.upgrades || {});
            return data;
        } catch (e) {
            return this._defaults();
        }
    },

    save(data) {
        try {
            localStorage.setItem(_SMS_KEY, JSON.stringify(data));
        } catch (e) {
            console.warn('SaveManager: failed to write localStorage', e);
        }
    },

    getCurrency() {
        return this.load().currency;
    },

    addCurrency(amount) {
        const data = this.load();
        data.currency = (data.currency || 0) + Math.max(0, amount);
        this.save(data);
    },

    getUpgrades() {
        return this.load().upgrades;
    },

    // Returns true if purchase succeeded, false if insufficient currency or already maxed
    purchaseUpgrade(id, currentLevel, cost) {
        const data = this.load();
        if (data.currency < cost) return false;
        data.currency -= cost;
        data.upgrades[id] = currentLevel + 1;
        this.save(data);
        return true;
    }
};

// ============================================
// META UPGRADE DEFINITIONS
// ============================================

const META_UPGRADES = [
    {
        id: 'meleeHp',
        name: 'Melee Fortitude',
        icon: '🛡️',
        desc: '+10% base HP for melee units',
        maxLevel: 10,
        // Level passed is the NEXT level being purchased (1-indexed)
        costFn: (lvl) => Math.round(50 * Math.pow(1.45, lvl - 1))
    },
    {
        id: 'spellDmg',
        name: 'Arcane Empowerment',
        icon: '✨',
        desc: '+2.5% spell damage',
        maxLevel: 20,
        costFn: (lvl) => Math.round(40 * Math.pow(1.35, lvl - 1))
    },
    {
        id: 'movespeed',
        name: 'Swift Feet',
        icon: '💨',
        desc: '+1 movement for all units',
        maxLevel: 2,
        costFn: (lvl) => lvl === 1 ? 1000 : 2500
    },
    {
        id: 'startingBalance',
        name: 'War Chest',
        icon: '💰',
        desc: '+50 starting army recruitment points',
        maxLevel: 20,
        costFn: (lvl) => Math.round(75 * Math.pow(1.35, lvl - 1))
    },
    {
        id: 'unitDamage',
        name: 'Battle-Hardened',
        icon: '⚔️',
        desc: '+5% base damage for all units',
        maxLevel: 20,
        costFn: (lvl) => Math.round(60 * Math.pow(1.35, lvl - 1))
    }
];

// Player unit types affected by the Melee Fortitude upgrade
const MELEE_META_TYPES = ['KNIGHT', 'PALADIN', 'BERSERKER', 'ROGUE'];
