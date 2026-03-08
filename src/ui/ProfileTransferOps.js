function requireCallback(fn, name) {
    if (typeof fn !== 'function') {
        throw new TypeError(`${name} callback is required`);
    }
    return fn;
}

function cloneSettingsPayload(settings) {
    return JSON.parse(JSON.stringify(settings || {}));
}

export const PROFILE_EXPORT_CONTRACT_VERSION = 'profile-export.v1';

export function exportProfileAsJson(profile) {
    if (!profile || typeof profile !== 'object') {
        throw new TypeError('profile is required');
    }

    return JSON.stringify({
        contractVersion: PROFILE_EXPORT_CONTRACT_VERSION,
        exportedAt: Date.now(),
        profile: {
            name: String(profile.name || '').trim(),
            updatedAt: Number(profile.updatedAt || Date.now()),
            isDefault: Boolean(profile.isDefault),
            settings: cloneSettingsPayload(profile.settings),
        },
    }, null, 2);
}

export function parseProfileImport(inputValue, options = {}) {
    const normalizeProfileName = requireCallback(options.normalizeProfileName, 'normalizeProfileName');
    const rawInput = String(inputValue || '').trim();
    if (!rawInput) {
        return { success: false, error: 'Kein Profil-Import vorhanden' };
    }

    let parsed;
    try {
        parsed = JSON.parse(rawInput);
    } catch {
        return { success: false, error: 'Profil-Import ist kein gueltiges JSON' };
    }

    const candidate = parsed?.profile && typeof parsed.profile === 'object'
        ? parsed.profile
        : parsed;
    const name = normalizeProfileName(candidate?.name || '');
    if (!name) {
        return { success: false, error: 'Profilname fehlt im Import' };
    }

    return {
        success: true,
        profile: {
            name,
            updatedAt: Number(candidate?.updatedAt || Date.now()),
            isDefault: Boolean(candidate?.isDefault),
            settings: cloneSettingsPayload(candidate?.settings),
        },
    };
}
