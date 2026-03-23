import { createDefaultStorageDriver } from './StorageDriver.js';
import { StorageMigrationRegistry } from './StorageMigrationRegistry.js';

function toJson(value) {
    try {
        return JSON.stringify(value);
    } catch {
        return null;
    }
}

function parseJson(rawValue, fallbackValue = null) {
    try {
        return JSON.parse(rawValue);
    } catch {
        return fallbackValue;
    }
}

export class StoragePlatform {
    constructor(options = {}) {
        this.driver = options.driver || createDefaultStorageDriver(options);
        this.migrationRegistry = options.migrationRegistry || new StorageMigrationRegistry({ driver: this.driver });
        this.onQuotaExceeded = typeof options.onQuotaExceeded === 'function'
            ? options.onQuotaExceeded
            : null;
    }

    readRaw(primaryKey, legacyKeys = []) {
        return this.migrationRegistry.resolve(primaryKey, legacyKeys);
    }

    readJson(primaryKey, legacyKeys = [], fallbackValue = null) {
        const resolved = this.readRaw(primaryKey, legacyKeys);
        if (!resolved) return fallbackValue;
        this.migrationRegistry.migrate(primaryKey, resolved);
        return parseJson(resolved.raw, fallbackValue);
    }

    writeRaw(key, rawValue) {
        const result = this.driver.writeRaw(key, rawValue);
        if (!result.ok && result.quotaExceeded && this.onQuotaExceeded) {
            this.onQuotaExceeded({
                key,
                reason: result.reason,
                quotaExceeded: true,
            });
        }
        return result;
    }

    writeJson(key, value) {
        const serialized = toJson(value);
        if (typeof serialized !== 'string') {
            return { ok: false, reason: 'serialize_failed', quotaExceeded: false };
        }
        return this.writeRaw(key, serialized);
    }

    remove(key) {
        return this.driver.remove(key);
    }
}

export function createDefaultStoragePlatform(options = {}) {
    return new StoragePlatform(options);
}
