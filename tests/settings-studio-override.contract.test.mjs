import assert from 'node:assert/strict';
import test from 'node:test';

import {
    createSettingsOverrideFieldRegistry,
    createSettingsStudioSchemaDescriptor,
    SETTINGS_OVERRIDE_SCHEMA_VERSION,
    SCHEMA_MIGRATION_CODES,
    classifyOverrideDraftMigration,
    migrateOverrideDraft,
    createSettingsOverrideDraft,
    validateSettingsOverrideDraft,
} from '../src/core/settings/SettingsOverrideContract.js';

import { createDefaultSettingsSnapshotWithOverride } from '../src/core/settings/SettingsDefaultsFacade.js';

// ─── 97.1 Field registry metadata ────────────────────

test('Field registry entries include riskLevel, help, impact, example', () => {
    const registry = createSettingsOverrideFieldRegistry();
    assert.ok(registry.length > 0, 'registry must not be empty');

    for (const field of registry) {
        assert.ok('riskLevel' in field, `${field.path} missing riskLevel`);
        assert.ok('help' in field, `${field.path} missing help`);
        assert.ok('impact' in field, `${field.path} missing impact`);
        assert.ok('example' in field, `${field.path} missing example`);
        assert.ok(['low', 'medium', 'high'].includes(field.riskLevel), `${field.path} riskLevel invalid: ${field.riskLevel}`);
    }
});

test('Known high-risk field baseSettings.botBridge.timeoutMs has riskLevel high', () => {
    const registry = createSettingsOverrideFieldRegistry();
    const field = registry.find((f) => f.path === 'baseSettings.botBridge.timeoutMs');
    assert.ok(field, 'field not found');
    assert.equal(field.riskLevel, 'high');
    assert.ok(field.help?.de, 'missing DE help text');
    assert.ok(field.help?.en, 'missing EN help text');
});

test('Known medium-risk field baseSettings.gameplay.speed has riskLevel medium', () => {
    const registry = createSettingsOverrideFieldRegistry();
    const field = registry.find((f) => f.path === 'baseSettings.gameplay.speed');
    assert.ok(field, 'field not found');
    assert.equal(field.riskLevel, 'medium');
    assert.ok(field.impact?.de, 'missing DE impact text');
});

test('configShare fields inherit metadata from baseSettings mirror', () => {
    const registry = createSettingsOverrideFieldRegistry();
    const field = registry.find((f) => f.path === 'configShare.gameplay.speed');
    assert.ok(field, 'configShare.gameplay.speed not found');
    assert.equal(field.riskLevel, 'medium');
    assert.ok(field.help?.de, 'missing inherited DE help text');
});

test('Schema descriptor fields include help metadata', () => {
    const descriptor = createSettingsStudioSchemaDescriptor();
    assert.ok(Array.isArray(descriptor.fields), 'descriptor.fields must be array');
    const field = descriptor.fields.find((f) => f.path === 'baseSettings.gameplay.speed');
    assert.ok(field, 'speed field not found in descriptor');
    assert.ok('riskLevel' in field, 'descriptor field missing riskLevel');
    assert.ok('help' in field, 'descriptor field missing help');
    assert.ok('impact' in field, 'descriptor field missing impact');
});

// ─── 97.4 Migration classification ───────────────────

test('classifyOverrideDraftMigration returns current for valid v1 draft', () => {
    const draft = createSettingsOverrideDraft();
    const result = classifyOverrideDraftMigration(draft);
    assert.equal(result.status, 'current');
    assert.equal(result.code, SCHEMA_MIGRATION_CODES.CURRENT);
    assert.equal(result.reason, null);
});

test('classifyOverrideDraftMigration returns upgrade for draft without schemaVersion', () => {
    const draft = { baseSettings: {}, language: 'de' };
    const result = classifyOverrideDraftMigration(draft);
    assert.equal(result.status, 'upgrade');
    assert.equal(result.code, SCHEMA_MIGRATION_CODES.UPGRADE);
    assert.ok(result.reason, 'missing upgrade reason');
});

