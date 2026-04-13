import { PLATFORM_SURFACE_QUICK_START_ACTION_IDS } from '../../shared/contracts/PlatformCapabilityRegistry.js';
import {
    isSurfaceModePathAllowed,
    isSurfaceQuickStartActionAllowed,
    resolveSurfaceFallbackModePath,
} from '../../shared/contracts/PlatformSurfacePolicyOps.js';

export function syncMenuSurfacePolicyUi({
    ui,
    settings,
    sessionType,
    surfacePolicy = null,
    huntFeatureEnabled = true,
}) {
    let modePath = String(settings?.localSettings?.modePath || 'normal').toLowerCase();
    if (surfacePolicy && !isSurfaceModePathAllowed(modePath, {
        productSurfaceId: surfacePolicy.productSurfaceId,
    })) {
        modePath = resolveSurfaceFallbackModePath({
            productSurfaceId: surfacePolicy.productSurfaceId,
        });
        if (settings?.localSettings) {
            settings.localSettings.modePath = modePath;
        }
    }

    if (Array.isArray(ui.sessionButtons)) {
        ui.sessionButtons.forEach((button) => {
            const buttonSessionType = String(button?.dataset?.sessionType || '').trim().toLowerCase();
            const isActive = buttonSessionType === sessionType;
            button.classList.toggle('active', isActive);
            button.setAttribute('aria-pressed', String(isActive));
        });
    }

    if (Array.isArray(ui.modePathButtons)) {
        ui.modePathButtons.forEach((button) => {
            const buttonModePath = String(button?.dataset?.modePath || '').trim().toLowerCase();
            const surfaceAllowed = !surfacePolicy || isSurfaceModePathAllowed(buttonModePath, {
                productSurfaceId: surfacePolicy.productSurfaceId,
            });
            const isActive = buttonModePath === modePath;
            const disabledByFeatureFlag = buttonModePath === 'fight' && !huntFeatureEnabled;
            button.classList.toggle('active', isActive);
            button.classList.toggle('hidden', !surfaceAllowed);
            button.setAttribute('aria-pressed', String(isActive));
            button.setAttribute('aria-hidden', String(!surfaceAllowed));
            button.disabled = !surfaceAllowed || disabledByFeatureFlag;
            button.title = disabledByFeatureFlag ? 'Fight ist per Feature-Flag deaktiviert' : '';
        });
    }

    const quickStartButtons = [{ button: ui.quickStartLastButton, actionId: PLATFORM_SURFACE_QUICK_START_ACTION_IDS.LAST_SETTINGS }, { button: ui.quickStartEventPlaylistButton, actionId: PLATFORM_SURFACE_QUICK_START_ACTION_IDS.EVENT_PLAYLIST }, { button: ui.quickStartRandomButton, actionId: PLATFORM_SURFACE_QUICK_START_ACTION_IDS.RANDOM_MAP }];
    let visibleQuickStartCount = 0;
    quickStartButtons.forEach(({ button, actionId }) => {
        if (!button) {
            return;
        }
        const surfaceAllowed = !surfacePolicy || isSurfaceQuickStartActionAllowed(actionId, {
            productSurfaceId: surfacePolicy.productSurfaceId,
        });
        button.classList.toggle('hidden', !surfaceAllowed);
        button.setAttribute('aria-hidden', String(!surfaceAllowed));
        button.disabled = !surfaceAllowed;
        if (surfaceAllowed) {
            visibleQuickStartCount += 1;
        }
    });

    const quickStartSection = ui.quickStartLastButton?.closest('.menu-section') || ui.quickStartEventPlaylistButton?.closest('.menu-section') || ui.quickStartRandomButton?.closest('.menu-section') || null;
    if (quickStartSection) {
        quickStartSection.classList.toggle('hidden', visibleQuickStartCount === 0);
        quickStartSection.setAttribute('aria-hidden', String(visibleQuickStartCount === 0));
    }

    return { modePath };
}
