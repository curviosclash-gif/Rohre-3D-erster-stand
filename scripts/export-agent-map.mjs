#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_OUTPUT = 'tmp/agent-map/agent-map.json';
const AGENTS_PATH = 'AGENTS.md';
const RULES_DIR = '.agents/rules';
const WORKFLOWS_DIR = '.agents/workflows';
const AGENT_GOVERNANCE_MAPPING_PATH = 'data/contracts/knowledge-graph/agent-governance.v1.json';

const SKILL_CATALOG = [
  {
    id: 'curvios-agent-governance',
    label: 'Curvios Agent Governance',
    scope: 'repo-governance-router',
    source: 'codex-skill',
    pathHint: '$CODEX_HOME/skills/curvios-agent-governance/SKILL.md',
    description: 'Routes CurviosClash work through AGENTS.md, rules, workflows, decision class, preflight and graph context.',
  },
  {
    id: 'curvios-graph-navigation',
    label: 'Curvios Graph Navigation',
    scope: 'knowledge-graph-radar',
    source: 'codex-skill',
    pathHint: '$CODEX_HOME/skills/curvios-graph-navigation/SKILL.md',
    description: 'Chooses focused knowledge-graph queries for scope, impact, dependencies, event flow, coverage and graph health.',
  },
];

const CHECK_CATALOG = [
  {
    id: 'guard-main',
    label: 'Main branch guard',
    command: 'npm run guard:main',
    kind: 'git-safety',
    description: 'Confirms the expected main-branch working context before commit or push work.',
  },
  {
    id: 'agent-preflight',
    label: 'Agent preflight',
    command: 'npm run agent:preflight -- --workflow=<workflow> --decision=<D0-D4> --evidence="<gate> -> PASS"',
    kind: 'governance',
    description: 'Checks workflow, decision class, staged scope and graph context before commit.',
  },
  {
    id: 'graph-query',
    label: 'Knowledge graph query',
    command: 'node scripts/query-knowledge-graph.mjs <query> --json',
    kind: 'graph-radar',
    description: 'Uses the graph as scope and impact radar; it does not override governance sources.',
  },
  {
    id: 'graph-check',
    label: 'Knowledge graph check',
    command: 'npm run graph:check',
    kind: 'graph-integrity',
    description: 'Validates generated graph artifacts and mapping integrity.',
  },
  {
    id: 'plan-check',
    label: 'Plan check',
    command: 'npm run plan:check',
    kind: 'plan-governance',
    description: 'Validates master and active plan structure.',
  },
  {
    id: 'gates-pre-commit',
    label: 'Pre-commit gates',
    command: 'npm run gates:pre-commit',
    kind: 'closure-gate',
    description: 'Meta gate for plan, docs, graph and governance-sensitive slices.',
  },
  {
    id: 'targeted-tests',
    label: 'Targeted tests',
    command: 'node --test <focused-test>',
    kind: 'verification',
    description: 'Smallest meaningful test signal for the touched behavior.',
  },
];

const DEFAULT_RULE_IDS = [
  'planning-and-governance',
  'git-and-commits',
  'code-quality-and-debugging',
  'product-focus',
  'token-efficiency-and-tools',
];

const WORKFLOW_RULE_FALLBACKS = {
  plan: ['planning-and-governance', 'token-efficiency-and-tools', 'product-focus'],
  code: DEFAULT_RULE_IDS,
  quick: ['planning-and-governance', 'git-and-commits', 'code-quality-and-debugging', 'token-efficiency-and-tools'],
  bugfix: ['planning-and-governance', 'git-and-commits', 'code-quality-and-debugging', 'token-efficiency-and-tools'],
  'analyse-planung': ['planning-and-governance', 'token-efficiency-and-tools'],
  'fix-planung': ['planning-and-governance', 'git-and-commits', 'token-efficiency-and-tools'],
  'bot-training-plan': ['planning-and-governance', 'git-and-commits', 'token-efficiency-and-tools'],
  status: ['planning-and-governance', 'token-efficiency-and-tools'],
  cleanup: ['planning-and-governance', 'git-and-commits', 'code-quality-and-debugging', 'token-efficiency-and-tools'],
  refactor: ['planning-and-governance', 'git-and-commits', 'code-quality-and-debugging', 'token-efficiency-and-tools'],
  release: ['planning-and-governance', 'git-and-commits', 'product-focus'],
};