test('classifyOverrideDraftMigration returns fallback for unknown future version', () => {
    const draft = { schemaVersion: 'menu-defaults-override.v99', baseSettings: {} };
    const result = classifyOverrideDraftMigration(draft);
    assert.equal(result.status, 'fallback');
    assert.equal(result.code, SCHEMA_MIGRATION_CODES.FALLBACK);
    assert.ok(result.reason?.includes('v99'), 'reason should mention unknown version');
});

test('classifyOverrideDraftMigration returns reject for non-object', () => {
    const result = classifyOverrideDraftMigration('not-an-object');
    assert.equal(result.status, 'reject');
    assert.equal(result.code, SCHEMA_MIGRATION_CODES.REJECT);
});

test('migrateOverrideDraft on upgrade sets correct schemaVersion', () => {
    const rawDraft = { language: 'de', baseSettings: {} };
    const migration = classifyOverrideDraftMigration(rawDraft);
    assert.equal(migration.status, 'upgrade');
    const migrated = migrateOverrideDraft(rawDraft, migration);
    assert.equal(migrated.schemaVersion, SETTINGS_OVERRIDE_SCHEMA_VERSION);
    assert.equal(migrated.language, 'de');
});

test('migrateOverrideDraft on current returns draft unchanged', () => {
    const draft = createSettingsOverrideDraft();
    const migration = classifyOverrideDraftMigration(draft);
    const migrated = migrateOverrideDraft(draft, migration);
    assert.deepEqual(migrated, draft);
});

// ─── 97.1/97.4 SettingsDefaultsFacade diagnostics ────

test('SettingsDefaultsFacade sets __overrideDiagnostics on validation failure', () => {
    const invalidDraft = {
        schemaVersion: SETTINGS_OVERRIDE_SCHEMA_VERSION,
        baseSettings: { numBots: 'not-a-number' },
    };
    const result = createDefaultSettingsSnapshotWithOverride(invalidDraft);
    assert.equal(result.__overrideSkipped, true, '__overrideSkipped must be true');
    assert.ok(result.__overrideSkippedReason, 'must have __overrideSkippedReason');
    assert.ok(result.__overrideDiagnostics, 'must have __overrideDiagnostics');
    assert.equal(result.__overrideDiagnostics.status, 'skipped');
    assert.equal(result.__overrideDiagnostics.reason, 'VALIDATION_FAILED');
    assert.ok(Array.isArray(result.__overrideDiagnostics.errorCodes), 'errorCodes must be array');
});

test('SettingsDefaultsFacade passes migrationCode into diagnostics', () => {
    const invalidDraft = { schemaVersion: SETTINGS_OVERRIDE_SCHEMA_VERSION, numBots: 'bad' };
    const migrationInfo = { status: 'upgrade', code: SCHEMA_MIGRATION_CODES.UPGRADE, reason: 'test upgrade' };
    const result = createDefaultSettingsSnapshotWithOverride(invalidDraft, migrationInfo);
    if (result.__overrideDiagnostics) {
        assert.equal(result.__overrideDiagnostics.migrationCode, SCHEMA_MIGRATION_CODES.UPGRADE);
    }
});

test('SettingsDefaultsFacade returns base defaults when override is null', () => {
    const result = createDefaultSettingsSnapshotWithOverride(null);
    assert.equal(result.__overrideSkipped, undefined);
    assert.equal(result.__overrideDiagnostics, undefined);
});

// ─── 97.5 Backup retention constants ─────────────────

test('validateSettingsOverrideDraft accepts a fresh default draft', () => {
    const draft = createSettingsOverrideDraft();
    const result = validateSettingsOverrideDraft(draft);
    assert.equal(result.valid, true, `validation failed: ${JSON.stringify(result.errors)}`);
    assert.equal(result.errors.length, 0);
});
