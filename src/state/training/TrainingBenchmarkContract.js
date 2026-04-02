import { TRAINING_GATE_BASELINE_REFERENCE } from './TrainingGateThresholds.js';
import {
    TRAINING_BENCHMARK_FAILURE_TAXONOMY,
    TRAINING_BENCHMARK_FAILURE_TAXONOMY_VERSION,
    evaluateBenchmarkArtifactRequirements as evaluateBenchmarkArtifactRequirementsBase,
    evaluateBenchmarkProfileGuardrails,
    summarizeFailureCodes,
} from './TrainingBenchmarkFailures.js';
import {
    TRAINING_ALGORITHM_PROFILE_VERSION,
    TRAINING_ALGORITHM_PROFILES,
    TRAINING_BENCHMARK_PROFILE_VERSION,
    TRAINING_PERFORMANCE_PROFILES,
    listTrainingAlgorithmProfiles,
    normalizeTrainingAlgorithmProfileName,
    resolveTrainingAlgorithmProfile,
    listTrainingPerformanceProfiles,
    normalizeTrainingPerformanceProfileName,
    resolveTrainingPerformanceProfile,
} from './TrainingBenchmarkProfiles.js';

function cloneEntries(entries = []) {
    return entries.map((entry) => ({ ...entry }));
}

function toFiniteNumber(value, fallback = 0) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
}

function roundMetric(value) {
    return Math.round(toFiniteNumber(value, 0) * 1_000_000) / 1_000_000;
}