const WORKFLOW_CHECK_FALLBACKS = {
  plan: ['agent-preflight', 'plan-check'],
  code: ['guard-main', 'graph-query', 'plan-check', 'agent-preflight'],
  quick: ['guard-main', 'targeted-tests', 'agent-preflight'],
  bugfix: ['guard-main', 'graph-query', 'targeted-tests', 'agent-preflight'],
  'analyse-planung': ['graph-query', 'plan-check'],
  'fix-planung': ['graph-query', 'plan-check', 'agent-preflight'],
  'bot-training-plan': ['plan-check', 'targeted-tests', 'agent-preflight'],
  status: ['graph-query', 'plan-check'],
  cleanup: ['guard-main', 'graph-query', 'targeted-tests', 'agent-preflight'],
  refactor: ['guard-main', 'graph-query', 'targeted-tests', 'agent-preflight'],
  release: ['guard-main', 'gates-pre-commit', 'agent-preflight'],
};

function normalizePath(value) {
  return String(value || '')
    .trim()
    .replace(/\\/g, '/')
    .replace(/^\.\/+/, '')
    .replace(/\/{2,}/g, '/');
}

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/ae/g, 'ae')
    .replace(/oe/g, 'oe')
    .replace(/ue/g, 'ue')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'item';
}

function cleanCell(value) {
  return String(value || '')
    .trim()
    .replace(/^`|`$/g, '')
    .trim();
}

function basenameId(relativePath) {
  return path.basename(normalizePath(relativePath), '.md');
}

function titleFromId(id) {
  return String(id || '')
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');
}

function parseFrontmatter(markdown) {
  const normalized = String(markdown || '').replace(/^\uFEFF/, '');
  const match = normalized.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) {
    return {};
  }

  const data = {};
  let currentKey = null;
  for (const line of match[1].split(/\r?\n/)) {
    const keyValue = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (keyValue) {
      currentKey = keyValue[1];
      data[currentKey] = cleanCell(keyValue[2]);
      continue;
    }
    const listItem = line.match(/^\s+-\s*(.*)$/);
    if (listItem && currentKey) {
      if (!Array.isArray(data[currentKey])) {
        data[currentKey] = data[currentKey] ? [data[currentKey]] : [];
      }
      data[currentKey].push(cleanCell(listItem[1]));
    }
  }
  return data;
}

function stripFrontmatter(markdown) {
  return String(markdown || '').replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '');
}

