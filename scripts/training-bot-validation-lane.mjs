import { TRAINING_BOT_VALIDATION_BASELINE_REFERENCE } from '../src/state/training/TrainingBenchmarkContract.js';

const BOT_VALIDATION_EVAL_CONTRACT_VERSION = 'v80-bot-validation-eval-v1';

export const BOT_VALIDATION_BASELINE_REFERENCE = TRAINING_BOT_VALIDATION_BASELINE_REFERENCE;

function toFiniteNumber(value, fallback = 0) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
}

function toNonNegativeInt(value, fallback = 0) {
    return Math.max(0, Math.trunc(toFiniteNumber(value, fallback)));
}

function roundMetric(value) {
    return Math.round(toFiniteNumber(value, 0) * 1_000_000) / 1_000_000;
}

function toNullableElapsedMs(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return null;
    return Math.max(0, Math.round(numeric));
}

function buildBotValidationCapacityScan(reportArtifact = null) {
    const runner = reportArtifact?.runner && typeof reportArtifact.runner === 'object'
        ? reportArtifact.runner
        : null;
    const diagnostics = runner?.diagnostics && typeof runner.diagnostics === 'object'
        ? runner.diagnostics
        : null;
    const stageTimings = diagnostics?.stageTimingsMs && typeof diagnostics.stageTimingsMs === 'object'
        ? diagnostics.stageTimingsMs
        : {};
    const reportIo = diagnostics?.reportIo && typeof diagnostics.reportIo === 'object'
        ? diagnostics.reportIo
        : {};
    const preview = diagnostics?.preview && typeof diagnostics.preview === 'object'
        ? diagnostics.preview
        : {};
    const publish = diagnostics?.publish && typeof diagnostics.publish === 'object'
        ? diagnostics.publish
        : {};
    return {
        available: diagnostics != null,
        contractVersion: diagnostics?.contractVersion || null,
        stageTimingsMs: {
            serverProbe: toNullableElapsedMs(stageTimings.serverProbeMs),
            previewBuild: toNullableElapsedMs(stageTimings.previewBuildMs),
            serverStart: toNullableElapsedMs(stageTimings.serverStartMs),
            browserLaunch: toNullableElapsedMs(stageTimings.browserLaunchMs),
            browserContext: toNullableElapsedMs(stageTimings.browserContextMs),
            browserPage: toNullableElapsedMs(stageTimings.browserPageMs),
            appBootstrap: toNullableElapsedMs(stageTimings.appBootstrapMs),
            scenarioEval: toNullableElapsedMs(stageTimings.scenarioEvalMs),
            reportWrite: toNullableElapsedMs(stageTimings.reportWriteMs),
            publishWrite: toNullableElapsedMs(stageTimings.publishWriteMs),
            total: toNullableElapsedMs(stageTimings.totalMs),
        },
        reportIo: {
            jsonWriteMs: toNullableElapsedMs(reportIo.jsonWriteMs),
            markdownWriteMs: toNullableElapsedMs(reportIo.markdownWriteMs),
            totalWriteMs: toNullableElapsedMs(reportIo.totalWriteMs),
            totalBytes: toNonNegativeInt(reportIo.totalBytes, 0),
            writes: Array.isArray(reportIo.writes)
                ? reportIo.writes.map((entry) => ({
                    label: entry?.label || null,
                    path: entry?.path || null,
                    elapsedMs: toNullableElapsedMs(entry?.elapsedMs),
                    bytes: toNonNegativeInt(entry?.bytes, 0),
                }))
                : [],
        },
        preview: {
            active: runner?.serverMode === 'preview',
            buildRequested: runner?.previewBuildBeforeStart === true,
            buildPerformed: preview?.buildPerformed === true
                ? true
                : (preview?.buildPerformed === false ? false : null),
            serverReused: preview?.serverReused === true
                ? true
                : (preview?.serverReused === false ? false : null),
            buildElapsedMs: toNullableElapsedMs(preview.buildElapsedMs),
            serverStartElapsedMs: toNullableElapsedMs(preview.serverStartElapsedMs),
        },
        publish: {
            requested: runner?.publishEvidence === true,
            jsonWriteMs: toNullableElapsedMs(publish.jsonWriteMs),
            markdownWriteMs: toNullableElapsedMs(publish.markdownWriteMs),
            totalWriteMs: toNullableElapsedMs(publish.totalWriteMs),
            totalBytes: toNonNegativeInt(publish.totalBytes, 0),
            wroteCanonicalJson: publish.wroteCanonicalJson === true,
            wroteCanonicalMarkdown: publish.wroteCanonicalMarkdown === true,
            writes: Array.isArray(publish.writes)
                ? publish.writes.map((entry) => ({
                    label: entry?.label || null,
                    path: entry?.path || null,
                    elapsedMs: toNullableElapsedMs(entry?.elapsedMs),
                    bytes: toNonNegativeInt(entry?.bytes, 0),
                }))
                : [],
        },
        bottlenecks: Array.isArray(diagnostics?.bottlenecks)
            ? diagnostics.bottlenecks.map((entry) => ({
                rank: toNonNegativeInt(entry?.rank, 0),
                stage: entry?.stage || null,
                elapsedMs: toNullableElapsedMs(entry?.elapsedMs),
            }))
            : [],
    };
}

