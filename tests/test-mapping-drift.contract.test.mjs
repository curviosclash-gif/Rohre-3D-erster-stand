import assert from 'node:assert/strict';
import test from 'node:test';

import { checkTestMappingDrift } from '../scripts/check-test-mapping-drift.mjs';

const SCRIPTS = {
  'test:contract': 'node --test tests/*.contract.test.mjs',
  'test:desktop:smoke': 'node smoke.mjs',
  'test:desktop:e2e': 'node e2e.mjs',
  'test:browser:compat': 'node browser.mjs',
};

const TRACKED = [
  'src/core/main.js',
  'tests/example.contract.test.mjs',
];

const GOOD_MAPPING = `
- \`node-contract\`: \`npm run test:contract\`
- \`desktop-smoke\`: \`npm run test:desktop:smoke\`
- \`desktop-e2e\`: \`npm run test:desktop:e2e\`
- \`browser-compat\`: \`npm run test:browser:compat\`

## Path -> Command
- \`src/core/main.js\` -> \`npm run test:contract\`
- \`tests/*.contract.test.mjs\` -> \`npm run test:contract\`
`;

test('valid scripts paths and contract catch-all stay clean', () => {
  assert.deepEqual(
    checkTestMappingDrift({
      mappingMarkdown: GOOD_MAPPING,
      packageDocument: { scripts: SCRIPTS },
      trackedFiles: TRACKED,
    }),
    []
  );
});

test('missing npm script is reported', () => {
  const warnings = checkTestMappingDrift({
    mappingMarkdown: `${GOOD_MAPPING}\n- \`npm run test:missing\``,
    packageDocument: { scripts: SCRIPTS },
    trackedFiles: TRACKED,
  });
  assert(warnings.some((warning) => warning.code === 'missing-npm-script'));
});

test('missing mapped path is reported', () => {
  const warnings = checkTestMappingDrift({
    mappingMarkdown: `${GOOD_MAPPING}\n- \`src/missing.js\` -> \`npm run test:contract\``,
    packageDocument: { scripts: SCRIPTS },
    trackedFiles: TRACKED,
  });
  assert(warnings.some((warning) => warning.code === 'missing-mapped-path'));
});

test('double-star path mapping matches nested files', () => {
  const warnings = checkTestMappingDrift({
    mappingMarkdown: `${GOOD_MAPPING}\n- \`src/**/*.js\` -> \`npm run test:contract\``,
    packageDocument: { scripts: SCRIPTS },
    trackedFiles: TRACKED,
  });
  assert(!warnings.some((warning) => warning.value === 'src/**/*.js'));
});

test('contract files require generic visibility mapping', () => {
  const warnings = checkTestMappingDrift({
    mappingMarkdown: GOOD_MAPPING.replace('- `tests/*.contract.test.mjs` -> `npm run test:contract`', ''),
    packageDocument: { scripts: SCRIPTS },
    trackedFiles: TRACKED,
  });
  assert(warnings.some((warning) => warning.code === 'contract-tests-unmapped'));
});

test('canonical runners must remain visible', () => {
  const warnings = checkTestMappingDrift({
    mappingMarkdown: GOOD_MAPPING.replace(/.*test:desktop:e2e.*\n/, ''),
    packageDocument: { scripts: SCRIPTS },
    trackedFiles: TRACKED,
  });
  assert(warnings.some((warning) => warning.code === 'canonical-runner-unmapped'));
});
