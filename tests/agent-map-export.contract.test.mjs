import test from 'node:test';
import assert from 'node:assert/strict';

import { buildAgentMapData } from '../scripts/export-agent-map.mjs';
import { buildKnowledgeGraph } from '../scripts/build-knowledge-graph.mjs';

test('agent map export builds a read-only agent governance dataset', async () => {
  const data = await buildAgentMapData({ rootDir: process.cwd() });

  assert.equal(data.contract, 'curvios.agent-map.v1');
  assert.equal(data.readOnly, true);
  assert.equal(data.sources.entrypoint, 'AGENTS.md');
  assert.equal(data.sources.rules, '.agents/rules');
  assert.equal(data.sources.workflows, '.agents/workflows');
  assert.equal(data.graphMapping.mappingId, 'agent-governance');
  assert.ok(data.summary.taskCount >= 8);
  assert.ok(data.summary.ruleCount >= 5);
  assert.ok(data.summary.workflowCount >= 10);
  assert.ok(data.summary.skillCount >= 3);
  assert.ok(data.summary.checkCount >= 6);
  assert.ok(data.summary.edgeCount > data.summary.workflowCount);

  const codeWorkflow = data.workflows.find((workflow) => workflow.id === 'code');
  assert.ok(codeWorkflow, 'code workflow is present');
  assert.equal(codeWorkflow.path, '.agents/workflows/code.md');
  assert.ok(codeWorkflow.ruleIds.includes('planning-and-governance'));
  assert.ok(codeWorkflow.ruleIds.includes('git-and-commits'));
  assert.ok(codeWorkflow.skillIds.includes('curvios-agent-governance'));
  assert.ok(codeWorkflow.skillIds.includes('curvios-graph-navigation'));
  assert.ok(codeWorkflow.checkIds.includes('agent-preflight'));

  const bugfixTask = data.tasks.find((task) => task.label === 'Bugfix');
  assert.ok(bugfixTask, 'Bugfix task is present');
  assert.ok(bugfixTask.workflowIds.includes('bugfix'));

  const nodeIds = new Set(data.nodes.map((node) => node.id));
  const edgeKeys = new Set(data.edges.map((edge) => `${edge.from}->${edge.to}:${edge.type}`));
  assert.ok(nodeIds.has('entry:agents'));
  assert.ok(nodeIds.has('workflow:code'));
  assert.ok(nodeIds.has('rule:planning-and-governance'));
  assert.ok(nodeIds.has('skill:curvios-agent-governance'));
  assert.ok(nodeIds.has('skill:plan-generator'));
  assert.ok(nodeIds.has('check:agent-preflight'));
  assert.ok(edgeKeys.has('task:bugfix->workflow:bugfix:uses_workflow'));
  assert.ok(edgeKeys.has('workflow:code->rule:planning-and-governance:reads_rule'));
  assert.ok(edgeKeys.has('workflow:code->skill:curvios-agent-governance:recommends_skill'));
});

test('agent governance is represented in the knowledge graph mapping source', async () => {
  const graph = await buildKnowledgeGraph();
  const nodes = new Map(graph.nodes.map((node) => [node.id, node]));
  const edges = new Set(graph.edges.map((edge) => `${edge.from}->${edge.to}:${edge.type}`));

  for (const nodeId of [
    'runtime:agent-map-export',
    'runtime:agent-map-viewer',
    'runtime:agent-preflight',
    'state:agent-map-readonly-dataset',
    'config:agent-governance-entrypoint',
    'config:agent-workflow-code',
    'config:agent-rule-planning-and-governance',
    'config:agent-skill-curvios-agent-governance',
    'test:agent-map-export-contract',
  ]) {
    assert.ok(nodes.has(nodeId), `${nodeId} missing`);
  }

  assert.equal(nodes.get('runtime:agent-map-export').attributes.mappingId, 'agent-governance');
  assert.ok(edges.has('runtime:agent-map-export->state:agent-map-readonly-dataset:writes_state'));
  assert.ok(edges.has('runtime:agent-map-viewer->state:agent-map-readonly-dataset:reads_state'));
  assert.ok(edges.has('config:agent-governance-entrypoint->config:agent-rule-planning-and-governance:reads_config'));
});
