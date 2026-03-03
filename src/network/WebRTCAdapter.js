// ============================================
// WEBRTC ADAPTER - P2P Connection
// ============================================
// Uses Firebase for signaling if available, otherwise falls back to manual copy-paste
// All game data flows through DataChannel

export class WebRTCAdapter {
    constructor(firebaseDatabase) {
        this.db = firebaseDatabase;
        this.sessionKey = null;
        this.playerNumber = null;
        this.sessionRef = null;
        
        // WebRTC
        this.pc = null;
        this.dataChannel = null;
        this.isConnected = false;
        
        // Callbacks
        this.onMessageCallback = null;
        this.onConnectedCallback = null;
        this.onDisconnectedCallback = null;
        
        // Manual signaling fallback
        this.useManualSignaling = false;
        this.manualOffer = null;
        this.manualAnswer = null;
        this.pendingIceCandidates = [];
        
        // STUN servers (free public servers)
        this.iceServers = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
            ]
        };
    }

    // ============================================
    // SESSION MANAGEMENT
    // ============================================

    async createSession() {
        this.sessionKey = this._generateKey();
        this.playerNumber = 1;
        
        // Try Firebase first
        if (this.db) {
            this.sessionRef = this.db.ref(`signaling/${this.sessionKey}`);
            try {
                await this.sessionRef.set({
                    created: firebase.database.ServerValue.TIMESTAMP,
                    host: { connected: false }
                });
                // Firebase worked, use it
                await this._createHostConnection();
                this._setupHostListeners();
                return this.sessionKey;
            } catch (error) {
                console.log('Firebase signaling failed, falling back to manual signaling');
                this.useManualSignaling = true;
            }
        } else {
            this.useManualSignaling = true;
        }
        
        // Fall back to manual signaling
        if (this.useManualSignaling) {
            return await this._createManualSession();
        }
        
        return this.sessionKey;
    }

    async joinSession(sessionKey) {
        this.sessionKey = sessionKey.toUpperCase().trim();
        this.playerNumber = 2;
        
        // Check if it's a manual signaling code (base64 encoded SDP)
        if (sessionKey.length > 20) {
            return await this._joinManualSession(sessionKey);
        }
        
        // Try Firebase
        if (this.db) {
            this.sessionRef = this.db.ref(`signaling/${this.sessionKey}`);
            try {
                const snapshot = await this.sessionRef.once('value');
                if (!snapshot.exists()) {
                    throw new Error('Session not found');
                }
                const data = snapshot.val();
                if (data.guest) {
                    throw new Error('Session is full');
                }
                await this._createGuestConnection();
                this._setupGuestListeners();
                return true;
            } catch (error) {
                if (error.message === 'Session not found' || error.message === 'Session is full') {
                    throw error;
                }
                console.log('Firebase join failed, checking for manual signaling...');
                throw new Error('Invalid session key. For manual connection, paste the full connection code.');
            }
        }
        
        throw new Error('No signaling method available');
    }

    // ============================================
    // MANUAL SIGNALING (Copy-Paste Fallback)
    // ============================================

    async _createManualSession() {
        await this._createHostConnection();
        
        // Wait for ICE gathering to complete
        await this._waitForIceGathering();
        
        // Create connection code containing offer + ICE candidates
        const signalData = {
            type: 'offer',
            sdp: this.pc.localDescription,
            ice: this.pendingIceCandidates
        };
        
        const code = btoa(JSON.stringify(signalData));
        return code;
    }

    async _joinManualSession(code) {
        try {
            const signalData = JSON.parse(atob(code));
            
            if (signalData.type !== 'offer') {
                throw new Error('Invalid connection code');
            }
            
            await this._createGuestConnection();
            
            // Set remote description (offer)
            await this.pc.setRemoteDescription(new RTCSessionDescription(signalData.sdp));
            
            // Add ICE candidates
            for (const candidate of signalData.ice || []) {
                await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
            }
            
            // Wait for ICE gathering for answer
            await this._waitForIceGathering();
            
            // Create answer code
            const answerData = {
                type: 'answer',
                sdp: this.pc.localDescription,
                ice: this.pendingIceCandidates
            };
            
            const answerCode = btoa(JSON.stringify(answerData));
            
            // Show answer code to user (via callback)
            if (this.onManualAnswerReady) {
                this.onManualAnswerReady(answerCode);
            }
            
            return true;
        } catch (e) {
            throw new Error('Invalid connection code: ' + e.message);
        }
    }

    async completeManualConnection(answerCode) {
        try {
            const signalData = JSON.parse(atob(answerCode));
            
            if (signalData.type !== 'answer') {
                throw new Error('Invalid answer code');
            }
            
            // Set remote description (answer)
            await this.pc.setRemoteDescription(new RTCSessionDescription(signalData.sdp));
            
            // Add ICE candidates
            for (const candidate of signalData.ice || []) {
                await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
            }
            
            return true;
        } catch (e) {
            throw new Error('Invalid answer code: ' + e.message);
        }
    }

    _waitForIceGathering() {
        return new Promise((resolve) => {
            if (this.pc.iceGatheringState === 'complete') {
                resolve();
                return;
            }
            
            const checkState = () => {
                if (this.pc.iceGatheringState === 'complete') {
                    this.pc.removeEventListener('icegatheringstatechange', checkState);
                    resolve();
                }
            };
            
            this.pc.addEventListener('icegatheringstatechange', checkState);
            
            // Timeout after 3 seconds (gathered enough candidates)
            setTimeout(() => {
                this.pc.removeEventListener('icegatheringstatechange', checkState);
                resolve();
            }, 3000);
        });
    }

    onManualAnswerReady = null;  // Callback for when answer code is ready

    // ============================================
    // WEBRTC CONNECTION (Firebase mode)
    // ============================================

    async _createHostConnection() {
        this.pc = new RTCPeerConnection(this.iceServers);
        
        // Create data channel
        this.dataChannel = this.pc.createDataChannel('game', { ordered: true });
        this._setupDataChannel(this.dataChannel);
        
        // Handle ICE candidates
        this.pc.onicecandidate = (event) => {
            if (event.candidate) {
                if (this.useManualSignaling) {
                    this.pendingIceCandidates.push(event.candidate.toJSON());
                } else if (this.sessionRef) {
                    this.sessionRef.child('host/ice').push(event.candidate.toJSON());
                }
            }
        };
        
        // Create and send offer
        const offer = await this.pc.createOffer();
        await this.pc.setLocalDescription(offer);
        
        if (!this.useManualSignaling && this.sessionRef) {
            await this.sessionRef.child('host').update({
                offer: { type: offer.type, sdp: offer.sdp }
            });
        }
    }

    async _createGuestConnection() {
        this.pc = new RTCPeerConnection(this.iceServers);
        
        // Handle data channel from host
        this.pc.ondatachannel = (event) => {
            this.dataChannel = event.channel;
            this._setupDataChannel(this.dataChannel);
        };
        
        // Handle ICE candidates
        this.pc.onicecandidate = (event) => {
            if (event.candidate) {
                if (this.useManualSignaling) {
                    this.pendingIceCandidates.push(event.candidate.toJSON());
                } else if (this.sessionRef) {
                    this.sessionRef.child('guest/ice').push(event.candidate.toJSON());
                }
            }
        };
        
        if (!this.useManualSignaling) {
            // Get host's offer
            const offerSnap = await this.sessionRef.child('host/offer').once('value');
            const offer = offerSnap.val();
            
            if (!offer) throw new Error('Host offer not found');
            
            // Set remote description and create answer
            await this.pc.setRemoteDescription(new RTCSessionDescription(offer));
            
            const answer = await this.pc.createAnswer();
            await this.pc.setLocalDescription(answer);
            
            // Send answer
            await this.sessionRef.child('guest').set({
                answer: { type: answer.type, sdp: answer.sdp },
                connected: false
            });
        }
    }

    // ============================================
    // SIGNALING LISTENERS (Firebase mode)
    // ============================================

    _setupHostListeners() {
        if (this.useManualSignaling) return;
        
        // Listen for guest's answer
        this.sessionRef.child('guest/answer').on('value', async (snapshot) => {
            const answer = snapshot.val();
            if (answer && this.pc.signalingState !== 'stable') {
                await this.pc.setRemoteDescription(new RTCSessionDescription(answer));
            }
        });
        
        // Listen for guest ICE candidates
        this.sessionRef.child('guest/ice').on('child_added', async (snapshot) => {
            const candidate = snapshot.val();
            if (candidate) {
                await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
            }
        });
    }

    _setupGuestListeners() {
        if (this.useManualSignaling) return;
        
        // Listen for host ICE candidates
        this.sessionRef.child('host/ice').on('child_added', async (snapshot) => {
            const candidate = snapshot.val();
            if (candidate) {
                await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
            }
        });
    }

    // ============================================
    // DATA CHANNEL
    // ============================================

    _setupDataChannel(channel) {
        channel.onopen = () => {
            this.isConnected = true;
            if (this.onConnectedCallback) this.onConnectedCallback();
        };
        
        channel.onclose = () => {
            this.isConnected = false;
            if (this.onDisconnectedCallback) this.onDisconnectedCallback();
        };
        
        channel.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (this.onMessageCallback) this.onMessageCallback(data);
            } catch (e) {
                // Ignore parse errors
            }
        };
    }

    // ============================================
    // MESSAGING
    // ============================================

    send(data) {
        if (!this.isConnected || !this.dataChannel) return false;
        try {
            this.dataChannel.send(JSON.stringify(data));
            return true;
        } catch (e) {
            return false;
        }
    }

    onMessage(callback) { this.onMessageCallback = callback; }
    onConnected(callback) { this.onConnectedCallback = callback; }
    onDisconnected(callback) { this.onDisconnectedCallback = callback; }

    // ============================================
    // CLEANUP
    // ============================================

    cleanupSignaling() {
        if (this.useManualSignaling) return;
        
        // Remove Firebase listeners and delete session data
        // (we don't need signaling anymore once connected)
        if (this.sessionRef) {
            this.sessionRef.off();
            // Delete after a short delay to ensure both peers got everything
            setTimeout(() => this.sessionRef.remove(), 5000);
        }
    }

    disconnect() {
        if (this.dataChannel) this.dataChannel.close();
        if (this.pc) this.pc.close();
        this.isConnected = false;
        this.cleanupSignaling();
    }

    // ============================================
    // UTILITY
    // ============================================

    _generateKey() {
        const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // No confusing chars
        let key = '';
        for (let i = 0; i < 6; i++) {
            key += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return key;
    }
}
