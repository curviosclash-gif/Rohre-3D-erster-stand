import assert from 'node:assert/strict';
import test from 'node:test';

import { buildRouteFromParcours } from '../src/entities/systems/ParcoursProgressUtils.js';

function createParcoursFixture(rules = undefined) {
    return {
        enabled: true,
        rules: rules && typeof rules === 'object' ? rules : undefined,
        checkpoints: [
            { id: 'CP01', pos: [0, 0, 0], radius: 1.2 },
            { id: 'CP02', pos: [10, 0, 0], radius: 1.2 },
        ],
        finish: { id: 'FINISH', pos: [20, 0, 0], radius: 1.2 },
    };
}

test('Parcours route defaults to ghost enabled unless explicitly disabled', () => {
    const defaultRoute = buildRouteFromParcours(createParcoursFixture());
    assert.equal(defaultRoute?.rules?.showGhost, true);

    const disabledRoute = buildRouteFromParcours(createParcoursFixture({ showGhost: false }));
    assert.equal(disabledRoute?.rules?.showGhost, false);

    const enabledRoute = buildRouteFromParcours(createParcoursFixture({ showGhost: true }));
    assert.equal(enabledRoute?.rules?.showGhost, true);
});
