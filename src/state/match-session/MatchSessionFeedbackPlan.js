import { CUSTOM_MAP_KEY } from '../../entities/MapSchema.js';

export function deriveMapResolutionFeedbackPlan({ mapResolution, portalsEnabled, arenaBuildResult = null }) {
    const consoleEntries = [];
    const toasts = [];

    if (!mapResolution) {
        return { consoleEntries, toasts };
    }

    if (mapResolution.error) {
        consoleEntries.push({
            level: 'warn',
            args: ['[Game] Map loading fallback:', mapResolution.error],
        });
    }
    if (Array.isArray(mapResolution.warnings) && mapResolution.warnings.length > 0) {
        consoleEntries.push({
            level: 'warn',
            args: ['[Game] Map loading warnings:', mapResolution.warnings],
        });
    }
    if (Array.isArray(arenaBuildResult?.glbLoadWarnings) && arenaBuildResult.glbLoadWarnings.length > 0) {
        consoleEntries.push({
            level: 'warn',
            args: ['[Game] GLB map loading warnings:', arenaBuildResult.glbLoadWarnings],
        });
    }

    if (mapResolution.isFallback && mapResolution.requestedMapKey === CUSTOM_MAP_KEY) {
        toasts.push({
            message: 'Custom-Map ungueltig, Standard-Map geladen',
            durationMs: 2600,
            tone: 'error',
        });
    } else if (mapResolution.isFallback) {
        toasts.push({
            message: `Map-Fallback aktiv: ${mapResolution.effectiveMapKey}`,
            durationMs: 2200,
            tone: 'error',
        });
    } else if (mapResolution.isCustom && Array.isArray(mapResolution.warnings) && mapResolution.warnings.length > 0) {
        const extraCount = Math.max(0, mapResolution.warnings.length - 1);
        const suffix = extraCount > 0 ? ` (+${extraCount} Hinweis(e) in Konsole)` : '';
        toasts.push({
            message: `Custom-Map Hinweis: ${mapResolution.warnings[0]}${suffix}`,
            durationMs: 3600,
            tone: 'info',
        });
    }
    if (arenaBuildResult?.glbLoadError) {
        toasts.push({
            message: 'GLB-Map konnte nicht geladen werden, Box-Fallback aktiv',
            durationMs: 2600,
            tone: 'error',
        });
    }

    if (mapResolution.isCustom && mapResolution.mapDocument && mapResolution.mapDefinition) {
        const runtimeObstacleCount = Array.isArray(mapResolution.mapDefinition.obstacles)
            ? mapResolution.mapDefinition.obstacles.length
            : 0;
        const runtimePortalCount = Array.isArray(mapResolution.mapDefinition.portals)
            ? mapResolution.mapDefinition.portals.length
            : 0;
        const runtimeGateCount = Array.isArray(mapResolution.mapDefinition.gates)
            ? mapResolution.mapDefinition.gates.length
            : 0;
        if (runtimeObstacleCount === 0 && runtimePortalCount > 0 && runtimeGateCount === 0 && !portalsEnabled) {
            toasts.push({
                message: 'Custom-Map hat nur Portale, aber Portale sind im Menue deaktiviert.',
                durationMs: 3400,
                tone: 'error',
            });
        }
    }

    return { consoleEntries, toasts };
}
