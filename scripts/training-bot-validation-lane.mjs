const BOT_VALIDATION_EVAL_CONTRACT_VERSION = 'v36-bot-validation-eval-v1';

export const BOT_VALIDATION_BASELINE_REFERENCE = Object.freeze({
    rounds: 16,
    botWinRate: 0.5,
    averageBotSurvival: 31.908458,
    forcedRoundRate: 0.5,
    timeoutRoundRate: 0.5,
});

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

function buildDisabledResult(source = {}) {
    return {
        enabled: false,
        contractVersion: BOT_VALIDATION_EVAL_CONTRACT_VERSION,
        source: {
            reportPath: typeof source.reportPath === 'string' ? source.reportPath : null,
            exists: source.exists === true,
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

    return {
        enabled: true,
        contractVersion: BOT_VALIDATION_EVAL_CONTRACT_VERSION,
        source: {
            reportPath: typeof source.reportPath === 'string' ? source.reportPath : null,
            exists: source.exists === true,
        },
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
        return {
            enabled: false,
            ok: true,
            status: 'pass',
            checks: [],
            warnings: [],
            hardFailures: [],
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

