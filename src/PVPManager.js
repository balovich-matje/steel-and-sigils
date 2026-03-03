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
        
        // Message buffer for early messages (before callbacks are set)
        this._messageBuffer = [];
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
        console.log('[PVPManager] Received message:', data.type, data);
        
        // Handle army message
        if (data.type === 'army') {
            console.log('[PVPManager] Army received, length:', data.army?.length);
            this.opponentArmy = data.army;
            
            // Send acknowledgment
            this.send({ type: 'army_ack' });
            
            if (this.onOpponentArmyReceived) {
                console.log('[PVPManager] Calling onOpponentArmyReceived callback');
                this.onOpponentArmyReceived(data.army);
            } else {
                console.log('[PVPManager] No callback set - buffering army message');
                this._messageBuffer.push(data);
            }
            return;
        }
        
        // Handle army acknowledgment
        if (data.type === 'army_ack') {
            console.log('[PVPManager] Army acknowledgment received');
            this.armyAckReceived = true;
            return;
        }
        
        // Handle action message
        if (data.type === 'action') {
            if (this.onOpponentAction) {
                this.onOpponentAction(data.action);
            } else {
                console.log('[PVPManager] No action callback set - buffering');
                this._messageBuffer.push(data);
            }
            return;
        }
        
        // Handle ping
        if (data.type === 'ping') {
            this.send({ type: 'pong', time: data.time });
        }
    }
    
    // Process any buffered messages after callbacks are set
    processBufferedMessages() {
        console.log('[PVPManager] Processing', this._messageBuffer.length, 'buffered messages');
        while (this._messageBuffer.length > 0) {
            const data = this._messageBuffer.shift();
            console.log('[PVPManager] Processing buffered message:', data.type);
            
            if (data.type === 'army' && this.onOpponentArmyReceived) {
                this.onOpponentArmyReceived(data.army);
            } else if (data.type === 'action' && this.onOpponentAction) {
                this.onOpponentAction(data.action);
            }
        }
    }

    // ============================================
    // SEND METHODS
    // ============================================

    send(data) {
        if (!this.isConnected) {
            console.log('[PVPManager] Send failed - not connected');
            return false;
        }
        const result = this.webrtc.send(data);
        console.log('[PVPManager] Send result:', result, 'type:', data.type);
        return result;
    }

    sendArmy(army) {
        console.log('[PVPManager] sendArmy called with', army.length, 'units');
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
