#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const MASTER_PLANS = [
    'docs/Umsetzungsplan.md',
    'docs/bot-training/Bot_Trainingsplan.md',
];

const MASTER_BLOCK_STATUSES = new Set(['planned', 'active', 'blocked', 'done']);
const MASTER_PRIORITIES = new Set(['P1', 'P2', 'P3']);
const LOCK_STATUSES = new Set([
    'frei',
    'active',
    'in-bearbeitung',
    'blockiert',
    'claimed',
    'shared',
    'closed',
    'offen',
    '-',
]);
const ACTIVE_LOCK_STATUSES = new Set(['active', 'in-bearbeitung', 'blockiert', 'claimed', 'shared']);
const BLOCK_FILE_STATUSES = new Set(['planned', 'active', 'blocked', 'done']);
const PHASE_STATUSES = new Set(['open', 'done', 'blocked', 'in_progress']);

function normalizePath(value) {
    return value.replace(/\\/g, '/');
}

function parseChecklistItems(lines) {
    const itemRegex = /^\s*-\s*\[([ xX\/])\]\s*(.+?)\s*$/;
    const idRegex = /^((?:\d+(?:\.\d+)+)|(?:DoD\.\d+))\b/;
    const items = [];

    for (let index = 0; index < lines.length; index += 1) {
        const match = lines[index].match(itemRegex);
        if (!match) continue;

        const marker = match[1];
        const text = match[2];
        const idMatch = text.match(idRegex);
        const state = marker === '/' ? '/' : (marker.toLowerCase() === 'x' ? 'x' : ' ');

        items.push({
            line: index + 1,
            state,
            text,
            id: idMatch ? idMatch[1] : '',
        });
    }

    return items;
}

function findSectionRange(lines, headingText) {
    const headingIndex = lines.findIndex((line) => line.trim() === headingText.trim());
    if (headingIndex < 0) return null;

    let endIndex = lines.length - 1;
    for (let index = headingIndex + 1; index < lines.length; index += 1) {
        if (/^##\s+/.test(lines[index])) {
            endIndex = index - 1;
            break;
        }
    }

    return { startIndex: headingIndex, endIndex };
}

function parseMarkdownTable(lines, range, headerPattern) {
    const rows = [];
    const violations = [];

    if (!range) return { rows, violations };

    for (let index = range.startIndex + 1; index <= range.endIndex; index += 1) {
        const raw = lines[index].trim();
        if (!raw.startsWith('|')) continue;
        if (raw.startsWith('| ---')) continue;
        if (headerPattern && headerPattern.test(raw)) continue;

        const cells = raw
            .split('|')
            .slice(1, -1)
            .map((cell) => cell.trim());

        rows.push({ line: index + 1, cells, raw });
    }

    return { rows, violations };
}

function parseLockStatusTable(lines) {
    const section = findSectionRange(lines, '## Lock-Status');
    if (!section) {
        return {
            entries: [],
            violations: [{ line: 1, message: 'Section "## Lock-Status" fehlt.' }],
        };
    }

    const { rows } = parseMarkdownTable(lines, section, /^\|\s*Agent\s*\|/i);
    const entries = [];
    const violations = [];

    for (const row of rows) {
        if (row.cells.length < 4) {
            violations.push({ line: row.line, message: 'Lock-Status-Tabelle hat zu wenige Spalten.' });
            continue;
        }

        const [agent, block, startDate, rawStatus, target = ''] = row.cells;
        const status = rawStatus.toLowerCase();
        entries.push({ line: row.line, agent, block, startDate, rawStatus, status, target });

        if (!LOCK_STATUSES.has(status)) {
            violations.push({
                line: row.line,
                message: `Ungueltiger Lock-Status "${rawStatus}" in Lock-Status-Tabelle.`,
            });
        }
    }

    return { entries, violations };
}

