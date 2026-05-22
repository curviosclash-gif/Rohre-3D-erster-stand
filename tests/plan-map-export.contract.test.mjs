import test from 'node:test';
import assert from 'node:assert/strict';

import { buildPlanMapData } from '../scripts/export-plan-map.mjs';

test('plan map export builds a read-only implementation-plan dataset', async () => {
  const data = await buildPlanMapData({ rootDir: process.cwd() });

  assert.equal(data.contract, 'curvios.plan-map.v1');
  assert.equal(data.readOnly, true);
  assert.ok(data.summary.blockCount >= 30);
  assert.ok(data.summary.dependencyCount > 0);
  assert.ok(data.sources.masterPlan.endsWith('docs/Umsetzungsplan.md'));

  const v126 = data.blocks.find((block) => block.id === 'V126');
  assert.ok(v126, 'V126 is present');
  assert.equal(v126.priority, 'P1');
  assert.ok(v126.phaseProgress.total > 0);
  assert.ok(v126.scopeFiles.includes('vite.config.js'));
  assert.ok(v126.readiness);
  assert.ok(['ready', 'ready-with-risk', 'blocked', 'locked', 'done'].includes(v126.readiness.status));
  assert.ok(v126.impact.scopeFileCount > 0);
  assert.equal(v126.workstream, 'repo-governance');
  assert.equal(v126.workstreamLabel, 'Repo-Pflege & Governance');
  assert.ok(v126.explanation);
  assert.ok(typeof v126.explanation.brief === 'string');
  assert.ok(Array.isArray(v126.explanation.goal));
  assert.ok(Array.isArray(v126.explanation.implementedHighlights));
  assert.ok(v126.explanation.completionCounts.phaseTotal > 0);

  const v121OpenDependency = data.dependencies.find((edge) => (
    edge.from === 'V121'
    && edge.to === 'V120'
    && edge.phase === 'V120.99'
  ));
  assert.ok(v121OpenDependency, 'V121 -> V120.99 dependency is present');
  assert.equal(v121OpenDependency.fulfilled, false);

  assert.ok(data.graph.nodeCount > 0);
  assert.ok(data.scorecard.metrics.criticalPathTotalCount >= 4);
  assert.ok(Array.isArray(data.scopeCollisions));
  assert.ok(data.summary.byReadiness);
  assert.ok(data.summary.byWorkstream['repo-governance'] > 0);
  assert.ok(data.summary.intakePlanCount > 0);
  assert.ok(data.summary.byIntakeClassification['intake-review'] > 0);
  assert.ok(data.summary.byIntakeLane.candidate > 0);
  assert.ok(data.summary.byIntakeLane['adopted-open'] > 0);
  assert.ok(Number.isInteger(data.summary.intakeAdoptedDoneCount));
  assert.ok(data.summary.byIntakeLane['bot-training'] > 0);
  assert.ok(data.summary.byIntakeLane.meta > 0);
  assert.equal(data.summary.intakeCandidateCount, data.summary.byIntakeLane.candidate);
  assert.equal(data.summary.intakeAdoptedOpenCount, data.summary.byIntakeLane['adopted-open']);
  assert.equal(data.summary.intakeAdoptedDoneCount, data.summary.byIntakeLane['adopted-done'] ?? 0);
  assert.equal(data.summary.intakeBotTrainingCount, data.summary.byIntakeLane['bot-training']);
  assert.equal(data.summary.intakeMetaCount, data.summary.byIntakeLane.meta);
  assert.ok(data.sources.intakePlans.endsWith('docs/plaene/neu'));
  assert.ok(data.sources.archiveReferences.endsWith('docs/plaene/alt'));
  assert.ok(Array.isArray(data.archiveReferences));
  assert.ok(data.summary.archiveReferenceCount > 0);
  assert.equal(data.summary.archiveReferenceCount, data.archiveReferences.length);
  assert.ok(data.summary.byArchiveType['superseded-intake'] > 0);
  assert.ok(data.summary.byArchiveType['archived-block'] > 0);
  const mobileIntake = data.intakePlans.find((plan) => plan.path === 'docs/plaene/neu/Feature_Mobile_Classic_Steuerung_Hardening_V131.md');
  assert.ok(mobileIntake);
  assert.equal(mobileIntake.workstream, 'android-mobile');
  assert.equal(mobileIntake.classification, 'intake-review');
  assert.equal(mobileIntake.intakeLane, 'candidate');
  assert.equal(mobileIntake.intakeAction, 'review-for-master-intake');
  assert.equal(mobileIntake.primaryBlockId, 'V131');
  assert.equal(mobileIntake.canonicalBlockId, null);
  assert.equal(mobileIntake.requiresUserIntake, true);
  assert.equal(mobileIntake.targetPlanFile, 'docs/plaene/aktiv/V131.md');

  const adoptedOpen = data.intakePlans.find((plan) => plan.path === 'docs/plaene/neu/Feature_Graph_RAG_Viewer_Evidence_Dashboard_V121.md');
  assert.ok(adoptedOpen);
  assert.equal(adoptedOpen.intakeLane, 'adopted-open');
  assert.equal(adoptedOpen.intakeAction, 'open-canonical-block');
  assert.equal(adoptedOpen.canonicalBlockId, 'V121');
  assert.equal(adoptedOpen.requiresUserIntake, false);

  const archivedIntake = data.archiveReferences.find((reference) => (
    reference.path === 'docs/plaene/alt/superseded-intakes-2026-05/Feature_Legacy_Runtime_Surface_Sunset_V91.md'
  ));
  assert.ok(archivedIntake);
  assert.equal(archivedIntake.archiveType, 'superseded-intake');
  assert.equal(archivedIntake.canonicalBlockId, 'V91');
  assert.equal(archivedIntake.isReadOnly, true);
  assert.ok(archivedIntake.readRule.includes('Historien'));

  const archivedBlock = data.archiveReferences.find((reference) => reference.path === 'docs/plaene/alt/V74.md');
  assert.ok(archivedBlock);
  assert.equal(archivedBlock.archiveType, 'archived-block');
  assert.equal(archivedBlock.canonicalBlockId, 'V74');

  assert.ok(data.intakePlans.some((plan) => plan.intakeLane === 'bot-training' && plan.intakeAction === 'use-bot-training-governance'));
  assert.ok(data.intakePlans.some((plan) => plan.intakeLane === 'meta' && plan.intakeAction === 'reference-only'));

  const glbFollowup = data.intakePlans.find((plan) => plan.path === 'docs/plaene/neu/Feature_Audit_Followup_V11_GLB_Map_Varianz_V106.md');
  assert.ok(glbFollowup);
  assert.equal(glbFollowup.primaryBlockId, 'V106');
  assert.equal(glbFollowup.canonicalBlockId, 'V106');
  assert.equal(glbFollowup.blockIdAmbiguous, true);
  assert.ok(glbFollowup.ambiguousBlockIds.includes('V11'));
  assert.ok(data.workstreams.some((entry) => entry.id === 'map-tools-settings'));
  assert.ok(data.workstreams.some((entry) => entry.id === 'android-mobile'));
  assert.ok(data.fileIndex.some((entry) => entry.path === 'vite.config.js'));
  assert.ok(data.summary.changelogCount > 20);
  assert.ok(data.summary.changelogWithEvidenceCount > 0);
  assert.ok(data.changelog.some((entry) => (
    entry.blockIds.includes('V112')
    && entry.evidence.commands.some((command) => command.result === 'PASS')
  )));
  assert.ok(data.changelog.every((entry) => entry.source === 'docs/plaene/CHANGELOG.md'));
});
