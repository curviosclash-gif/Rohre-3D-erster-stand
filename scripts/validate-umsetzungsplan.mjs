#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const MASTER_PLANS = [
    'docs/Umsetzungsplan.md',
    'docs/Bot_Trainingsplan.md',
];

function normalizePath(value) {
    return value.replace(/\\/g, '/');
}

function parseChecklistItems(lines) {
    const itemRegex = /^\s*-\s*\[([ xX\/])\]\s*(.+?)\s*$/;
    const idRegex = /^((?:\d+(?:\.\d+)+)|(?:[A-Z]\.\d+(?:\.\d+){0,2}))\b/;
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
    const blockRegex = /^##\s+Block\s+(.+)$/;
    const blocks = [];

    for (let index = 0; index < lines.length; index += 1) {
        const line = lines[index];
        const match = line.match(blockRegex);
        if (!match) continue;

        blocks.push({
            name: match[1].trim(),
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

function collectLockStatusTableViolations(lines) {
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
        return [{ line: 1, message: 'Section "## Lock-Status" fehlt.' }];
    }

    const violations = [];
    for (let index = section.startIndex + 1; index <= section.endIndex; index += 1) {
        const line = lines[index].trim();
        if (!line.startsWith('|')) continue;
        if (line.startsWith('| ---')) continue;
        if (/^\|\s*Agent\s*\|/i.test(line)) continue;

        const cells = line.split('|').map((cell) => cell.trim()).filter((cell) => cell.length > 0);
        if (cells.length < 4) continue;

        const status = cells[3].toLowerCase();
        if (!allowedStatuses.has(status)) {
            violations.push({
                line: index + 1,
                message: `Ungueltiger Lock-Status "${cells[3]}" in Lock-Status-Tabelle.`,
            });
        }
    }

    return violations;
}

async function fileExists(relPath) {
    try {
        await fs.access(path.join(ROOT, relPath));
        return true;
    } catch {
        return false;
    }
}

async function validatePlan(planPath) {
    const absPath = path.join(ROOT, planPath);
    let content = '';
    try {
        content = await fs.readFile(absPath, 'utf8');
    } catch (error) {
        return [{ file: planPath, line: 1, message: `Datei nicht lesbar: ${String(error)}` }];
    }

    const lines = content.split(/\r?\n/);
    const checklistItems = parseChecklistItems(lines);
    const blocks = parseBlocks(lines);
    const lockEntries = collectLockEntries(lines);
    const planRefs = collectPlanFileRefs(lines);
    const violations = [];

    if (blocks.length === 0) {
        violations.push({ file: planPath, line: 1, message: 'Keine Block-Sektionen (`## Block ...`) gefunden.' });
        return violations;
    }

    // Duplicate checklist IDs within plan
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

    // Gate invariant: *.99 done only after all prior phases done.
    const gateItems = checklistItems.filter((item) => item.id.endsWith('.99'));
    for (const gate of gateItems) {
        if (gate.state !== 'x') continue;

        const root = gate.id.slice(0, -3);
        const prerequisites = checklistItems.filter(
            (item) => item.id.startsWith(`${root}.`) && !item.id.startsWith(`${root}.99`)
        );
        const openPrerequisites = prerequisites.filter((item) => item.state !== 'x');
        const gateChildren = checklistItems.filter((item) => item.id.startsWith(`${gate.id}.`));
        const openGateChildren = gateChildren.filter((item) => item.state !== 'x');

        if (prerequisites.length === 0) {
            violations.push({
                file: planPath,
                line: gate.line,
                message: `Gate ${gate.id} ist abgeschlossen, aber es wurden keine Vorphasen gefunden.`,
            });
            continue;
        }

        if (openPrerequisites.length > 0 || openGateChildren.length > 0) {
            const openIds = [...openPrerequisites, ...openGateChildren].map((item) => item.id || `line ${item.line}`);
            violations.push({
                file: planPath,
                line: gate.line,
                message: `Gate ${gate.id} ist abgeschlossen, aber offene Punkte vorhanden: ${openIds.join(', ')}.`,
            });
        }
    }

    // Evidence format for completed checklist items that carry IDs
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

    // Lock format and per-block lock presence
    for (const lock of lockEntries) {
        if (!isValidLockValue(lock.value)) {
            violations.push({
                file: planPath,
                line: lock.line,
                message: `Ungueltiger ${lock.kind}-Wert "${lock.value}".`,
            });
        }
    }

    for (const block of blocks) {
        const lockInBlock = lockEntries.filter((lock) => {
            const lineIndex = lock.line - 1;
            return lineIndex >= block.startIndex && lineIndex <= block.endIndex && lock.kind === 'LOCK';
        });

        if (lockInBlock.length !== 1) {
            violations.push({
                file: planPath,
                line: block.startLine,
                message: `Block "${block.name}" braucht genau einen LOCK-Header (gefunden: ${lockInBlock.length}).`,
            });
        }

        const dodExists = lines
            .slice(block.startIndex, block.endIndex + 1)
            .some((line) => /^###\s+Definition of Done \(DoD\)\s*$/.test(line.trim()));

        if (!dodExists) {
            violations.push({
                file: planPath,
                line: block.startLine,
                message: `Block "${block.name}" hat keine "Definition of Done (DoD)"-Sektion.`,
            });
        }
    }

    // Lock status table values
    for (const tableViolation of collectLockStatusTableViolations(lines)) {
        violations.push({ file: planPath, ...tableViolation });
    }

    // Referenced docs paths must exist
    const checkedPaths = new Set();
    for (const ref of planRefs) {
        if (!ref.file.startsWith('docs/')) continue;
        if (checkedPaths.has(ref.file)) continue;
        checkedPaths.add(ref.file);

        if (!(await fileExists(ref.file))) {
            violations.push({
                file: planPath,
                line: ref.line,
                message: `${ref.source} verweist auf fehlende Datei: ${ref.file}`,
            });
        }
    }

    return violations;
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

await main();
