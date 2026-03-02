// ============================================
// FIREBASE ADAPTER - Firebase Realtime Database implementation
// ============================================

import { NetworkAdapter } from './NetworkAdapter.js';

/**
 * Firebase implementation of NetworkAdapter.
 * Uses Firebase Realtime Database for real-time synchronization.
 */
export class FirebaseAdapter extends NetworkAdapter {
    constructor(firebaseConfig) {
        super();
        
        // Initialize Firebase (compat version uses global firebase object)
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        this.database = firebase.database();
        this.sessionRef = null;
        this.unsubscribeCallbacks = [];
    }

    // ============================================
    // SESSION MANAGEMENT
    // ============================================

    async createSession() {
        // Clean up old sessions first
        await this._cleanupOldSessions();
        
        const sessionKey = this.generateSessionKey();
        const sessionRef = this.database.ref(`sessions/${sessionKey}`);
        
        const initialState = {
            player1: {
                id: this.playerId,
                name: `Player ${Math.floor(Math.random() * 1000)}`,
                connected: true,
                currentBattle: 1,
                army: [],
                ready: false,
                side: null,
                lastSeen: firebase.database.ServerValue.TIMESTAMP
            },
            player2: null,
            state: 'waiting',
            createdAt: firebase.database.ServerValue.TIMESTAMP,
            updatedAt: firebase.database.ServerValue.TIMESTAMP,
            expiresAt: Date.now() + (5 * 60 * 1000), // 5 minutes from now
            pvpRound: {
                player1Side: null,
                player1Ready: false,
                player2Ready: false,
                battleStarted: false,
                winner: null,
                battleEvents: []
            },
            spectatorData: null
        };

        await sessionRef.set(initialState);
        this.sessionKey = sessionKey;
        this.sessionRef = sessionRef;
        
        // Set up disconnect cleanup
        this._setupDisconnectHandler(sessionRef, 1);
        
        // Set up session timeout
        this._scheduleSessionTimeout(sessionRef, 5 * 60 * 1000); // 5 minutes
        
        return sessionKey;
    }

    async joinSession(sessionKey) {
        // Clean up old sessions first
        await this._cleanupOldSessions();
        
        const normalizedKey = sessionKey.toUpperCase().trim();
        const sessionRef = this.database.ref(`sessions/${normalizedKey}`);
        
        // Check if session exists
        const snapshot = await sessionRef.once('value');
        const sessionData = snapshot.val();
        
        if (!sessionData) {
            throw new Error('Session not found');
        }
        
        // Check if session expired
        if (sessionData.expiresAt && sessionData.expiresAt < Date.now()) {
            await sessionRef.remove();
            throw new Error('Session has expired');
        }
        
        if (sessionData.player2) {
            throw new Error('Session is full');
        }
        
        // Join as player 2
        const player2Data = {
            id: this.playerId,
            name: `Player ${Math.floor(Math.random() * 1000)}`,
            connected: true,
            currentBattle: 1,
            army: [],
            ready: false,
            side: null,
            lastSeen: firebase.database.ServerValue.TIMESTAMP
        };

        await sessionRef.update({
            player2: player2Data,
            state: 'playing',
            updatedAt: firebase.database.ServerValue.TIMESTAMP
        });

        this.sessionKey = normalizedKey;
        this.sessionRef = sessionRef;
        
        // Set up disconnect cleanup
        this._setupDisconnectHandler(sessionRef, 2);
        
        // Set up session timeout
        this._scheduleSessionTimeout(sessionRef, 5 * 60 * 1000); // 5 minutes
        
        return true;
    }

    async leaveSession() {
        if (!this.sessionRef) return;
        
        const playerNum = this.getPlayerNumberFromRef();
        
        if (playerNum === 1) {
            // Player 1 leaving - delete entire session
            await this.sessionRef.remove();
        } else if (playerNum === 2) {
            // Player 2 leaving - just remove player2
            await this.sessionRef.update({
                player2: null,
                state: 'waiting',
                updatedAt: firebase.database.ServerValue.TIMESTAMP
            });
        }
        
        this._cleanup();
    }