function parseMasterIndexRows(lines) {
    const section = findSectionRange(lines, '## Aktive Bloecke');
    if (!section) {
        return {
            rows: [],
            violations: [{ line: 1, message: 'Section "## Aktive Bloecke" fehlt.' }],
        };
    }

    const { rows } = parseMarkdownTable(lines, section, /^\|\s*id\s*\|/i);
    const parsedRows = [];
    const violations = [];

    for (const row of rows) {
        if (row.cells.length !== 8) {
            violations.push({ line: row.line, message: 'Aktive-Bloecke-Tabelle braucht genau 8 Spalten.' });
            continue;
        }

        const [id, title, status, prio, owner, dependsOn, currentPhase, planFileCell] = row.cells;
        const planFileMatch = planFileCell.match(/`([^`]+)`/);
        const planFile = planFileMatch ? normalizePath(planFileMatch[1]) : normalizePath(planFileCell);

        parsedRows.push({
            line: row.line,
            id,
            title,
            status,
            prio,
            owner,
            dependsOn,
            currentPhase,
            planFile,
        });
    }

    return { rows: parsedRows, violations };
}

function parseFrontmatter(content) {
    const lines = content.split(/\r?\n/);
    if (lines[0]?.trim() !== '---') {
        return { data: {}, body: content, hasFrontmatter: false };
    }

    let endIndex = -1;
    for (let index = 1; index < lines.length; index += 1) {
        if (lines[index].trim() === '---') {
            endIndex = index;
            break;
        }
    }

    if (endIndex < 0) {
        return { data: {}, body: content, hasFrontmatter: false };
    }

    const data = {};
    let currentKey = null;

    for (let index = 1; index < endIndex; index += 1) {
        const line = lines[index];
        const keyValueMatch = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
        if (keyValueMatch) {
            const [, key, rawValue] = keyValueMatch;
            currentKey = key;
            if (rawValue === '') {
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

        const listMatch = line.match(/^\s*-\s*(.+)\s*$/);
        if (listMatch && currentKey) {
            if (!Array.isArray(data[currentKey])) data[currentKey] = [];
            data[currentKey].push(listMatch[1].trim());
        }
    }

    return {
        data,
        body: lines.slice(endIndex + 1).join('\n'),
        hasFrontmatter: true,
    };
}

function parsePhaseHeadings(lines, phaseRoot) {
    const headingRegex = new RegExp(`^###\\s+${phaseRoot}\\.(\\d+)\\b`);
    const phases = [];

    for (let index = 0; index < lines.length; index += 1) {
        const match = lines[index].match(headingRegex);
        if (!match) continue;

        phases.push({
            line: index + 1,
            phaseNumber: Number(match[1]),
            phaseId: `${phaseRoot}.${match[1]}`,
        });
    }

    return phases;
}

function collectPhaseSubCounts(checklistItems, phaseRoot) {
    const counts = new Map();

    for (const item of checklistItems) {
        const match = item.id.match(new RegExp(`^${phaseRoot}\\.(\\d+)\\.(\\d+)\\b`));
        if (!match) continue;

        const phaseNumber = Number(match[1]);
        counts.set(phaseNumber, (counts.get(phaseNumber) ?? 0) + 1);
    }

    return counts;
}

