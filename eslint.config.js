import { LEGACY_MAX_LINES } from './scripts/architecture/LegacyMaxLinesConfig.mjs';

const createMaxLinesRule = (max) => ([
    'error',
    {
        max,
        skipBlankLines: true,
        skipComments: true,
    },
]);

const legacyFileCeilings = LEGACY_MAX_LINES;

export default [
    {
        ignores: [
            'backups/**',
            'data/**',
            'dist/**',
            'node_modules/**',
            'output/**',
            'playwright-report/**',
            'test-results*/**',
            'tmp/**',
            'videos/**',
        ],
    },
    {
        files: ['src/**/*.js'],
        rules: {
            'max-lines': createMaxLinesRule(500),
        },
    },
    ...Object.entries(legacyFileCeilings).map(([file, max]) => ({
        files: [file],
        rules: {
            'max-lines': createMaxLinesRule(max),
        },
    })),
];
