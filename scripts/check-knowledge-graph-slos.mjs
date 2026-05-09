#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

import {
    queryChangeRisk,
    queryCriticalPathHealth,
    queryEventFlow,
    queryImpactForFile,
} from './query-knowledge-graph.mjs';

const ROOT = process.cwd();
const GRAPH_PATH = 'docs/generated/knowledge-graph.json';
const COVERAGE_PATH = 'docs/generated/knowledge-graph.coverage.json';
const QUERY_OPS_PATH = 'data/contracts/knowledge-graph/query-ops.v1.json';
const DEFAULT_PROFILE = 'desktop-local';

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

function buildQueryRunner(query, graph, coverage) {
    if (query.id === 'critical-path-health') {
        return () => queryCriticalPathHealth(graph);
    }
    if (query.id === 'change-risk') {
        return () => queryChangeRisk(graph, coverage, query.sample_files || [], { baseRef: query.sample_base_ref || null });
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

async function runQuerySamples(query, graph, coverage, sampleCount) {
    const runQuery = buildQueryRunner(query, graph, coverage);
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
    const [graph, coverage, contract] = await Promise.all([
        readJson(GRAPH_PATH),
        readJson(COVERAGE_PATH),
        readJson(QUERY_OPS_PATH),
    ]);
    const gate = contract.regression_gate || {};
    const sampleCount = Number(gate.min_samples || 5);
    const tolerancePercent = Number(gate.tolerance_percent || 0);
    const failures = [];
    const measurements = [];

    for (const query of contract.queries || []) {
        const budget = query.profile_budgets?.[profileId];
        if (!budget) continue;
        const measurement = await runQuerySamples(query, graph, coverage, sampleCount);
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

process.exit(await main());
