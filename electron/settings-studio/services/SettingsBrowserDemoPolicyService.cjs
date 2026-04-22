const fs = require('node:fs/promises');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const BROWSER_DEMO_POLICY_OVERRIDE_FILE_NAME = 'browser-demo-surface-policy.override.json';

let cachedBrowserDemoPolicyContractPromise = null;

function loadBrowserDemoPolicyContractModule() {
    if (cachedBrowserDemoPolicyContractPromise) {
        return cachedBrowserDemoPolicyContractPromise;
    }

    const contractModuleUrl = pathToFileURL(
        path.resolve(
            __dirname,
            '..',
            '..',
            '..',
            'src',
            'shared',
            'contracts',
            'BrowserDemoSurfacePolicyOverrideContract.js'
        )
    ).href;

    cachedBrowserDemoPolicyContractPromise = import(contractModuleUrl);
    return cachedBrowserDemoPolicyContractPromise;
}

class SettingsBrowserDemoPolicyService {
    constructor({ app }) {
        this.app = app;
        this.fileName = BROWSER_DEMO_POLICY_OVERRIDE_FILE_NAME;
    }

    getOverrideFilePath() {
        return path.join(this.app.getPath('userData'), this.fileName);
    }

    toJsonString(value) {
        return `${JSON.stringify(value, null, 2)}\n`;
    }

    async createDraft() {
        const moduleApi = await loadBrowserDemoPolicyContractModule();
        return moduleApi.createBrowserDemoSurfacePolicyOverrideDraft();
    }

    async validateDraft(draft) {
        const moduleApi = await loadBrowserDemoPolicyContractModule();
        return moduleApi.validateBrowserDemoSurfacePolicyOverrideDraft(draft);
    }

    async classifyMigration(draft) {
        const moduleApi = await loadBrowserDemoPolicyContractModule();
        const migration = moduleApi.classifyBrowserDemoSurfacePolicyOverrideMigration(draft);
        const migrated = moduleApi.migrateBrowserDemoSurfacePolicyOverrideDraft(draft, migration);
        return { ...migration, migrated };
    }

    async readRawFile() {
        try {
            return await fs.readFile(this.getOverrideFilePath(), 'utf-8');
        } catch (error) {
            if (error && error.code === 'ENOENT') {
                return '';
            }
            throw error;
        }
    }

    async loadDraft({ fallbackDraft }) {
        const filePath = this.getOverrideFilePath();
        try {
            const raw = await fs.readFile(filePath, 'utf-8');
            const parsed = JSON.parse(raw);
            return {
                exists: true,
                path: filePath,
                raw,
                draft: parsed,
                error: null,
            };
        } catch (error) {
            if (error && error.code === 'ENOENT') {
                return {
                    exists: false,
                    path: filePath,
                    raw: '',
                    draft: fallbackDraft,
                    error: null,
                };
            }
            return {
                exists: true,
                path: filePath,
                raw: '',
                draft: fallbackDraft,
                error: error instanceof Error ? error.message : String(error || 'Datei konnte nicht gelesen werden.'),
            };
        }
    }

    async saveDraft(draft) {
        const filePath = this.getOverrideFilePath();
        const dirPath = path.dirname(filePath);
        await fs.mkdir(dirPath, { recursive: true });

        const tempPath = `${filePath}.tmp.${process.pid}.${Date.now()}`;
        await fs.writeFile(tempPath, this.toJsonString(draft), 'utf-8');

        try {
            await fs.rename(tempPath, filePath);
        } catch (error) {
            if (error && (error.code === 'EEXIST' || error.code === 'EPERM')) {
                await fs.rm(filePath, { force: true });
                await fs.rename(tempPath, filePath);
            } else {
                await fs.rm(tempPath, { force: true });
                throw error;
            }
        }

        return {
            path: filePath,
            savedAt: Date.now(),
        };
    }
}

module.exports = {
    SettingsBrowserDemoPolicyService,
    BROWSER_DEMO_POLICY_OVERRIDE_FILE_NAME,
};
