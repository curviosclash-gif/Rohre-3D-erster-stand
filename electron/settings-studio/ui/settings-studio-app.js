import { createTranslator, normalizeLanguage, SECTIONS } from './settings-studio-i18n.js';
import {
    renderSectionForm,
    renderPresetsSection,
    renderLimitsSection,
    countSectionDirtyFields,
} from './settings-studio-form-renderer.js';

const state = {
    language: 'de',
    draft: null,
    baseDraft: null,
    schema: null,
    validation: null,
    paths: null,
    activeSection: 'baseSettings',
};

const refs = {
    title: document.querySelector('[data-bind="title"]'),
    languageLabel: document.querySelector('[data-bind="language-label"]'),
    languageSelect: document.querySelector('[data-bind="language-select"]'),
    sidebarNav: document.querySelector('[data-bind="sidebar-nav"]'),
    sectionTitle: document.querySelector('[data-bind="section-title"]'),
    changeBadge: document.querySelector('[data-bind="change-count"]'),
    resetSectionBtn: document.querySelector('[data-action="reset-section"]'),
    resetAllBtn: document.querySelector('[data-action="reset-all"]'),
    validateBtn: document.querySelector('[data-action="validate"]'),
    saveBtn: document.querySelector('[data-action="save"]'),
    formContent: document.querySelector('[data-bind="form-content"]'),
    status: document.querySelector('[data-bind="status"]'),
};

function t(key, ...args) {
    return createTranslator(state.language)(key, ...args);
}

function setStatus(msg) {
    refs.status.textContent = typeof msg === 'string' ? msg : t(msg);
}

function deepClone(v) {
    return JSON.parse(JSON.stringify(v));
}

function readPath(obj, path) {
    const parts = String(path || '').split('.');
    let cur = obj;
    for (const p of parts) {
        if (cur == null || typeof cur !== 'object') return undefined;
        cur = cur[p];
    }
    return cur;
}

function writePath(obj, path, value) {
    const parts = String(path || '').split('.');
    let cur = obj;
    for (let i = 0; i < parts.length - 1; i++) {
        if (cur[parts[i]] == null || typeof cur[parts[i]] !== 'object') cur[parts[i]] = {};
        cur = cur[parts[i]];
    }
    cur[parts[parts.length - 1]] = value;
}

function renderStaticTexts() {
    refs.title.textContent = t('title');
    refs.languageLabel.textContent = t('languageLabel');
    refs.resetSectionBtn.textContent = t('buttonResetSection');
    refs.resetAllBtn.textContent = t('buttonResetAll');
    refs.validateBtn.textContent = t('buttonValidate');
    refs.saveBtn.textContent = t('buttonSave');
}

function renderSidebar() {
    const items = SECTIONS.map((section) => {
        const label = t(section.labelKey);
        const active = section.key === state.activeSection ? 'active' : '';
        const dirtyCount = state.draft && state.baseDraft
            ? countSectionDirtyFields(section.key, state.schema, state.draft, state.baseDraft)
            : 0;
        const dirtyDot = dirtyCount > 0 ? '<span class="nav-dirty"></span>' : '';
        return `<li class="nav-item"><button class="nav-btn ${active}" data-nav-section="${section.key}" type="button">${label}${dirtyDot}</button></li>`;
    });
    refs.sidebarNav.innerHTML = items.join('');
}

function renderFormContent() {
    if (!state.draft || !state.schema) {
        refs.formContent.textContent = '';
        return;
    }

    const section = SECTIONS.find((s) => s.key === state.activeSection);
    refs.sectionTitle.textContent = section ? t(section.labelKey) : state.activeSection;

    let html;
    if (state.activeSection === 'limits') {
        html = renderLimitsSection(state.schema, state.draft, state.baseDraft, createTranslator(state.language));
    } else if (state.activeSection === 'fixedPresets') {
        html = renderPresetsSection(state.draft, state.baseDraft, createTranslator(state.language));
    } else {
        html = renderSectionForm(state.activeSection, state.schema, state.draft, state.baseDraft, createTranslator(state.language));
    }

    refs.formContent.innerHTML = html;
    updateChangeBadge();
}

