// ============================================
// PVP MANAGER - WebRTC Peer-to-Peer
// ============================================
// Firebase is used ONLY for initial signaling (SDP exchange)
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
        
        // Game data
        this.myArmy = [];
        this.opponentArmy = null;
        
        // Callbacks
        this.onConnected = null;
        this.onDisconnected = null;
        this.onOpponentAction = null;
        this.onOpponentArmyReceived = null;
    }

    // ============================================
    // SESSION CREATION / JOINING
    // ============================================

    async createSession() {
        this._initFirebase();
        
        this.webrtc = new WebRTCAdapter(firebase.database());
        this._setupCallbacks();
        
        this.sessionKey = await this.webrtc.createSession();
        this.playerNumber = 1;
        this.isHost = true;
        

        return this.sessionKey;
    }

    async joinSession(sessionKey) {
        this._initFirebase();
        
        this.webrtc = new WebRTCAdapter(firebase.database());
        this._setupCallbacks();
        
        await this.webrtc.joinSession(sessionKey);
        this.sessionKey = sessionKey;
        this.playerNumber = 2;
        this.isHost = false;
        

        return true;
    }

    _initFirebase() {
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
    }

    _setupCallbacks() {
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
