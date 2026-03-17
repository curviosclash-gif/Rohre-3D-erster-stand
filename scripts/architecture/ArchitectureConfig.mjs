export function createEdgeKey(fromFile, toFile) {
    return `${fromFile} -> ${toFile}`;
}

function pair(left, right) {
    return /** @type {[string, string]} */ ([left, right]);
}

const uiConfigImportSources = [
    'src/ui/CrosshairSystem.js',
    'src/ui/HUD.js',
    'src/ui/HudRuntimeSystem.js',
    'src/ui/menu/MenuCompatibilityRules.js',
    'src/ui/menu/MenuGameplayBindings.js',
    'src/ui/menu/MenuPreviewCatalog.js',
    'src/ui/UIManager.js',
    'src/ui/UIStartSyncController.js',
];

const entityConfigImportSources = [
    'src/entities/ai/BotDecisionOps.js',
    'src/entities/ai/BotProbeOps.js',
    'src/entities/ai/BotRecoveryOps.js',
    'src/entities/ai/BotRuntimeContextFactory.js',
    'src/entities/ai/BotSensingOps.js',
    'src/entities/ai/BotThreatOps.js',
    'src/entities/ai/HuntBridgePolicy.js',
    'src/entities/arena/ArenaBuilder.js',
    'src/entities/arena/ArenaGeometryCompilePipeline.js',
    'src/entities/arena/portal/PortalLayoutBuilder.js',
    'src/entities/arena/portal/PortalRuntimeSystem.js',
    'src/entities/arena/PortalGateMeshFactory.js',
    'src/entities/Bot.js',
    'src/entities/CustomMapLoader.js',
    'src/entities/EntityManager.js',
    'src/entities/Particles.js',
    'src/entities/player/PlayerController.js',
    'src/entities/player/PlayerEffectOps.js',
    'src/entities/player/PlayerInventoryOps.js',
    'src/entities/player/PlayerMotionOps.js',
    'src/entities/player/PlayerView.js',
    'src/entities/Player.js',
    'src/entities/Powerup.js',
    'src/entities/runtime/EntitySetupOps.js',
    'src/entities/runtime/EntitySpawnOps.js',
    'src/entities/systems/CollisionResponseSystem.js',
    'src/entities/systems/HuntCombatSystem.js',
    'src/entities/systems/lifecycle/PlayerInteractionPhase.js',
    'src/entities/systems/projectile/ProjectileSimulationOps.js',
    'src/entities/systems/ProjectileSystem.js',
    'src/entities/Trail.js',
];

const entityRuntimeConfigStoreSources = [
    'src/entities/arena/ArenaBuilder.js',
    'src/entities/arena/portal/PortalLayoutBuilder.js',
    'src/entities/EntityManager.js',
    'src/entities/player/PlayerMotionOps.js',
    'src/entities/Powerup.js',
    'src/entities/systems/HuntCombatSystem.js',
    'src/entities/systems/projectile/ProjectileSimulationOps.js',
    'src/entities/systems/ProjectileSystem.js',
    'src/entities/Trail.js',
];

const entityThreeDisposalSources = [
    'src/entities/Arena.js',
    'src/entities/Particles.js',
    'src/entities/player/PlayerView.js',
];

export const LEGACY_CONSTRUCTOR_GAME_ALLOWLIST = new Map([
    ['src/core/GameDebugApi.js', 'Legacy debug bridge still wraps the full runtime while V44 only forbids new wide constructors.'],
    ['src/core/PlayingStateSystem.js', 'Existing playing loop shell still receives the game runtime directly.'],
    ['src/core/PlanarAimAssistSystem.js', 'Planar aim hotpath still consumes the runtime facade directly.'],
    ['src/core/RuntimeDiagnosticsSystem.js', 'Diagnostics overlay remains an infrastructure exception with runtime-wide read access.'],
    ['src/hunt/HuntHUD.js', 'Legacy hunt HUD has not yet been absorbed into the ui/dom boundary.'],
    ['src/state/MatchLifecycleSessionOrchestrator.js', 'Session orchestrator still fronts the runtime until the session port split is deeper.'],
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
    ['src/hunt/HuntHUD.js', 'Legacy hunt HUD has not yet been moved behind the ui/dom seam.'],
]);

/** @type {[string, string][]} */
const legacyUiToCoreImportEntries = [
    ...uiConfigImportSources.map((fromFile) => pair(
        createEdgeKey(fromFile, 'src/core/Config.js'),
        'Legacy config-backed UI projection until shared runtime catalogs replace direct core config reads.'
    )),
    pair(
        createEdgeKey('src/ui/KeybindEditorController.js', 'src/core/SettingsManager.js'),
        'Keybind editor still relies on SettingsManager cloning helpers while the settings port transition is incremental.'
    ),
];

/** @type {[string, string][]} */
const legacyEntitiesToCoreImportEntries = [
    ...entityConfigImportSources.map((fromFile) => pair(
        createEdgeKey(fromFile, 'src/core/Config.js'),
        'Legacy runtime entities still read default config until the remaining config readers move behind explicit runtime contracts.'
    )),
    ...entityRuntimeConfigStoreSources.map((fromFile) => pair(
        createEdgeKey(fromFile, 'src/core/runtime/ActiveRuntimeConfigStore.js'),
        'Entity runtime is allowed to resolve the active runtime config via the dedicated compatibility store during V44.'
    )),
    ...entityThreeDisposalSources.map((fromFile) => pair(
        createEdgeKey(fromFile, 'src/core/three-disposal.js'),
        'Three.js disposal helpers are treated as shared rendering infrastructure for the legacy entity path.'
    )),
];

export const LEGACY_UI_TO_CORE_IMPORTS = new Map(legacyUiToCoreImportEntries);

export const LEGACY_ENTITIES_TO_CORE_IMPORTS = new Map(legacyEntitiesToCoreImportEntries);

export const ARCHITECTURE_SCORECARD_TARGETS = Object.freeze({
    configWrites: 0,
    disallowedConstructorGameFiles: 0,
    disallowedDomAccessFiles: 0,
    disallowedUiToCoreImports: 0,
    disallowedEntitiesToCoreImports: 0,
});

export const ARCHITECTURE_SCORECARD_BUDGETS = Object.freeze({
    constructorGameFiles: LEGACY_CONSTRUCTOR_GAME_ALLOWLIST.size,
    domAccessFiles: LEGACY_DOM_ACCESS_ALLOWLIST.size,
    uiToCoreImportEdges: LEGACY_UI_TO_CORE_IMPORTS.size,
    entitiesToCoreImportEdges: LEGACY_ENTITIES_TO_CORE_IMPORTS.size,
});
