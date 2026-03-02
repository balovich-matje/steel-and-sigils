// ============================================
// PVP MATCH SCENE - Coordinates PVP battle flow
// ============================================

import { CONFIG } from './GameConfig.js';

/**
 * PVPMatchScene manages the PVP flow:
 * - Both players connect
 * - Go directly to unit placement
 * - Start PVP battle
 */
export class PVPMatchScene extends Phaser.Scene {
    constructor() {
        super({ key: 'PVPMatchScene' });
        
        this.pvpManager = null;
        this.sessionKey = null;
        this.playerNumber = null;
        
        // Army data
        this.myArmy = [];
        this.opponentArmy = null;
        this.magicBuffs = [];
        
        // State
        this.isWaitingForOpponent = true;
    }

    init(data) {
        this.pvpManager = data.pvpManager;
        this.sessionKey = data.sessionKey;
        this.playerNumber = data.playerNumber;
        this.myArmy = data.army || [];
        this.magicBuffs = data.magicBuffs || [];
        
        // Set up callbacks
        this._setupCallbacks();
    }

    create() {
        window.gameScene = this;
        
        // Save army to Firebase
        this.pvpManager.updateProgress(6, this.myArmy);
        
        // Show waiting UI
        this._showWaitingUI();
        
        // Check if both players are already connected
        if (this.pvpManager.isOpponentConnected()) {
            const opponentData = this.pvpManager.getOpponentData();
            if (opponentData && opponentData.currentBattle >= 6) {
                // Both ready, start placement
                this.opponentArmy = opponentData.army;
                this._startPlacement();
            }
        }
    }

    // ============================================
    // CALLBACK SETUP
    // ============================================

    _setupCallbacks() {
        // Opponent connected or updated
        this.pvpManager.onOpponentProgressUpdate = (progress) => {
            console.log('[PVP] Opponent progress:', progress);
            
            if (progress >= 6) {
                // Opponent has their army ready
                const opponentData = this.pvpManager.getOpponentData();
                if (opponentData && opponentData.army) {
                    this.opponentArmy = opponentData.army;
                    
                    // If we're also ready, start placement
                    if (!this.isWaitingForOpponent) {
                        this._startPlacement();
                    }
                }
            }
        };

        // PVP state change
        this.pvpManager.onPVPStateChange = (state, fullState) => {
            console.log('[PVP] State changed:', state);
            
            if (state === 'pvp_placement' && this.isWaitingForOpponent) {
                this._startPlacement();
            } else if (state === 'pvp_battle') {
                this._startBattle();
            } else if (state === 'finished') {
                this._showMatchResult(fullState.pvpRound?.winner);
            }
        };

        // Match end
        this.pvpManager.onMatchEnd = (winner) => {
            this._showMatchResult(winner);
        };
    }

    // ============================================
    // WAITING UI
    // ============================================

