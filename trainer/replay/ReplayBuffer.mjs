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

// Sum-Tree for O(log n) prioritized sampling
class SumTree {
    constructor(capacity) {
        this.capacity = capacity;
        this._tree = new Float64Array(2 * capacity);
        this._maxPriority = 1.0;
    }

    get total() {
        return this._tree[1];
    }

    update(leafIndex, priority) {
        const treeIndex = leafIndex + this.capacity;
        const delta = priority - this._tree[treeIndex];
        this._tree[treeIndex] = priority;
        let parent = treeIndex >> 1;
        while (parent >= 1) {
            this._tree[parent] += delta;
            parent >>= 1;
        }
        if (priority > this._maxPriority) {
            this._maxPriority = priority;
        }
    }

    sample(value) {
        let index = 1;
        while (index < this.capacity) {
            const left = 2 * index;
            const right = left + 1;
            if (value <= this._tree[left]) {
                index = left;
            } else {
                value -= this._tree[left];
                index = right;
            }
        }
        const leafIndex = index - this.capacity;
        return {
            leafIndex,
            priority: this._tree[index],
        };
    }
}

export class ReplayBuffer {
    constructor(options = {}) {
        this.capacity = toPositiveInt(options.capacity, 20_000);
        this.prioritized = options.prioritized === true;
        this.alpha = Math.max(0, Math.min(1, Number(options.alpha) || 0.6));
        this.betaStart = Math.max(0, Math.min(1, Number(options.betaStart) || 0.4));
        this.betaEnd = Math.max(0, Math.min(1, Number(options.betaEnd) || 1.0));
        this.betaAnnealSteps = toPositiveInt(options.betaAnnealSteps, 100_000);
        this._entries = new Array(this.capacity);
        this._size = 0;
        this._nextIndex = 0;
        this._rngState = toPositiveInt(options.seed, 13_337) >>> 0;
        this._samplingSteps = 0;
        this._sumTree = this.prioritized ? new SumTree(this.capacity) : null;
    }

    get size() {
        return this._size;
    }

    _nextRandomFloat() {
        this._rngState = (1664525 * this._rngState + 1013904223) >>> 0;
        return this._rngState / 4294967296;
    }

    _nextRandomInt(limit) {
        if (!Number.isInteger(limit) || limit <= 0) return 0;
        this._rngState = (1664525 * this._rngState + 1013904223) >>> 0;
        return this._rngState % limit;
    }

    _currentBeta() {
        const progress = Math.min(1, this._samplingSteps / this.betaAnnealSteps);
        return this.betaStart + (this.betaEnd - this.betaStart) * progress;
    }

    push(transition) {
        const cloned = cloneTransition(transition);
        const index = this._nextIndex;
        const replaced = this._size === this.capacity && this._entries[index] !== undefined;
        this._entries[index] = cloned;
        if (this._sumTree) {
            this._sumTree.update(index, this._sumTree._maxPriority ** this.alpha);
        }
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

    updatePriority(index, tdError) {
        if (!this._sumTree || index < 0 || index >= this._size) return;
        const priority = (Math.abs(tdError) + 1e-6) ** this.alpha;
        this._sumTree.update(index, priority);
    }

    sample(count = 1) {
        const targetCount = Math.max(0, Math.min(this._size, Math.trunc(Number(count) || 0)));
        if (targetCount <= 0) return [];

        if (!this._sumTree || !this.prioritized) {
            // Uniform sampling (original behavior)
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

        // Prioritized sampling with importance sampling weights
        this._samplingSteps += 1;
        const beta = this._currentBeta();
        const total = this._sumTree.total;
        if (total <= 0) return [];
        const segmentSize = total / targetCount;
        const sampled = [];
        const minPriority = (1e-6) ** this.alpha;
        const maxWeight = (this._size * minPriority / total) ** (-beta);

        for (let i = 0; i < targetCount; i++) {
            const low = segmentSize * i;
            const high = segmentSize * (i + 1);
            const value = low + this._nextRandomFloat() * (high - low);
            const { leafIndex, priority } = this._sumTree.sample(Math.min(value, total - 1e-8));
            if (leafIndex >= this._size || !this._entries[leafIndex]) continue;
            const cloned = cloneTransition(this._entries[leafIndex]);
            const prob = priority / total;
            const weight = (this._size * prob) ** (-beta);
            cloned._replayIndex = leafIndex;
            cloned._isWeight = weight / maxWeight;
            sampled.push(cloned);
        }
        return sampled;
    }

    getStats() {
        return {
            capacity: this.capacity,
            size: this._size,
            fillRatio: this.capacity > 0 ? this._size / this.capacity : 0,
            nextWriteIndex: this._nextIndex,
            prioritized: this.prioritized,
            beta: this.prioritized ? this._currentBeta() : null,
        };
    }
}
