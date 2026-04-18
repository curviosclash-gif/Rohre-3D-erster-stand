const schemaService = require('../services/SettingsSchemaService.cjs');
const { SettingsOverrideFileService } = require('../services/SettingsOverrideFileService.cjs');
const { SettingsBackupService } = require('../services/SettingsBackupService.cjs');

const CHANNELS = Object.freeze({
    load: 'settings-studio:load',
    validate: 'settings-studio:validate',
    save: 'settings-studio:save',
    listBackups: 'settings-studio:list-backups',
    restoreBackup: 'settings-studio:restore-backup',
    getSchema: 'settings-studio:get-schema',
    setLanguage: 'settings-studio:set-language',
});

const SUPPORTED_LANGUAGES = new Set(['de', 'en']);

function normalizeLanguage(language) {
    const normalized = String(language || 'de').trim().toLowerCase();
    return SUPPORTED_LANGUAGES.has(normalized) ? normalized : 'de';
}

function createValidationSnapshot(validationResult) {
    const result = validationResult || {};
    return {
        valid: result.valid === true,
        errors: Array.isArray(result.errors) ? result.errors : [],
        warnings: Array.isArray(result.warnings) ? result.warnings : [],
    };
}

function registerSettingsStudioIpc({ ipcMain, app }) {
    const fileService = new SettingsOverrideFileService({ app });
    const backupService = new SettingsBackupService({ app });

    ipcMain.handle(CHANNELS.load, async () => {
        const schema = await schemaService.getSchemaDescriptor();
        const fallbackDraft = await schemaService.createDraft();
        const loaded = await fileService.loadDraft({ fallbackDraft });
        const validation = await schemaService.validateDraft(loaded.draft);
        const backups = await backupService.listBackups({ limit: 20 });

        return {
            ok: true,
            draft: validation.normalizedDraft,
            validation: createValidationSnapshot(validation),
            schema,
            paths: {
                overrideFilePath: fileService.getOverrideFilePath(),
                backupDirectoryPath: backupService.getBackupDirectoryPath(),
            },
            fileState: {
                exists: loaded.exists,
                loadError: loaded.error || null,
            },
            backups,
        };
    });

    ipcMain.handle(CHANNELS.validate, async (_event, draft) => {
        const validation = await schemaService.validateDraft(draft);
        return {
            ok: true,
            draft: validation.normalizedDraft,
            validation: createValidationSnapshot(validation),
        };
    });

    ipcMain.handle(CHANNELS.save, async (_event, draft) => {
        const validation = await schemaService.validateDraft(draft);
        const validationSnapshot = createValidationSnapshot(validation);
        if (!validationSnapshot.valid) {
            return {
                ok: false,
                draft: validation.normalizedDraft,
                validation: validationSnapshot,
            };
        }

        const existingRaw = await fileService.readRawFile();
        const backupPayload = existingRaw || fileService.toJsonString(validation.normalizedDraft);
        const backup = await backupService.createBackup({
            content: backupPayload,
            reason: 'pre-save',
        });

        const saveState = await fileService.saveDraft(validation.normalizedDraft);
        return {
            ok: true,
            draft: validation.normalizedDraft,
            validation: validationSnapshot,
            saveState,
            backup,
        };
    });

    ipcMain.handle(CHANNELS.listBackups, async (_event, options = {}) => {
        const backups = await backupService.listBackups({
            limit: Number(options?.limit || 20),
        });
        return {
            ok: true,
            backups,
        };
    });

    ipcMain.handle(CHANNELS.restoreBackup, async (_event, backupFileName) => {
        const backupContent = await backupService.readBackupFile(backupFileName);
        const parsed = JSON.parse(backupContent);
        const validation = await schemaService.validateDraft(parsed);
        const validationSnapshot = createValidationSnapshot(validation);
        if (!validationSnapshot.valid) {
            return {
                ok: false,
                draft: validation.normalizedDraft,
                validation: validationSnapshot,
            };
        }

        const existingRaw = await fileService.readRawFile();
        if (existingRaw) {
            await backupService.createBackup({
                content: existingRaw,
                reason: 'pre-restore',
            });
        }

        const saveState = await fileService.saveDraft(validation.normalizedDraft);
        return {
            ok: true,
            draft: validation.normalizedDraft,
            validation: validationSnapshot,
            saveState,
        };
    });

    ipcMain.handle(CHANNELS.getSchema, async () => {
        const schema = await schemaService.getSchemaDescriptor();
        return {
            ok: true,
            schema,
        };
    });

    ipcMain.handle(CHANNELS.setLanguage, async (_event, language) => {
        return {
            ok: true,
            language: normalizeLanguage(language),
        };
    });

    return () => {
        for (const channel of Object.values(CHANNELS)) {
            ipcMain.removeHandler(channel);
        }
    };
}

module.exports = {
    registerSettingsStudioIpc,
};
