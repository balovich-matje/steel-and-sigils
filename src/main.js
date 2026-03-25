// ============================================
// MAIN ENTRY POINT - Steel and Sigils
// ============================================

const GAME_VERSION = '1.00';
console.log(`Steel and Sigils v${GAME_VERSION}`);

import { CONFIG } from './GameConfig.js';
import { BattleScene, PreGameScene } from './SceneManager.js';

// Note: UNIT_TYPES is available globally from units.js (loaded as script tag before this module)

// Phaser Game Configuration
// Responsive scaling - maps stretch to fill viewport
const config = {
    type: Phaser.AUTO,
    width: 640,  // Base width - 10 tiles * 64px
    height: 512, // Base height - 8 tiles * 64px
    parent: 'game-container',
    backgroundColor: '#1A1C1E',
    scene: [PreGameScene, BattleScene],
    scale: {
        mode: Phaser.Scale.FIT,
        parent: 'game-container'
    }
};

// Global game reference
let game = null;

// Initialize the game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    game = new Phaser.Game(config);

    // Expose for debugging
    window.game = game;
});