function buildDisabledResult(source = {}) {
    return {
        enabled: false,
        contractVersion: BOT_VALIDATION_EVAL_CONTRACT_VERSION,
        source: {
            reportPath: typeof source.reportPath === 'string' ? source.reportPath : null,
            exists: source.exists === true,
        },
        runner: null,
        capacityScan: {
            available: false,
            contractVersion: null,
            stageTimingsMs: {},
            reportIo: null,
            preview: null,
            publish: null,
            bottlenecks: [],
        },
        metrics: null,
        baseline: {
            reference: BOT_VALIDATION_BASELINE_REFERENCE,
            drift: null,
        },
    };
}

export function buildBotValidationEval(reportArtifact = null, source = {}) {
    const report = reportArtifact && typeof reportArtifact === 'object'
        ? reportArtifact
        : null;
    const overall = report?.overall && typeof report.overall === 'object'
        ? report.overall
        : null;
    if (!overall) {
        return buildDisabledResult(source);
    }

    const rounds = toNonNegativeInt(overall.rounds, 0);
    const botWinRate = roundMetric(toFiniteNumber(overall.botWinRate, 0));
    const averageBotSurvival = roundMetric(toFiniteNumber(overall.averageBotSurvival, 0));
    const forcedRounds = toNonNegativeInt(report?.runner?.forcedRounds, 0);
    const timeoutRounds = toNonNegativeInt(report?.runner?.timeoutRounds, 0);
    const forcedRoundRate = rounds > 0 ? roundMetric(forcedRounds / rounds) : 0;
    const timeoutRoundRate = rounds > 0 ? roundMetric(timeoutRounds / rounds) : 0;
    const capacityScan = buildBotValidationCapacityScan(report);

    return {
        enabled: true,
        contractVersion: BOT_VALIDATION_EVAL_CONTRACT_VERSION,
        source: {
            reportPath: typeof source.reportPath === 'string' ? source.reportPath : null,
            exists: source.exists === true,
        },
        runner: {
            serverMode: typeof report?.runner?.serverMode === 'string' ? report.runner.serverMode : null,
            publishEvidence: report?.runner?.publishEvidence === true,
            previewBuildBeforeStart: report?.runner?.previewBuildBeforeStart === true,
            diagnosticsAvailable: capacityScan.available === true,
        },
        capacityScan,
        metrics: {
            rounds,
            botWinRate,
            averageBotSurvival,
            forcedRounds,
            timeoutRounds,
            forcedRoundRate,
            timeoutRoundRate,
        },
        baseline: {
            reference: BOT_VALIDATION_BASELINE_REFERENCE,
            drift: {
                botWinRate: roundMetric(botWinRate - BOT_VALIDATION_BASELINE_REFERENCE.botWinRate),
                averageBotSurvival: roundMetric(
                    averageBotSurvival - BOT_VALIDATION_BASELINE_REFERENCE.averageBotSurvival
                ),
                forcedRoundRate: roundMetric(
                    forcedRoundRate - BOT_VALIDATION_BASELINE_REFERENCE.forcedRoundRate
                ),
                timeoutRoundRate: roundMetric(
                    timeoutRoundRate - BOT_VALIDATION_BASELINE_REFERENCE.timeoutRoundRate
                ),
            },
        },
    };
}