function firstHeading(markdown) {
  const match = stripFrontmatter(markdown).match(/^#\s+(.+)$/m);
  return match ? cleanCell(match[1]) : null;
}

function firstPlainLine(markdown) {
  const body = stripFrontmatter(markdown);
  for (const rawLine of body.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || line.startsWith('<!--') || line.startsWith('|') || line.startsWith('- ')) {
      continue;
    }
    return line.replace(/`/g, '');
  }
  return null;
}

function splitMarkdownTableRow(line) {
  return String(line || '')
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map(cleanCell);
}

function extractBacktickPaths(value) {
  const refs = [];
  const regex = /(?:`([^`]+?\.md)`|((?:\.agents|docs)\/[A-Za-z0-9._/-]+?\.md))/g;
  let match;
  while ((match = regex.exec(String(value || ''))) != null) {
    refs.push(normalizePath(match[1] || match[2]));
  }
  return refs;
}

function extractRuleRefs(markdown) {
  const refs = new Set();
  const regex = /`(\.agents\/rules\/[^`]+?\.md)`/g;
  let match;
  while ((match = regex.exec(String(markdown || ''))) != null) {
    refs.add(basenameId(match[1]));
  }
  return [...refs].sort((left, right) => left.localeCompare(right));
}

function parseWorkflowTable(agentsMarkdown) {
  const rows = [];
  const lines = String(agentsMarkdown || '').split(/\r?\n/);
  let inTable = false;
  for (const line of lines) {
    if (/^\|\s*Aufgabe\s*\|\s*Workflow\s*\|/.test(line)) {
      inTable = true;
      continue;
    }
    if (!inTable) continue;
    if (!line.trim().startsWith('|')) {
      if (rows.length > 0) break;
      continue;
    }
    if (/^\|\s*-+/.test(line)) continue;
    const cells = splitMarkdownTableRow(line);
    if (cells.length < 2) continue;
    const workflowPaths = extractBacktickPaths(cells[1]);
    if (workflowPaths.length === 0) continue;
    rows.push({
      id: slugify(cells[0]),
      label: cells[0],
      workflowPaths,
      workflowIds: workflowPaths.map(basenameId),
      source: AGENTS_PATH,
    });
  }
  return rows;
}

async function readText(rootDir, relativePath) {
  return fs.readFile(path.join(rootDir, relativePath), 'utf8');
}

async function readJsonIfExists(rootDir, relativePath) {
  try {
    return JSON.parse(await readText(rootDir, relativePath));
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
}

async function listMarkdownFiles(rootDir, relativeDir) {
  const absoluteDir = path.join(rootDir, relativeDir);
  const entries = await fs.readdir(absoluteDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.md'))
    .map((entry) => normalizePath(path.join(relativeDir, entry.name)))
    .sort((left, right) => left.localeCompare(right));
}

function unique(values) {
  return [...new Set((values || []).filter(Boolean))].sort((left, right) => left.localeCompare(right));
}

function inferWorkflowSkillIds(workflowId) {
  if (/^(code|quick|bugfix|plan|fix-planung|analyse-planung|status|bot-training-plan)$/.test(workflowId)) {
    return ['curvios-agent-governance', 'curvios-graph-navigation'];
  }
  return ['curvios-agent-governance'];
}

function createNodes({ tasks, rules, workflows, skills, checks }) {
  return [
    {
      id: 'entry:agents',
      type: 'entrypoint',
      label: 'AGENTS.md',
      path: AGENTS_PATH,
      layer: 'entry',
    },
    ...tasks.map((task) => ({
      id: `task:${task.id}`,
      type: 'task',
      label: task.label,
      layer: 'task',
      path: task.source,
    })),
    ...workflows.map((workflow) => ({
      id: `workflow:${workflow.id}`,
      type: 'workflow',
      label: workflow.label,
      path: workflow.path,
      layer: 'workflow',
      description: workflow.description,
    })),
    ...rules.map((rule) => ({
      id: `rule:${rule.id}`,
      type: 'rule',
      label: rule.label,
      path: rule.path,
      layer: 'rule',
      description: rule.description,
    })),
    ...skills.map((skill) => ({
      id: `skill:${skill.id}`,
      type: 'skill',
      label: skill.label,
      path: skill.pathHint,
      layer: 'skill',
      description: skill.description,
    })),
    ...checks.map((check) => ({
      id: `check:${check.id}`,
      type: 'check',
      label: check.label,
      command: check.command,
      layer: 'check',
      description: check.description,
    })),
  ];
}

function createEdges({ tasks, rules, workflows, checks }) {
  const edges = [];
  const ruleIds = new Set(rules.map((rule) => rule.id));
  const workflowById = new Map(workflows.map((workflow) => [workflow.id, workflow]));
  const checkIds = new Set(checks.map((check) => check.id));

  for (const rule of rules) {
    edges.push({
      from: 'entry:agents',
      to: `rule:${rule.id}`,
      type: 'references_rule',
      label: 'references',
    });
  }
  for (const workflow of workflows) {
    edges.push({
      from: 'entry:agents',
      to: `workflow:${workflow.id}`,
      type: 'references_workflow',
      label: 'routes',
    });
  }

  for (const workflow of workflows) {
    for (const ruleId of workflow.ruleIds.filter((id) => ruleIds.has(id))) {
      edges.push({
        from: `workflow:${workflow.id}`,
        to: `rule:${ruleId}`,
        type: 'reads_rule',
        label: 'reads',
      });
    }
    for (const checkId of workflow.checkIds.filter((id) => checkIds.has(id))) {
      edges.push({
        from: `workflow:${workflow.id}`,
        to: `check:${checkId}`,
        type: 'uses_check',
        label: 'checks',
      });
    }
    for (const skillId of workflow.skillIds) {
      edges.push({
        from: `workflow:${workflow.id}`,
        to: `skill:${skillId}`,
        type: 'recommends_skill',
        label: 'skill',
      });
    }
  }

  for (const task of tasks) {
    for (const workflowId of task.workflowIds.filter((id) => workflowById.has(id))) {
      edges.push({
        from: `task:${task.id}`,
        to: `workflow:${workflowId}`,
        type: 'uses_workflow',
        label: 'workflow',
      });
    }
  }

  edges.push({
    from: 'skill:curvios-agent-governance',
    to: 'check:agent-preflight',
    type: 'uses_check',
    label: 'preflight',
  });
  edges.push({
    from: 'skill:curvios-graph-navigation',
    to: 'check:graph-query',
    type: 'uses_check',
    label: 'query',
  });

  return unique(edges.map((edge) => `${edge.from}\n${edge.to}\n${edge.type}`))
    .map((key) => {
      const [from, to, type] = key.split('\n');
      return edges.find((edge) => edge.from === from && edge.to === to && edge.type === type);
    });
}

function createSummary({ tasks, rules, workflows, skills, checks, edges }) {
  return {
    taskCount: tasks.length,
    ruleCount: rules.length,
    workflowCount: workflows.length,
    skillCount: skills.length,
    checkCount: checks.length,
    edgeCount: edges.length,
  };
}

function summarizeMapping(mapping) {
  if (!mapping) {
    return null;
  }
  return {
    path: AGENT_GOVERNANCE_MAPPING_PATH,
    mappingId: mapping.mapping_id || null,
    nodeCount: Array.isArray(mapping.nodes) ? mapping.nodes.length : 0,
    edgeCount: Array.isArray(mapping.edges) ? mapping.edges.length : 0,
  };
}

export async function buildAgentMapData({ rootDir = process.cwd() } = {}) {
  const [agentsMarkdown, rulePaths, workflowPaths, graphMapping] = await Promise.all([
    readText(rootDir, AGENTS_PATH),
    listMarkdownFiles(rootDir, RULES_DIR),
    listMarkdownFiles(rootDir, WORKFLOWS_DIR),
    readJsonIfExists(rootDir, AGENT_GOVERNANCE_MAPPING_PATH),
  ]);

  const tasks = parseWorkflowTable(agentsMarkdown);
  const rules = await Promise.all(rulePaths.map(async (rulePath) => {
    const markdown = await readText(rootDir, rulePath);
    const frontmatter = parseFrontmatter(markdown);
    const id = basenameId(rulePath).replace(/_/g, '-');
    return {
      id,
      label: firstHeading(markdown) || titleFromId(id),
      path: rulePath,
      description: frontmatter.description || firstPlainLine(markdown) || '',
      source: AGENTS_PATH,
    };
  }));

  const workflows = await Promise.all(workflowPaths.map(async (workflowPath) => {
    const markdown = await readText(rootDir, workflowPath);
    const frontmatter = parseFrontmatter(markdown);
    const id = basenameId(workflowPath);
    const ruleIds = unique([
      ...extractRuleRefs(markdown).map((value) => value.replace(/_/g, '-')),
      ...(WORKFLOW_RULE_FALLBACKS[id] || []),
    ]);
    const checkIds = unique(WORKFLOW_CHECK_FALLBACKS[id] || ['agent-preflight']);
    return {
      id,
      label: firstHeading(markdown) || titleFromId(id),
      path: workflowPath,
      description: frontmatter.description || firstPlainLine(markdown) || '',
      ruleIds,
      checkIds,
      skillIds: inferWorkflowSkillIds(id),
      source: AGENTS_PATH,
    };
  }));

  const workflowById = new Map(workflows.map((workflow) => [workflow.id, workflow]));
  const normalizedTasks = tasks.map((task) => ({
    ...task,
    workflowIds: task.workflowIds.filter((id) => workflowById.has(id)),
  }));

  const nodes = createNodes({
    tasks: normalizedTasks,
    rules,
    workflows,
    skills: SKILL_CATALOG,
    checks: CHECK_CATALOG,
  });
  const edges = createEdges({
    tasks: normalizedTasks,
    rules,
    workflows,
    checks: CHECK_CATALOG,
  });

  return {
    contract: 'curvios.agent-map.v1',
    generatedAt: new Date().toISOString(),
    readOnly: true,
    purpose: 'Agent Map maps task types to workflows, rules, skills and checks without becoming a governance source of truth.',
    sources: {
      entrypoint: AGENTS_PATH,
      rules: RULES_DIR,
      workflows: WORKFLOWS_DIR,
      graphMapping: AGENT_GOVERNANCE_MAPPING_PATH,
    },
    graphMapping: summarizeMapping(graphMapping),
    tasks: normalizedTasks,
    rules,
    workflows,
    skills: SKILL_CATALOG,
    checks: CHECK_CATALOG,
    nodes,
    edges,
    summary: createSummary({
      tasks: normalizedTasks,
      rules,
      workflows,
      skills: SKILL_CATALOG,
      checks: CHECK_CATALOG,
      edges,
    }),
  };
}

function parseArgs(argv) {
  const args = {
    output: DEFAULT_OUTPUT,
    stdout: false,
    pretty: true,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--stdout') {
      args.stdout = true;
    } else if (arg === '--compact') {
      args.pretty = false;
    } else if (arg === '--out') {
      args.output = argv[index + 1] || args.output;
      index += 1;
    } else if (arg.startsWith('--out=')) {
      args.output = arg.slice('--out='.length);
    } else if (arg === '--help' || arg === '-h') {
      args.help = true;
    }
  }

  return args;
}

function printHelp() {
  process.stdout.write([
    'Usage: node scripts/export-agent-map.mjs [--out <path>] [--stdout] [--compact]',
    '',
    `Default output: ${DEFAULT_OUTPUT}`,
    '',
  ].join('\n'));
}

async function writeOutput(rootDir, relativePath, payload) {
  const absolutePath = path.resolve(rootDir, relativePath);
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, payload, 'utf8');
  return absolutePath;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const rootDir = process.cwd();
  const data = await buildAgentMapData({ rootDir });
  const json = JSON.stringify(data, null, args.pretty ? 2 : 0);

  if (args.stdout) {
    process.stdout.write(`${json}\n`);
    return;
  }

  const outputPath = await writeOutput(rootDir, args.output, `${json}\n`);
  process.stdout.write(`agent-map: wrote ${path.relative(rootDir, outputPath)}\n`);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((error) => {
    process.stderr.write(`agent-map: ${error.stack || error.message}\n`);
    process.exitCode = 1;
  });
}
