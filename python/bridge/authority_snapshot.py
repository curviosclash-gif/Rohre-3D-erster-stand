"""BT90 snapshot for the Python PPO bootstrap path.

Wichtig:
- Die JS-Dateien im Repo bleiben authoritative.
- Dieses Modul ist nur eine read-only Referenz fuer BT90.
- Bei Drift in Freeze- oder Adjacent-Dateien ist vor BT91/BT92 ein Re-Audit Pflicht.
"""

from __future__ import annotations

FREEZE_DATE = "2026-04-22"
SNAPSHOT_COMMIT = "017e8edeb548cb64a164d8dc72d1d1cb3055cc93"
SNAPSHOT_PATH = (
    "docs/plaene/neu/BT90_GoldStandard/"
    "BT90_Contract_Authority_Snapshot_2026-04-22.md"
)
FREEZE_CHECK_SCRIPT_PATH = "python/scripts/bt90_freeze_check.py"
FREEZE_CHECK_ARTIFACT_PATH = "data/training/ppo/freeze_check.json"

JS_AUTHORITY_FILES = (
    "src/entities/ai/training/TrainingContractV1.js",
    "src/entities/ai/training/TrainerPayloadAdapter.js",
    "src/entities/ai/observation/ObservationSchemaV2.js",
    "src/entities/ai/actions/BotActionContract.js",
)

ADJACENT_REAUDIT_FILES = (
    "src/state/training/TrainingDomain.js",
    "src/entities/ai/observation/RuntimeNearObservationAdapter.js",
    "src/entities/ai/hybrid/HybridDecisionArchitecture.js",
    "src/state/training/EpisodeController.js",
)

FREEZE_FILE_GROUPS = (
    ("authority", JS_AUTHORITY_FILES),
    ("adjacent", ADJACENT_REAUDIT_FILES),
)

JS_AUTHORITATIVE_ARTIFACTS = (
    "tests/training-environment.contract.test.mjs",
    "scripts/training-smoke.mjs",
    "scripts/headless-match-kernel-smoke.mjs",
)

TRAINING_V1_REQUIRED_FIELDS = (
    "contractVersion",
    "operation",
    "episodeId",
    "episodeIndex",
    "stepIndex",
    "observation",
    "action",
    "reward",
    "done",
    "truncated",
)

TRAINING_V1_INFO_FIELDS = (
    "observationSchemaVersion",
    "observationLength",
    "domain",
    "match",
    "terminalReason",
    "truncatedReason",
    "rewardBreakdown",
    "metadata",
)

TRAINER_TRANSITION_TOP_LEVEL_FIELDS = (
    "contractVersion",
    "observationSchemaVersion",
    "observationLength",
    "operation",
    "episodeId",
    "episodeIndex",
    "stepIndex",
    "reward",
    "done",
    "truncated",
    "observation",
    "action",
    "info",
    "kernelRuntime",
)

TRAINER_TRANSITION_INFO_FIELDS = (
    "domain",
    "terminalReason",
    "truncatedReason",
    "rewardBreakdown",
    "match",
    "observationContext",
    "hybridDecision",
)

RUNTIME_OBSERVATION_TOP_LEVEL_FIELDS = (
    "mode",
    "planarMode",
    "controlProfileId",
    "domainId",
    "domainVersion",
    "dt",
    "observationSchemaVersion",
    "observationLength",
    "observation",
    "observationContext",
    "player",
)

OPTIONAL_PROJECTED_FIELDS = (
    "match",
    "observationContext",
    "hybridDecision",
    "kernelRuntime",
)

BT92_SINGLE_ENV_VISIBLE_FIELDS = (
    "reward",
    "done",
    "truncated",
    "rewardBreakdown",
    "terminalReason",
    "truncatedReason",
    "hybridDecision",
    "observationSchemaVersion",
    "observationLength",
)

TRAINING_V1_MESSAGE_TYPES = (
    "trainer-ready",
    "bot-action-request",
    "training-reset",
    "training-step",
    "trainer-stats-request",
)

ACTION_BOOLEAN_FIELDS = (
    "pitchUp",
    "pitchDown",
    "yawLeft",
    "yawRight",
    "rollLeft",
    "rollRight",
    "boost",
    "cameraSwitch",
    "dropItem",
    "shootItem",
    "shootMG",
    "nextItem",
)

ACTION_INDEX_FIELDS = (
    "shootItemIndex",
    "useItem",
)

ALLOWED_PPO_BUILD_LOCATIONS = (
    "python/bridge/**",
    "python/envs/**",
    "python/scripts/**",
    "python/tests/**",
    "data/training/ppo/**",
)

READ_ONLY_RUNTIME_SURFACES = (
    "src/state/HeadlessMatchKernelRuntime.js",
    "src/core/MatchKernelTrainingAdapter.js",
    "src/entities/ai/training/TrainingTransportFacade.js",
    "src/entities/ai/training/WebSocketTrainerBridge.js",
    "src/entities/ai/ObservationBridgePolicy.js",
    "src/core/RuntimeConfig.js",
    "src/entities/ai/BotPolicyRegistry.js",
    "src/entities/ai/BotPolicyTypes.js",
    "src/entities/ai/inference/LocalDqnInference.js",
    "src/state/training/RewardCalculator.js",
    "src/entities/ai/hybrid/HybridDecisionArchitecture.js",
    "src/state/MatchSessionFactory.js",
)

HARD_BLOCKER_SIGNALS = (
    "TRAINING_CONTRACT_VERSION changes away from v1",
    "OBSERVATION_SCHEMA_VERSION_V2 or OBSERVATION_LENGTH_V2 changes",
    "useItem or shootItemIndex changes away from index semantics",
    "rewardBreakdown, terminalReason, or truncatedReason disappears",
    "hybridDecision or observationContext moves silently or disappears",
    "BT90/BT91 would require new message types, runtime switches, or writes to read-only surfaces",
)

OUT_OF_SCOPE = (
    "sidecar-handshake",
    "100-step-lane",
    "single-env",
    "vecenv",
    "ppo-baseline",
)