function normalizeStampToken(value) {
    return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function buildRequiredCheck(metric, actual, expected, ok, summary) {
    return {
        metric,
        comparator: 'required',
        value: actual,
        expected,
        level: ok ? 'pass' : 'fail',
        summary,
    };
}

function buildMinCheck(metric, value, hardThreshold, summary) {
    const numericValue = roundMetric(toFiniteNumber(value, 0));
    const numericThreshold = roundMetric(toFiniteNumber(hardThreshold, 0));
    return {
        metric,
        comparator: 'min',
        value: numericValue,
        hardThreshold: numericThreshold,
        level: numericValue >= numericThreshold ? 'pass' : 'fail',
        summary,
    };
}

function buildMaxCheck(metric, value, hardThreshold, summary) {
    const numericValue = roundMetric(toFiniteNumber(value, 0));
    const numericThreshold = roundMetric(toFiniteNumber(hardThreshold, 0));
    return {
        metric,
        comparator: 'max',
        value: numericValue,
        hardThreshold: numericThreshold,
        level: numericValue <= numericThreshold ? 'pass' : 'fail',
        summary,
    };
}

export const TRAINING_BENCHMARK_CONTRACT_VERSION = 'v80-benchmark-v1';
export const TRAINING_BENCHMARK_MATRIX_VERSION = 'v80-benchmark-matrix-v1';
export const TRAINING_BENCHMARK_MANIFEST_VERSION = 'v80-benchmark-manifest-v1';
export const TRAINING_BENCHMARK_REPORT_VERSION = 'v80-benchmark-report-v1';
export const TRAINING_HARDWARE_TELEMETRY_VERSION = 'v80-hardware-telemetry-v1';
export const TRAINING_DECISION_TRACE_VERSION = 'v80-decision-trace-v1';
export const TRAINING_PROMOTION_POLICY_VERSION = 'v80-promotion-policy-v1';

export {
    TRAINING_ALGORITHM_PROFILE_VERSION,
    TRAINING_ALGORITHM_PROFILES,
    TRAINING_BENCHMARK_FAILURE_TAXONOMY,
    TRAINING_BENCHMARK_FAILURE_TAXONOMY_VERSION,
    TRAINING_BENCHMARK_PROFILE_VERSION,
    TRAINING_PERFORMANCE_PROFILES,
    listTrainingAlgorithmProfiles,
    normalizeTrainingAlgorithmProfileName,
    resolveTrainingAlgorithmProfile,
    listTrainingPerformanceProfiles,
    normalizeTrainingPerformanceProfileName,
    resolveTrainingPerformanceProfile,
    summarizeFailureCodes,
    evaluateBenchmarkProfileGuardrails,
};

export const TRAINING_BOT_VALIDATION_BASELINE_REFERENCE = Object.freeze({
    rounds: 16,
    botWinRate: 0.5,
    averageBotSurvival: 31.908458,
    forcedRoundRate: 0.5,
    timeoutRoundRate: 0.5,
});

export const TRAINING_PLAY_EVAL_BASELINE_REFERENCE = Object.freeze({
    scenarioReturnMean: 1.615,
    scenarioWinRate: 0.5,
});

const BENCHMARK_EVAL_SEEDS = Object.freeze([11, 23, 37, 41]);
const BENCHMARK_EVAL_DOMAINS = Object.freeze([
    Object.freeze({ mode: 'classic', planarMode: false, domainId: 'classic-3d' }),
    Object.freeze({ mode: 'classic', planarMode: true, domainId: 'classic-2d' }),
    Object.freeze({ mode: 'hunt', planarMode: false, domainId: 'hunt-3d' }),
    Object.freeze({ mode: 'hunt', planarMode: true, domainId: 'hunt-2d' }),
]);
const BENCHMARK_PLAY_SCENARIOS = Object.freeze([
    Object.freeze({
        scenarioId: 'play-classic-3d-a',
        mode: 'classic',
        planarMode: false,
        domainId: 'classic-3d',
        seed: 101,
        variant: 'done',
    }),
    Object.freeze({
        scenarioId: 'play-classic-2d-b',
        mode: 'classic',
        planarMode: true,
        domainId: 'classic-2d',
        seed: 202,
        variant: 'truncated',
    }),
    Object.freeze({
        scenarioId: 'play-hunt-3d-a',
        mode: 'hunt',
        planarMode: false,
        domainId: 'hunt-3d',
        seed: 303,
        variant: 'done',
    }),
    Object.freeze({
        scenarioId: 'play-hunt-2d-b',
        mode: 'hunt',
        planarMode: true,
        domainId: 'hunt-2d',
        seed: 404,
        variant: 'truncated',
    }),
]);
const BENCHMARK_VALIDATION_SCENARIOS = Object.freeze([
    Object.freeze({
        id: 'V1',
        mode: '1p',
        bots: 2,
        mapKey: 'standard',
        gameMode: 'CLASSIC',
        botPolicyStrategy: 'auto',
        planarMode: false,
        portalCount: 0,
        rounds: 10,
        expectedPolicyType: 'classic-3d',
    }),
    Object.freeze({
        id: 'V2',
        mode: '1p',
        bots: 2,
        mapKey: 'maze',
        gameMode: 'CLASSIC',
        botPolicyStrategy: 'auto',
        planarMode: true,
        portalCount: 0,
        rounds: 10,
        expectedPolicyType: 'classic-2d',
    }),
    Object.freeze({
        id: 'V3',
        mode: '1p',
        bots: 3,
        mapKey: 'complex',
        gameMode: 'HUNT',
        botPolicyStrategy: 'auto',
        planarMode: true,
        portalCount: 4,
        rounds: 10,
        expectedPolicyType: 'hunt-2d',
    }),
    Object.freeze({
        id: 'V4',
        mode: '2p',
        bots: 2,
        mapKey: 'standard',
        gameMode: 'HUNT',
        botPolicyStrategy: 'auto',
        planarMode: false,
        portalCount: 6,
        rounds: 10,
        expectedPolicyType: 'hunt-3d',
    }),
]);

export const TRAINING_BENCHMARK_SEMANTIC_WINDOW = Object.freeze({
    id: 'pre-v72-runtime-freeze-2026-04-01',
    runtimeSurface: 'desktop-app',
    portalContract: 'pre-v72-portals-v1',
    gateContract: 'pre-v72-gates-v1',
    itemContract: 'v69-items-runtime-v1',
    shieldContract: 'v69-shield-runtime-v1',
    note: 'Vergleiche bleiben auf der vor-V72-Semantik eingefroren, bis Portal/Gate/Item/Shield bewusst neu synchronisiert werden.',
});

export const TRAINING_FROZEN_REFERENCES = Object.freeze({
    legacyBaseline: Object.freeze({
        id: 'bt10-legacy-baseline-2026-03-21',
        role: 'origin-baseline',
        qualification: 'documented-legacy-reference',
        stamp: '20260321T180755Z-r01',
        artifacts: Object.freeze({
            run: 'data/training/runs/20260321T180755Z-r01/run.json',
            trainer: 'data/training/runs/20260321T180755Z-r01/trainer.json',
            planEvidence: 'docs/bot-training/Bot_Trainingsplan.md',
            roadmapEvidence: 'docs/bot-training/Bot_Trainings_Roadmap.md',
        }),
        metrics: Object.freeze({
            avgStepsPerEpisode: 123.799,
            averageBotSurvival: 31.908458,
            invalidActionRate: 0.24746,
        }),
    }),
    champion: Object.freeze({
        id: 'bt11-fight-champion-2026-03-24',
        role: 'current-champion',
        qualification: 'frozen-documented-champion',
        stamp: 'BT11_FIGHT_20260324T014853-r4042',
        artifacts: Object.freeze({
            run: 'data/training/runs/BT11_FIGHT_20260324T014853-r4042/run.json',
            eval: 'data/training/runs/BT11_FIGHT_20260324T014853-r4042/eval.json',
            gate: 'data/training/runs/BT11_FIGHT_20260324T014853-r4042/gate.json',
            botValidationEvidence: 'docs/tests/Testergebnisse_Phase4b_2026-03-24.md',
        }),
        metrics: Object.freeze({
            avgStepsPerEpisode: 117.525,
            averageBotSurvival: 37.376986,
            invalidActionRate: 1,
            forcedRoundRate: 0.857143,
            timeoutRoundRate: 0,
            gateOk: true,
        }),
        notes: Object.freeze([
            'BT11 bleibt Champion, weil BT20 als offener Block keine eingefrorene bot:validate-Referenz im Run-Ordner mitliefert.',
            'Promotion vergleicht immer gegen diesen Champion, nicht nur gegen den BT10-Ursprungsbaselinewert.',
        ]),
    }),
    bt20LatestCandidate: Object.freeze({
        id: 'bt20-open-candidate-2026-03-28',
        role: 'latest-open-candidate',
        qualification: 'unqualified-open-block',
        stamp: 'BT20_SURV_20260328T000841-r728',
        artifacts: Object.freeze({
            run: 'data/training/runs/BT20_SURV_20260328T000841-r728/run.json',
            eval: 'data/training/runs/BT20_SURV_20260328T000841-r728/eval.json',
            gate: 'data/training/runs/BT20_SURV_20260328T000841-r728/gate.json',
            series: 'data/training/series/BT20_SURV_20260328T000841/loop.json',
        }),
        disqualifiers: Object.freeze([
            'BT20.99 ist nicht abgeschlossen.',
            'Kein eingefrorener bot:validate-Report im Run-Ordner.',
            'Darf als Vergleichspunkt dienen, aber nicht als Champion promoted werden.',
        ]),
    }),
});

export const TRAINING_BENCHMARK_COMPARE_RULES = Object.freeze({
    contractVersion: TRAINING_BENCHMARK_CONTRACT_VERSION,
    championId: TRAINING_FROZEN_REFERENCES.champion.id,
    originBaselineId: TRAINING_FROZEN_REFERENCES.legacyBaseline.id,
    rules: Object.freeze([
        'Promotion vergleicht immer gegen den eingefrorenen Champion und nur zusaetzlich gegen die BT10-Ursprungsbaseline.',
        'Kandidaten mit anderer Semantikfenster-ID oder anderer Benchmark-Matrix-Version sind nicht vergleichbar und failen hart.',
        'Fehlende Artefakte fuer bot:validate, Decision-Trace, Resume-Health, Hardware-Telemetrie oder Benchmark-Manifest sind harte Disqualifier.',
        'Promotion und Abschluss-Gates sind nur auf runtime-nahen Lanes zulaessig; synthetische Lanes bleiben Smoke- oder Ablation-Hilfe.',
        'BT20- und spaetere offene Laeufe bleiben Challenger-Referenzen, bis ein vollstaendiger Benchmark-Report mit denselben Artefaktpflichten eingefroren ist.',
        'Champion-Promotion bleibt manuell; ein gruener Gate-Lauf ersetzt BT11 niemals stillschweigend.',
        'Promotion verlangt positives Survival-Delta gegen BT11 sowie null Forced- oder Timeout-Rounds in der bot:validate-Lane.',
    ]),
});

export const TRAINING_CHAMPION_PROMOTION_POLICY = Object.freeze({
    contractVersion: TRAINING_PROMOTION_POLICY_VERSION,
    championId: TRAINING_FROZEN_REFERENCES.champion.id,
    championStamp: TRAINING_FROZEN_REFERENCES.champion.stamp,
    manualOnly: true,
    averageBotSurvivalDelta: 0.25,
    maxForcedRoundRate: 0,
    maxTimeoutRoundRate: 0,
});

export const TRAINING_BENCHMARK_MATRIX = Object.freeze({
    contractVersion: TRAINING_BENCHMARK_CONTRACT_VERSION,
    version: TRAINING_BENCHMARK_MATRIX_VERSION,
    eval: Object.freeze({
        sampleSizeEpisodes: BENCHMARK_EVAL_SEEDS.length * BENCHMARK_EVAL_DOMAINS.length,
        seeds: BENCHMARK_EVAL_SEEDS,
        domains: BENCHMARK_EVAL_DOMAINS,
        baseline: TRAINING_GATE_BASELINE_REFERENCE,
    }),
    playEval: Object.freeze({
        scenarios: BENCHMARK_PLAY_SCENARIOS,
        baseline: TRAINING_PLAY_EVAL_BASELINE_REFERENCE,
    }),
    botValidation: Object.freeze({
        scenarioCount: BENCHMARK_VALIDATION_SCENARIOS.length,
        roundsPerScenario: 4,
        scenarios: BENCHMARK_VALIDATION_SCENARIOS,
        baseline: TRAINING_BOT_VALIDATION_BASELINE_REFERENCE,
    }),
    semantics: TRAINING_BENCHMARK_SEMANTIC_WINDOW,
});

export const TRAINING_BENCHMARK_ARTIFACT_REQUIREMENTS = Object.freeze({
    run: Object.freeze({ phase: 'run', required: true }),
    eval: Object.freeze({ phase: 'eval', required: true }),
    trainer: Object.freeze({ phase: 'run', required: true }),
    checkpoint: Object.freeze({ phase: 'run', required: true }),
    benchmarkManifest: Object.freeze({ phase: 'run', required: true }),
    decisionTrace: Object.freeze({ phase: 'eval', required: true }),
    botValidationReport: Object.freeze({ phase: 'eval', required: true }),
    hardwareTelemetry: Object.freeze({ phase: 'run', required: true }),
    resumeHealth: Object.freeze({ phase: 'run', required: true }),
    benchmarkReport: Object.freeze({ phase: 'gate', required: true }),
});

export function getTrainingBenchmarkEvalSeeds() {
    return [...BENCHMARK_EVAL_SEEDS];
}

export function getTrainingBenchmarkEvalDomains() {
    return cloneEntries(BENCHMARK_EVAL_DOMAINS);
}

export function getTrainingBenchmarkPlayScenarios() {
    return cloneEntries(BENCHMARK_PLAY_SCENARIOS);
}

export function getTrainingBenchmarkBotValidationMatrix() {
    return cloneEntries(BENCHMARK_VALIDATION_SCENARIOS);
}

export function classifyTrainingBenchmarkCandidate(input = {}) {
    const performanceProfile = input.performanceProfile && typeof input.performanceProfile === 'object'
        ? input.performanceProfile
        : resolveTrainingPerformanceProfile(input.performanceProfileName, null);
    const algorithmProfile = input.algorithmProfile && typeof input.algorithmProfile === 'object'
        ? input.algorithmProfile
        : resolveTrainingAlgorithmProfile(
            input.algorithmProfileName || performanceProfile?.algorithmProfileName,
            null
        );
    const environmentProfile = typeof input.environmentProfile === 'string' && input.environmentProfile.trim()
        ? input.environmentProfile.trim()
        : (performanceProfile?.run?.environmentProfile || null);
    const runtimeNear = environmentProfile === 'runtime-near';
    const syntheticLane = environmentProfile === 'synthetic-smoke';
    const stampToken = normalizeStampToken(input.stamp);
    const seriesToken = normalizeStampToken(input.seriesStamp);
    const championStampToken = normalizeStampToken(TRAINING_FROZEN_REFERENCES.champion.stamp);
    const bt20Reference = stampToken.startsWith('bt20')
        || seriesToken.startsWith('bt20')
        || stampToken === normalizeStampToken(TRAINING_FROZEN_REFERENCES.bt20LatestCandidate.stamp);

    let role = 'challenger';
    if (stampToken === championStampToken) {
        role = 'champion';
    } else if (syntheticLane || algorithmProfile?.track === 'ablation' || performanceProfile?.id === 'ablation') {
        role = 'ablation';
    }

    const referenceOnly = role === 'ablation'
        || bt20Reference
        || algorithmProfile?.referenceOnly === true;
    const promotionEligible = role === 'challenger'
        && runtimeNear
        && syntheticLane !== true
        && referenceOnly !== true;
    const notes = [];
    if (role === 'champion') {
        notes.push('BT11 bleibt eingefrorener Champion und wird nicht automatisch ersetzt.');
    }
    if (role === 'ablation') {
        notes.push('Ablation- und Synthetic-Lanes bleiben Vergleichs- oder Smoke-Lanes und nie Promotion-Kandidaten.');
    }
    if (bt20Reference) {
        notes.push('BT20 bleibt Challenger- oder Referenzlauf und darf nicht in den Champion-Slot promoted werden.');
    }
    if (promotionEligible) {
        notes.push('Promotion bleibt manuell und erfordert eine explizite Champion-Entscheidung trotz gruenem Gate.');
    }
    return Object.freeze({
        role,
        track: algorithmProfile?.track || null,
        runtimeNear,
        syntheticLane,
        referenceOnly,
        bt20Reference,
        promotionEligible,
        manualPromotionOnly: true,
        performanceProfileName: performanceProfile?.id || null,
        algorithmProfileName: algorithmProfile?.id || null,
        notes: Object.freeze(notes),
    });
}

function resolveChampionPromotionPolicy(manifest = null) {
    const algorithmProfile = resolveTrainingAlgorithmProfile(
        manifest?.algorithmProfileName
            || manifest?.candidate?.algorithmProfileName
            || manifest?.performanceProfile?.algorithmProfileName,
        null
    );
    const promotionPolicy = algorithmProfile?.promotion && typeof algorithmProfile.promotion === 'object'
        ? algorithmProfile.promotion
        : TRAINING_CHAMPION_PROMOTION_POLICY;
    return Object.freeze({
        contractVersion: TRAINING_PROMOTION_POLICY_VERSION,
        championId: TRAINING_FROZEN_REFERENCES.champion.id,
        championStamp: TRAINING_FROZEN_REFERENCES.champion.stamp,
        manualOnly: promotionPolicy.manualOnly !== false,
        averageBotSurvivalDelta: roundMetric(
            toFiniteNumber(
                promotionPolicy.averageBotSurvivalDelta,
                TRAINING_CHAMPION_PROMOTION_POLICY.averageBotSurvivalDelta
            )
        ),
        maxForcedRoundRate: roundMetric(
            toFiniteNumber(
                promotionPolicy.maxForcedRoundRate,
                TRAINING_CHAMPION_PROMOTION_POLICY.maxForcedRoundRate
            )
        ),
        maxTimeoutRoundRate: roundMetric(
            toFiniteNumber(
                promotionPolicy.maxTimeoutRoundRate,
                TRAINING_CHAMPION_PROMOTION_POLICY.maxTimeoutRoundRate
            )
        ),
    });
}

export function evaluateChampionPromotion(input = {}) {
    const manifest = input.manifest && typeof input.manifest === 'object' ? input.manifest : null;
    const candidate = manifest?.candidate && typeof manifest.candidate === 'object'
        ? manifest.candidate
        : classifyTrainingBenchmarkCandidate({
            stamp: input.runStamp,
            performanceProfileName: manifest?.performanceProfileName,
            performanceProfile: manifest?.performanceProfile,
            algorithmProfileName: manifest?.algorithmProfileName,
            algorithmProfile: manifest?.algorithmProfile,
            environmentProfile: manifest?.environment?.profile,
        });
    const validationLane = input.validationLane && typeof input.validationLane === 'object'
        ? input.validationLane
        : {};
    const validationMetrics = validationLane.metrics && typeof validationLane.metrics === 'object'
        ? validationLane.metrics
        : {};
    const policy = resolveChampionPromotionPolicy(manifest);
    const championMetrics = TRAINING_FROZEN_REFERENCES.champion.metrics;
    const requiredSurvival = roundMetric(
        toFiniteNumber(championMetrics.averageBotSurvival, 0) + policy.averageBotSurvivalDelta
    );
    const checks = [
        buildRequiredCheck(
            'candidateRole',
            candidate?.role || 'unknown',
            'challenger',
            candidate?.role === 'challenger',
            'Nur Challenger-Lanes koennen fuer eine Champion-Promotion vorgeschlagen werden.'
        ),
        buildRequiredCheck(
            'runtimeNear',
            candidate?.runtimeNear === true ? 'runtime-near' : 'non-runtime',
            'runtime-near',
            candidate?.runtimeNear === true,
            'Promotion bleibt strikt auf runtime-nahe Lanes begrenzt.'
        ),
        buildRequiredCheck(
            'referenceOnly',
            candidate?.referenceOnly === true ? 'reference-only' : 'promotion-lane',
            'promotion-lane',
            candidate?.referenceOnly !== true,
            'Referenz- oder Ablation-Lanes duerfen den Champion nicht ersetzen.'
        ),
        buildRequiredCheck(
            'gateOk',
            input.gateOk === true ? 'pass' : 'fail',
            'pass',
            input.gateOk === true,
            'Nur voll gruene Gate-Laeufe koennen fuer einen Champion-Wechsel vorgeschlagen werden.'
        ),
        buildRequiredCheck(
            'botValidationGate',
            input.botValidationGate?.ok === true ? 'pass' : 'fail',
            'pass',
            input.botValidationGate?.ok === true,
            'bot:validate muss gruen bleiben, sonst bleibt BT11 Champion.'
        ),
        buildRequiredCheck(
            'playEvalGate',
            input.playEvalGate?.ok === true ? 'pass' : 'fail',
            'pass',
            input.playEvalGate?.ok === true,
            'Die feste Play-Eval-Matrix darf fuer Promotion nicht regressieren.'
        ),
        buildMinCheck(
            'averageBotSurvival',
            validationMetrics.averageBotSurvival,
            requiredSurvival,
            'Promotion verlangt ein positives Survival-Delta gegen den eingefrorenen BT11-Champion.'
        ),
        buildMaxCheck(
            'forcedRoundRate',
            validationMetrics.forcedRoundRate,
            policy.maxForcedRoundRate,
            'Promotion bleibt bei erzwungenen Runden hart blockiert.'
        ),
        buildMaxCheck(
            'timeoutRoundRate',
            validationMetrics.timeoutRoundRate,
            policy.maxTimeoutRoundRate,
            'Promotion bleibt bei Timeout-Runden hart blockiert.'
        ),
    ];
    const hardFailures = checks.filter((entry) => entry.level === 'fail');
    return {
        contractVersion: TRAINING_PROMOTION_POLICY_VERSION,
        status: hardFailures.length === 0 ? 'eligible' : 'blocked',
        eligible: hardFailures.length === 0,
        decision: hardFailures.length === 0 ? 'manual-promotion-required' : 'hold-champion',
        manualPromotionOnly: policy.manualOnly === true,
        champion: Object.freeze({
            id: TRAINING_FROZEN_REFERENCES.champion.id,
            stamp: TRAINING_FROZEN_REFERENCES.champion.stamp,
            metrics: TRAINING_FROZEN_REFERENCES.champion.metrics,
        }),
        candidate,
        policy,
        checks,
        hardFailures,
        warnings: [],
    };
}

export function evaluateBenchmarkArtifactRequirements(input = {}) {
    return evaluateBenchmarkArtifactRequirementsBase(input, {
        expectedSemanticWindowId: TRAINING_BENCHMARK_SEMANTIC_WINDOW.id,
        expectedMatrixVersion: TRAINING_BENCHMARK_MATRIX.version,
    });
}