function collectPhaseStatus(lines, phaseLineIndex) {
    for (let index = phaseLineIndex + 1; index < lines.length; index += 1) {
        if (/^###\s+/.test(lines[index])) break;
        const match = lines[index].match(/^status:\s*(\S+)\s*$/);
        if (match) return match[1];
    }
    return '';
}

async function fileExists(relPath) {
    try {
        await fs.access(path.join(ROOT, relPath));
        return true;
    } catch {
        return false;
    }
}

async function readRepoFile(relPath) {
    return fs.readFile(path.join(ROOT, relPath), 'utf8');
}

async function validateActiveBlockFile(planPath, content, options = {}) {
    const violations = [];
    const { data, body, hasFrontmatter } = parseFrontmatter(content);
    const lines = body.split(/\r?\n/);
    const checklistItems = parseChecklistItems(lines);
    const expectedId = options.expectedId ?? null;
    const expectedCurrentPhase = options.expectedCurrentPhase ?? null;

    if (!hasFrontmatter) {
        violations.push({ file: planPath, line: 1, message: 'Aktive Blockdatei braucht YAML-Frontmatter.' });
        return violations;
    }

    const requiredScalarKeys = ['id', 'title', 'status', 'priority', 'owner', 'updated_at'];
    for (const key of requiredScalarKeys) {
        if (!data[key]) {
            violations.push({ file: planPath, line: 1, message: `Frontmatter-Feld "${key}" fehlt.` });
        }
    }

    const requiredArrayKeys = ['depends_on', 'blocked_by', 'scope_files', 'verification'];
    for (const key of requiredArrayKeys) {
        if (!Array.isArray(data[key])) {
            violations.push({ file: planPath, line: 1, message: `Frontmatter-Liste "${key}" fehlt oder ist ungueltig.` });
        }
    }

    if (data.status && !BLOCK_FILE_STATUSES.has(data.status)) {
        violations.push({ file: planPath, line: 1, message: `Ungueltiger Block-Status "${data.status}" im Frontmatter.` });
    }

    if (data.priority && !MASTER_PRIORITIES.has(data.priority)) {
        violations.push({ file: planPath, line: 1, message: `Ungueltige Prioritaet "${data.priority}" im Frontmatter.` });
    }

    if (data.updated_at && !/^\d{4}-\d{2}-\d{2}$/.test(data.updated_at)) {
        violations.push({ file: planPath, line: 1, message: `updated_at muss YYYY-MM-DD sein, gefunden: "${data.updated_at}".` });
    }

    if (expectedId && data.id && data.id !== expectedId) {
        violations.push({ file: planPath, line: 1, message: `Blockdatei-ID "${data.id}" widerspricht Master-ID "${expectedId}".` });
    }

    const basename = path.basename(planPath, '.md');
    if (data.id && basename !== data.id) {
        violations.push({ file: planPath, line: 1, message: `Dateiname "${basename}.md" passt nicht zur Block-ID "${data.id}".` });
    }

    const requiredSections = [
        '## Ziel',
        '## Nicht-Ziel',
        '## Definition of Done',
        '## Risiken',
        '## Phasen',
    ];
    for (const section of requiredSections) {
        if (!findSectionRange(lines, section)) {
            violations.push({ file: planPath, line: 1, message: `Section "${section}" fehlt.` });
        }
    }

    const evidenceRegex = /\(abgeschlossen:\s*\d{4}-\d{2}-\d{2};\s*evidence:\s*.+\)$/;
    for (const item of checklistItems) {
        if (item.state !== 'x') continue;
        if (item.id.startsWith('DoD.') || /^\d+\.\d+\.\d+$/.test(item.id)) {
            if (!evidenceRegex.test(item.text)) {
                violations.push({
                    file: planPath,
                    line: item.line,
                    message: `Abgeschlossener Punkt ohne Evidence-Format: "${item.text}".`,
                });
            }
        }
    }

    const dodSection = findSectionRange(lines, '## Definition of Done');
    if (dodSection) {
        const dodItems = checklistItems.filter((item) => item.id.startsWith('DoD.'));
        if (dodItems.length < 4) {
            violations.push({ file: planPath, line: dodSection.startIndex + 1, message: 'Definition of Done braucht mindestens 4 Punkte.' });
        }
    }

    const phaseRootMatch = data.id?.match(/(\d+)$/);
    if (!phaseRootMatch) {
        violations.push({ file: planPath, line: 1, message: `Block-ID "${data.id ?? ''}" enthaelt keine numerische Phasenwurzel.` });
        return violations;
    }

    const phaseRoot = phaseRootMatch[1];
    const phases = parsePhaseHeadings(lines, phaseRoot);
    if (phases.length === 0) {
        violations.push({ file: planPath, line: 1, message: 'Keine Phasen-Ueberschriften gefunden.' });
        return violations;
    }

    const phaseNumbers = phases.map((phase) => phase.phaseNumber).sort((a, b) => a - b);
    if (!phaseNumbers.includes(99)) {
        violations.push({ file: planPath, line: phases[0].line, message: `Block "${data.id}" hat kein Abschluss-Gate ${phaseRoot}.99.` });
    }
    if (phaseNumbers[phaseNumbers.length - 1] !== 99) {
        violations.push({
            file: planPath,
            line: phases[phases.length - 1].line,
            message: `Block "${data.id}" endet mit ${phaseRoot}.${phaseNumbers[phaseNumbers.length - 1]} statt ${phaseRoot}.99.`,
        });
    }

    if (expectedCurrentPhase && !phaseNumbers.some((number) => `${phaseRoot}.${number}` === expectedCurrentPhase)) {
        violations.push({
            file: planPath,
            line: 1,
            message: `Master current_phase "${expectedCurrentPhase}" fehlt in ${planPath}.`,
        });
    }

    const subCounts = collectPhaseSubCounts(checklistItems, phaseRoot);
    for (const phase of phases) {
        const status = collectPhaseStatus(lines, phase.line - 1);
        if (!status) {
            violations.push({ file: planPath, line: phase.line, message: `Phase ${phase.phaseId} hat keine status:-Zeile.` });
        } else if (!PHASE_STATUSES.has(status)) {
            violations.push({ file: planPath, line: phase.line, message: `Phase ${phase.phaseId} hat ungueltigen Status "${status}".` });
        }

        const subCount = subCounts.get(phase.phaseNumber) ?? 0;
        if (subCount < 2) {
            violations.push({
                file: planPath,
                line: phase.line,
                message: `Phase ${phase.phaseId} braucht mindestens 2 Sub-Phasen (gefunden: ${subCount}).`,
            });
        }
    }

    const gateChildren = checklistItems.filter((item) => item.id.startsWith(`${phaseRoot}.99.`));
    if (gateChildren.length > 0 && gateChildren.every((item) => item.state === 'x')) {
        const openPrerequisites = checklistItems.filter((item) => /^\d+\.\d+\.\d+$/.test(item.id)
            && !item.id.startsWith(`${phaseRoot}.99.`)
            && item.state !== 'x');

        if (openPrerequisites.length > 0) {
            violations.push({
                file: planPath,
                line: gateChildren[0].line,
                message: `Gate ${phaseRoot}.99 ist abgeschlossen, aber Vorphasen sind noch offen: ${openPrerequisites.map((item) => item.id).join(', ')}.`,
            });
        }
    }

    return violations;
}

async function validateMasterIndex(planPath, content, options = {}) {
    const fileExistsImpl = options.fileExistsImpl ?? fileExists;
    const readFileImpl = options.readFileImpl ?? readRepoFile;
    const lines = content.split(/\r?\n/);
    const violations = [];

    const requiredSections = ['## Aktive Bloecke', '## Abhaengigkeiten', '## Lock-Status', '## Conflict-Log'];
    for (const section of requiredSections) {
        if (!findSectionRange(lines, section)) {
            violations.push({ file: planPath, line: 1, message: `Section "${section}" fehlt.` });
        }
    }

    const masterRows = parseMasterIndexRows(lines);
    for (const tableViolation of masterRows.violations) {
        violations.push({ file: planPath, ...tableViolation });
    }
    if (masterRows.rows.length === 0) {
        violations.push({ file: planPath, line: 1, message: 'Keine aktiven Blockzeilen gefunden.' });
        return violations;
    }

    const lockStatusTable = parseLockStatusTable(lines);
    for (const tableViolation of lockStatusTable.violations) {
        violations.push({ file: planPath, ...tableViolation });
    }

    const seenIds = new Set();
    for (const row of masterRows.rows) {
        if (seenIds.has(row.id)) {
            violations.push({ file: planPath, line: row.line, message: `Doppelte Block-ID "${row.id}" in "Aktive Bloecke".` });
        }
        seenIds.add(row.id);

        if (!/^V\d+$/.test(row.id)) {
            violations.push({ file: planPath, line: row.line, message: `Ungueltige Block-ID "${row.id}".` });
        }
        if (!MASTER_BLOCK_STATUSES.has(row.status)) {
            violations.push({ file: planPath, line: row.line, message: `Ungueltiger Block-Status "${row.status}".` });
        }
        if (!MASTER_PRIORITIES.has(row.prio)) {
            violations.push({ file: planPath, line: row.line, message: `Ungueltige Prioritaet "${row.prio}".` });
        }

        const phaseRoot = row.id.replace(/^V/, '');
        if (!new RegExp(`^${phaseRoot}\\.\\d+$`).test(row.currentPhase)) {
            violations.push({
                file: planPath,
                line: row.line,
                message: `current_phase "${row.currentPhase}" passt nicht zu ${row.id}.`,
            });
        }

        if (!row.planFile) {
            violations.push({ file: planPath, line: row.line, message: `plan_file fehlt fuer ${row.id}.` });
            violations.push({ file: planPath, line: row.line, message: 'plan_file verweist auf fehlende Datei: <leer>' });
            continue;
        }

        if (!row.planFile.startsWith('docs/plaene/aktiv/')) {
            violations.push({ file: planPath, line: row.line, message: `plan_file fuer ${row.id} muss unter docs/plaene/aktiv/ liegen.` });
        }

        if (!(await fileExistsImpl(row.planFile))) {
            violations.push({ file: planPath, line: row.line, message: `plan_file verweist auf fehlende Datei: ${row.planFile}` });
            continue;
        }

        const lockRows = lockStatusTable.entries.filter((entry) => entry.block === row.id);
        if (lockRows.length !== 1) {
            violations.push({
                file: planPath,
                line: row.line,
                message: `Block "${row.id}" braucht genau eine Lock-Status-Zeile (gefunden: ${lockRows.length}).`,
            });
        } else if (row.status === 'active' && !ACTIVE_LOCK_STATUSES.has(lockRows[0].status)) {
            violations.push({
                file: planPath,
                line: lockRows[0].line,
                message: `Block "${row.id}" ist im Master aktiv, aber Lock-Status ist "${lockRows[0].rawStatus}".`,
            });
        }

        try {
            const linkedContent = await readFileImpl(row.planFile);
            const linkedViolations = await validateActiveBlockFile(row.planFile, linkedContent, {
                expectedId: row.id,
                expectedCurrentPhase: row.currentPhase,
            });
            violations.push(...linkedViolations);
        } catch (error) {
            violations.push({
                file: planPath,
                line: row.line,
                message: `plan_file konnte nicht gelesen werden: ${row.planFile} (${String(error)})`,
            });
        }
    }

    return violations;
}

function parseLegacyBlocks(lines) {
    const blockRegex = /^##\s+Block\s+([A-Z]*\d+):\s*(.+)$/;
    const blocks = [];

    for (let index = 0; index < lines.length; index += 1) {
        const match = lines[index].match(blockRegex);
        if (!match) continue;

        const idToken = match[1].trim();
        const phaseRootMatch = idToken.match(/(\d+)$/);
        if (!phaseRootMatch) continue;

        blocks.push({
            idToken,
            phaseRoot: phaseRootMatch[1],
            name: `${idToken}: ${match[2].trim()}`,
            startLine: index + 1,
            startIndex: index,
            endIndex: lines.length - 1,
        });
    }

    for (let index = 0; index < blocks.length - 1; index += 1) {
        blocks[index].endIndex = blocks[index + 1].startIndex - 1;
    }

    return blocks;
}

function collectLegacyPlanFileRefs(lines) {
    const refs = [];
    const planFileRegex = /Plan-Datei:\s*`([^`]+)`/;

    for (let index = 0; index < lines.length; index += 1) {
        const match = lines[index].match(planFileRegex);
        if (!match) continue;
        refs.push({ line: index + 1, file: normalizePath(match[1].trim()) });
    }

    return refs;
}

async function validateLegacyBlockPlan(planPath, content, options = {}) {
    const fileExistsImpl = options.fileExistsImpl ?? fileExists;
    const lines = content.split(/\r?\n/);
    const checklistItems = parseChecklistItems(lines);
    const blocks = parseLegacyBlocks(lines);
    const planRefs = collectLegacyPlanFileRefs(lines);
    const lockStatusTable = parseLockStatusTable(lines);
    const violations = [];

    if (blocks.length === 0) {
        violations.push({ file: planPath, line: 1, message: 'Keine Block-Sektionen (`## Block ...`) gefunden.' });
        return violations;
    }

    for (const tableViolation of lockStatusTable.violations) {
        violations.push({ file: planPath, ...tableViolation });
    }

    const evidenceRegex = /\(abgeschlossen:\s*\d{4}-\d{2}-\d{2};\s*evidence:\s*.+\)$/;
    for (const item of checklistItems) {
        if (!item.id || item.state !== 'x') continue;
        if (!/^\d+\.\d+\.\d+$/.test(item.id)) continue;
        if (!evidenceRegex.test(item.text)) {
            violations.push({ file: planPath, line: item.line, message: `Abgeschlossener Punkt ohne Evidence-Format: "${item.text}".` });
        }
    }

    for (const block of blocks) {
        const blockLines = lines.slice(block.startIndex, block.endIndex + 1);
        const phaseHeadings = parsePhaseHeadings(blockLines, block.phaseRoot);
        const scopedItems = checklistItems.filter((item) => item.id.startsWith(`${block.phaseRoot}.`));
        const subCounts = collectPhaseSubCounts(scopedItems, block.phaseRoot);
        const hasDod = blockLines.some((line) => /^###\s+Definition of Done \(DoD\)\s*$/.test(line.trim()));
        const hasRisk = blockLines.some((line) => line.trim() === `### Risiko-Register ${block.idToken}`);

        if (!hasDod) {
            violations.push({ file: planPath, line: block.startLine, message: `Block "${block.name}" hat keine "Definition of Done (DoD)"-Sektion.` });
        }
        if (!hasRisk) {
            violations.push({ file: planPath, line: block.startLine, message: `Block "${block.name}" hat kein "Risiko-Register ${block.idToken}".` });
        }
        if (!phaseHeadings.some((phase) => phase.phaseNumber === 99)) {
            violations.push({ file: planPath, line: block.startLine, message: `Block "${block.name}" hat kein Abschluss-Gate ${block.phaseRoot}.99.` });
        }

        for (const phase of phaseHeadings) {
            const subCount = subCounts.get(phase.phaseNumber) ?? 0;
            if (subCount < 2) {
                violations.push({
                    file: planPath,
                    line: block.startLine + phase.line - 1,
                    message: `Phase ${phase.phaseId} braucht mindestens 2 Sub-Phasen (gefunden: ${subCount}).`,
                });
            }
        }
    }

    for (const ref of planRefs) {
        if (!(await fileExistsImpl(ref.file))) {
            violations.push({ file: planPath, line: ref.line, message: `Plan-Datei verweist auf fehlende Datei: ${ref.file}` });
        }
    }

    return violations;
}

