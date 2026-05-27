#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { pathToFileURL } from 'node:url';

import {
    queryChangeRisk,
    queryCriticalPathHealth,
    queryEventFlow,
    queryExportView,
    queryFeedbackLoop,
    queryImpactForFile,
    queryIncidentAutoMinimize,
    queryPolicyEvaluation,
    queryQualityScorecard,
    querySchemaLint,
    queryTemporalAnomalies,
    queryTestPrioritization,
    queryWhatIfRemove,
    queryWhatIfReplace,
} from './query-knowledge-graph.mjs';

const ROOT = process.cwd();
const GRAPH_PATH = 'docs/generated/knowledge-graph.json';
const COVERAGE_PATH = 'docs/generated/knowledge-graph.coverage.json';
const SCORECARD_PATH = 'docs/generated/knowledge-graph.scorecard.json';
const QUERY_OPS_PATH = 'data/contracts/knowledge-graph/query-ops.v1.json';
const DEFAULT_PROFILE = 'desktop-local';
const SUPPORTED_SLO_QUERY_IDS = Object.freeze([
    'change-risk',
    'critical-path-health',
    'event-flow-combat-hit',
    'event-flow-round-end',
    'event-flow-spawn',
    'export-view',
    'feedback-loop-settings',
    'impact-settings-manager',
    'incident-auto-minimize-settings',
    'policy-evaluate',
    'quality-scorecard',
    'schema-lint',
    'temporal-anomalies',
    'test-prioritization-settings',
    'what-if-remove-settings',
    'what-if-replace-settings-validation',
]);

async function readJson(relativePath) {
    const raw = await fs.readFile(path.join(ROOT, relativePath), 'utf8');
    return JSON.parse(raw);
}

function percentile(values, percentileRank) {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((left, right) => left - right);
    const index = Math.min(sorted.length - 1, Math.ceil((percentileRank / 100) * sorted.length) - 1);
    return sorted[index];
}

function readSampleFiles(query) {
    return Array.isArray(query.sample_files)
        ? query.sample_files.map((entry) => String(entry || '').trim()).filter(Boolean)
        : [];
}

function buildQueryRunner(query, artifacts) {
    const { graph, coverage, scorecard, contract } = artifacts;
    const sampleFiles = readSampleFiles(query);

    if (query.id === 'critical-path-health') {
        return () => queryCriticalPathHealth(graph);
    }
    if (query.id === 'change-risk') {
        return () => queryChangeRisk(graph, coverage, sampleFiles, { baseRef: query.sample_base_ref || null });
    }
    if (query.id === 'export-view') {
        return () => queryExportView(graph, coverage, { unsafeRaw: false });
    }
    if (query.id === 'quality-scorecard') {
        return () => queryQualityScorecard(scorecard);
    }
    if (query.id === 'incident-auto-minimize-settings') {
        return () => queryIncidentAutoMinimize(graph, coverage, sampleFiles, { baseRef: query.sample_base_ref || null });
    }
    if (query.id === 'temporal-anomalies') {
        return () => queryTemporalAnomalies(scorecard);
    }
    if (query.id === 'schema-lint') {
        return () => querySchemaLint(graph, coverage, scorecard);
    }
    if (query.id === 'test-prioritization-settings') {
        return () => queryTestPrioritization(graph, coverage, sampleFiles, { baseRef: query.sample_base_ref || null });
    }
    if (query.id === 'policy-evaluate') {
        return () => queryPolicyEvaluation(graph, coverage, scorecard, contract);
    }
    if (query.id === 'feedback-loop-settings') {
        return () => queryFeedbackLoop(graph, coverage, sampleFiles, contract, { baseRef: query.sample_base_ref || null });
    }
    if (query.id === 'what-if-remove-settings') {
        return () => queryWhatIfRemove(graph, coverage, sampleFiles[0] || 'src/core/SettingsManager.js');
    }
    if (query.id === 'what-if-replace-settings-validation') {
        return () => queryWhatIfReplace(
            graph,
            coverage,
            sampleFiles[0] || 'src/core/SettingsManager.js',
            sampleFiles[1] || 'tests/runtime-settings-live-apply.contract.test.mjs'
        );
    }
    if (query.id === 'event-flow-spawn') {
        return () => queryEventFlow(graph, 'spawn');
    }
    if (query.id === 'event-flow-combat-hit') {
        return () => queryEventFlow(graph, 'combat-hit');
    }
    if (query.id === 'event-flow-round-end') {
        return () => queryEventFlow(graph, 'round-end');
    }
    if (query.id === 'impact-settings-manager') {
        return () => queryImpactForFile(graph, coverage, 'src/core/SettingsManager.js');
    }
    throw new Error(`Unsupported SLO query id: ${query.id}`);
}

