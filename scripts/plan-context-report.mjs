#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const args = new Set(process.argv.slice(2));
const checkMode = args.has('--check');
const jsonMode = args.has('--json');
const reportPath = path.resolve(
    ROOT,
    String(process.env.PLAN_CONTEXT_REPORT || 'tmp/plan-context-report.json').trim()
);
const COMPLETED_PLAN_STATUSES = new Set(['done', 'closed']);

function normalizePath(value) {
    return String(value || '').replace(/\\/g, '/');
}

async function readText(relativePath) {
    return fs.readFile(path.resolve(ROOT, relativePath), 'utf8');
}

async function readJson(relativePath) {
    return JSON.parse(await readText(relativePath));
}

async function exists(relativePath) {
    try {
        await fs.access(path.resolve(ROOT, relativePath));
        return true;
    } catch {
        return false;
    }
}

async function listMarkdownFiles(relativeDir) {
    const absoluteDir = path.resolve(ROOT, relativeDir);
    let entries = [];
    try {
        entries = await fs.readdir(absoluteDir, { withFileTypes: true });
    } catch {
        return [];
    }

    const files = [];
    for (const entry of entries) {
        const relativePath = normalizePath(path.join(relativeDir, entry.name));
        if (entry.isDirectory()) {
            files.push(...await listMarkdownFiles(relativePath));
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
            files.push(relativePath);
        }
    }
    return files.sort((left, right) => left.localeCompare(right));
}

function unique(values) {
    return [...new Set(values.filter(Boolean))].sort((left, right) => left.localeCompare(right));
}

function parseFrontmatter(content) {
    const lines = content.split(/\r?\n/);
    if (lines[0]?.trim() !== '---') return {};

    const data = {};
    let currentKey = null;
    for (let index = 1; index < lines.length; index += 1) {
        const line = lines[index];
        if (line.trim() === '---') break;

        const keyValueMatch = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
        if (keyValueMatch) {
            const [, key, rawValue] = keyValueMatch;
            currentKey = key;
            if (rawValue.trim() === '') {
                data[key] = [];
            } else if (rawValue.trim() === '[]') {
                data[key] = [];
                currentKey = null;
            } else {
                data[key] = rawValue.trim();
                currentKey = null;
            }
            continue;
        }

        const listMatch = line.match(/^\s*-\s*(.+?)\s*$/);
        if (listMatch && currentKey) {
            if (!Array.isArray(data[currentKey])) data[currentKey] = [];
            data[currentKey].push(listMatch[1].trim());
        }
    }

    return data;
}

function parseMasterPlan(content) {
    const planFileMatches = [...content.matchAll(/`(docs\/plaene\/aktiv\/V\d+\.md)`/g)]
        .map((match) => normalizePath(match[1]));
    const rows = content
        .split(/\r?\n/)
        .map((line) => line.match(/^\|\s*(V\d+)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]*?)\s*\|\s*([^|]+?)\s*\|\s*`(docs\/plaene\/aktiv\/V\d+\.md)`\s*\|$/))
        .filter(Boolean)
        .map((match) => ({
            blockId: match[1],
            title: match[2].trim(),
            status: match[3].trim(),
            priority: match[4].trim(),
            owner: match[5].trim(),
            dependsOn: match[6].trim(),
            phase: match[7].trim(),
            planFile: normalizePath(match[8]),
        }));
    const dependencyIds = [...content.matchAll(/\b(V\d+)(?:\.\d+)?\b/g)].map((match) => match[1]);

    return {
        referencedPlanFiles: unique(planFileMatches),
        referencedBlockIds: unique(planFileMatches.map((file) => path.basename(file, '.md'))),
        dependencyIds: unique(dependencyIds),
        rows,
    };
}

function masterRowFor(master, blockId) {
    return master.rows.find((row) => row.blockId === blockId) || null;
}

function masterStatusFor(master, blockId) {
    return String(masterRowFor(master, blockId)?.status || '').trim().toLowerCase();
}

function indexKnowledgeGraph(graph) {
    const byPlanFile = new Map();
    const byBlockId = new Map();

    for (const node of graph.nodes || []) {
        const attributes = node.attributes || {};
        const planFile = normalizePath(attributes.planFile || '');
        if (planFile) {
            if (!byPlanFile.has(planFile)) byPlanFile.set(planFile, []);
            byPlanFile.get(planFile).push(node);
        }
        if (node.id) {
            byBlockId.set(node.id, node);
        }
    }

    return { byPlanFile, byBlockId };
}

function graphSourcesFor(nodes) {
    return unique(nodes.flatMap((node) => node.attributes?.source || []));
}

