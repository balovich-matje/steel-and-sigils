// ============================================
// WEBRTC ADAPTER - P2P Connection
// ============================================
// Uses Firebase ONLY for signaling (SDP/ICE exchange)
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
        this.sessionRef = this.db.ref(`signaling/${this.sessionKey}`);
        
        // Create signaling session
        await this.sessionRef.set({
            created: firebase.database.ServerValue.TIMESTAMP,
            host: { connected: false }
        });

        // Create host peer connection
        await this._createHostConnection();
        
        // Set up listeners for guest response
        this._setupHostListeners();
        
        return this.sessionKey;
    }

    async joinSession(sessionKey) {
        this.sessionKey = sessionKey.toUpperCase().trim();
        this.playerNumber = 2;
        this.sessionRef = this.db.ref(`signaling/${this.sessionKey}`);
        
        // Check session exists
        const snapshot = await this.sessionRef.once('value');
        if (!snapshot.exists()) {
            throw new Error('Session not found');
        }
        
        const data = snapshot.val();
        if (data.guest) {
            throw new Error('Session is full');
        }

        // Create guest peer connection
        await this._createGuestConnection();
        
        // Set up listeners for host ICE
        this._setupGuestListeners();
        
        return true;
    }

    // ============================================
    // WEBRTC CONNECTION
    // ============================================

    async _createHostConnection() {
        this.pc = new RTCPeerConnection(this.iceServers);
        
        // Create data channel
        this.dataChannel = this.pc.createDataChannel('game', { ordered: true });
        this._setupDataChannel(this.dataChannel);
        
        // Handle ICE candidates
        this.pc.onicecandidate = (event) => {
            if (event.candidate) {
                this.sessionRef.child('host/ice').push(event.candidate.toJSON());
            }
        };
        
        // Create and send offer
        const offer = await this.pc.createOffer();
        await this.pc.setLocalDescription(offer);
        
        await this.sessionRef.child('host').update({
            offer: { type: offer.type, sdp: offer.sdp }
        });
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
                this.sessionRef.child('guest/ice').push(event.candidate.toJSON());
            }
        };
        
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

    // ============================================
    // SIGNALING LISTENERS
    // ============================================

    _setupHostListeners() {
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
