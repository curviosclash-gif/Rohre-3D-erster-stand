import { readFileSync } from 'node:fs';
import { collectArchitectureReport, formatArchitectureReport } from './architecture/ArchitectureAnalysis.mjs';

const report = collectArchitectureReport(process.cwd());

let ratchetBaselines = {};
try {
    const ratchet = JSON.parse(readFileSync('scripts/architecture/architecture-budget-ratchet.json', 'utf8'));
    ratchetBaselines = ratchet?.budgets || {};
} catch {
    // ratchet file optional for metrics display
}

const legacySurfaceChecks = Object.entries(report.scorecard.legacySurfaces || {}).map(
    ([surfaceId, data]) => {
        const key = `legacySurface_${surfaceId.replace(/[^a-zA-Z0-9]/g, '_')}_totalFiles`;
        return {
            label: `legacy-surface ${surfaceId} total files`,
            actual: data.totalFiles,
            max: Number.isFinite(ratchetBaselines[key]) ? ratchetBaselines[key] : data.totalFiles,
        };
    }
);

const checks = [
    {
        label: 'CONFIG writes',
        actual: report.scorecard.configWrites.total,
        max: report.targets.configWrites,
    },
    {
        label: 'constructor(game) legacy file budget',
        actual: report.scorecard.constructorGame.totalFiles,
        max: report.budgets.constructorGameFiles,
    },
    {
        label: 'DOM outside src/ui legacy file budget',
        actual: report.scorecard.domAccessOutsideUi.totalFiles,
        max: report.budgets.domAccessFiles,
    },
    {
        label: 'core -> ui legacy edge budget',
        actual: report.scorecard.coreToUiImports.totalEdges,
        max: report.budgets.coreToUiImportEdges,
    },
    {
        label: 'ui -> core legacy edge budget',
        actual: report.scorecard.uiToCoreImports.totalEdges,
        max: report.budgets.uiToCoreImportEdges,
    },
    {
        label: 'ui -> state legacy edge budget',
        actual: report.scorecard.uiToStateImports.totalEdges,
        max: report.budgets.uiToStateImportEdges,
    },
    {
        label: 'state -> ui legacy edge budget',
        actual: report.scorecard.stateToUiImports.totalEdges,
        max: report.budgets.stateToUiImportEdges,
    },
    {
        label: 'entities -> core legacy edge budget',
        actual: report.scorecard.entitiesToCoreImports.totalEdges,
        max: report.budgets.entitiesToCoreImportEdges,
    },
    {
        label: 'state -> core legacy edge budget',
        actual: report.scorecard.stateToCoreImports.totalEdges,
        max: report.budgets.stateToCoreImportEdges,
    },
    ...legacySurfaceChecks,
];

const failures = checks.filter((check) => check.actual > check.max);

console.log(formatArchitectureReport(report));
console.log('');
console.log('Architecture metric budgets:');
for (const check of checks) {
    const status = check.actual <= check.max ? 'OK' : 'FAIL';
    console.log(`- ${status}: ${check.label} = ${check.actual} (budget ${check.max})`);
}

if (failures.length > 0) {
    process.exit(1);
}
