#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const GEMINI_ROOT = '.gemini';
const AGENTS_ROOT = '.gemini/agents';
const PLAN_GENERATOR = '.gemini/skills/plan-generator/SKILL.md';

const forbiddenPatterns = [
    {
        id: 'open-findings-reference',
        pattern: /Open_Findings\.md/,
        message: 'Open_Findings.md ist keine kanonische Repo-Quelle; nutze .agents/test_mapping.md, docs/qa/** oder aktive Blockplaene.',
    },
    {
        id: 'legacy-test-script',
        pattern: /npm\s+run\s+test:e2e:desktop/,
        message: 'Altes Testskript gefunden; nutze test:desktop:smoke, test:desktop:e2e oder .agents/test_mapping.md.',
    },
    {
        id: 'direct-active-plan-create',
        pattern: /Erstelle\s+die\s+Datei\s+`docs\/plaene\/aktiv\/VXX\.md`/i,
        message: 'Plan-Intake darf keine aktive VXX-Datei direkt erstellen; Drafts gehoeren nach docs/plaene/neu/.',
    },
    {
        id: 'direct-master-update',
        pattern: /F[uü]ge\s+.*docs\/Umsetzungsplan\.md/i,
        message: 'Master-Index-Aufnahme ist User-owned; Gemini darf hoechstens Intake-Hinweise im Draft notieren.',
    },
    {
        id: 'master-claim',
        pattern: /in den Master-Index [uü]bernommen wurde/i,
        message: 'Gemini darf keine Master-Aufnahme behaupten, solange sie nicht explizit erfolgt ist.',
    },
];

function normalizePath(value) {
    return value.replace(/\\/g, '/');
}

async function exists(relPath) {
    try {
        await fs.access(path.join(ROOT, relPath));
        return true;
    } catch {
        return false;
    }
}

async function listMarkdownFiles(relDir) {
    const fullDir = path.join(ROOT, relDir);
    const out = [];
    let entries = [];

    try {
        entries = await fs.readdir(fullDir, { withFileTypes: true });
    } catch {
        return out;
    }

    for (const entry of entries) {
        const relPath = normalizePath(path.join(relDir, entry.name));
        if (entry.isDirectory()) {
            out.push(...await listMarkdownFiles(relPath));
        } else if (entry.isFile() && relPath.endsWith('.md')) {
            out.push(relPath);
        }
    }

    return out.sort((a, b) => a.localeCompare(b));
}

function findPatternLines(text, pattern) {
    const lines = text.split(/\r?\n/);
    const hits = [];
    for (let index = 0; index < lines.length; index += 1) {
        pattern.lastIndex = 0;
        if (pattern.test(lines[index])) {
            hits.push(index + 1);
        }
    }
    return hits;
}

function addViolation(violations, file, line, id, message) {
    violations.push({ file, line, id, message });
}

async function readUtf8(relPath) {
    return fs.readFile(path.join(ROOT, relPath), 'utf8');
}

async function main() {
    if (!await exists(GEMINI_ROOT)) {
        console.log('[gemini-governance] skipped: .gemini fehlt');
        return;
    }

    const markdownFiles = await listMarkdownFiles(GEMINI_ROOT);
    const violations = [];
    const contentByFile = new Map();

    for (const file of markdownFiles) {
        const text = await readUtf8(file);
        contentByFile.set(file, text);

        for (const rule of forbiddenPatterns) {
            const lines = findPatternLines(text, rule.pattern);
            for (const line of lines) {
                addViolation(violations, file, line, rule.id, rule.message);
            }
        }
    }

    const agentFiles = markdownFiles.filter((file) => file.startsWith(`${AGENTS_ROOT}/`));
    for (const file of agentFiles) {
        const text = contentByFile.get(file) || '';
        if (!text.includes('Repo-Governance zuerst:')) {
            addViolation(
                violations,
                file,
                1,
                'missing-repo-governance-preamble',
                'Gemini-Agenten muessen vor Spezialregeln auf AGENTS.md, Rules und Workflows verweisen.'
            );
        }
    }

    if (await exists(PLAN_GENERATOR)) {
        const planGenerator = contentByFile.get(PLAN_GENERATOR) || await readUtf8(PLAN_GENERATOR);
        const requiredSnippets = [
            ['docs/plaene/neu/', 'plan-generator muss Intake-Drafts unter docs/plaene/neu/ verankern.'],
            ['User-owned', 'plan-generator muss User-owned Master-/Intake-Governance benennen.'],
            ['Kein Master-Update', 'plan-generator muss direkte Master-Updates explizit verbieten.'],
        ];

        for (const [snippet, message] of requiredSnippets) {
            if (!planGenerator.includes(snippet)) {
                addViolation(violations, PLAN_GENERATOR, 1, 'plan-generator-governance-missing', message);
            }
        }
    }

    if (violations.length > 0) {
        console.error(`[gemini-governance] ${violations.length} violation(s)`);
        for (const violation of violations) {
            console.error(`- ${violation.file}:${violation.line} [${violation.id}] ${violation.message}`);
        }
        process.exitCode = 1;
        return;
    }

    console.log(`[gemini-governance] ok files=${markdownFiles.length} agents=${agentFiles.length}`);
}

main().catch((error) => {
    console.error(`[gemini-governance] failed: ${error?.message || error}`);
    process.exitCode = 1;
});