function classifyActivePlan({ planFile, frontmatter, master, graphNodes, openFindings }) {
    const blockId = path.basename(planFile, '.md');
    const graphSources = graphSourcesFor(graphNodes);
    const reasons = [];
    let classification = 'review';

    if (master.referencedPlanFiles.includes(planFile)) {
        classification = 'protected-master-referenced';
        reasons.push('Master-Index referenziert diese aktive Detaildatei.');
    }

    if (graphSources.includes('master-index')) {
        if (!classification.startsWith('protected')) {
            classification = 'protected-graph-master';
        }
        reasons.push('Knowledge-Graph markiert die Datei als master-index Quelle.');
    }

    if (graphSources.includes('dependency-target') || master.dependencyIds.includes(blockId)) {
        if (!classification.startsWith('protected')) {
            classification = 'protected-dependency-source';
        }
        reasons.push('Plan ist Dependency-Ziel im Master oder Knowledge-Graph.');
    }

    if (graphSources.includes('archive-index')) {
        if (!classification.startsWith('protected')) {
            classification = 'protected-archive-index';
        }
        reasons.push('Knowledge-Graph markiert die Datei als Archiv-/Abgleichsindex.');
    }

    if (openFindings.includes(blockId) || openFindings.includes(planFile)) {
        if (!classification.startsWith('protected')) {
            classification = 'protected-open-finding';
        }
        reasons.push('Open_Findings referenziert Block oder Datei.');
    }

    if (classification === 'review') {
        const status = String(frontmatter.status || '').toLowerCase();
        if (status === 'done' || status === 'closed') {
            classification = 'archive-candidate';
            reasons.push('Nicht im Master referenziert und laut Frontmatter abgeschlossen.');
        } else {
            classification = 'needs-user-decision';
            reasons.push('Nicht im Master referenziert, aber Status ist nicht eindeutig abgeschlossen.');
        }
    }

    if (reasons.length === 0) {
        reasons.push('Keine Master-/Graph-/Finding-Klassifikation gefunden.');
    }

    return { classification, reasons, graphSources };
}

function classifyIntakeDraft({ file, content, master }) {
    const basename = path.basename(file);
    const reasons = [];
    let classification = 'intake-review';

    if (basename.toLowerCase() === 'readme.md') {
        return {
            classification: 'protected-readme',
            reasons: ['README der Intake-Zone.'],
            referencedBlockIds: [],
        };
    }

    const frontmatter = parseFrontmatter(content);
    const referencedBlockIds = unique([...content.matchAll(/\bV\d+\b/g)].map((match) => match[0]));
    const plannedBlockIds = unique([
        String(frontmatter.planned_block_id || '').trim(),
        ...[...basename.matchAll(/(?:^|[_-])(V\d+)(?:[_\-.]|$)/g)].map((match) => match[1]),
    ]);

    if (/^BT/i.test(basename) || /Bot/i.test(basename) || file.includes('/BT')) {
        classification = 'protected-bot-training-intake';
        reasons.push('Bot-Training-Draft gehoert nicht in den normalen Master-Intake.');
    }

    const masterHits = plannedBlockIds.filter((blockId) => master.referencedBlockIds.includes(blockId));
    if (masterHits.length > 0 && classification !== 'protected-bot-training-intake') {
        const openMasterHits = masterHits.filter((blockId) => !COMPLETED_PLAN_STATUSES.has(masterStatusFor(master, blockId)));
        classification = openMasterHits.length > 0
            ? 'adopted-by-open-master-block'
            : 'adopted-by-done-master-block';
        const hitDetails = masterHits.map((blockId) => `${blockId}:${masterStatusFor(master, blockId) || 'unknown'}`);
        reasons.push(`Geplante Block-ID oder Dateiname ist bereits im Master referenziert: ${hitDetails.join(', ')}.`);
    }

    if (masterHits.length > 0 && classification === 'protected-bot-training-intake') {
        reasons.push(`Geplante Block-ID oder Dateiname passt zu Master-Bloecken, bleibt aber Bot-Training-Sonderfall: ${masterHits.join(', ')}.`);
    }

    const contextualMasterHits = referencedBlockIds.filter((blockId) => (
        master.referencedBlockIds.includes(blockId)
        && !masterHits.includes(blockId)
    ));
    if (contextualMasterHits.length > 0 && classification === 'intake-review') {
        reasons.push(`Erwaehnt Master-Bloecke nur als Kontext: ${contextualMasterHits.join(', ')}.`);
    }

    if (classification === 'intake-review') {
        reasons.push('Kein direkter Master-Abgleich; User-Intake-Entscheidung noetig.');
    }

    return { classification, reasons, referencedBlockIds, plannedBlockIds };
}

function summarize(items) {
    return items.reduce((accumulator, item) => {
        accumulator[item.classification] = (accumulator[item.classification] || 0) + 1;
        return accumulator;
    }, {});
}

