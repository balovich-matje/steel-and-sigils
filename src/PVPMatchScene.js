// ============================================
// PVP MATCH SCENE - WebRTC P2P
// ============================================

import { PVPManager } from './PVPManager.js';

/**
 * PVPMatchScene coordinates P2P PVP battles.
 * Handles: session setup → WebRTC connection → army exchange → battle start
 */
export class PVPMatchScene extends Phaser.Scene {
    constructor() {
        super({ key: 'PVPMatchScene' });
        
        this.pvpManager = null;
        this.sessionKey = null;
        this.playerNumber = null;
        this.myArmy = [];
        this.opponentArmy = null;
        this.battleStarted = false;
    }

    init(data) {
        this.pvpManager = data.pvpManager;
        this.sessionKey = data.sessionKey;
        this.playerNumber = data.playerNumber;
        this.myArmy = data.army || [];
    }

    create() {
        window.gameScene = this;
        
        console.log('[PVPMatchScene] ==== CREATED ====');
        console.log('[PVPMatchScene] Player:', this.playerNumber, 'isHost:', this.playerNumber === 1);
        console.log('[PVPMatchScene] Army:', this.myArmy);
        console.log('[PVPMatchScene] Army length:', this.myArmy?.length);
        console.log('[PVPMatchScene] pvpManager.isConnected:', this.pvpManager?.isConnected);
        console.log('[PVPMatchScene] pvpManager.opponentArmy:', this.pvpManager?.opponentArmy);
        
        // Set up callbacks
        this._setupCallbacks();
        
        // Show waiting UI
        this._showWaitingUI();
        
        // Send army once connected
        if (this.pvpManager?.isConnected) {
            console.log('[PVPMatchScene] Already connected, calling _onConnected');
            this._onConnected();
        } else {
            console.log('[PVPMatchScene] Not connected yet, will wait for callback');
        }
    }

    _setupCallbacks() {
        console.log('[PVPMatchScene] Setting up callbacks');
        this.pvpManager.onConnected = () => this._onConnected();
        this.pvpManager.onDisconnected = () => this._onDisconnected();
        this.pvpManager.onOpponentArmyReceived = (army) => this._onOpponentArmy(army);
        
        // Process any messages that arrived before callbacks were set
        this.pvpManager.processBufferedMessages();
    }

    // ============================================
    // CONNECTION HANDLERS
    // ============================================

    _onConnected() {
        console.log('[PVPMatchScene] ==== _onConnected CALLED ====');
        console.log('[PVPMatchScene] Player:', this.playerNumber);
        console.log('[PVPMatchScene] isConnected:', this.pvpManager?.isConnected);
        
        // Update UI
        const statusEl = document.getElementById('pvp-connection-status');
        if (statusEl) {
            statusEl.textContent = '✓ Connected - Exchanging armies...';
            statusEl.style.color = '#4CAF50';
        }
        
        // Start the army exchange handshake
        console.log('[PVPMatchScene] About to call _startArmyExchange');
        this._startArmyExchange();
    }

    _startArmyExchange() {
        console.log('[PVPMatchScene] ==== STARTING ARMY EXCHANGE ====');
        console.log('[PVPMatchScene] My army:', JSON.stringify(this.myArmy));
        console.log('[PVPMatchScene] My army length:', this.myArmy?.length);
        console.log('[PVPMatchScene] Have opponent army?:', !!this.opponentArmy);
        let sendCount = 0;
        
        // Send army and retry until we receive opponent's army
        const sendArmyInterval = setInterval(() => {
            if (!this.pvpManager.isConnected) {
                console.log('[PVPMatchScene] Not connected, stopping retry');
                clearInterval(sendArmyInterval);
                return;
            }
            
            if (this.opponentArmy) {
                console.log('[PVPMatchScene] Received opponent army, stopping retry');
                clearInterval(sendArmyInterval);
                this._tryStartBattle();
                return;
            }
            
            // Send our army
            sendCount++;
            console.log('[PVPMatchScene] Sending army (attempt', sendCount, ')');
            const sent = this.pvpManager.sendArmy(this.myArmy);
            console.log('[PVPMatchScene] sendArmy returned:', sent);
        }, 500); // Retry every 500ms
        
        // Stop retrying after 10 seconds (20 attempts)
        setTimeout(() => {
            clearInterval(sendArmyInterval);
            if (!this.opponentArmy) {
                console.log('[PVPMatchScene] Timeout - failed to receive opponent army');
                const statusEl = document.getElementById('pvp-connection-status');
                if (statusEl) {
                    statusEl.textContent = '✗ Failed to exchange armies';
                    statusEl.style.color = '#f44336';
                }
            }
        }, 10000);
    }

