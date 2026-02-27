// ============================================
// MAIN ENTRY POINT - Rogues of Might and Magic
// ============================================

import { CONFIG } from './GameConfig.js';
import { BattleScene, PreGameScene } from './SceneManager.js';

// Note: UNIT_TYPES is available globally from units.js (loaded as script tag before this module)

// Phaser Game Configuration
const config = {
    type: Phaser.AUTO,
    width: CONFIG.GRID_WIDTH * CONFIG.TILE_SIZE,
    height: CONFIG.GRID_HEIGHT * CONFIG.TILE_SIZE,
    parent: 'game-container',
    backgroundColor: '#2d2d44',
    scene: [PreGameScene, BattleScene]
};

// Initialize the game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const game = new Phaser.Game(config);
    
    // Expose for debugging
    window.game = game;
});