async function buildReport() {
    const [masterContent, openFindingsContent] = await Promise.all([
        readText('docs/Umsetzungsplan.md'),
        exists('docs/prozess/Open_Findings.md') ? readText('docs/prozess/Open_Findings.md') : '',
    ]);
    const graph = await readJson('docs/generated/knowledge-graph.json');
    const graphIndex = indexKnowledgeGraph(graph);
    const master = parseMasterPlan(masterContent);
    const activePlanFiles = (await listMarkdownFiles('docs/plaene/aktiv'))
        .filter((file) => /^docs\/plaene\/aktiv\/V\d+\.md$/.test(file));
    const intakeFiles = await listMarkdownFiles('docs/plaene/neu');
    const violations = [];

    for (const planFile of master.referencedPlanFiles) {
        if (!activePlanFiles.includes(planFile)) {
            violations.push({
                id: 'missing-master-plan-file',
                path: planFile,
                message: 'Master referenziert eine aktive Detaildatei, die nicht existiert.',
            });
        }
    }

    const activePlans = [];
    for (const planFile of activePlanFiles) {
        const content = await readText(planFile);
        const frontmatter = parseFrontmatter(content);
        const graphNodes = graphIndex.byPlanFile.get(planFile) || [];
        const classification = classifyActivePlan({
            planFile,
            frontmatter,
            master,
            graphNodes,
            openFindings: openFindingsContent,
        });
        activePlans.push({
            path: planFile,
            blockId: path.basename(planFile, '.md'),
            status: frontmatter.status || null,
            ...classification,
        });
    }

    const intakeDrafts = [];
    for (const file of intakeFiles) {
        const content = await readText(file);
        intakeDrafts.push({
            path: file,
            ...classifyIntakeDraft({ file, content, master }),
        });
    }

    const graphPlanFiles = unique(
        [...graphIndex.byPlanFile.keys()]
            .filter((file) => file.startsWith('docs/plaene/'))
    );
    const graphOnlyPlanFiles = graphPlanFiles.filter((file) => (
        !activePlanFiles.includes(file)
        && !intakeFiles.includes(file)
    ));

    return {
        generatedAt: new Date().toISOString(),
        mode: checkMode ? 'check' : 'report',
        inputs: {
            masterPlan: 'docs/Umsetzungsplan.md',
            openFindings: 'docs/prozess/Open_Findings.md',
            knowledgeGraph: 'docs/generated/knowledge-graph.json',
        },
        summary: {
            masterReferencedActivePlans: master.referencedPlanFiles.length,
            activePlanFiles: activePlanFiles.length,
            intakeDraftFiles: intakeFiles.length,
            activePlanClassifications: summarize(activePlans),
            intakeDraftClassifications: summarize(intakeDrafts),
            graphOnlyPlanFiles: graphOnlyPlanFiles.length,
            violations: violations.length,
        },
        activePlans,
        intakeDrafts,
        graphOnlyPlanFiles,
        violations,
    };
}

async function writeReport(report) {
    await fs.mkdir(path.dirname(reportPath), { recursive: true });
    await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
}

function printHumanSummary(report) {
    console.log(`[plan-context] mode=${report.mode}`);
    console.log(`[plan-context] report=${normalizePath(path.relative(ROOT, reportPath))}`);
    console.log(`[plan-context] master_referenced=${report.summary.masterReferencedActivePlans}`);
    console.log(`[plan-context] active_plans=${report.summary.activePlanFiles}`);
    console.log(`[plan-context] intake_drafts=${report.summary.intakeDraftFiles}`);
    console.log(`[plan-context] violations=${report.summary.violations}`);

    for (const [classification, count] of Object.entries(report.summary.activePlanClassifications)) {
        console.log(`[plan-context] active ${classification}=${count}`);
    }
    for (const [classification, count] of Object.entries(report.summary.intakeDraftClassifications)) {
        console.log(`[plan-context] intake ${classification}=${count}`);
    }

    const activeCandidates = report.activePlans.filter((item) => item.classification === 'archive-candidate');
    for (const item of activeCandidates) {
        console.log(`[plan-context] archive-candidate ${item.path} :: ${item.reasons.join(' ')}`);
    }

    const doneDrafts = report.intakeDrafts.filter((item) => item.classification === 'adopted-by-done-master-block');
    for (const item of doneDrafts.slice(0, 20)) {
        console.log(`[plan-context] adopted-done-intake ${item.path} :: ${item.reasons.join(' ')}`);
    }
    if (doneDrafts.length > 20) {
        console.log(`[plan-context] adopted-done-intake more=${doneDrafts.length - 20}`);
    }

    const openDrafts = report.intakeDrafts.filter((item) => item.classification === 'adopted-by-open-master-block');
    for (const item of openDrafts.slice(0, 20)) {
        console.log(`[plan-context] adopted-open-intake ${item.path} :: ${item.reasons.join(' ')}`);
    }
    if (openDrafts.length > 20) {
        console.log(`[plan-context] adopted-open-intake more=${openDrafts.length - 20}`);
    }

    for (const violation of report.violations) {
        console.error(`[plan-context] violation ${violation.path} [${violation.id}] ${violation.message}`);
    }
}

const report = await buildReport();
await writeReport(report);

if (jsonMode) {
    console.log(JSON.stringify(report, null, 2));
} else {
    printHumanSummary(report);
}

if (checkMode && report.violations.length > 0) {
    process.exitCode = 1;
}
