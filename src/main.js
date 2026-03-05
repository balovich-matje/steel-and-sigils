// ============================================
// MAIN ENTRY POINT - Steel and Sigils
// ============================================

const GAME_VERSION = '0.81';
console.log(`Steel and Sigils v${GAME_VERSION}`);

import { CONFIG } from './GameConfig.js';
import { BattleScene, PreGameScene } from './SceneManager.js';

// Note: UNIT_TYPES is available globally from units.js (loaded as script tag before this module)

// Phaser Game Configuration
const config = {
    type: Phaser.AUTO,
    width: 15 * CONFIG.TILE_SIZE,
    height: 15 * CONFIG.TILE_SIZE,
    parent: 'game-container',
    backgroundColor: '#2d2d44',
    scene: [PreGameScene, BattleScene]
};

// Global game reference
let game = null;

// Initialize the game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    game = new Phaser.Game(config);

    // Expose for debugging
    window.game = game;
});