async function runQuerySamples(query, artifacts, sampleCount) {
    const runQuery = buildQueryRunner(query, artifacts);
    const samples = [];
    JSON.stringify(runQuery());
    for (let index = 0; index < sampleCount; index += 1) {
        const start = performance.now();
        const result = runQuery();
        JSON.stringify(result);
        samples.push(performance.now() - start);
    }
    return {
        min_ms: Number(Math.min(...samples).toFixed(3)),
        p95_ms: Number(percentile(samples, 95).toFixed(3)),
        max_ms: Number(Math.max(...samples).toFixed(3)),
    };
}

async function main() {
    const profileId = process.env.KG_SLO_PROFILE || DEFAULT_PROFILE;
    const [graph, coverage, scorecard, contract] = await Promise.all([
        readJson(GRAPH_PATH),
        readJson(COVERAGE_PATH),
        readJson(SCORECARD_PATH),
        readJson(QUERY_OPS_PATH),
    ]);
    const artifacts = { graph, coverage, scorecard, contract };
    const gate = contract.regression_gate || {};
    const sampleCount = Number(gate.min_samples || 5);
    const tolerancePercent = Number(gate.tolerance_percent || 0);
    const failures = [];
    const measurements = [];

    for (const query of contract.queries || []) {
        const budget = query.profile_budgets?.[profileId];
        if (!budget) continue;
        const measurement = await runQuerySamples(query, artifacts, sampleCount);
        const budgetMs = Number(budget.p95_ms);
        const toleratedBaseline = Number(budget.baseline_p95_ms) * (1 + tolerancePercent / 100);
        const limitMs = budgetMs;
        const status = measurement.p95_ms <= limitMs ? 'pass' : 'fail';
        measurements.push({
            id: query.id,
            status,
            p95_ms: measurement.p95_ms,
            limit_ms: Number(limitMs.toFixed(3)),
            budget_ms: budgetMs,
            baseline_p95_ms: Number(budget.baseline_p95_ms),
            tolerated_baseline_ms: Number(toleratedBaseline.toFixed(3)),
        });
        if (status === 'fail') {
            failures.push(`${query.id} p95=${measurement.p95_ms}ms limit=${limitMs.toFixed(3)}ms playbook=${query.playbook || 'none'}`);
        }
    }

    process.stdout.write(`[graph:slo] profile=${profileId} samples=${sampleCount}\n`);
    for (const entry of measurements) {
        process.stdout.write(`- ${entry.id}: ${entry.status} p95=${entry.p95_ms}ms limit=${entry.limit_ms}ms\n`);
    }

    if (failures.length > 0) {
        process.stderr.write('[graph:slo] failed\n');
        for (const failure of failures) {
            process.stderr.write(`- ${failure}\n`);
        }
        return 1;
    }

    process.stdout.write('[graph:slo] passed\n');
    return 0;
}

const isDirectRun = process.argv[1]
    && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isDirectRun) {
    process.exit(await main());
}

export {
    buildQueryRunner,
    main as runKnowledgeGraphSloCheck,
    SUPPORTED_SLO_QUERY_IDS,
};