function evaluateMinMetric(metric, value, baseline, warnFactor = 0.8, hardFactor = 0.6) {
    const safeBaseline = Math.max(0, toFiniteNumber(baseline, 0));
    const warnThreshold = roundMetric(safeBaseline * warnFactor);
    const hardThreshold = roundMetric(safeBaseline * hardFactor);
    let level = 'pass';
    if (value < hardThreshold) level = 'fail';
    else if (value < warnThreshold) level = 'warn';
    return {
        metric,
        comparator: 'min',
        level,
        value: roundMetric(value),
        warnThreshold,
        hardThreshold,
        baseline: roundMetric(safeBaseline),
    };
}

function evaluateMaxMetric(metric, value, baseline, warnFactor = 1.1, hardFactor = 1.35, slack = 0.02) {
    const safeBaseline = Math.max(0, toFiniteNumber(baseline, 0));
    const warnThreshold = roundMetric(safeBaseline * warnFactor + slack);
    const hardThreshold = roundMetric(safeBaseline * hardFactor + slack);
    let level = 'pass';
    if (value > hardThreshold) level = 'fail';
    else if (value > warnThreshold) level = 'warn';
    return {
        metric,
        comparator: 'max',
        level,
        value: roundMetric(value),
        warnThreshold,
        hardThreshold,
        baseline: roundMetric(safeBaseline),
    };
}

export function evaluateBotValidationDrift(evalArtifact = {}) {
    const lane = evalArtifact?.botValidation;
    const metrics = lane?.metrics;
    const baseline = lane?.baseline?.reference || BOT_VALIDATION_BASELINE_REFERENCE;
    if (!lane?.enabled || !metrics || typeof metrics !== 'object') {
        const reportExists = lane?.source?.exists === true;
        return {
            enabled: false,
            ok: false,
            status: 'fail',
            checks: [
                {
                    metric: 'botValidationReport',
                    comparator: 'required',
                    level: 'fail',
                    value: reportExists ? 'disabled' : 'missing',
                    warnThreshold: 'enabled',
                    hardThreshold: 'enabled',
                    baseline: 'enabled',
                    reason: reportExists ? 'validation-disabled' : 'artifact-missing',
                },
            ],
            warnings: [],
            hardFailures: [
                {
                    metric: 'botValidationReport',
                    comparator: 'required',
                    level: 'fail',
                    value: reportExists ? 'disabled' : 'missing',
                    warnThreshold: 'enabled',
                    hardThreshold: 'enabled',
                    baseline: 'enabled',
                    reason: reportExists ? 'validation-disabled' : 'artifact-missing',
                },
            ],
        };
    }

    const checks = [
        evaluateMinMetric(
            'botWinRate',
            toFiniteNumber(metrics.botWinRate, 0),
            toFiniteNumber(baseline.botWinRate, 0)
        ),
        evaluateMinMetric(
            'averageBotSurvival',
            toFiniteNumber(metrics.averageBotSurvival, 0),
            toFiniteNumber(baseline.averageBotSurvival, 0)
        ),
        evaluateMaxMetric(
            'forcedRoundRate',
            toFiniteNumber(metrics.forcedRoundRate, 0),
            toFiniteNumber(baseline.forcedRoundRate, 0)
        ),
        evaluateMaxMetric(
            'timeoutRoundRate',
            toFiniteNumber(metrics.timeoutRoundRate, 0),
            toFiniteNumber(baseline.timeoutRoundRate, 0)
        ),
    ];

    const hardFailures = checks.filter((entry) => entry.level === 'fail');
    const warnings = checks.filter((entry) => entry.level === 'warn');
    return {
        enabled: true,
        ok: hardFailures.length === 0,
        status: hardFailures.length === 0 ? 'pass' : 'fail',
        checks,
        warnings,
        hardFailures,
    };
}