    // ============================================
    // STATE SYNCHRONIZATION
    // ============================================

    onStateChange(sessionKey, callback) {
        this.sessionKey = sessionKey;
        this.onStateChangeCallback = callback;
        
        const sessionRef = this.database.ref(`sessions/${sessionKey}`);
        this.sessionRef = sessionRef;
        
        // Subscribe to session changes
        const unsubscribe = sessionRef.on('value', (snapshot) => {
            const data = snapshot.val();
            if (data && this.onStateChangeCallback) {
                this.onStateChangeCallback(data);
            }
        });
        
        this.unsubscribeCallbacks.push(() => sessionRef.off('value', unsubscribe));
        
        // Also set up heartbeat to show we're online
        this._startHeartbeat();
    }

    offStateChange() {
        this._cleanup();
        this.onStateChangeCallback = null;
    }

    async send(data) {
        if (!this.sessionRef) {
            throw new Error('Not connected to a session');
        }

        const updateData = {
            ...data,
            updatedAt: firebase.database.ServerValue.TIMESTAMP
        };

        await this.sessionRef.update(updateData);
        
        // Extend timeout on activity
        await this.extendSessionTimeout();
    }

    // ============================================
    // PVP-SPECIFIC METHODS
    // ============================================

    /**
     * Update player's battle progress
     */
    async updateBattleProgress(battleNumber, armyData) {
        const playerNum = await this._getPlayerNumber();
        if (!playerNum) return;

        const update = {};
        update[`player${playerNum}/currentBattle`] = battleNumber;
        update[`player${playerNum}/army`] = armyData;
        update[`player${playerNum}/lastSeen`] = firebase.database.ServerValue.TIMESTAMP;
        
        await this.send(update);
    }

    /**
     * Set player ready status for placement phase
     */
    async setReadyStatus(ready) {
        const playerNum = await this._getPlayerNumber();
        if (!playerNum) return;

        const update = {};
        update[`player${playerNum}/ready`] = ready;
        update[`pvpRound/player${playerNum}Ready`] = ready;
        
        await this.send(update);
    }

    /**
     * Update spectator data (for live viewing)
     */
    async updateSpectatorData(spectatorData) {
        await this.send({
            spectatorData: {
                ...spectatorData,
                timestamp: firebase.database.ServerValue.TIMESTAMP
            }
        });
    }

    /**
     * Send battle event (for replay/spectator)
     */
    async sendBattleEvent(event) {
        const eventsRef = this.sessionRef.child('pvpRound/battleEvents');
        await eventsRef.push({
            ...event,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        });
    }

    /**
     * Initialize PVP round with random side assignment
     */
    async initPVPRound() {
        const player1Side = Math.random() < 0.5 ? 'left' : 'right';
        
        await this.send({
            state: 'pvp_placement',
            pvpRound: {
                player1Side: player1Side,
                player2Side: player1Side === 'left' ? 'right' : 'left',
                player1Ready: false,
                player2Ready: false,
                battleStarted: false,
                winner: null,
                battleEvents: []
            }
        });
    }

    /**
     * Start PVP battle (both players ready)
     */
    async startPVPBattle() {
        await this.send({
            state: 'pvp_battle',
            'pvpRound/battleStarted': true
        });
    }

    /**
     * Report PVP battle winner
     */
    async reportWinner(playerNumber) {
        await this.send({
            state: 'finished',
            'pvpRound/winner': playerNumber
        });
    }

    // ============================================
    // PRIVATE HELPERS
    // ============================================

    _getPlayerNumber() {
        return new Promise((resolve) => {
            if (!this.sessionRef) {
                resolve(null);
                return;
            }
            
            this.sessionRef.once('value', (snapshot) => {
                const data = snapshot.val();
                resolve(this.getPlayerNumber(data));
            });
        });
    }

    getPlayerNumberFromRef() {
        // Synchronous version for when we already have data
        return this._playerNum || null;
    }

    _setupDisconnectHandler(sessionRef, playerNum) {
        this._playerNum = playerNum;
        
        // Set up onDisconnect to mark player as disconnected
        const playerRef = sessionRef.child(`player${playerNum}`);
        playerRef.onDisconnect().update({
            connected: false,
            lastSeen: firebase.database.ServerValue.TIMESTAMP
        });
    }