function updateChangeBadge() {
    if (!state.draft || !state.baseDraft) {
        refs.changeBadge.hidden = true;
        return;
    }
    const count = countSectionDirtyFields(state.activeSection, state.schema, state.draft, state.baseDraft);
    if (count > 0) {
        refs.changeBadge.textContent = t('changeBadge', count);
        refs.changeBadge.hidden = false;
    } else {
        refs.changeBadge.hidden = true;
    }
}

function renderAll() {
    renderStaticTexts();
    renderSidebar();
    renderFormContent();
}

async function loadState() {
    setStatus('statusLoading');
    const response = await window.settingsStudioApi.load();
    state.draft = response?.draft ? deepClone(response.draft) : null;
    state.baseDraft = response?.draft ? deepClone(response.draft) : null;
    state.schema = response?.schema || null;
    state.validation = response?.validation || null;
    state.paths = response?.paths || null;
    state.language = normalizeLanguage(state.draft?.language || state.language);
    refs.languageSelect.value = state.language;
    renderAll();
    setStatus(state.validation?.valid ? 'statusValid' : 'statusInvalid');
}

async function validateState() {
    if (!state.draft) return;
    setStatus('statusLoading');
    const response = await window.settingsStudioApi.validate(state.draft);
    state.validation = response?.validation || state.validation;
    if (response?.draft) state.draft = deepClone(response.draft);
    renderFormContent();
    setStatus(state.validation?.valid ? 'statusValid' : 'statusInvalid');
}

async function saveState() {
    if (!state.draft) return;
    setStatus('statusLoading');
    const response = await window.settingsStudioApi.save(state.draft);
    if (response?.ok) {
        state.baseDraft = deepClone(state.draft);
        state.validation = response?.validation || state.validation;
    }
    renderAll();
    setStatus(response?.ok ? 'statusSaved' : 'statusInvalid');
}

function onFieldChange(event) {
    const target = event.target;
    const path = target.dataset?.path;
    if (!path || !state.draft) return;

    let value;
    const dataType = target.dataset?.type || 'string';

    if (dataType === 'boolean') {
        value = target.checked;
    } else if (dataType === 'number') {
        value = target.value === '' ? null : Number(target.value);
    } else if (dataType === 'json') {
        try { value = JSON.parse(target.value); } catch { return; }
    } else {
        value = target.value;
    }

    writePath(state.draft, path, value);

    const row = target.closest('.field-row');
    if (row) {
        const isDirtyNow = JSON.stringify(readPath(state.draft, path)) !== JSON.stringify(readPath(state.baseDraft, path));
        row.classList.toggle('dirty', isDirtyNow);
        const resetBtn = row.querySelector('[data-action="reset-field"]');
        if (resetBtn) {
            if (isDirtyNow) resetBtn.setAttribute('data-dirty', 'true');
            else resetBtn.removeAttribute('data-dirty');
        }
        target.dataset.dirty = isDirtyNow ? 'true' : '';
    }

    updateChangeBadge();
    renderSidebar();
}

function onLimitChange(event) {
    const target = event.target;
    const limitPath = target.dataset?.limitPath;
    const limitKey = target.dataset?.limitKey;
    if (!limitPath || !limitKey || !state.draft) return;

    if (!state.draft.limitOverrides) state.draft.limitOverrides = {};
    if (!state.draft.limitOverrides[limitPath]) state.draft.limitOverrides[limitPath] = {};

    const raw = target.value;
    if (raw === '' || raw == null) {
        delete state.draft.limitOverrides[limitPath][limitKey];
        if (!Object.keys(state.draft.limitOverrides[limitPath]).length) {
            delete state.draft.limitOverrides[limitPath];
        }
    } else {
        state.draft.limitOverrides[limitPath][limitKey] = Number(raw);
    }

    const row = target.closest('tr');
    if (row) {
        const override = state.draft.limitOverrides?.[limitPath] || {};
        const baseOverride = state.baseDraft?.limitOverrides?.[limitPath] || {};
        const dirty = JSON.stringify(override) !== JSON.stringify(baseOverride);
        row.classList.toggle('dirty', dirty);
    }

    updateChangeBadge();
    renderSidebar();
}

