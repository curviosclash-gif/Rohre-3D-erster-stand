import test from 'node:test';
import assert from 'node:assert/strict';

import { buildGraphRagIndex } from '../scripts/graph-rag-index.mjs';
import {
    routeGraphRagQuestion,
    runGraphRagQuery,
} from '../scripts/graph-rag-query.mjs';

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
]);

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
        assert.equal(result.evidencePackage.contract, 'knowledge-graph.rag-evidence-package.draft.v1', fixture.id);
        assert.equal(result.evidencePackage.claims.length, result.selectedChunks.length, fixture.id);
        for (const claim of result.evidencePackage.claims) {
            assert.match(claim.path, /^(docs|\.agents)\//, fixture.id);
            assert.ok(Number.isInteger(claim.lineStart), fixture.id);
            assert.ok(Number.isInteger(claim.lineEnd), fixture.id);
            assert.ok(['high', 'medium', 'low'].includes(claim.confidence), fixture.id);
        }
    }
});
