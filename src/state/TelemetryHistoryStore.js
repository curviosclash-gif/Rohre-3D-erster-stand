// ============================================
// TelemetryHistoryStore.js - IndexedDB-based persistent telemetry
// for cross-session comparison (max 500 entries, auto-pruning)
// ============================================

const DB_NAME = 'cuviosclash-telemetry';
const DB_VERSION = 1;
const STORE_NAME = 'rounds';
const MAX_ENTRIES = 500;
const PRUNE_BATCH = 50;

function openDb() {
    return new Promise((resolve, reject) => {
        if (typeof indexedDB === 'undefined') {
            reject(new Error('IndexedDB not available'));
            return;
        }
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
                store.createIndex('at', 'at', { unique: false });
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

function toNonNegativeNumber(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function toNonNegativeInt(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : fallback;
}

function sanitizeString(value, fallback = '') {
    return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function normalizeEntry(source) {
    const s = source && typeof source === 'object' ? source : {};
    return {
        at: sanitizeString(s.at, new Date().toISOString()),
        mapKey: sanitizeString(s.mapKey, 'unknown'),
        mode: sanitizeString(s.mode, 'classic'),
        winnerType: sanitizeString(s.winnerType, 'draw'),
        winnerLabel: sanitizeString(s.winnerLabel, 'Unbekannt'),
        duration: toNonNegativeNumber(s.duration),
        selfCollisions: toNonNegativeInt(s.selfCollisions),
        itemUses: toNonNegativeInt(s.itemUses),
        stuckEvents: toNonNegativeInt(s.stuckEvents),
    };
}

export class TelemetryHistoryStore {
    constructor() {
        this._dbPromise = null;
    }

    _getDb() {
        if (!this._dbPromise) {
            this._dbPromise = openDb().catch(() => null);
        }
        return this._dbPromise;
    }

    async recordRound(payload) {
        const db = await this._getDb();
        if (!db) return false;

        const entry = normalizeEntry(payload);

        return new Promise((resolve) => {
            try {
                const tx = db.transaction(STORE_NAME, 'readwrite');
                const store = tx.objectStore(STORE_NAME);
                store.add(entry);
                tx.oncomplete = () => {
                    this._pruneIfNeeded(db).then(() => resolve(true));
                };
                tx.onerror = () => resolve(false);
            } catch {
                resolve(false);
            }
        });
    }

    async _pruneIfNeeded(db) {
        return new Promise((resolve) => {
            try {
                const tx = db.transaction(STORE_NAME, 'readwrite');
                const store = tx.objectStore(STORE_NAME);
                const countReq = store.count();
                countReq.onsuccess = () => {
                    const total = countReq.result;
                    if (total <= MAX_ENTRIES) {
                        resolve();
                        return;
                    }
                    const deleteCount = total - MAX_ENTRIES + PRUNE_BATCH;
                    const cursor = store.openCursor();
                    let deleted = 0;
                    cursor.onsuccess = (event) => {
                        const c = event.target.result;
                        if (c && deleted < deleteCount) {
                            c.delete();
                            deleted++;
                            c.continue();
                        } else {
                            resolve();
                        }
                    };
                    cursor.onerror = () => resolve();
                };
                countReq.onerror = () => resolve();
            } catch {
                resolve();
            }
        });
    }

    async getCount() {
        const db = await this._getDb();
        if (!db) return 0;

        return new Promise((resolve) => {
            try {
                const tx = db.transaction(STORE_NAME, 'readonly');
                const store = tx.objectStore(STORE_NAME);
                const req = store.count();
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => resolve(0);
            } catch {
                resolve(0);
            }
        });
    }

    async getSummary() {
        const db = await this._getDb();
        if (!db) return this._emptySummary();

        return new Promise((resolve) => {
            try {
                const tx = db.transaction(STORE_NAME, 'readonly');
                const store = tx.objectStore(STORE_NAME);
                const req = store.getAll();
                req.onsuccess = () => {
                    const rows = req.result || [];
                    resolve(this._computeSummary(rows));
                };
                req.onerror = () => resolve(this._emptySummary());
            } catch {
                resolve(this._emptySummary());
            }
        });
    }

    _computeSummary(rows) {
        if (!rows.length) return this._emptySummary();

        let totalDuration = 0;
        let humanWins = 0;
        let botWins = 0;
        let totalSelfCollisions = 0;
        let totalItemUses = 0;
        let totalStuckEvents = 0;
        const mapCounts = {};
        const modeCounts = {};

        for (let i = 0; i < rows.length; i++) {
            const r = rows[i];
            totalDuration += toNonNegativeNumber(r.duration);
            totalSelfCollisions += toNonNegativeInt(r.selfCollisions);
            totalItemUses += toNonNegativeInt(r.itemUses);
            totalStuckEvents += toNonNegativeInt(r.stuckEvents);
            if (r.winnerType === 'human') humanWins++;
            if (r.winnerType === 'bot') botWins++;

            const mk = sanitizeString(r.mapKey, 'unknown');
            mapCounts[mk] = (mapCounts[mk] || 0) + 1;

            const md = sanitizeString(r.mode, 'classic');
            modeCounts[md] = (modeCounts[md] || 0) + 1;
        }

        const rounds = rows.length;
        return {
            rounds,
            humanWins,
            botWins,
            humanWinRate: rounds > 0 ? humanWins / rounds : 0,
            botWinRate: rounds > 0 ? botWins / rounds : 0,
            averageDuration: rounds > 0 ? totalDuration / rounds : 0,
            selfCollisionsPerRound: rounds > 0 ? totalSelfCollisions / rounds : 0,
            itemUsesPerRound: rounds > 0 ? totalItemUses / rounds : 0,
            stuckEventsPerRound: rounds > 0 ? totalStuckEvents / rounds : 0,
            topMaps: this._topEntries(mapCounts, 3),
            topModes: this._topEntries(modeCounts, 3),
        };
    }

    _topEntries(counts, limit) {
        return Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([key, count]) => ({ key, count }));
    }

    _emptySummary() {
        return {
            rounds: 0,
            humanWins: 0,
            botWins: 0,
            humanWinRate: 0,
            botWinRate: 0,
            averageDuration: 0,
            selfCollisionsPerRound: 0,
            itemUsesPerRound: 0,
            stuckEventsPerRound: 0,
            topMaps: [],
            topModes: [],
        };
    }

    async clear() {
        const db = await this._getDb();
        if (!db) return false;

        return new Promise((resolve) => {
            try {
                const tx = db.transaction(STORE_NAME, 'readwrite');
                tx.objectStore(STORE_NAME).clear();
                tx.oncomplete = () => resolve(true);
                tx.onerror = () => resolve(false);
            } catch {
                resolve(false);
            }
        });
    }
}
