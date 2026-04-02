import assert from 'node:assert/strict';
import test from 'node:test';

import { createBenchmarkReport } from '../scripts/training-benchmark-artifacts.mjs';
import { buildBotValidationEval } from '../scripts/training-bot-validation-lane.mjs';
import {
    TRAINING_BENCHMARK_MATRIX,
    TRAINING_BENCHMARK_SEMANTIC_WINDOW,
    evaluateBenchmarkArtifactRequirements,
    resolveTrainingPerformanceProfile,
} from '../src/state/training/TrainingBenchmarkContract.js';
import { evaluateBenchmarkProfileGuardrails } from '../src/state/training/TrainingBenchmarkFailures.js';

function createValidationReportWithDiagnostics() {
    return {
        overall: {
            rounds: 16,
            botWinRate: 0.75,
            averageBotSurvival: 48,
        },
        runner: {
            forcedRounds: 0,
            timeoutRounds: 0,
            serverMode: 'preview',
            publishEvidence: true,
            previewBuildBeforeStart: true,
            diagnostics: {
                contractVersion: 'v80-bot-validation-runtime-v1',
                stageTimingsMs: {
                    serverProbeMs: 4,
                    previewBuildMs: 42,
                    serverStartMs: 18,
                    browserLaunchMs: 12,
                    browserContextMs: 5,
                    browserPageMs: 6,
                    appBootstrapMs: 140,
                    scenarioEvalMs: 520,
                    reportWriteMs: 24,
                    publishWriteMs: 10,
                    totalMs: 781,
                },
                reportIo: {
                    jsonWriteMs: 11,
                    markdownWriteMs: 13,
                    totalWriteMs: 24,
                    totalBytes: 1536,
                    writes: [
                        { label: 'report-json', path: 'tmp/bot-validation-report.json', elapsedMs: 11, bytes: 768 },
                        { label: 'report-markdown', path: 'tmp/Testergebnisse.md', elapsedMs: 13, bytes: 768 },
                    ],
                },
                preview: {
                    buildPerformed: true,
                    serverReused: false,
                    buildElapsedMs: 42,
                    serverStartElapsedMs: 18,
                },
                publish: {
                    jsonWriteMs: 5,
                    markdownWriteMs: 5,
                    totalWriteMs: 10,
                    totalBytes: 2048,
                    wroteCanonicalJson: true,
                    wroteCanonicalMarkdown: true,
                    writes: [
                        { label: 'publish-json', path: 'data/bot_validation_report.json', elapsedMs: 5, bytes: 1024 },
                        { label: 'publish-markdown', path: 'docs/Testergebnisse.md', elapsedMs: 5, bytes: 1024 },
                    ],
                },
                bottlenecks: [
                    { rank: 1, stage: 'scenario-eval', elapsedMs: 520 },
                    { rank: 2, stage: 'app-bootstrap', elapsedMs: 140 },
                ],
            },
        },
    };
}

test('V80 benchmark artifact audit accepts preview/publish diagnostics and preserves validation lane in report', () => {
    const reportPath = 'data/training/runs/TEST_BT80A_DIAGNOSTICS/bot-validation-report.json';
    const validationLane = buildBotValidationEval(createValidationReportWithDiagnostics(), {
        reportPath,
        exists: true,
    });
    const manifest = {
        contractVersion: 'v80-benchmark-manifest-v1',
        semantics: { id: TRAINING_BENCHMARK_SEMANTIC_WINDOW.id },
        benchmarkMatrix: { version: TRAINING_BENCHMARK_MATRIX.version },
    };
    const artifactAudit = evaluateBenchmarkArtifactRequirements({
        manifest,
        runArtifact: {
            checkpointPath: 'data/training/models/TEST_BT80A_DIAGNOSTICS/checkpoint.json',
            hardwareTelemetry: {
                thermal: {
                    available: false,
                    temperatureC: null,
                },
            },
            resume: {
                requested: false,
                loaded: false,
            },
        },
        evalArtifact: {
            botValidation: validationLane,
            source: {
                botValidationReportPath: reportPath,
            },
        },
        trainerArtifact: {
            hardwareTelemetry: {
                thermal: {
                    available: false,
                    temperatureC: null,
                },
            },
        },
        decisionTrace: {
            decisions: [],
        },
    });

    assert.equal(artifactAudit.ok, true);
    assert.deepEqual(artifactAudit.failures, []);

    const benchmarkReport = createBenchmarkReport({
        runStamp: 'TEST_BT80A_DIAGNOSTICS',
        profile: resolveTrainingPerformanceProfile('quick-benchmark'),
        manifest,
        source: {
            benchmarkManifestPath: 'data/training/runs/TEST_BT80A_DIAGNOSTICS/benchmark-manifest.json',
        },
        artifacts: {
            benchmarkReport: 'data/training/runs/TEST_BT80A_DIAGNOSTICS/benchmark-report.json',
            botValidationReport: reportPath,
        },
        validationLane,
    });

    assert.equal(benchmarkReport.validationLane?.runner?.diagnosticsAvailable, true);
    assert.equal(benchmarkReport.validationLane?.capacityScan?.preview?.active, true);
    assert.equal(benchmarkReport.validationLane?.capacityScan?.publish?.requested, true);
    assert.equal(benchmarkReport.validationLane?.source?.reportPath, reportPath);
});

