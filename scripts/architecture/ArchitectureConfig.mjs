export function createEdgeKey(fromFile, toFile) {
    return `${fromFile} -> ${toFile}`;
}

function pair(left, right) {
    return /** @type {[string, string]} */ ([left, right]);
}

const entityRuntimeConfigStoreSources = [
];

const entityThreeDisposalSources = [
    'src/entities/Arena.js',
    'src/entities/Particles.js',
    'src/entities/player/PlayerView.js',
];

/** @type {[string, string][]} */
const legacyStateToUiImportEntries = [];

/** @type {[string, string][]} */
const legacyUiToStateImportEntries = [
    pair(
        createEdgeKey('src/ui/arcade/ArcadeVehicleManager.js', 'src/state/arcade/ArcadeVehicleProfile.js'),
        'Arcade vehicle manager still loads/saves profiles directly; awaiting contract-based refactor via ArcadeVehicleProfileContract (V58.3 follow-up).'
    ),
    pair(
        createEdgeKey('src/ui/MatchFlowUiController.js', 'src/state/MatchLifecycleSessionOrchestrator.js'),
        'Match flow UI still orchestrates state session lifecycle while command/reducer ownership is being consolidated.'
    ),
    pair(
        createEdgeKey('src/ui/MatchFlowUiController.js', 'src/state/MatchLifecycleStateTransitions.js'),
        'Match flow UI still consumes explicit lifecycle transition builders during the ongoing state/ui split.'
    ),
    pair(
        createEdgeKey('src/ui/MatchFlowUiController.js', 'src/state/RoundEndCoordinator.js'),
        'Match flow UI still calls round-end coordinator while transition responsibilities are incrementally moved to state orchestration.'
    ),
    pair(
        createEdgeKey('src/ui/PauseOverlayController.js', 'src/state/MatchLifecycleStateTransitions.js'),
        'Pause overlay still consumes lifecycle transition builders while pause ownership is migrated to command reducers.'
    ),
    pair(
        createEdgeKey('src/ui/SettingsStore.js', 'src/state/storage/StoragePlatform.js'),
        'UI settings store still reuses shared storage platform contract pending complete command/reducer storage abstraction.'
    ),
    pair(
        createEdgeKey('src/ui/menu/MenuDraftStore.js', 'src/state/storage/StoragePlatform.js'),
        'Menu draft store still reuses shared storage platform contract pending complete command/reducer storage abstraction.'
    ),
    pair(
        createEdgeKey('src/ui/menu/MenuPresetStore.js', 'src/state/storage/StoragePlatform.js'),
        'Menu preset store still reuses shared storage platform contract pending complete command/reducer storage abstraction.'
    ),
    pair(
        createEdgeKey('src/ui/menu/MenuTelemetryStore.js', 'src/state/storage/StoragePlatform.js'),
        'Menu telemetry store still reuses shared storage platform contract pending complete command/reducer storage abstraction.'
    ),
    pair(
        createEdgeKey('src/ui/menu/MenuTextOverrideStore.js', 'src/state/storage/StoragePlatform.js'),
        'Menu text-override store still reuses shared storage platform contract pending complete command/reducer storage abstraction.'
    ),
];

/** @type {[string, string][]} */
const legacyCoreToUiImportEntries = [];

export const LEGACY_CONSTRUCTOR_GAME_ALLOWLIST = new Map([
    ['src/core/GameDebugApi.js', 'Legacy debug bridge still wraps the full runtime while V44 only forbids new wide constructors.'],
    ['src/core/PlayingStateSystem.js', 'Existing playing loop shell still receives the game runtime directly.'],
    ['src/core/PlanarAimAssistSystem.js', 'Planar aim hotpath still consumes the runtime facade directly.'],
    ['src/core/RuntimeDiagnosticsSystem.js', 'Diagnostics overlay remains an infrastructure exception with runtime-wide read access.'],
    ['src/ui/KeybindEditorController.js', 'Keybind editor remains a UI infrastructure shell around the runtime key capture path.'],
    ['src/ui/UIManager.js', 'UIManager keeps a legacy game alias while sync responsibilities are being reduced.'],
    ['src/ui/UIStartSyncController.js', 'Start sync controller still receives the runtime shell while V44 freezes new occurrences.'],
    ['src/ui/UINavigationLifecycleController.js', 'Navigation lifecycle controller still receives the runtime shell while V44 freezes new occurrences.'],
]);

