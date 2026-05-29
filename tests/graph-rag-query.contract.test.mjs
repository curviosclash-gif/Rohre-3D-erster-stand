import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

import { buildGraphRagIndex } from '../scripts/graph-rag-index.mjs';
import {
    EVIDENCE_PACKAGE_CONTRACT,
    loadRagEvidencePackageContract,
    routeGraphRagQuestion,
    runGraphRagQuery,
    validateRagEvidencePackage,
    validateRagEvidencePackageContract,
} from '../scripts/graph-rag-query.mjs';

const ROOT = process.cwd();

const REFERENCE_QUESTIONS = Object.freeze([
    {
        id: 'scope-collisions-v112-v96',
        question: 'Welche Scope-Kollisionen betreffen V112 und V96?',
        expectedQueries: ['scope-collisions', 'files-for-block'],
        expectedBlocks: ['V112', 'V96'],
    },
    {
        id: 'settings-manager-history',
        question: 'Welche historischen SettingsManager-Entscheidungen sind fuer den aktuellen Pfad wichtig?',
        expectedQueries: ['impact-for-file'],
        expectedFiles: ['src/core/SettingsManager.js'],
    },
    {
        id: 'spawn-critical-path',
        question: 'Zeige mir den spawn Critical Path mit Tests und Evidence.',
        expectedQueries: ['event-flow', 'critical-path-health'],
        expectedCriticalPath: 'spawn',
    },
    {
        id: 'graph-rag-query-alias',
        question: 'Wo ist der Graph-RAG Query Code und welche Tests pruefen ihn?',
        expectedQueries: ['impact-for-file', 'test-prioritization'],
        expectedFiles: [
            'scripts/graph-rag-query.mjs',
            'tests/graph-rag-query.contract.test.mjs',
        ],
    },
    {
        id: 'codegraph-block-alias',
        question: 'Welche Handoff-Regeln gelten fuer CodeGraph?',
        expectedQueries: ['open-deps', 'files-for-block'],
        expectedBlocks: ['V137'],
    },
]);

const NEGATIVE_REFERENCE_QUESTIONS = Object.freeze([
    {
        id: 'nonexistent-block',
        question: 'Was ist mit V999 gemeint?',
        expectedUnresolved: { type: 'block', value: 'V999' },
    },
    {
        id: 'unclear-file',
        question: 'Was ist in src/does-not-exist/NopeWidget.js geregelt?',
        expectedUnresolved: { type: 'file', value: 'src/does-not-exist/NopeWidget.js' },
    },
    {
        id: 'mixed-scope',
        question: 'Welche Scope-Kollisionen betreffen V112 und V999?',
        expectedUnresolved: { type: 'block', value: 'V999' },
    },
    {
        id: 'false-critical-path',
        question: 'Zeige mir den fake Critical Path mit Tests und Evidence.',
        expectedUnresolved: { type: 'critical-path', value: 'fake' },
    },
]);

test('rag evidence package contract defines source-backed claims and budget report', async () => {
    const contract = await loadRagEvidencePackageContract();
    validateRagEvidencePackageContract(contract);

    assert.equal(contract.contract, EVIDENCE_PACKAGE_CONTRACT);
    assert.ok(contract.claim_schema.required.includes('claim'));
    assert.ok(contract.claim_schema.required.includes('path'));
    assert.ok(contract.claim_schema.required.includes('lineStart'));
    assert.ok(contract.claim_schema.required.includes('lineEnd'));
    assert.ok(contract.claim_schema.required.includes('confidence'));
    assert.ok(contract.claim_schema.required.includes('uncertainties'));
    assert.deepEqual(contract.claim_schema.confidence_values, ['high', 'medium', 'low']);
    assert.ok(contract.budget_report.required.includes('selectedEstimatedTokens'));
    assert.ok(contract.budget_report.required.includes('fallbackRate'));
    assert.ok(contract.ranking_report.required.includes('lowestConfidence'));
    assert.ok(contract.consumer_hints.required.includes('viewer'));
    assert.ok(contract.consumer_hints.required.includes('askRepo'));
    assert.equal(contract.consumer_hints.source_of_truth, false);
    assert.equal(contract.consumer_hints.safe_to_commit, false);
});

