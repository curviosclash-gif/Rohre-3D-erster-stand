#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const GRAPH_PATH = 'docs/generated/knowledge-graph.json';
const COVERAGE_PATH = 'docs/generated/knowledge-graph.coverage.json';
const MIGRATIONS_PATH = 'data/contracts/knowledge-graph/schema-migrations.v1.json';
const MIGRATIONS_CONTRACT = 'knowledge-graph.schema-migrations.v1';
const MIGRATIONS_SCHEMA_VERSION = 1;

function normalizeRepoPath(value) {
    return String(value || '')
        .trim()
        .replace(/\\/g, '/')
        .replace(/^\.\/+/, '')
        .replace(/\/{2,}/g, '/');
}

async function readJson(relativePath) {
    const raw = await fs.readFile(path.join(ROOT, normalizeRepoPath(relativePath)), 'utf8');
    return JSON.parse(raw);
}

function artifactVersions({ graph, coverage }) {
    return {
        graph_schema_version: Number(graph?.schema_version),
        coverage_schema_version: Number(coverage?.schema_version),
        mapping_schema_version: 1,
    };
}

function sameVersions(left, right) {
    return Number(left?.graph_schema_version) === Number(right?.graph_schema_version)
        && Number(left?.coverage_schema_version) === Number(right?.coverage_schema_version)
        && Number(left?.mapping_schema_version) === Number(right?.mapping_schema_version);
}

function validateKnowledgeGraphMigrationContract(contract, violations = []) {
    if (!contract || typeof contract !== 'object') {
        violations.push({ code: 'KG_MIGRATION_CONTRACT_MISSING', message: `Migration-Contract fehlt: ${MIGRATIONS_PATH}` });
        return violations;
    }
    if (String(contract.contract || '').trim() !== MIGRATIONS_CONTRACT) {
        violations.push({ code: 'KG_MIGRATION_CONTRACT_UNSUPPORTED', message: `Migration-Contract unsupported: ${contract.contract || '<empty>'}` });
        return violations;
    }
    if (Number(contract.schema_version) !== MIGRATIONS_SCHEMA_VERSION) {
        violations.push({ code: 'KG_MIGRATION_SCHEMA_UNSUPPORTED', message: `Migration schema_version unsupported: ${contract.schema_version}` });
        return violations;
    }

    const current = contract.current || {};
    if (!Number.isInteger(Number(current.graph_schema_version))
        || !Number.isInteger(Number(current.coverage_schema_version))
        || !Number.isInteger(Number(current.mapping_schema_version))) {
        violations.push({ code: 'KG_MIGRATION_CURRENT_INVALID', message: 'Migration-Contract current-Versionen sind unvollstaendig' });
    }

    const migrations = Array.isArray(contract.migrations) ? contract.migrations : [];
    if (migrations.length === 0) {
        violations.push({ code: 'KG_MIGRATION_RULE_MISSING', message: 'Migration-Contract enthaelt keine Migrationsregel' });
        return violations;
    }

    const seenIds = new Set();
    let hasCurrentPath = false;
    for (const [index, migration] of migrations.entries()) {
        const id = String(migration?.id || '').trim();
        const mode = String(migration?.mode || '').trim();
        const status = String(migration?.status || '').trim();
        if (!id || !migration?.from || !migration?.to || !['noop', 'backfill'].includes(mode) || status !== 'active') {
            violations.push({ code: 'KG_MIGRATION_RULE_INVALID', message: `Migration migrations[${index}] ist unvollstaendig` });
            continue;
        }
        if (seenIds.has(id)) {
            violations.push({ code: 'KG_MIGRATION_RULE_DUPLICATE', message: `Migration ${id} ist doppelt deklariert` });
            continue;
        }
        seenIds.add(id);
        if (sameVersions(migration.from, current) && sameVersions(migration.to, current)) {
            hasCurrentPath = true;
        }
    }

    if (!hasCurrentPath) {
        violations.push({ code: 'KG_MIGRATION_CURRENT_PATH_MISSING', message: 'Migration-Contract braucht einen aktiven Current-v1-Pfad' });
    }

    return violations;
}

function resolveKnowledgeGraphMigration(versions, contract) {
    const current = contract.current || {};
    if (sameVersions(versions, current)) {
        return {
            status: 'current',
            migration: (contract.migrations || []).find((entry) => sameVersions(entry.from, current) && sameVersions(entry.to, current)) || null,
        };
    }

    const migration = (contract.migrations || [])
        .find((entry) => sameVersions(entry.from, versions) && sameVersions(entry.to, current)) || null;
    return {
        status: migration ? 'migration-required' : 'unsupported',
        migration,
    };
}

async function planKnowledgeGraphMigration() {
    const [graph, coverage, migrations] = await Promise.all([
        readJson(GRAPH_PATH),
        readJson(COVERAGE_PATH),
        readJson(MIGRATIONS_PATH),
    ]);
    const violations = validateKnowledgeGraphMigrationContract(migrations, []);
    if (violations.length > 0) {
        return {
            status: 'invalid-contract',
            violations,
        };
    }

    const versions = artifactVersions({ graph, coverage });
    const decision = resolveKnowledgeGraphMigration(versions, migrations);
    return {
        ...decision,
        versions,
        target: migrations.current,
        contract: MIGRATIONS_PATH,
        command: decision.migration?.backfill?.command || 'npm run graph:build',
    };
}

export {
    artifactVersions,
    planKnowledgeGraphMigration,
    resolveKnowledgeGraphMigration,
    validateKnowledgeGraphMigrationContract,
};

const isDirectRun = process.argv[1]
    && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isDirectRun) {
    const result = await planKnowledgeGraphMigration();
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    process.exit(result.status === 'unsupported' || result.status === 'invalid-contract' ? 1 : 0);
}
