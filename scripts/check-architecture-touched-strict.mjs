import { collectArchitectureReport } from './architecture/ArchitectureAnalysis.mjs';
import { collectTouchedFiles } from './architecture/TouchedFiles.mjs';

const touchedFiles = new Set(
    collectTouchedFiles({})
        .filter((filePath) => filePath.startsWith('src/'))
        .filter((filePath) => filePath.endsWith('.js'))
);

if (touchedFiles.size === 0) {
    console.log('Architecture touched-file strict mode skipped (no touched src files).');
    process.exit(0);
}

const report = collectArchitectureReport(process.cwd());
const failures = [];

const pushViolation = (category, entry, filePath, line, detail) => {
    if (!touchedFiles.has(filePath)) return;
    if (entry.allowed !== false) return;
    failures.push({
        category,
        location: `${filePath}:${line}`,
        detail,
    });
};

for (const entry of report.findings.constructorGameMatches) {
    pushViolation('constructor(game)', entry, entry.file, entry.line, entry.snippet);
}

for (const entry of report.findings.domAccessesOutsideUi) {
    pushViolation('DOM outside src/ui', entry, entry.file, entry.line, entry.snippet);
}

for (const entry of report.findings.coreToUiImports) {
    pushViolation('core -> ui import', entry, entry.from, entry.line, `${entry.from} -> ${entry.to}`);
}

for (const entry of report.findings.uiToCoreImports) {
    pushViolation('ui -> core import', entry, entry.from, entry.line, `${entry.from} -> ${entry.to}`);
}

for (const entry of report.findings.entitiesToCoreImports) {
    pushViolation('entities -> core import', entry, entry.from, entry.line, `${entry.from} -> ${entry.to}`);
}

for (const entry of report.findings.stateToCoreImports) {
    pushViolation('state -> core import', entry, entry.from, entry.line, `${entry.from} -> ${entry.to}`);
}

if (failures.length === 0) {
    console.log('Architecture touched-file strict mode passed.');
    console.log(`Touched src files checked: ${touchedFiles.size}`);
    process.exit(0);
}

console.error('Architecture touched-file strict mode failed.');
for (const failure of failures) {
    console.error(`- ${failure.category} @ ${failure.location}`);
    console.error(`  ${failure.detail}`);
}
process.exit(1);