function onResetField(target) {
    const path = target.dataset?.path;
    if (!path || !state.draft || !state.baseDraft) return;

    const baseValue = readPath(state.baseDraft, path);
    writePath(state.draft, path, baseValue != null ? deepClone(baseValue) : baseValue);

    const row = target.closest('.field-row');
    if (row) {
        row.classList.remove('dirty');
        target.removeAttribute('data-dirty');
        const input = row.querySelector('[data-path]');
        if (input) {
            if (input.type === 'checkbox') input.checked = !!baseValue;
            else if (input.tagName === 'TEXTAREA') input.value = JSON.stringify(baseValue, null, 2);
            else input.value = baseValue ?? '';
            input.removeAttribute('data-dirty');
        }
    }

    updateChangeBadge();
    renderSidebar();
}

function onResetSection() {
    if (!state.draft || !state.baseDraft) return;
    const sectionKey = state.activeSection;

    if (sectionKey === 'limits') {
        state.draft.limitOverrides = deepClone(state.baseDraft.limitOverrides || {});
    } else if (sectionKey === 'fixedPresets') {
        state.draft.fixedPresets = deepClone(state.baseDraft.fixedPresets || []);
    } else {
        if (state.baseDraft[sectionKey] !== undefined) {
            state.draft[sectionKey] = deepClone(state.baseDraft[sectionKey]);
        }
    }

    renderFormContent();
    renderSidebar();
}

function onResetAll() {
    if (!state.baseDraft) return;
    state.draft = deepClone(state.baseDraft);
    renderAll();
}

function onNavSection(sectionKey) {
    state.activeSection = sectionKey;
    renderSidebar();
    renderFormContent();
}

async function onLanguageChange(event) {
    const nextLanguage = normalizeLanguage(event?.target?.value || 'de');
    state.language = nextLanguage;
    if (state.draft && typeof state.draft === 'object') state.draft.language = nextLanguage;
    await window.settingsStudioApi.setLanguage(nextLanguage).catch(() => null);
    renderAll();
    setStatus('statusReady');
}

function onPresetFieldChange(event) {
    const target = event.target;
    const path = target.dataset?.path;
    if (!path || !state.draft) return;

    let value;
    if (target.type === 'checkbox') value = target.checked;
    else if (target.type === 'number') value = target.value === '' ? null : Number(target.value);
    else value = target.value;

    const parts = path.split('.');
    const idx = parseInt(parts[1], 10);
    const key = parts[2];
    if (!isNaN(idx) && key && Array.isArray(state.draft.fixedPresets)) {
        state.draft.fixedPresets[idx][key] = value;
        updateChangeBadge();
        renderSidebar();
    }
}

function bindEvents() {
    refs.formContent.addEventListener('change', (event) => {
        if (event.target.dataset?.limitPath) return onLimitChange(event);
        if (event.target.closest('.preset-body')) return onPresetFieldChange(event);
        onFieldChange(event);
    });

    refs.formContent.addEventListener('click', (event) => {
        const btn = event.target.closest('[data-action="reset-field"]');
        if (btn) onResetField(btn);
    });

    refs.sidebarNav.addEventListener('click', (event) => {
        const btn = event.target.closest('[data-nav-section]');
        if (btn) onNavSection(btn.dataset.navSection);
    });

    refs.resetSectionBtn.addEventListener('click', onResetSection);
    refs.resetAllBtn.addEventListener('click', onResetAll);

    refs.validateBtn.addEventListener('click', () => {
        void validateState().catch((err) => setStatus(`${t('statusError')}: ${err.message}`));
    });

    refs.saveBtn.addEventListener('click', () => {
        void saveState().catch((err) => setStatus(`${t('statusError')}: ${err.message}`));
    });

    refs.languageSelect.addEventListener('change', (event) => {
        void onLanguageChange(event).catch((err) => setStatus(`${t('statusError')}: ${err.message}`));
    });
}

function bootstrap() {
    renderStaticTexts();
    setStatus('statusReady');
    bindEvents();
    void loadState().catch((err) => setStatus(`${t('statusError')}: ${err.message}`));
}

bootstrap();
