// ============================================
// MAIN ENTRY POINT - Steel and Sigils
// ============================================

const GAME_VERSION = '0.46';
console.log(`Steel and Sigils v${GAME_VERSION}`);

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

// Global game reference
let game = null;

// Dynamically load PVP scenes only when needed
let pvpScenesLoaded = false;
async function loadVPScenes() {
    if (pvpScenesLoaded) return;
    if (!window.game) {

        return;
    }

    const { PVPMatchScene } = await import('./PVPMatchScene.js?v=' + Date.now());
    const { PVPBattleScene } = await import('./PVPBattleScene.js?v=' + Date.now());

    window.game.scene.add('PVPMatchScene', PVPMatchScene);
    window.game.scene.add('PVPBattleScene', PVPBattleScene);

    pvpScenesLoaded = true;

}

// Expose load function globally for PreGameScene
window.loadVPScenes = loadVPScenes;

// Initialize the game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    game = new Phaser.Game(config);

    // Expose for debugging
    window.game = game;
});
