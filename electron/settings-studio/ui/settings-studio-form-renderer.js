import { fieldLabel, categoryLabel, translateValidationError } from './settings-studio-i18n.js';

function readPath(obj, path) {
    const parts = String(path || '').split('.');
    let cur = obj;
    for (const p of parts) {
        if (cur == null || typeof cur !== 'object') return undefined;
        cur = cur[p];
    }
    return cur;
}

function esc(value) {
    return String(value ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function isDirty(draft, baseDraft, path) {
    const a = readPath(draft, path);
    const b = readPath(baseDraft, path);
    if (a === b) return false;
    if (typeof a === 'object' || typeof b === 'object') {
        return JSON.stringify(a) !== JSON.stringify(b);
    }
    return true;
}

function renderFieldInput(field, value, dirty) {
    const { path, type, limits } = field;
    const dirtyAttr = dirty ? 'data-dirty="true"' : '';

    if (type === 'boolean') {
        const checked = value ? 'checked' : '';
        return `<input class="field-input field-input--check" type="checkbox" data-path="${esc(path)}" data-type="boolean" ${checked} ${dirtyAttr} />`;
    }

    if (type === 'number') {
        const min = limits?.min != null ? `min="${esc(limits.min)}"` : '';
        const max = limits?.max != null ? `max="${esc(limits.max)}"` : '';
        const step = limits?.step != null ? `step="${esc(limits.step)}"` : 'step="any"';
        return `<input class="field-input" type="number" data-path="${esc(path)}" data-type="number" value="${esc(value ?? '')}" ${min} ${max} ${step} ${dirtyAttr} />`;
    }

    if (type === 'string') {
        return `<input class="field-input" type="text" data-path="${esc(path)}" data-type="string" value="${esc(value ?? '')}" ${dirtyAttr} />`;
    }

    const jsonValue = value != null ? JSON.stringify(value, null, 2) : '';
    return `<textarea class="field-input field-input--textarea" data-path="${esc(path)}" data-type="json" ${dirtyAttr}>${esc(jsonValue)}</textarea>`;
}

function renderFieldError(fieldErrors, t) {
    if (!fieldErrors || !fieldErrors.length) return '';
    const messages = fieldErrors.map((e) => `<span class="field-error">${esc(translateValidationError(e, t))}</span>`).join('');
    return `<div class="field-error-list">${messages}</div>`;
}

function renderFieldRow(field, draft, baseDraft, t, validationErrors) {
    const value = readPath(draft, field.path);
    const dirty = isDirty(draft, baseDraft, field.path);
    const fieldErrors = Array.isArray(validationErrors)
        ? validationErrors.filter((e) => e.path === field.path)
        : [];
    const hasError = fieldErrors.length > 0;
    const label = fieldLabel(field.path);
    const input = renderFieldInput(field, value, dirty);
    const classes = ['field-row', dirty ? 'dirty' : '', hasError ? 'has-error' : ''].filter(Boolean).join(' ');
    const resetBtn = `<button class="field-reset-btn" data-action="reset-field" data-path="${esc(field.path)}" ${dirty ? 'data-dirty="true"' : ''}>${t('buttonResetField')}</button>`;
    const errorHtml = renderFieldError(fieldErrors, t);
    return `<div class="${classes}"><span class="field-label" title="${esc(field.path)}">${esc(label)}</span>${input}${resetBtn}${errorHtml}</div>`;
}

function renderFieldGroup(category, fields, draft, baseDraft, t, validationErrors) {
    const rows = fields.map((f) => renderFieldRow(f, draft, baseDraft, t, validationErrors)).join('');
    const title = categoryLabel(category, t);
    return `<div class="field-group"><h3 class="field-group__title">${esc(title)}</h3>${rows}</div>`;
}

export function renderSectionForm(sectionKey, schema, draft, baseDraft, t, validationErrors) {
    const fields = Array.isArray(schema?.fields)
        ? schema.fields.filter((f) => f.section === sectionKey)
        : [];

    if (!fields.length) {
        const sectionValue = draft ? draft[sectionKey] : null;
        if (sectionValue != null) {
            const jsonStr = JSON.stringify(sectionValue, null, 2);
            const dirty = isDirty(draft, baseDraft, sectionKey);
            const dirtyAttr = dirty ? 'data-dirty="true"' : '';
            return `<div class="field-group"><textarea class="field-input field-input--textarea" style="width:100%;height:300px;" data-path="${esc(sectionKey)}" data-type="json" ${dirtyAttr}>${esc(jsonStr)}</textarea></div>`;
        }
        return `<div class="field-group"><em>${esc(t('noFields'))}</em></div>`;
    }

    const groups = new Map();
    for (const field of fields) {
        const cat = field.category || sectionKey;
        if (!groups.has(cat)) groups.set(cat, []);
        groups.get(cat).push(field);
    }

    return [...groups.entries()]
        .map(([cat, catFields]) => renderFieldGroup(cat, catFields, draft, baseDraft, t, validationErrors))
        .join('');
}

export function renderPresetsSection(draft, baseDraft, t) {
    const presets = Array.isArray(draft?.fixedPresets) ? draft.fixedPresets : [];
    const basePresets = Array.isArray(baseDraft?.fixedPresets) ? baseDraft.fixedPresets : [];

    if (!presets.length) {
        return `<div class="field-group"><em>${esc(t('noPresets'))}</em></div>`;
    }

    const items = presets.map((preset, idx) => {
        const basePreset = basePresets[idx] || {};
        const presetDirty = JSON.stringify(preset) !== JSON.stringify(basePreset);
        const itemClass = presetDirty ? 'preset-item dirty' : 'preset-item';

        const fields = typeof preset === 'object' && preset !== null
            ? Object.entries(preset).filter(([, v]) => typeof v !== 'object')
            : [];

        const rows = fields.map(([key, value]) => {
            const path = `fixedPresets.${idx}.${key}`;
            const baseValue = basePreset[key];
            const fieldDirty = JSON.stringify(value) !== JSON.stringify(baseValue);
            const inputType = typeof value === 'boolean' ? 'checkbox'
                : typeof value === 'number' ? 'number' : 'text';
            const dirtyAttr = fieldDirty ? 'data-dirty="true"' : '';
            let input;
            if (inputType === 'checkbox') {
                input = `<input type="checkbox" data-path="${esc(path)}" data-type="boolean" ${value ? 'checked' : ''} ${dirtyAttr} />`;
            } else {
                input = `<input class="field-input" type="${inputType}" data-path="${esc(path)}" data-type="${inputType === 'number' ? 'number' : 'string'}" value="${esc(value)}" ${dirtyAttr} />`;
            }
            return `<div class="preset-field-row"><span class="field-label">${esc(key)}</span>${input}</div>`;
        }).join('');

        const id = esc(preset?.id || `preset-${idx}`);
        return `<div class="${itemClass}" data-preset-idx="${idx}"><div class="preset-header">${id}${presetDirty ? ' <span class="nav-dirty"></span>' : ''}</div><div class="preset-body">${rows}</div></div>`;
    });

    return `<div class="preset-list">${items.join('')}</div>`;
}

export function renderLimitsSection(schema, draft, baseDraft, t) {
    const fields = Array.isArray(schema?.fields)
        ? schema.fields.filter((f) => f.type === 'number')
        : [];

    if (!fields.length) return '<em>Keine numerischen Felder.</em>';

    const overrides = draft?.limitOverrides || {};
    const baseOverrides = baseDraft?.limitOverrides || {};

    const rows = fields.map((field) => {
        const override = overrides[field.path] || {};
        const baseOverride = baseOverrides[field.path] || {};
        const def = field.limits || {};

        const activeMin = override.min != null ? override.min : (def.min ?? '');
        const activeMax = override.max != null ? override.max : (def.max ?? '');
        const activeStep = override.step != null ? override.step : (def.step ?? '');

        const dirty = JSON.stringify(override) !== JSON.stringify(baseOverride);
        const rowClass = dirty ? 'dirty' : '';

        const minInput = `<input class="limits-input" type="number" step="any" data-limit-path="${esc(field.path)}" data-limit-key="min" value="${esc(activeMin)}" />`;
        const maxInput = `<input class="limits-input" type="number" step="any" data-limit-path="${esc(field.path)}" data-limit-key="max" value="${esc(activeMax)}" />`;
        const stepInput = `<input class="limits-input" type="number" step="any" min="0" data-limit-path="${esc(field.path)}" data-limit-key="step" value="${esc(activeStep)}" />`;

        const defStr = `${def.min ?? '?'} / ${def.max ?? '?'} / ${def.step ?? '?'}`;
        return `<tr class="${rowClass}"><td title="${esc(field.path)}">${esc(fieldLabel(field.path))}</td><td><small style="color:var(--muted)">${esc(defStr)}</small></td><td>${minInput}</td><td>${maxInput}</td><td>${stepInput}</td></tr>`;
    });

    return `<table class="limits-table"><thead><tr><th>${t('limitsColField')}</th><th>${t('limitsColDefault')}</th><th>${t('limitsColMin')}</th><th>${t('limitsColMax')}</th><th>${t('limitsColStep')}</th></tr></thead><tbody>${rows.join('')}</tbody></table>`;
}

export function countSectionDirtyFields(sectionKey, schema, draft, baseDraft) {
    if (sectionKey === 'limits') {
        const overrides = draft?.limitOverrides || {};
        const baseOverrides = baseDraft?.limitOverrides || {};
        return Object.keys(overrides).filter(
            (k) => JSON.stringify(overrides[k]) !== JSON.stringify(baseOverrides[k])
        ).length;
    }
    if (sectionKey === 'fixedPresets') {
        const a = draft?.fixedPresets;
        const b = baseDraft?.fixedPresets;
        return JSON.stringify(a) !== JSON.stringify(b) ? 1 : 0;
    }
    const fields = Array.isArray(schema?.fields)
        ? schema.fields.filter((f) => f.section === sectionKey)
        : [];
    if (!fields.length) {
        return isDirty(draft, baseDraft, sectionKey) ? 1 : 0;
    }
    return fields.filter((f) => isDirty(draft, baseDraft, f.path)).length;
}