export const LEGACY_DOM_ACCESS_ALLOWLIST = new Map([
    ['src/core/AppInitializer.js', 'Bootstrap readiness check is infrastructure and still touches document directly.'],
    ['src/core/BuildInfoController.js', 'Clipboard fallback still needs temporary DOM helpers.'],
    ['src/core/GameBootstrap.js', 'Canvas bootstrap is allowed infrastructure DOM access.'],
    ['src/core/GameLoop.js', 'Loop visibility handling and emergency overlay remain infrastructure concerns.'],
    ['src/core/MediaRecorderSystem.js', 'Recorder downloads and capture canvas creation are infrastructure DOM paths.'],
    ['src/core/RuntimeDiagnosticsSystem.js', 'Diagnostics overlay is an infrastructure DOM exception.'],
    ['src/core/RuntimeErrorOverlay.js', 'Fatal runtime overlay is intentionally outside src/ui.'],
    ['src/entities/arena/ArenaBuildResourceCache.js', 'Offscreen canvas generation is a rendering infrastructure exception.'],
]);

/** @type {[string, string][]} */
const legacyUiToCoreImportEntries = [
    pair(
        createEdgeKey('src/ui/KeybindEditorController.js', 'src/core/SettingsManager.js'),
        'Keybind editor still relies on SettingsManager cloning helpers while the settings port transition is incremental.'
    ),
];

/** @type {[string, string][]} */
const legacyEntitiesToCoreImportEntries = [
    ...entityRuntimeConfigStoreSources.map((fromFile) => pair(
        createEdgeKey(fromFile, 'src/core/runtime/ActiveRuntimeConfigStore.js'),
        'Entity runtime is allowed to resolve the active runtime config via the dedicated compatibility store during V44.'
    )),
    ...entityThreeDisposalSources.map((fromFile) => pair(
        createEdgeKey(fromFile, 'src/core/three-disposal.js'),
        'Three.js disposal helpers are treated as shared rendering infrastructure for the legacy entity path.'
    )),
];

/** @type {[string, string][]} */
const legacyStateToCoreImportEntries = [];

export const LEGACY_UI_TO_CORE_IMPORTS = new Map(legacyUiToCoreImportEntries);
export const LEGACY_CORE_TO_UI_IMPORTS = new Map(legacyCoreToUiImportEntries);
export const LEGACY_UI_TO_STATE_IMPORTS = new Map(legacyUiToStateImportEntries);
export const LEGACY_STATE_TO_UI_IMPORTS = new Map(legacyStateToUiImportEntries);

export const LEGACY_ENTITIES_TO_CORE_IMPORTS = new Map(legacyEntitiesToCoreImportEntries);
export const LEGACY_STATE_TO_CORE_IMPORTS = new Map(legacyStateToCoreImportEntries);

export const ARCHITECTURE_SCORECARD_TARGETS = Object.freeze({
    configWrites: 0,
    disallowedConstructorGameFiles: 0,
    disallowedDomAccessFiles: 0,
    disallowedCoreToUiImports: 0,
    disallowedUiToCoreImports: 0,
    disallowedUiToStateImports: 0,
    disallowedStateToUiImports: 0,
    disallowedEntitiesToCoreImports: 0,
    disallowedStateToCoreImports: 0,
});

export const ARCHITECTURE_SCORECARD_BUDGETS = Object.freeze({
    constructorGameFiles: LEGACY_CONSTRUCTOR_GAME_ALLOWLIST.size,
    domAccessFiles: LEGACY_DOM_ACCESS_ALLOWLIST.size,
    coreToUiImportEdges: LEGACY_CORE_TO_UI_IMPORTS.size,
    uiToCoreImportEdges: LEGACY_UI_TO_CORE_IMPORTS.size,
    uiToStateImportEdges: LEGACY_UI_TO_STATE_IMPORTS.size,
    stateToUiImportEdges: LEGACY_STATE_TO_UI_IMPORTS.size,
    entitiesToCoreImportEdges: LEGACY_ENTITIES_TO_CORE_IMPORTS.size,
    stateToCoreImportEdges: LEGACY_STATE_TO_CORE_IMPORTS.size,
});
