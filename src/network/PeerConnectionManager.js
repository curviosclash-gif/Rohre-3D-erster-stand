// ============================================
// PeerConnectionManager.js - WebRTC lifecycle, Star topology
// ============================================

/**
 * Manages WebRTC PeerConnections in a Star topology.
 * Host maintains up to N-1 connections (one per client).
 * Clients maintain exactly one connection (to the host).
 */

const DEFAULT_ICE_SERVERS = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
];

export class PeerConnectionManager {
    constructor(options = {}) {
        this.isHost = !!options.isHost;
        this.iceServers = options.iceServers || DEFAULT_ICE_SERVERS;
        this._peers = new Map();
        this._listeners = new Map();
        this._dataChannelManager = options.dataChannelManager || null;
    }

    async createOffer(peerId) {
        const pc = this._createPeerConnection(peerId);

        if (this._dataChannelManager) {
            this._dataChannelManager.createChannels(peerId, pc);
        }

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        await this._waitForIceGathering(pc);

        return pc.localDescription;
    }

    async handleOffer(peerId, offer) {
        const pc = this._createPeerConnection(peerId);

        pc.ondatachannel = (event) => {
            if (this._dataChannelManager) {
                this._dataChannelManager.handleIncomingChannel(peerId, event.channel);
            }
        };

        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        await this._waitForIceGathering(pc);

        return pc.localDescription;
    }

    async handleAnswer(peerId, answer) {
        const pc = this._peers.get(peerId);
        if (!pc) return;
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
    }

    async addIceCandidate(peerId, candidate) {
        const pc = this._peers.get(peerId);
        if (!pc) return;
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
    }

    _createPeerConnection(peerId) {
        if (this._peers.has(peerId)) {
            this._peers.get(peerId).close();
        }

        const pc = new RTCPeerConnection({ iceServers: this.iceServers });
        this._peers.set(peerId, pc);

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                this._emit('iceCandidate', { peerId, candidate: event.candidate });
            }
        };

        pc.onconnectionstatechange = () => {
            const state = pc.connectionState;
            this._emit('connectionStateChange', { peerId, state });
            if (state === 'connected') {
                this._emit('peerConnected', { peerId });
            }
            if (state === 'disconnected' || state === 'failed' || state === 'closed') {
                this._emit('peerDisconnected', { peerId, state });
            }
        };

        return pc;
    }

    _waitForIceGathering(pc, timeout = 3000) {
        return new Promise((resolve) => {
            if (pc.iceGatheringState === 'complete') {
                resolve();
                return;
            }
            const timer = setTimeout(resolve, timeout);
            pc.onicegatheringstatechange = () => {
                if (pc.iceGatheringState === 'complete') {
                    clearTimeout(timer);
                    resolve();
                }
            };
        });
    }

    getConnection(peerId) {
        return this._peers.get(peerId) || null;
    }

    getAllPeerIds() {
        return Array.from(this._peers.keys());
    }

    get peerCount() {
        return this._peers.size;
    }

    closePeer(peerId) {
        const pc = this._peers.get(peerId);
        if (pc) {
            pc.close();
            this._peers.delete(peerId);
        }
        if (this._dataChannelManager) {
            this._dataChannelManager.closeChannels(peerId);
        }
    }

    on(event, handler) {
        if (!this._listeners.has(event)) {
            this._listeners.set(event, []);
        }
        this._listeners.get(event).push(handler);
    }

    off(event, handler) {
        const handlers = this._listeners.get(event);
        if (!handlers) return;
        const index = handlers.indexOf(handler);
        if (index >= 0) handlers.splice(index, 1);
    }

    _emit(event, data) {
        const handlers = this._listeners.get(event);
        if (handlers) {
            for (const handler of handlers) {
                handler(data);
            }
        }
    }

    dispose() {
        for (const [peerId, pc] of this._peers) {
            pc.close();
        }
        this._peers.clear();
        this._listeners.clear();
    }
}
