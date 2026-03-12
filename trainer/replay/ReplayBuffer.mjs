function toPositiveInt(value, fallback) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    const integer = Math.trunc(numeric);
    return integer > 0 ? integer : fallback;
}

function cloneTransition(transition) {
    if (!transition || typeof transition !== 'object') return null;
    return {
        ...transition,
        state: Array.isArray(transition.state) ? [...transition.state] : [],
        nextState: Array.isArray(transition.nextState) ? [...transition.nextState] : [],
        action: transition.action && typeof transition.action === 'object'
            ? { ...transition.action }
            : {},
        info: transition.info && typeof transition.info === 'object'
            ? { ...transition.info }
            : {},
    };
}

export class ReplayBuffer {
    constructor(options = {}) {
        this.capacity = toPositiveInt(options.capacity, 20_000);
        this._entries = new Array(this.capacity);
        this._size = 0;
        this._nextIndex = 0;
        this._rngState = toPositiveInt(options.seed, 13_337) >>> 0;
    }

    get size() {
        return this._size;
    }

    _nextRandomInt(limit) {
        if (!Number.isInteger(limit) || limit <= 0) return 0;
        this._rngState = (1664525 * this._rngState + 1013904223) >>> 0;
        return this._rngState % limit;
    }

    push(transition) {
        const cloned = cloneTransition(transition);
        const index = this._nextIndex;
        const replaced = this._size === this.capacity && this._entries[index] !== undefined;
        this._entries[index] = cloned;
        this._nextIndex = (index + 1) % this.capacity;
        if (this._size < this.capacity) {
            this._size += 1;
        }
        return {
            size: this._size,
            capacity: this.capacity,
            index,
            replaced,
            fillRatio: this._size / this.capacity,
        };
    }

    sample(count = 1) {
        const targetCount = Math.max(0, Math.min(this._size, Math.trunc(Number(count) || 0)));
        if (targetCount <= 0) return [];
        const selected = new Set();
        const sampled = [];
        while (sampled.length < targetCount && selected.size < this._size) {
            const index = this._nextRandomInt(this._size);
            if (selected.has(index)) continue;
            selected.add(index);
            sampled.push(cloneTransition(this._entries[index]));
        }
        return sampled;
    }

    getStats() {
        return {
            capacity: this.capacity,
            size: this._size,
            fillRatio: this.capacity > 0 ? this._size / this.capacity : 0,
            nextWriteIndex: this._nextIndex,
        };
    }
}
