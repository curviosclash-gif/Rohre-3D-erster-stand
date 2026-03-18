// ============================================
// DataChannelManager.js - WebRTC data channel setup and routing
// ============================================

/**
 * Manages two data channels per peer:
 * - "inputs" (unreliable, unordered) — Client → Host, 60/s
 * - "state"  (reliable, ordered)     — Host → Client, 10/s
 */
export class DataChannelManager {
    constructor() {
        this._channels = new Map();
        this._listeners = new Map();
    }

    createChannels(peerId, peerConnection) {
        const inputChannel = peerConnection.createDataChannel('inputs', {
            ordered: false,
            maxRetransmits: 0,
        });
        const stateChannel = peerConnection.createDataChannel('state', {
            ordered: true,
            maxRetransmits: 5,
        });

        this._setupChannel(peerId, 'inputs', inputChannel);
        this._setupChannel(peerId, 'state', stateChannel);
    }

    handleIncomingChannel(peerId, channel) {
        const name = channel.label;
        if (name === 'inputs' || name === 'state') {
            this._setupChannel(peerId, name, channel);
        }
    }

    _setupChannel(peerId, name, channel) {
        const key = `${peerId}:${name}`;
        this._channels.set(key, channel);

        channel.onopen = () => {
            this._emit('channelOpen', { peerId, channel: name });
        };
        channel.onclose = () => {
            this._emit('channelClose', { peerId, channel: name });
        };
        channel.onerror = (err) => {
            this._emit('channelError', { peerId, channel: name, error: err });
        };
        channel.onmessage = (event) => {
            let data;
            try {
                data = JSON.parse(event.data);
            } catch {
                return;
            }
            this._emit('message', { peerId, channel: name, data });
        };
    }

    send(peerId, channelName, data) {
        const key = `${peerId}:${channelName}`;
        const channel = this._channels.get(key);
        if (!channel || channel.readyState !== 'open') return false;

        try {
            channel.send(JSON.stringify(data));
            return true;
        } catch {
            return false;
        }
    }

    sendToAll(channelName, data, excludePeerId) {
        const json = JSON.stringify(data);
        for (const [key, channel] of this._channels) {
            if (!key.endsWith(`:${channelName}`)) continue;
            if (excludePeerId && key.startsWith(`${excludePeerId}:`)) continue;
            if (channel.readyState !== 'open') continue;
            try {
                channel.send(json);
            } catch {
                // skip failed sends
            }
        }
    }

    getChannel(peerId, channelName) {
        return this._channels.get(`${peerId}:${channelName}`) || null;
    }

    closeChannels(peerId) {
        for (const [key, channel] of this._channels) {
            if (key.startsWith(`${peerId}:`)) {
                channel.close();
                this._channels.delete(key);
            }
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
        for (const channel of this._channels.values()) {
            channel.close();
        }
        this._channels.clear();
        this._listeners.clear();
    }
}
