import { readFileSync } from 'node:fs';
import { collectArchitectureReport } from './architecture/ArchitectureAnalysis.mjs';

const baseline = JSON.parse(
    readFileSync('scripts/architecture/architecture-budget-ratchet.json', 'utf8')
);

const baselineBudgets = baseline?.budgets || {};
const report = collectArchitectureReport(process.cwd());

const checks = [
    {
        key: 'constructorGameFiles',
        label: 'constructor(game) legacy file budget',
        actual: report.scorecard.constructorGame.totalFiles,
    },
    {
        key: 'domAccessFiles',
        label: 'DOM outside src/ui legacy file budget',
        actual: report.scorecard.domAccessOutsideUi.totalFiles,
    },
    {
        key: 'coreToUiImportEdges',
        label: 'core -> ui legacy edge budget',
        actual: report.scorecard.coreToUiImports.totalEdges,
    },
    {
        key: 'uiToCoreImportEdges',
        label: 'ui -> core legacy edge budget',
        actual: report.scorecard.uiToCoreImports.totalEdges,
    },
    {
        key: 'entitiesToCoreImportEdges',
        label: 'entities -> core legacy edge budget',
        actual: report.scorecard.entitiesToCoreImports.totalEdges,
    },
    {
        key: 'stateToCoreImportEdges',
        label: 'state -> core legacy edge budget',
        actual: report.scorecard.stateToCoreImports.totalEdges,
    },
];

const failures = [];
for (const check of checks) {
    const max = Number(baselineBudgets[check.key]);
    if (!Number.isFinite(max)) {
        failures.push({
            label: check.label,
            detail: `Missing baseline key "${check.key}"`,
        });
        continue;
    }
    if (check.actual > max) {
        failures.push({
            label: check.label,
            detail: `${check.actual} exceeds ratchet baseline ${max}`,
        });
    }
}

if (failures.length === 0) {
    console.log('Architecture budget ratchet passed.');
    for (const check of checks) {
        const max = baselineBudgets[check.key];
        const status = check.actual === max ? 'at-baseline' : 'below-baseline';
        console.log(`- ${status}: ${check.label} = ${check.actual} (baseline ${max})`);
    }
    process.exit(0);
}

console.error('Architecture budget ratchet failed.');
for (const failure of failures) {
    console.error(`- ${failure.label}: ${failure.detail}`);
}
process.exit(1);