test('graph rag query CLI rejects --out outside tmp/graph-rag and writes allowed outputs', async () => {
    const forbidden = spawnSync(process.execPath, [
        'scripts/graph-rag-query.mjs',
        'Zeige mir den spawn Critical Path mit Tests und Evidence.',
        '--max-chunks',
        '1',
        '--out',
        'tmp/forbidden-query.json',
    ], {
        cwd: ROOT,
        encoding: 'utf8',
    });
    assert.notEqual(forbidden.status, 0);
    assert.match(forbidden.stderr, /Graph-RAG runtime output path must stay under tmp\/graph-rag\//);

    const outPath = 'tmp/graph-rag/graph-rag-query-contract-test.json';
    const index = await buildGraphRagIndex();
    try {
        const result = await runGraphRagQuery('Zeige mir den spawn Critical Path mit Tests und Evidence.', {
            index,
            maxChunks: 1,
            outPath,
        });
        assert.equal(result.writtenPath, outPath);
        const artifact = JSON.parse(await fs.readFile(path.join(ROOT, outPath), 'utf8'));
        assert.equal(artifact.contract, 'knowledge-graph.rag-query.v1');
    } finally {
        await fs.rm(path.join(ROOT, outPath), { force: true });
    }
});

test('graph rag intent router maps reference questions to conservative graph queries', () => {
    const scopeRoute = routeGraphRagQuestion(REFERENCE_QUESTIONS[0].question);
    assert.deepEqual(new Set(scopeRoute.blockIds), new Set(['V112', 'V96']));
    assert.ok(scopeRoute.intents.includes('plan'));
    assert.ok(scopeRoute.graphQueries.some((query) => query.id === 'scope-collisions'));
    assert.equal(scopeRoute.graphQueries.filter((query) => query.id === 'files-for-block').length, 2);

    const settingsRoute = routeGraphRagQuestion(REFERENCE_QUESTIONS[1].question);
    assert.deepEqual(settingsRoute.filePaths, ['src/core/SettingsManager.js']);
    assert.ok(settingsRoute.intents.includes('file'));
    assert.ok(settingsRoute.intents.includes('history'));
    assert.ok(settingsRoute.graphQueries.some((query) => query.id === 'impact-for-file'));

    const spawnRoute = routeGraphRagQuestion(REFERENCE_QUESTIONS[2].question);
    assert.equal(spawnRoute.criticalPath, 'spawn');
    assert.ok(spawnRoute.intents.includes('runtime'));
    assert.ok(spawnRoute.intents.includes('test'));
    assert.ok(spawnRoute.graphQueries.some((query) => query.id === 'event-flow'));

    const graphRagRoute = routeGraphRagQuestion(REFERENCE_QUESTIONS[3].question);
    assert.ok(graphRagRoute.filePaths.includes('scripts/graph-rag-query.mjs'));
    assert.ok(graphRagRoute.filePaths.includes('tests/graph-rag-query.contract.test.mjs'));
    assert.ok(graphRagRoute.intents.includes('file'));
    assert.ok(graphRagRoute.intents.includes('test'));

    const codeGraphRoute = routeGraphRagQuestion(REFERENCE_QUESTIONS[4].question);
    assert.ok(codeGraphRoute.blockIds.includes('V137'));
    assert.ok(codeGraphRoute.intents.includes('plan'));
});

test('graph rag query runs graph-first before selecting source-backed chunks', async () => {
    const index = await buildGraphRagIndex();

    for (const fixture of REFERENCE_QUESTIONS) {
        const result = await runGraphRagQuery(fixture.question, {
            index,
            maxChunks: 4,
        });

        assert.equal(result.contract, 'knowledge-graph.rag-query.v1', fixture.id);
        assert.equal(result.pipeline[0].stage, 'intent-router', fixture.id);
        assert.equal(result.pipeline[1].stage, 'graph-query', fixture.id);
        assert.equal(result.pipeline[3].stage, 'text-retrieval', fixture.id);
        for (const expectedQuery of fixture.expectedQueries) {
            assert.ok(
                result.route.graphQueries.some((query) => query.id === expectedQuery),
                `${fixture.id} expected ${expectedQuery}`
            );
        }
        for (const expectedBlock of fixture.expectedBlocks || []) {
            assert.ok(result.route.blockIds.includes(expectedBlock), `${fixture.id} expected block ${expectedBlock}`);
        }
        for (const expectedFile of fixture.expectedFiles || []) {
            assert.ok(result.route.filePaths.includes(expectedFile), `${fixture.id} expected file ${expectedFile}`);
        }
        if (fixture.expectedCriticalPath) {
            assert.equal(result.route.criticalPath, fixture.expectedCriticalPath, fixture.id);
        }

        assert.ok(result.budget.graphCandidatePathCount > 0, `${fixture.id} should have graph candidates`);
        assert.ok(result.selectedChunks.length > 0, `${fixture.id} should select chunks`);
        assert.equal(result.evidencePackage.contract, EVIDENCE_PACKAGE_CONTRACT, fixture.id);
        validateRagEvidencePackage(result.evidencePackage, await loadRagEvidencePackageContract());
        assert.equal(result.evidencePackage.claims.length, result.selectedChunks.length, fixture.id);
        assert.equal(result.evidencePackage.budgetReport.chunksSelected, result.selectedChunks.length, fixture.id);
        assert.equal(result.evidencePackage.budgetReport.candidatePathCount, result.graph.candidates.length, fixture.id);
        assert.equal(result.evidencePackage.budgetReport.selectedGraphCandidateChunks + result.evidencePackage.budgetReport.selectedTextFallbackChunks, result.selectedChunks.length, fixture.id);
        assert.equal(
            result.evidencePackage.budgetReport.selectedEstimatedTokens,
            result.budget.selectedEstimatedTokens,
            fixture.id
        );
        assert.equal(result.evidencePackage.rankingReport.lowestConfidence, result.budget.lowestConfidence, fixture.id);
        assert.ok(result.evidencePackage.rankingReport.topCandidates.length > 0, fixture.id);
        assert.ok(Array.isArray(result.evidencePackage.rankingReport.rejectedChunks), fixture.id);
        for (const field of (await loadRagEvidencePackageContract()).budget_report.required) {
            assert.deepEqual(result.budget[field], result.evidencePackage.budgetReport[field], `${fixture.id} budget ${field}`);
        }
        assert.equal(result.budget.selectedChunkCount, result.evidencePackage.budgetReport.chunksSelected, fixture.id);
        assert.equal(result.budget.rejectedChunkCount, result.evidencePackage.budgetReport.chunksRejected, fixture.id);
        assert.equal(result.evidencePackage.consumerHints.viewer.sourceOfTruth, false, fixture.id);
        assert.equal(result.evidencePackage.consumerHints.askRepo.requiresSourceLinks, true, fixture.id);
        assert.equal(result.evidencePackage.consumerHints.exportPolicy.safeToCommit, false, fixture.id);
        assert.equal(result.evidencePackage.consumerHints.sourceLinks.length, result.evidencePackage.claims.length, fixture.id);
        assert.ok(result.graph.candidates.every((candidate) => candidate.path && candidate.reasons.length > 0));
        for (const claim of result.evidencePackage.claims) {
            assert.match(claim.path, /^(docs|\.agents)\//, fixture.id);
            assert.ok(Number.isInteger(claim.lineStart), fixture.id);
            assert.ok(Number.isInteger(claim.lineEnd), fixture.id);
            assert.ok(claim.lineEnd >= claim.lineStart, fixture.id);
            assert.ok(['high', 'medium', 'low'].includes(claim.confidence), fixture.id);
            assert.ok(Array.isArray(claim.uncertainties), fixture.id);
            assert.ok(claim.uncertainties.length > 0, fixture.id);
        }
    }
});

test('graph rag negative reference questions keep unresolved matches below high confidence', async () => {
    const index = await buildGraphRagIndex();

    for (const fixture of NEGATIVE_REFERENCE_QUESTIONS) {
        const result = await runGraphRagQuery(fixture.question, {
            index,
            maxChunks: 4,
        });

        assert.ok(
            result.route.unresolvedReferences.some((reference) => (
                reference.type === fixture.expectedUnresolved.type
                && reference.value === fixture.expectedUnresolved.value
            )),
            `${fixture.id} should expose unresolved ${fixture.expectedUnresolved.type}`
        );
        assert.ok(result.evidencePackage.uncertainties.includes('unresolved-query-reference'), fixture.id);
        assert.ok(!result.evidencePackage.claims.some((claim) => claim.confidence === 'high'), fixture.id);
        assert.notEqual(result.evidencePackage.rankingReport.lowestConfidence, 'high', fixture.id);
        assert.ok(result.evidencePackage.rankingReport.rejectedChunks.every((chunk) => chunk.rejectedReason), fixture.id);
    }
});
