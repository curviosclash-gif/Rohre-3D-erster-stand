import { createEntityRuntimeSupport } from './EntityRuntimeSupportAssembly.js';
import { createEntityRuntimeSystems } from './EntityRuntimeSystemAssembly.js';
import { createEntityRuntimeCompat } from './EntityRuntimeCompat.js';

export class EntityRuntimeAssembler {
    constructor(entityManager) {
        this.entityManager = entityManager || null;
    }

    assemble() {
        const owner = this.entityManager;
        const support = createEntityRuntimeSupport(owner);
        const systems = createEntityRuntimeSystems(owner, support.runtimeContext, support);
        const runtime = {
            support,
            context: support.runtimeContext,
            systems,
        };
        runtime.compat = createEntityRuntimeCompat(runtime);
        return runtime;
    }
}

export function assembleEntityRuntime(entityManager) {
    return new EntityRuntimeAssembler(entityManager).assemble();
}
