const path = require('node:path');
const { pathToFileURL } = require('node:url');

let cachedContractModulePromise = null;

function loadContractModule() {
    if (cachedContractModulePromise) {
        return cachedContractModulePromise;
    }

    const contractModuleUrl = pathToFileURL(
        path.resolve(__dirname, '..', '..', '..', 'src', 'core', 'settings', 'SettingsOverrideContract.js')
    ).href;

    cachedContractModulePromise = import(contractModuleUrl);
    return cachedContractModulePromise;
}

async function getSchemaDescriptor() {
    const contractModule = await loadContractModule();
    return contractModule.createSettingsStudioSchemaDescriptor();
}

async function createDraft() {
    const contractModule = await loadContractModule();
    return contractModule.createSettingsOverrideDraft();
}

async function validateDraft(draft) {
    const contractModule = await loadContractModule();
    return contractModule.validateSettingsOverrideDraft(draft);
}

module.exports = {
    createDraft,
    getSchemaDescriptor,
    validateDraft,
};