    _onDisconnected() {
        console.log('[PVPMatchScene] Disconnected');
        const statusEl = document.getElementById('pvp-connection-status');
        if (statusEl) {
            statusEl.textContent = '✗ Disconnected';
            statusEl.style.color = '#f44336';
        }
    }

    _onOpponentArmy(army) {
        console.log('[PVPMatchScene] Received opponent army:', army);
        if (!this.opponentArmy) {
            this.opponentArmy = army;
            this._tryStartBattle();
        } else {
            console.log('[PVPMatchScene] Already have opponent army, ignoring duplicate');
        }
    }

    // ============================================
    // BATTLE START
    // ============================================

    _tryStartBattle() {
        if (this.battleStarted) return;
        if (!this.pvpManager.isConnected) return;
        if (!this.opponentArmy) return;
        
        this.battleStarted = true;
        
        // Hide waiting UI
        this._hideWaitingUI();
        
        // Start battle scene
        this.scene.start('PVPBattleScene', {
            pvpManager: this.pvpManager,
            playerNumber: this.playerNumber,
            myArmy: this.myArmy,
            opponentArmy: this.opponentArmy,
            onComplete: (winner) => this._handleBattleEnd(winner)
        });
    }

    // ============================================
    // UI
    // ============================================

    _showWaitingUI() {
        const existing = document.getElementById('pvp-waiting-overlay');
        if (existing) existing.remove();
        
        const div = document.createElement('div');
        div.id = 'pvp-waiting-overlay';
        div.style.cssText = `
            position: fixed;
            top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(26, 28, 30, 0.95);
            display: flex; flex-direction: column;
            align-items: center; justify-content: center;
            z-index: 3000; color: #E3D5B8;
        `;
        
        // For manual signaling, session key is a long code - don't display it fully
        const isLongCode = this.sessionKey.length > 20;
        const displayKey = isLongCode 
            ? `${this.sessionKey.substring(0, 12)}...${this.sessionKey.substring(this.sessionKey.length - 4)}`
            : this.sessionKey;
        
        div.innerHTML = `
            <div style="font-size: 48px; margin-bottom: 20px;">⚔️</div>
            <h2 style="color: #A68966; margin-bottom: 10px;">PVP Battle</h2>
            <p style="color: #8B7355; margin-bottom: 20px;">
                ${this.pvpManager.isHostPlayer() ? 'Waiting for opponent to join...' : 'Connecting to host...'}
            </p>
            ${isLongCode ? '' : `
            <div style="background: #2D241E; border: 2px solid #A68966; border-radius: 8px; padding: 20px;">
                <div style="color: #8B7355; font-size: 12px; margin-bottom: 8px;">Session Key:</div>
                <div style="color: #FFD700; font-size: 32px; font-weight: bold; letter-spacing: 4px;">
                    ${displayKey}
                </div>
            </div>
            `}
            <div id="pvp-connection-status" style="margin-top: 20px; color: #ff9800;">
                ${this.pvpManager.isConnected ? '✓ Connected' : '⏳ Establishing P2P connection...'}
            </div>
            <button onclick="window.gameScene?._cancelPVP()" 
                    style="margin-top: 30px; padding: 10px 20px; background: #9E4A4A; border: none; 
                           color: #E3D5B8; border-radius: 4px; cursor: pointer;">
                Cancel
            </button>
        `;
        
        document.body.appendChild(div);
    }

    _hideWaitingUI() {
        const div = document.getElementById('pvp-waiting-overlay');
        if (div) div.remove();
    }

    // ============================================
    // BATTLE END
    // ============================================

    _handleBattleEnd(winner) {

        
        const victoryScreen = document.getElementById('victory-screen');
        const victoryText = document.getElementById('victory-text');
        
        victoryScreen.classList.remove('hidden');
        document.getElementById('rewards-container').style.display = 'none';
        document.getElementById('defeat-message').style.display = 'none';
        document.getElementById('confirm-rewards').style.display = 'none';
        
        const iWon = winner === this.playerNumber;
        victoryText.innerHTML = iWon ? '🏆 Victory! 🏆' : 'Defeat...';
        victoryText.style.color = iWon ? '#FFD700' : '#9E4A4A';
        
        // Add play again button
        const btn = document.createElement('button');
        btn.className = 'spell-button';
        btn.style.cssText = 'margin-top: 30px; font-size: 16px; padding: 12px 30px;';
        btn.textContent = '⚔️ Play Again';
        btn.onclick = () => location.reload();
        victoryScreen.appendChild(btn);
    }

    _cancelPVP() {
        this.pvpManager?.disconnect();
        location.reload();
    }
}
