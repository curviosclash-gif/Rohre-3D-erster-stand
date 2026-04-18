import { createTranslator, normalizeLanguage } from './settings-studio-i18n.js';
import { renderDraftSummary } from './settings-studio-form-renderer.js';
import { renderLimitsSummary } from './settings-studio-limits-renderer.js';

const state = {
    language: 'de',
    draft: null,
    schema: null,
    validation: null,
    paths: null,
};

const refs = {
    title: document.querySelector('[data-bind="title"]'),
    subtitle: document.querySelector('[data-bind="subtitle"]'),
    languageLabel: document.querySelector('[data-bind="language-label"]'),
    languageSelect: document.querySelector('[data-bind="language-select"]'),
    buttonReload: document.querySelector('[data-action="reload"]'),
    buttonValidate: document.querySelector('[data-action="validate"]'),
    buttonSave: document.querySelector('[data-action="save"]'),
    status: document.querySelector('[data-bind="status"]'),
    draftTitle: document.querySelector('[data-bind="draft-title"]'),
    limitsTitle: document.querySelector('[data-bind="limits-title"]'),
    validationTitle: document.querySelector('[data-bind="validation-title"]'),
    draftOutput: document.querySelector('[data-bind="draft-output"]'),
    limitsOutput: document.querySelector('[data-bind="limits-output"]'),
    validationOutput: document.querySelector('[data-bind="validation-output"]'),
    pathsOutput: document.querySelector('[data-bind="paths-output"]'),
};

function getTranslator() {
    return createTranslator(state.language);
}

function setStatus(messageKey, fallback = '') {
    const t = getTranslator();
    refs.status.textContent = t(messageKey) || fallback || '';
}

function renderStaticTexts() {
    const t = getTranslator();
    refs.title.textContent = t('title');
    refs.subtitle.textContent = t('subtitle');
    refs.languageLabel.textContent = t('languageLabel');
    refs.buttonReload.textContent = t('buttonReload');
    refs.buttonValidate.textContent = t('buttonValidate');
    refs.buttonSave.textContent = t('buttonSave');
    refs.draftTitle.textContent = t('sectionDraft');
    refs.limitsTitle.textContent = t('sectionLimits');
    refs.validationTitle.textContent = t('sectionValidation');
}

function renderOutputs() {
    refs.draftOutput.textContent = renderDraftSummary(state.draft, state.schema);
    refs.limitsOutput.textContent = renderLimitsSummary(state.draft, state.schema);

    const validation = state.validation || { valid: false, errors: [], warnings: [] };
    const lines = [];
    lines.push(`valid: ${validation.valid === true}`);
    lines.push(`errors: ${Array.isArray(validation.errors) ? validation.errors.length : 0}`);
    lines.push(`warnings: ${Array.isArray(validation.warnings) ? validation.warnings.length : 0}`);
    lines.push('');

    const firstErrors = Array.isArray(validation.errors) ? validation.errors.slice(0, 12) : [];
    if (firstErrors.length) {
        lines.push('errors:');
        for (const entry of firstErrors) {
            lines.push(`- [${entry.code}] ${entry.path}: ${entry.message}`);
        }
    }

    const firstWarnings = Array.isArray(validation.warnings) ? validation.warnings.slice(0, 6) : [];
    if (firstWarnings.length) {
        lines.push('');
        lines.push('warnings:');
        for (const entry of firstWarnings) {
            lines.push(`- [${entry.code}] ${entry.path}: ${entry.message}`);
        }
    }

    refs.validationOutput.textContent = lines.join('\n');

    if (state.paths) {
        refs.pathsOutput.textContent = [
            `override: ${state.paths.overrideFilePath || ''}`,
            `backups: ${state.paths.backupDirectoryPath || ''}`,
        ].join('\n');
    } else {
        refs.pathsOutput.textContent = '';
    }
}

async function loadState() {
    setStatus('statusLoading');
    const response = await window.settingsStudioApi.load();
    state.draft = response?.draft || null;
    state.schema = response?.schema || null;
    state.validation = response?.validation || null;
    state.paths = response?.paths || null;
    state.language = normalizeLanguage(state.draft?.language || state.language);
    refs.languageSelect.value = state.language;
    renderStaticTexts();
    renderOutputs();
    setStatus(state.validation?.valid ? 'statusValid' : 'statusInvalid');
}

async function validateState() {
    if (!state.draft) return;
    const response = await window.settingsStudioApi.validate(state.draft);
    state.draft = response?.draft || state.draft;
    state.validation = response?.validation || state.validation;
    renderOutputs();
    setStatus(state.validation?.valid ? 'statusValid' : 'statusInvalid');
}

async function saveState() {
    if (!state.draft) return;
    const response = await window.settingsStudioApi.save(state.draft);
    state.draft = response?.draft || state.draft;
    state.validation = response?.validation || state.validation;
    renderOutputs();
    setStatus(response?.ok ? 'statusSaved' : 'statusInvalid');
}

async function onLanguageChange(event) {
    const nextLanguage = normalizeLanguage(event?.target?.value || 'de');
    state.language = nextLanguage;
    if (state.draft && typeof state.draft === 'object') {
        state.draft.language = nextLanguage;
    }
    await window.settingsStudioApi.setLanguage(nextLanguage);
    renderStaticTexts();
    renderOutputs();
    setStatus('statusReady');
}

function bindEvents() {
    refs.buttonReload.addEventListener('click', () => {
        void loadState().catch((error) => {
            refs.status.textContent = `${getTranslator()('statusError')}: ${error.message}`;
        });
    });
    refs.buttonValidate.addEventListener('click', () => {
        void validateState().catch((error) => {
            refs.status.textContent = `${getTranslator()('statusError')}: ${error.message}`;
        });
    });
    refs.buttonSave.addEventListener('click', () => {
        void saveState().catch((error) => {
            refs.status.textContent = `${getTranslator()('statusError')}: ${error.message}`;
        });
    });
    refs.languageSelect.addEventListener('change', (event) => {
        void onLanguageChange(event).catch((error) => {
            refs.status.textContent = `${getTranslator()('statusError')}: ${error.message}`;
        });
    });
}

function bootstrap() {
    renderStaticTexts();
    setStatus('statusReady');
    bindEvents();
    void loadState().catch((error) => {
        refs.status.textContent = `${getTranslator()('statusError')}: ${error.message}`;
    });
}

bootstrap();
