function normalizeKey(value) {
    const normalized = typeof value === 'string' ? value.trim() : '';
    return normalized;
}

export class StorageMigrationRegistry {
    constructor(options = {}) {
        this.driver = options.driver || null;
    }

    resolve(primaryKey, legacyKeys = []) {
        const normalizedPrimaryKey = normalizeKey(primaryKey);
        if (!normalizedPrimaryKey || !this.driver) return null;

        const candidates = [
            normalizedPrimaryKey,
            ...legacyKeys.map((entry) => normalizeKey(entry)).filter((entry) => entry.length > 0),
        ];
        for (const candidate of candidates) {
            const result = this.driver.readRaw(candidate);
            if (!result.ok || typeof result.value !== 'string' || result.value.length === 0) {
                continue;
            }
            return {
                key: candidate,
                raw: result.value,
                migrated: candidate !== normalizedPrimaryKey,
            };
        }
        return null;
    }

    migrate(primaryKey, resolvedEntry) {
        const normalizedPrimaryKey = normalizeKey(primaryKey);
        if (!normalizedPrimaryKey || !resolvedEntry || !this.driver) return false;
        if (resolvedEntry.key === normalizedPrimaryKey) return false;
        const write = this.driver.writeRaw(normalizedPrimaryKey, resolvedEntry.raw);
        return write.ok;
    }
}