test('V80 benchmark artifact audit fails when preview build evidence or canonical publish evidence is incomplete', () => {
    const reportPath = 'data/training/runs/TEST_BT80A_DIAGNOSTICS_INCOMPLETE/bot-validation-report.json';
    const report = createValidationReportWithDiagnostics();
    report.runner.diagnostics.preview.buildPerformed = false;
    report.runner.diagnostics.preview.buildElapsedMs = null;
    report.runner.diagnostics.publish.totalBytes = 0;
    report.runner.diagnostics.publish.wroteCanonicalJson = false;
    report.runner.diagnostics.publish.wroteCanonicalMarkdown = false;
    report.runner.diagnostics.publish.writes = [];

    const validationLane = buildBotValidationEval(report, {
        reportPath,
        exists: true,
    });
    const artifactAudit = evaluateBenchmarkArtifactRequirements({
        manifest: {
            contractVersion: 'v80-benchmark-manifest-v1',
            semantics: { id: TRAINING_BENCHMARK_SEMANTIC_WINDOW.id },
            benchmarkMatrix: { version: TRAINING_BENCHMARK_MATRIX.version },
        },
        runArtifact: {
            checkpointPath: 'data/training/models/TEST_BT80A_DIAGNOSTICS_INCOMPLETE/checkpoint.json',
            hardwareTelemetry: {
                thermal: {
                    available: false,
                    temperatureC: null,
                },
            },
            resume: {
                requested: false,
                loaded: false,
            },
        },
        evalArtifact: {
            botValidation: validationLane,
            source: {
                botValidationReportPath: reportPath,
            },
        },
        trainerArtifact: {
            hardwareTelemetry: {
                thermal: {
                    available: false,
                    temperatureC: null,
                },
            },
        },
        decisionTrace: {
            decisions: [],
        },
    });

    assert.equal(artifactAudit.ok, false);
    assert.equal(artifactAudit.failures.some((entry) => entry.code === 'preview-lane-missing'), true);
    assert.equal(artifactAudit.failures.some((entry) => entry.code === 'publish-lane-missing'), true);
});

test('V80 benchmark profile guardrails keep thermal telemetry observe-only when unavailable', () => {
    const guardrails = evaluateBenchmarkProfileGuardrails({
        profile: resolveTrainingPerformanceProfile('quick-benchmark'),
        bridgeTelemetry: {
            latencyP95Ms: 5,
            pendingAckCount: 0,
            maxPendingAcks: 256,
            backpressureDrops: 0,
        },
        opsKpis: {
            bridgeLatencyP95Ms: 5,
            timeoutRate: 0,
            fallbackRate: 0,
        },
        artifactBacklogCount: 0,
        resumeRequested: false,
        resumeLoaded: false,
    });

    assert.equal(guardrails.ok, true);
    assert.equal(guardrails.failures.length, 0);
    assert.equal(guardrails.warnings.some((entry) => entry.code === 'temperature-unavailable'), true);
});

test('V80 benchmark artifact audit rejects promotion-eligible synthetic-only lanes', () => {
    const reportPath = 'data/training/runs/TEST_BT80B_SYNTHETIC_ONLY/bot-validation-report.json';
    const validationLane = buildBotValidationEval(createValidationReportWithDiagnostics(), {
        reportPath,
        exists: true,
    });
    const artifactAudit = evaluateBenchmarkArtifactRequirements({
        manifest: {
            contractVersion: 'v80-benchmark-manifest-v1',
            semantics: { id: TRAINING_BENCHMARK_SEMANTIC_WINDOW.id },
            benchmarkMatrix: { version: TRAINING_BENCHMARK_MATRIX.version },
            environment: {
                profile: 'synthetic-smoke',
                runtimeNear: false,
                syntheticLane: true,
                promotionEligible: true,
            },
        },
        runArtifact: {
            checkpointPath: 'data/training/models/TEST_BT80B_SYNTHETIC_ONLY/checkpoint.json',
            hardwareTelemetry: {
                thermal: {
                    available: false,
                    temperatureC: null,
                },
            },
            resume: {
                requested: false,
                loaded: false,
            },
        },
        evalArtifact: {
            botValidation: validationLane,
            source: {
                botValidationReportPath: reportPath,
            },
        },
        trainerArtifact: {
            hardwareTelemetry: {
                thermal: {
                    available: false,
                    temperatureC: null,
                },
            },
        },
        decisionTrace: {
            decisions: [],
        },
    });

    assert.equal(artifactAudit.ok, false);
    assert.equal(artifactAudit.failures.some((entry) => entry.code === 'runtime-lane-missing'), true);
});
