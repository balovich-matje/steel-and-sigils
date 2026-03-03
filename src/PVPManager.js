// ============================================
// PVP MANAGER - WebRTC Peer-to-Peer
// ============================================
// Firebase is used ONLY for initial signaling (SDP exchange) if available
// Falls back to manual copy-paste signaling
// All game data flows through WebRTC DataChannel

import { WebRTCAdapter } from './network/WebRTCAdapter.js';
import { firebaseConfig } from './firebase-config.js';

export class PVPManager {
    constructor(scene) {
        this.scene = scene;
        this.webrtc = null;
        this.sessionKey = null;
        this.playerNumber = null;
        this.isHost = false;
        this.isConnected = false;
        this.useManualSignaling = false;
        
        // Game data
        this.myArmy = [];
        this.opponentArmy = null;
        
        // Callbacks
        this.onConnected = null;
        this.onDisconnected = null;
        this.onOpponentAction = null;
        this.onOpponentArmyReceived = null;
        this.onManualCodeReady = null;  // For manual signaling: host offer code ready
        this.onManualAnswerReady = null;  // For manual signaling: guest answer code ready
    }

    // ============================================
    // SESSION CREATION / JOINING
    // ============================================

    async createSession() {
        this._initFirebase();
        
        this.webrtc = new WebRTCAdapter(firebase.apps.length ? firebase.database() : null);
        this._setupCallbacks();
        
        try {
            this.sessionKey = await this.webrtc.createSession();
            
            // Check if using manual signaling
            if (this.webrtc.useManualSignaling) {
                this.useManualSignaling = true;
                this.playerNumber = 1;
                this.isHost = true;
                
                // Notify UI to show the manual code
                if (this.onManualCodeReady) {
                    this.onManualCodeReady(this.sessionKey);
                }
                
                return this.sessionKey;
            }
            
            this.playerNumber = 1;
            this.isHost = true;
            
            return this.sessionKey;
        } catch (error) {
            throw new Error('Failed to create session: ' + error.message);
        }
    }

    async joinSession(sessionKey) {
        this._initFirebase();
        
        this.webrtc = new WebRTCAdapter(firebase.apps.length ? firebase.database() : null);
        this._setupCallbacks();
        
        await this.webrtc.joinSession(sessionKey);
        this.sessionKey = sessionKey;
        this.playerNumber = 2;
        this.isHost = false;
        
        // Check if using manual signaling
        if (this.webrtc.useManualSignaling) {
            this.useManualSignaling = true;
        }
        
        return true;
    }

    // Complete manual connection (host receives answer from guest)
    async completeManualConnection(answerCode) {
        if (!this.webrtc || !this.isHost) {
            throw new Error('Not in host mode');
        }
        return await this.webrtc.completeManualConnection(answerCode);
    }

    _initFirebase() {
        if (typeof firebase !== 'undefined' && !firebase.apps.length) {
            try {
                firebase.initializeApp(firebaseConfig);
            } catch (e) {
                console.log('Firebase initialization failed:', e.message);
            }
        }
    }

    _setupCallbacks() {
        // Set up WebRTC callbacks
        this.webrtc.onConnected(() => {
            this.isConnected = true;
            
            // Clean up Firebase signaling session (we don't need it anymore)
            this.webrtc.cleanupSignaling();
            
            if (this.onConnected) this.onConnected();
        });
        
        this.webrtc.onDisconnected(() => {
            this.isConnected = false;
            if (this.onDisconnected) this.onDisconnected();
        });
        
        this.webrtc.onMessage((data) => this._handleMessage(data));
        
        // Set up manual signaling callback
        this.webrtc.onManualAnswerReady = (answerCode) => {
            if (this.onManualAnswerReady) {
                this.onManualAnswerReady(answerCode);
            }
        };
    }

    // ============================================
    // MESSAGE HANDLING
    // ============================================

    _handleMessage(data) {
        switch (data.type) {
            case 'army':
                this.opponentArmy = data.army;
                if (this.onOpponentArmyReceived) {
                    this.onOpponentArmyReceived(data.army);
                }
                break;
                
            case 'action':
                if (this.onOpponentAction) {
                    this.onOpponentAction(data.action);
                }
                break;
                
            case 'ping':
                this.send({ type: 'pong', time: data.time });
                break;
        }
    }

    // ============================================
    // SEND METHODS
    // ============================================

    send(data) {
        if (!this.isConnected) {
            return false;
        }
        return this.webrtc.send(data);
    }

    sendArmy(army) {
        this.myArmy = army;
        return this.send({ type: 'army', army: army });
    }

    sendAction(action) {
        return this.send({ type: 'action', action: action });
    }

    // ============================================
    // GETTERS
    // ============================================

    getSessionKey() { return this.sessionKey; }
    getPlayerNumber() { return this.playerNumber; }
    isHostPlayer() { return this.isHost; }

    // ============================================
    // CLEANUP
    // ============================================

    disconnect() {
        if (this.webrtc) {
            this.webrtc.disconnect();
        }
    }
}
