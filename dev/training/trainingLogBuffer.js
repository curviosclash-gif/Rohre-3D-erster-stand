export const DEFAULT_TRAINING_LOG_CAPACITY = 500;

function normalizeCapacity(capacity) {
    const numeric = Number(capacity);
    if (!Number.isInteger(numeric) || numeric < 1) {
        throw new TypeError('Training log buffer capacity must be a positive integer.');
    }
    return numeric;
}

function normalizeSince(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric < 0) return 0;
    return Math.floor(numeric);
}

export function createTrainingLogBuffer(options = {}) {
    return new TrainingLogBuffer(options);
}

export class TrainingLogBuffer {
    constructor({ capacity = DEFAULT_TRAINING_LOG_CAPACITY, now = () => Date.now() } = {}) {
        this.capacity = normalizeCapacity(capacity);
        this.now = typeof now === 'function' ? now : () => Date.now();
        this.entries = new Array(this.capacity);
        this.start = 0;
        this.size = 0;
        this.nextIndex = 0;
    }

    append(source, text) {
        const emitted = [];
        const lines = String(text).split(/\r?\n/);

        for (const line of lines) {
            if (!line) continue;
            const entry = {
                i: this.nextIndex++,
                t: this.now(),
                s: source,
                text: line,
            };

            this.writeEntry(entry);
            emitted.push(entry);
        }

        return emitted;
    }

    writeEntry(entry) {
        if (this.size < this.capacity) {
            const writeIndex = (this.start + this.size) % this.capacity;
            this.entries[writeIndex] = entry;
            this.size++;
            return;
        }

        this.entries[this.start] = entry;
        this.start = (this.start + 1) % this.capacity;
    }

    getLines() {
        const lines = [];
        for (let offset = 0; offset < this.size; offset++) {
            lines.push(this.entries[(this.start + offset) % this.capacity]);
        }
        return lines;
    }

    getLinesSince(since = 0) {
        const minIndex = normalizeSince(since);
        return this.getLines().filter((entry) => entry.i >= minIndex);
    }

    get totalLines() {
        return this.nextIndex;
    }

    get retainedLines() {
        return this.size;
    }
}
