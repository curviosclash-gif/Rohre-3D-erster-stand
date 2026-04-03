import { resolveDefaultLobbyTransport } from '../../shared/contracts/PlatformCapabilityRegistry.js';
import {
    LOBBY_SERVICE_TRANSPORTS,
    matchesLobbyServiceTransport,
    normalizeLobbyServiceTransport,
} from '../../shared/contracts/LobbyServiceContract.js';
import { LanLobbyService } from './NetworkLobbyService.js';
import { StorageLobbyService } from './StorageLobbyService.js';

function resolveRuntimeGlobal(runtime = null) {
    if (runtime && typeof runtime === 'object' && runtime.global && typeof runtime.global === 'object') {
        return runtime.global;
    }
    return typeof globalThis !== 'undefined' ? globalThis : null;
}

function resolveDefaultTransport(runtime = null) {
    return resolveDefaultLobbyTransport({
        runtimeGlobal: resolveRuntimeGlobal(runtime),
    });
}

function resolveCustomFactory(serviceFactories = null, transport = '') {
    const registry = serviceFactories && typeof serviceFactories === 'object' ? serviceFactories : null;
    const factory = registry?.[transport];
    return typeof factory === 'function' ? factory : null;
}

export function resolveMenuLobbyServiceTransport(options = {}) {
    const resolvedTransport = normalizeLobbyServiceTransport(options.transport, '');
    const customFactory = resolveCustomFactory(options.serviceFactories, resolvedTransport);
    if (resolvedTransport === LOBBY_SERVICE_TRANSPORTS.ONLINE && !customFactory) {
        return resolveDefaultTransport(options.runtime);
    }
    return resolvedTransport || resolveDefaultTransport(options.runtime);
}

export function matchesMenuLobbyServiceTransport(service, transport) {
    return matchesLobbyServiceTransport(service, transport);
}

export function createMenuLobbyService(options = {}) {
    const transport = resolveMenuLobbyServiceTransport(options);
    const customFactory = resolveCustomFactory(options.serviceFactories, transport);
    if (customFactory) {
        return customFactory({
            ...options,
            transport,
        });
    }
    if (transport === LOBBY_SERVICE_TRANSPORTS.LAN) {
        return new LanLobbyService({
            ...options,
            transport,
        });
    }
    return new StorageLobbyService({
        ...options,
        transport: LOBBY_SERVICE_TRANSPORTS.STORAGE_BRIDGE,
    });
}
