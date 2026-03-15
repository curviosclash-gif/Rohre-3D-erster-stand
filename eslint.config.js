const createMaxLinesRule = (max) => ([
    'error',
    {
        max,
        skipBlankLines: true,
        skipComments: true,
    },
]);

const legacyFileCeilings = {
    'src/core/GameDebugApi.js': 650,
    'src/core/GameRuntimeFacade.js': 1050,
    'src/core/MediaRecorderSystem.js': 1225,
    'src/core/SettingsManager.js': 585,
    'src/core/main.js': 560,
    'src/entities/ai/training/WebSocketTrainerBridge.js': 700,
    'src/ui/menu/MenuMultiplayerBridge.js': 760,
    'src/ui/UIManager.js': 1225,
};

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
