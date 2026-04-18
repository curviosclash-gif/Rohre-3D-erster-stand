const fs = require('node:fs/promises');
const path = require('node:path');

function createTimestampLabel() {
    return new Date()
        .toISOString()
        .replaceAll(':', '-')
        .replaceAll('.', '-');
}

function parseCreatedAtFromFileName(fileName) {
    const match = String(fileName || '').match(/(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z)/);
    if (!match) return 0;
    const normalized = match[1].replace(/-(\d{2})-(\d{2})-(\d{2})-(\d{3})Z$/, ':$1:$2.$3Z');
    return Date.parse(normalized) || 0;
}

function sanitizeBackupFileName(fileName) {
    const normalized = String(fileName || '').trim();
    if (!normalized) return '';
    if (normalized.includes('/') || normalized.includes('\\')) return '';
    if (!normalized.endsWith('.json')) return '';
    return normalized;
}

class SettingsBackupService {
    constructor({ app }) {
        this.app = app;
        this.backupDirName = 'settings-studio-backups';
    }

    getBackupDirectoryPath() {
        return path.join(this.app.getPath('userData'), this.backupDirName);
    }

    async ensureBackupDirectory() {
        await fs.mkdir(this.getBackupDirectoryPath(), { recursive: true });
    }

    async createBackup({ content, reason = 'save' }) {
        await this.ensureBackupDirectory();
        const timestamp = createTimestampLabel();
        const safeReason = String(reason || 'save')
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9_-]+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '') || 'save';
        const fileName = `menu-defaults.override.${timestamp}.${safeReason}.json`;
        const targetPath = path.join(this.getBackupDirectoryPath(), fileName);
        await fs.writeFile(targetPath, String(content || ''), 'utf-8');
        return {
            fileName,
            path: targetPath,
            createdAt: Date.now(),
        };
    }

    async listBackups({ limit = 20 } = {}) {
        await this.ensureBackupDirectory();
        const dirPath = this.getBackupDirectoryPath();
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        const backups = entries
            .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
            .map((entry) => ({
                fileName: entry.name,
                path: path.join(dirPath, entry.name),
                createdAt: parseCreatedAtFromFileName(entry.name),
            }))
            .sort((left, right) => right.createdAt - left.createdAt)
            .slice(0, Math.max(1, Number(limit) || 20));
        return backups;
    }

    async readBackupFile(fileName) {
        const safeName = sanitizeBackupFileName(fileName);
        if (!safeName) {
            throw new Error('Ungueltiger Backup-Dateiname.');
        }
        const filePath = path.join(this.getBackupDirectoryPath(), safeName);
        return fs.readFile(filePath, 'utf-8');
    }
}

module.exports = {
    SettingsBackupService,
};
