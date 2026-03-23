import { collectArchitectureReport, formatArchitectureReport } from './architecture/ArchitectureAnalysis.mjs';

const report = collectArchitectureReport(process.cwd());

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
        label: 'entities -> core legacy edge budget',
        actual: report.scorecard.entitiesToCoreImports.totalEdges,
        max: report.budgets.entitiesToCoreImportEdges,
    },
    {
        label: 'state -> core legacy edge budget',
        actual: report.scorecard.stateToCoreImports.totalEdges,
        max: report.budgets.stateToCoreImportEdges,
    },
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
