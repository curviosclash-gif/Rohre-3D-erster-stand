function toSeed(value, fallback = 1) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback >>> 0;
    const integer = Math.trunc(numeric) >>> 0;
    if (integer === 0) return fallback >>> 0;
    return integer;
}

export class SeededRng {
    constructor(seed = 1) {
        this._state = toSeed(seed, 1);
    }

    nextUint32() {
        this._state = (1664525 * this._state + 1013904223) >>> 0;
        return this._state;
    }

    nextFloat() {
        return this.nextUint32() / 4294967296;
    }

    nextRange(min, max) {
        if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) {
            return Number.isFinite(min) ? min : 0;
        }
        return min + (max - min) * this.nextFloat();
    }

    nextInt(maxExclusive) {
        const max = Number.isInteger(maxExclusive) ? maxExclusive : 0;
        if (max <= 0) return 0;
        return Math.floor(this.nextFloat() * max);
    }
}
