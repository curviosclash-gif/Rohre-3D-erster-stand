import { collectArchitectureReport } from './architecture/ArchitectureAnalysis.mjs';

const report = collectArchitectureReport(process.cwd());

const violations = [
    ...report.findings.configWrites.map((entry) => ({
        category: 'CONFIG write',
        location: `${entry.file}:${entry.line}`,
        detail: entry.snippet,
    })),
    ...report.findings.constructorGameMatches
        .filter((entry) => !entry.allowed)
        .map((entry) => ({
            category: entry.kind,
            location: `${entry.file}:${entry.line}`,
            detail: entry.snippet,
        })),
    ...report.findings.domAccessesOutsideUi
        .filter((entry) => !entry.allowed)
        .map((entry) => ({
            category: 'DOM outside src/ui',
            location: `${entry.file}:${entry.line}`,
            detail: entry.snippet,
        })),
    ...report.findings.uiToCoreImports
        .filter((entry) => !entry.allowed)
        .map((entry) => ({
            category: 'ui -> core import',
            location: `${entry.from}:${entry.line}`,
            detail: `${entry.from} -> ${entry.to}`,
        })),
    ...report.findings.entitiesToCoreImports
        .filter((entry) => !entry.allowed)
        .map((entry) => ({
            category: 'entities -> core import',
            location: `${entry.from}:${entry.line}`,
            detail: `${entry.from} -> ${entry.to}`,
        })),
];

if (violations.length === 0) {
    console.log('Architecture boundary guard passed.');
    console.log(`CONFIG writes: ${report.scorecard.configWrites.total}`);
    console.log(`constructor(game)/this.game = game disallowed files: ${report.scorecard.constructorGame.disallowedFiles}`);
    console.log(`DOM outside src/ui disallowed files: ${report.scorecard.domAccessOutsideUi.disallowedFiles}`);
    console.log(`ui -> core disallowed imports: ${report.scorecard.uiToCoreImports.disallowedEdges}`);
    console.log(`entities -> core disallowed imports: ${report.scorecard.entitiesToCoreImports.disallowedEdges}`);
    process.exit(0);
}

console.error('Architecture boundary guard failed.');
for (const violation of violations) {
    console.error(`- ${violation.category} @ ${violation.location}`);
    console.error(`  ${violation.detail}`);
}
process.exit(1);