export async function validatePlanContent(planPath, content, options = {}) {
    if (normalizePath(planPath) === 'docs/Umsetzungsplan.md') {
        return validateMasterIndex(planPath, content, options);
    }

    if (normalizePath(planPath).startsWith('docs/plaene/aktiv/')) {
        return validateActiveBlockFile(planPath, content, options);
    }

    return validateLegacyBlockPlan(planPath, content, options);
}

export async function validatePlan(planPath, options = {}) {
    const absPath = path.join(ROOT, planPath);

    try {
        const content = await fs.readFile(absPath, 'utf8');
        return await validatePlanContent(planPath, content, options);
    } catch (error) {
        return [{ file: planPath, line: 1, message: `Datei nicht lesbar: ${String(error)}` }];
    }
}

async function main() {
    const violations = [];

    for (const planPath of MASTER_PLANS) {
        if (!(await fileExists(planPath))) {
            violations.push({ file: planPath, line: 1, message: 'Pflicht-Masterplan fehlt.' });
            continue;
        }
        violations.push(...(await validatePlan(planPath)));
    }

    if (violations.length === 0) {
        console.log('Master plan validation passed.');
        process.exit(0);
    }

    console.error('Master plan validation failed.');
    for (const violation of violations) {
        console.error(`- ${violation.file}:${violation.line} ${violation.message}`);
    }
    process.exit(1);
}

const isDirectRun = process.argv[1]
    && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isDirectRun) {
    await main();
}
