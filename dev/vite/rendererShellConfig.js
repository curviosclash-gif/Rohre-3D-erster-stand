import path from 'path';

const PLAYWRIGHT_WARMUP_CLIENT_FILES = [
    './src/core/main.js',
    './src/core/**/*.js',
    './src/state/**/*.js',
    './src/ui/**/*.js',
    './src/composition/core-ui/**/*.js',
    './src/hunt/**/*.js',
    './src/entities/MapSchema.js',
    './src/entities/Particles.js',
    './src/entities/mapSchema/**/*.js',
    './src/shared/contracts/**/*.js',
    './src/shared/runtime/**/*.js',
];

const RENDERER_INPUT_FILES = {
    app: 'index.html',
    editorMap3d: 'editor/map-editor-3d.html',
};

function resolvePlaywrightWarmupClientFiles(env = process.env) {
    return env?.PW_RUN_TAG ? PLAYWRIGHT_WARMUP_CLIENT_FILES : [];
}

function resolveRendererManualChunk(id) {
    if (!id) return undefined;
    if (id.includes('node_modules/three/examples/jsm/loaders/OBJLoader.js') ||
        id.includes('node_modules/three/examples/jsm/loaders/MTLLoader.js')) {
        return 'three-loaders';
    }
    if (id.includes('node_modules/three')) {
        return 'three-core';
    }

    const normalizedId = id.replace(/\\/g, '/');
    if (normalizedId.includes('/entities/ai/training/') ||
        normalizedId.includes('/state/training/')) {
        return 'training';
    }
    if (normalizedId.includes('/state/validation/')) {
        return 'validation';
    }
    if (normalizedId.includes('/trainer/') && !normalizedId.includes('node_modules')) {
        return 'trainer';
    }
    if (normalizedId.includes('/state/recorder/')) {
        return 'recorder';
    }
    if (normalizedId.includes('/config/maps/MapPresetCatalog') ||
        normalizedId.includes('/config/maps/MapPresetCatalogBaseData') ||
        normalizedId.includes('/config/maps/MapPresetCatalogExpertData') ||
        normalizedId.includes('/config/maps/MapPresetCatalogLarge') ||
        normalizedId.includes('/config/maps/presets/')) {
        return 'map-presets';
    }
    if (normalizedId.includes('/menu/MenuTelemetryDashboard') ||
        normalizedId.includes('/menu/MenuTelemetryStore') ||
        normalizedId.includes('/state/TelemetryHistoryStore')) {
        return 'developer-ui';
    }

    return undefined;
}

export function createRendererShellServerConfig(env = process.env) {
    const warmupClientFiles = resolvePlaywrightWarmupClientFiles(env);

    return {
        open: !env?.PW_RUN_TAG && !env?.CI,
        warmup: warmupClientFiles.length > 0
            ? { clientFiles: warmupClientFiles }
            : undefined,
    };
}

export function createRendererShellBuildConfig({ rootDir, chunkSizeWarningLimit }) {
    return {
        chunkSizeWarningLimit,
        rollupOptions: {
            input: Object.fromEntries(
                Object.entries(RENDERER_INPUT_FILES).map(([entryName, relativePath]) => [
                    entryName,
                    path.resolve(rootDir, relativePath),
                ])
            ),
            output: {
                manualChunks: resolveRendererManualChunk,
            },
        },
    };
}

export function createRendererBuildDefines({ pkgVersion, buildTime, buildId, env = process.env }) {
    return {
        __APP_VERSION__: JSON.stringify(pkgVersion),
        __BUILD_TIME__: JSON.stringify(buildTime),
        __BUILD_ID__: JSON.stringify(buildId),
        __APP_MODE__: JSON.stringify(env?.VITE_APP_MODE || 'web'),
        __SIGNALING_URL__: JSON.stringify(env?.VITE_SIGNALING_URL || ''),
        __TURN_URL__: JSON.stringify(env?.VITE_TURN_URL || ''),
        __TURN_USERNAME__: JSON.stringify(env?.VITE_TURN_USER || env?.VITE_TURN_USERNAME || ''),
        __TURN_CREDENTIAL__: JSON.stringify(env?.VITE_TURN_CREDENTIAL || ''),
    };
}