    _startHeartbeat() {
        // Update lastSeen every 30 seconds to show we're alive
        this._heartbeatInterval = setInterval(async () => {
            if (!this.sessionRef) return;
            
            const playerNum = await this._getPlayerNumber();
            if (!playerNum) return;

            const playerRef = this.sessionRef.child(`player${playerNum}`);
            await playerRef.update({
                lastSeen: firebase.database.ServerValue.TIMESTAMP
            });
        }, 30000);
    }

    // ============================================
    // SESSION TIMEOUT / CLEANUP
    // ============================================

    /**
     * Schedule automatic session deletion after timeout
     */
    _scheduleSessionTimeout(sessionRef, timeoutMs) {
        this._sessionTimeoutId = setTimeout(async () => {
            console.log('[PVP] Session timed out, cleaning up...');
            
            // Check if session still exists and game hasn't finished
            const snapshot = await sessionRef.once('value');
            const data = snapshot.val();
            
            if (data && data.state !== 'finished') {
                await sessionRef.remove();
                console.log('[PVP] Session deleted due to timeout');
            }
            
        }, timeoutMs);
    }

    /**
     * Clean up old/expired sessions on app start
     */
    async _cleanupOldSessions() {
        try {
            const now = Date.now();
            const sessionsRef = this.database.ref('sessions');
            const snapshot = await sessionsRef.once('value');
            const sessions = snapshot.val();
            
            if (!sessions) return;
            
            const cleanupPromises = [];
            
            for (const [key, session] of Object.entries(sessions)) {
                // Delete if expired or older than 5 minutes with no updates
                const isExpired = session.expiresAt && session.expiresAt < now;
                const isOld = session.updatedAt && (now - session.updatedAt > 5 * 60 * 1000);
                const isFinished = session.state === 'finished';
                
                // Also delete if both players disconnected
                const bothDisconnected = session.player1 && !session.player1.connected &&
                                        (!session.player2 || !session.player2.connected);
                
                if (isExpired || isOld || isFinished || bothDisconnected) {
                    console.log(`[PVP] Cleaning up old session: ${key}`);
                    cleanupPromises.push(sessionsRef.child(key).remove());
                }
            }
            
            await Promise.all(cleanupPromises);
            
        } catch (error) {
            console.error('[PVP] Error cleaning up old sessions:', error);
        }
    }

    /**
     * Extend session timeout (call when players are active)
     */
    async extendSessionTimeout() {
        if (!this.sessionRef) return;
        
        const newExpiry = Date.now() + (5 * 60 * 1000); // 5 more minutes
        await this.sessionRef.update({
            expiresAt: newExpiry,
            updatedAt: firebase.database.ServerValue.TIMESTAMP
        });
        
        // Reset the timeout timer
        if (this._sessionTimeoutId) {
            clearTimeout(this._sessionTimeoutId);
        }
        this._scheduleSessionTimeout(this.sessionRef, 5 * 60 * 1000);
    }

    _cleanup() {
        // Clear heartbeat
        if (this._heartbeatInterval) {
            clearInterval(this._heartbeatInterval);
            this._heartbeatInterval = null;
        }
        
        // Clear session timeout
        if (this._sessionTimeoutId) {
            clearTimeout(this._sessionTimeoutId);
            this._sessionTimeoutId = null;
        }

        // Unsubscribe from Firebase listeners
        this.unsubscribeCallbacks.forEach(unsub => unsub());
        this.unsubscribeCallbacks = [];

        // Clear session ref
        if (this.sessionRef) {
            this.sessionRef.onDisconnect().cancel();
            this.sessionRef = null;
        }

        this.sessionKey = null;
    }
}

// ============================================
// DEFAULT FIREBASE CONFIG
// ============================================

import { firebaseConfig } from '../firebase-config.js';

/**
 * Default Firebase configuration.
 * Users should replace with their own config from Firebase Console.
 */
export const DEFAULT_FIREBASE_CONFIG = firebaseConfig;
