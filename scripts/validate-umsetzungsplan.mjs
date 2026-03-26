#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const MASTER_PLANS = [
    'docs/Umsetzungsplan.md',
    'docs/Bot_Trainingsplan.md',
];

const ACTIVE_LOCK_STATUSES = new Set([
    'active',
    'in-bearbeitung',
    'blockiert',
    'claimed',
    'shared',
]);

function normalizePath(value) {
    return value.replace(/\\/g, '/');
}

function parseChecklistItems(lines) {
    const itemRegex = /^\s*-\s*\[([ xX\/])\]\s*(.+?)\s*$/;
    const idRegex = /^((?:\d+(?:\.\d+)+)|(?:[A-Z]+\.\d+(?:\.\d+){0,2}))\b/;
    const items = [];

    for (let index = 0; index < lines.length; index += 1) {
        const line = lines[index];
        const match = line.match(itemRegex);
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

function parseBlocks(lines) {
    const blockRegex = /^##\s+Block\s+([A-Z]*\d+):\s*(.+)$/;
    const blocks = [];

    for (let index = 0; index < lines.length; index += 1) {
        const line = lines[index];
        const match = line.match(blockRegex);
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

    for (let i = 0; i < blocks.length; i += 1) {
        const next = blocks[i + 1];
        if (next) {
            blocks[i].endIndex = next.startIndex - 1;
        }
    }

    return blocks;
}

function collectLockEntries(lines) {
    const lockRegex = /<!--\s*(LOCK|SUB-LOCK):\s*([^>]+?)\s*-->/;
    const entries = [];

    for (let index = 0; index < lines.length; index += 1) {
        const line = lines[index];
        const match = line.match(lockRegex);
        if (!match) continue;

        entries.push({
            line: index + 1,
            kind: match[1],
            value: match[2].trim(),
        });
    }

    return entries;
}

function isValidLockValue(value) {
    if (value === 'frei') return true;
    return /^Bot-[A-Za-z0-9-]+ seit \d{4}-\d{2}-\d{2}$/.test(value);
}

function collectPlanFileRefs(lines) {
    const refs = [];
    const planFileRegex = /Plan-Datei:\s*`([^`]+)`/;
    const markdownPathRegex = /`(docs\/[^`]+\.md)`/g;

    for (let index = 0; index < lines.length; index += 1) {
        const line = lines[index];

        const planMatch = line.match(planFileRegex);
        if (planMatch) {
            refs.push({
                line: index + 1,
                file: normalizePath(planMatch[1].trim()),
                source: 'Plan-Datei',
            });
        }

        let pathMatch = markdownPathRegex.exec(line);
        while (pathMatch) {
            refs.push({
                line: index + 1,
                file: normalizePath(pathMatch[1].trim()),
                source: 'Backtick-Ref',
            });
            pathMatch = markdownPathRegex.exec(line);
        }
        markdownPathRegex.lastIndex = 0;
    }

    return refs;
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

function collectPhaseHeadings(block, lines) {
    const headings = new Map();
    const headingRegex = new RegExp(`^###\\s+(?:Phase\\s+)?${block.phaseRoot}\\.(\\d+)\\b`);

    for (let index = block.startIndex; index <= block.endIndex; index += 1) {
        const match = lines[index].match(headingRegex);
        if (!match) continue;

        headings.set(Number(match[1]), {
            line: index + 1,
            text: lines[index],
        });
    }

    return headings;
}

function collectPhaseExpectationsFromDoD(line, phaseRoot) {
    const expected = new Set();
    const rangeRegex = new RegExp(`${phaseRoot}\\.(\\d+)\\s+bis\\s+${phaseRoot}\\.(\\d+)`, 'g');
    const directRegex = new RegExp(`${phaseRoot}\\.(\\d+)`, 'g');

    let rangeMatch = rangeRegex.exec(line);
    while (rangeMatch) {
        const from = Number(rangeMatch[1]);
        const to = Number(rangeMatch[2]);
        for (let phase = from; phase <= to; phase += 1) {
            expected.add(phase);
        }
        rangeMatch = rangeRegex.exec(line);
    }

    let directMatch = directRegex.exec(line);
    while (directMatch) {
        expected.add(Number(directMatch[1]));
        directMatch = directRegex.exec(line);
    }

    return [...expected];
}

function parseLockStatusTable(lines) {
    const allowedStatuses = new Set([
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

    const section = findSectionRange(lines, '## Lock-Status');
    if (!section) {
        return {
            entries: [],
            violations: [{ line: 1, message: 'Section "## Lock-Status" fehlt.' }],
        };
    }

    const entries = [];
    const violations = [];

    for (let index = section.startIndex + 1; index <= section.endIndex; index += 1) {
        const line = lines[index].trim();
        if (!line.startsWith('|')) continue;
        if (line.startsWith('| ---')) continue;
        if (/^\|\s*Agent\s*\|/i.test(line)) continue;

        const cells = line.split('|').map((cell) => cell.trim()).filter((cell) => cell.length > 0);
        if (cells.length < 4) continue;

        const [agent, block, startDate, rawStatus, target = ''] = cells;
        const status = rawStatus.toLowerCase();

        entries.push({
            line: index + 1,
            agent,
            block,
            startDate,
            rawStatus,
            status,
            target,
        });

        if (!allowedStatuses.has(status)) {
            violations.push({
                line: index + 1,
                message: `Ungueltiger Lock-Status "${rawStatus}" in Lock-Status-Tabelle.`,
            });
        }
    }

    return { entries, violations };
}

async function fileExists(relPath) {
    try {
        await fs.access(path.join(ROOT, relPath));
        return true;
    } catch {
        return false;
    }
}

export async function validatePlanContent(planPath, content, options = {}) {
    const fileExistsImpl = options.fileExistsImpl ?? fileExists;
    const lines = content.split(/\r?\n/);
    const checklistItems = parseChecklistItems(lines);
    const blocks = parseBlocks(lines);
    const lockEntries = collectLockEntries(lines);
    const planRefs = collectPlanFileRefs(lines);
    const lockStatusTable = parseLockStatusTable(lines);
    const violations = [];

    if (blocks.length === 0) {
        violations.push({ file: planPath, line: 1, message: 'Keine Block-Sektionen (`## Block ...`) gefunden.' });
        return violations;
    }

    const ids = new Map();
    for (const item of checklistItems) {
        if (!item.id) continue;
        if (!ids.has(item.id)) ids.set(item.id, []);
        ids.get(item.id).push(item.line);
    }

    for (const [id, idLines] of ids.entries()) {
        if (idLines.length > 1) {
            violations.push({
                file: planPath,
                line: idLines[0],
                message: `Doppelte Phasen-ID "${id}" (Zeilen: ${idLines.join(', ')}).`,
            });
        }
    }

    const evidenceRegex = /\(abgeschlossen:\s*\d{4}-\d{2}-\d{2};\s*evidence:\s*.+\)$/;
    for (const item of checklistItems) {
        if (!item.id) continue;
        if (item.state !== 'x') continue;
        if (evidenceRegex.test(item.text)) continue;

        violations.push({
            file: planPath,
            line: item.line,
            message: `Abgeschlossener Punkt ohne Evidence-Format: "${item.text}".`,
        });
    }

    for (const lock of lockEntries) {
        if (!isValidLockValue(lock.value)) {
            violations.push({
                file: planPath,
                line: lock.line,
                message: `Ungueltiger ${lock.kind}-Wert "${lock.value}".`,
            });
        }
    }

    for (const tableViolation of lockStatusTable.violations) {
        violations.push({ file: planPath, ...tableViolation });
    }

    for (const block of blocks) {
        const blockLines = lines.slice(block.startIndex, block.endIndex + 1);
        const blockChecklistItems = checklistItems.filter((item) => item.id.startsWith(`${block.phaseRoot}.`));
        const phaseHeadings = collectPhaseHeadings(block, lines);
        const phaseSubCounts = new Map();
        const lockInBlock = lockEntries.filter((lock) => {
            const lineIndex = lock.line - 1;
            return lineIndex >= block.startIndex && lineIndex <= block.endIndex && lock.kind === 'LOCK';
        });
        const lockRows = lockStatusTable.entries.filter((entry) => entry.block === block.idToken);

        if (lockInBlock.length !== 1) {
            violations.push({
                file: planPath,
                line: block.startLine,
                message: `Block "${block.name}" braucht genau einen LOCK-Header (gefunden: ${lockInBlock.length}).`,
            });
        }

        if (lockRows.length > 1) {
            violations.push({
                file: planPath,
                line: lockRows[0].line,
                message: `Block "${block.idToken}" hat mehrere Lock-Status-Zeilen (${lockRows.length}).`,
            });
        }

        if (lockInBlock.length === 1 && lockRows.length > 0) {
            const lockValue = lockInBlock[0].value;
            const activeRow = lockRows.find((row) => ACTIVE_LOCK_STATUSES.has(row.status));
            const hasActiveRow = lockRows.some((row) => ACTIVE_LOCK_STATUSES.has(row.status));
            const hasOnlyInactiveRows = lockRows.every((row) => !ACTIVE_LOCK_STATUSES.has(row.status));

            if (hasActiveRow && lockValue === 'frei') {
                violations.push({
                    file: planPath,
                    line: activeRow.line,
                    message: `Lock-Status "${activeRow.rawStatus}" fuer ${block.idToken} widerspricht LOCK-Header "frei".`,
                });
            }

            if (hasOnlyInactiveRows && lockValue !== 'frei') {
                violations.push({
                    file: planPath,
                    line: lockRows[0].line,
                    message: `Lock-Status "${lockRows[0].rawStatus}" fuer ${block.idToken} widerspricht LOCK-Header "${lockValue}".`,
                });
            }
        }

        const dodExists = blockLines.some((line) => /^###\s+Definition of Done \(DoD\)\s*$/.test(line.trim()));
        if (!dodExists) {
            violations.push({
                file: planPath,
                line: block.startLine,
                message: `Block "${block.name}" hat keine "Definition of Done (DoD)"-Sektion.`,
            });
        }

        const riskExists = blockLines.some((line) => line.trim() === `### Risiko-Register ${block.idToken}`);
        if (!riskExists) {
            violations.push({
                file: planPath,
                line: block.startLine,
                message: `Block "${block.name}" hat kein "Risiko-Register ${block.idToken}".`,
            });
        }

        if (!phaseHeadings.has(99)) {
            violations.push({
                file: planPath,
                line: block.startLine,
                message: `Block "${block.name}" hat kein Abschluss-Gate ${block.phaseRoot}.99.`,
            });
        }

        const phaseNumbers = [...phaseHeadings.keys()].sort((a, b) => a - b);
        if (phaseNumbers.length > 0 && phaseNumbers[phaseNumbers.length - 1] !== 99) {
            const lastPhase = phaseNumbers[phaseNumbers.length - 1];
            violations.push({
                file: planPath,
                line: phaseHeadings.get(lastPhase).line,
                message: `Block "${block.name}" endet mit ${block.phaseRoot}.${lastPhase} statt ${block.phaseRoot}.99.`,
            });
        }

        for (const phaseNumber of phaseNumbers) {
            phaseSubCounts.set(phaseNumber, 0);
        }

        for (const item of blockChecklistItems) {
            const match = item.id.match(new RegExp(`^${block.phaseRoot}\\.(\\d+)\\.(\\d+)\\b`));
            if (!match) continue;

            const phaseNumber = Number(match[1]);
            phaseSubCounts.set(phaseNumber, (phaseSubCounts.get(phaseNumber) ?? 0) + 1);
        }

        for (const phaseNumber of phaseNumbers) {
            const subCount = phaseSubCounts.get(phaseNumber) ?? 0;
            if (subCount >= 2) continue;

            violations.push({
                file: planPath,
                line: phaseHeadings.get(phaseNumber).line,
                message: `Phase ${block.phaseRoot}.${phaseNumber} braucht mindestens 2 Sub-Phasen (gefunden: ${subCount}).`,
            });
        }

        for (let index = block.startIndex; index <= block.endIndex; index += 1) {
            const line = lines[index];
            if (!/DoD\.1/.test(line)) continue;

            const expectedPhases = collectPhaseExpectationsFromDoD(line, block.phaseRoot);
            if (expectedPhases.length === 0) continue;

            const missingPhases = expectedPhases.filter((phaseNumber) => !phaseHeadings.has(phaseNumber));
            if (missingPhases.length === 0) continue;

            violations.push({
                file: planPath,
                line: index + 1,
                message: `DoD.1 referenziert fehlende Phasen fuer Block ${block.idToken}: ${missingPhases.map((phaseNumber) => `${block.phaseRoot}.${phaseNumber}`).join(', ')}.`,
            });
        }

        const gateChildren = blockChecklistItems.filter((item) => item.id.startsWith(`${block.phaseRoot}.99.`));
        if (gateChildren.length > 0 && gateChildren.every((item) => item.state === 'x')) {
            const openPrerequisites = blockChecklistItems.filter((item) => {
                if (item.id.startsWith(`${block.phaseRoot}.99.`)) return false;
                return item.state !== 'x';
            });

            if (openPrerequisites.length > 0) {
                violations.push({
                    file: planPath,
                    line: gateChildren[0].line,
                    message: `Gate ${block.phaseRoot}.99 ist abgeschlossen, aber Vorphasen sind noch offen: ${openPrerequisites.map((item) => item.id).join(', ')}.`,
                });
            }
        }
    }

    const checkedPaths = new Set();
    for (const ref of planRefs) {
        if (!ref.file.startsWith('docs/')) continue;
        if (checkedPaths.has(ref.file)) continue;
        checkedPaths.add(ref.file);

        if (!(await fileExistsImpl(ref.file))) {
            violations.push({
                file: planPath,
                line: ref.line,
                message: `${ref.source} verweist auf fehlende Datei: ${ref.file}`,
            });
        }
    }

    return violations;
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