    _showWaitingUI() {
        // Create a simple waiting overlay
        const waitingDiv = document.createElement('div');
        waitingDiv.id = 'pvp-waiting-overlay';
        waitingDiv.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(26, 28, 30, 0.95);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 3000;
            color: #E3D5B8;
        `;
        waitingDiv.innerHTML = `
            <div style="font-size: 48px; margin-bottom: 20px;">⚔️</div>
            <h2 style="color: #A68966; margin-bottom: 15px;">Waiting for Opponent</h2>
            <p style="color: #8B7355; margin-bottom: 30px;">Your army is ready. Waiting for opponent...</p>
            <div style="background: #2D241E; border: 2px solid #A68966; border-radius: 8px; padding: 20px; text-align: center;">
                <div style="color: #8B7355; font-size: 12px; margin-bottom: 8px;">Session Key:</div>
                <div style="color: #FFD700; font-size: 32px; font-weight: bold; letter-spacing: 4px; font-family: monospace;">${this.sessionKey}</div>
            </div>
            <button onclick="this.closest('#pvp-waiting-overlay').remove(); window.gameScene._cancelPVP();" 
                    style="margin-top: 30px; padding: 10px 20px; background: #5D4E3E; border: none; color: #E3D5B8; border-radius: 4px; cursor: pointer;">
                Cancel
            </button>
        `;
        document.body.appendChild(waitingDiv);
    }

    _hideWaitingUI() {
        const waitingDiv = document.getElementById('pvp-waiting-overlay');
        if (waitingDiv) waitingDiv.remove();
    }

    // ============================================
    // PLACEMENT
    // ============================================

    async _startPlacement() {
        this.isWaitingForOpponent = false;
        this._hideWaitingUI();
        
        // Initialize PVP round with random sides
        if (this.playerNumber === 1 && this.pvpManager.network) {
            await this.pvpManager.network.initPVPRound();
        }
        
        // Wait for side assignment
        const checkInterval = setInterval(() => {
            const mySide = this.pvpManager.getMySide();
            if (mySide) {
                clearInterval(checkInterval);
                this._showPlacementScene(mySide);
            }
        }, 500);
    }

    _showPlacementScene(mySide) {
        // Log assigned side for debugging
        console.log(`[PVP] Player ${this.playerNumber} assigned: ${mySide.toUpperCase()} side`);
        
        // Show placement UI
        document.getElementById('pvp-placement-screen').classList.remove('hidden');
        document.getElementById('pvp-your-side').textContent = mySide.toUpperCase();
        document.getElementById('pvp-units-to-place').textContent = this.myArmy.length;
        
        // Start placement phase
        this.scene.start('PVPPlacementScene', {
            pvpManager: this.pvpManager,
            mySide: mySide,
            myArmy: this.myArmy,
            opponentArmy: this.opponentArmy,
            onComplete: () => this._onPlacementComplete()
        });
    }

    async _onPlacementComplete() {
        // Mark as ready
        await this.pvpManager.setReady(true);
        
        // Check if both ready
        if (this.pvpManager.bothPlayersReady()) {
            await this.pvpManager.network.startPVPBattle();
        }
    }

    // ============================================
    // BATTLE
    // ============================================

    _startBattle() {
        document.getElementById('pvp-placement-screen').classList.add('hidden');
        
        const mySide = this.pvpManager.getMySide();
        
        this.scene.start('PVPBattleScene', {
            pvpManager: this.pvpManager,
            playerSide: mySide,
            myArmy: this.myArmy,
            opponentArmy: this.opponentArmy,
            myMagicBuffs: this.magicBuffs,
            onComplete: (winner) => this._handleBattleComplete(winner)
        });
    }

    async _handleBattleComplete(winner) {
        await this.pvpManager.reportWinner(winner);
    }

    // ============================================
    // END GAME
    // ============================================

    _showMatchResult(winner) {
        this._hideWaitingUI();
        
        const victoryScreen = document.getElementById('victory-screen');
        const victoryText = document.getElementById('victory-text');
        
        victoryScreen.classList.remove('hidden');
        document.getElementById('rewards-container').style.display = 'none';
        document.getElementById('defeat-message').style.display = 'none';
        document.getElementById('confirm-rewards').style.display = 'none';
        document.getElementById('victory-subtitle').style.display = 'none';

        const myNumber = this.pvpManager.getPlayerNumber();
        
        if (winner === myNumber) {
            victoryText.innerHTML = '🏆 Victory! 🏆';
            victoryText.style.color = '#FFD700';
        } else {
            victoryText.innerHTML = 'Defeat...';
            victoryText.style.color = '#9E4A4A';
        }

        // Add buttons
        const btnContainer = document.createElement('div');
        btnContainer.style.cssText = 'margin-top: 30px; display: flex; gap: 15px; justify-content: center;';
        
        const rematchBtn = document.createElement('button');
        rematchBtn.className = 'spell-button';
        rematchBtn.style.cssText = 'font-size: 16px; padding: 12px 30px;';
        rematchBtn.textContent = '⚔️ Play Again';
        rematchBtn.onclick = () => location.reload();
        btnContainer.appendChild(rematchBtn);
        
        victoryScreen.appendChild(btnContainer);
    }

    _cancelPVP() {
        if (this.pvpManager) {
            this.pvpManager.leaveSession();
        }
        this.scene.start('PreGameScene');
    }

    // ============================================
    // PUBLIC API
    // ============================================

    reportBattleComplete(victory, armyData, magicBuffs) {
        // Not used in simplified PVP mode
    }

    getPVPManager() {
        return this.pvpManager;
    }
}
