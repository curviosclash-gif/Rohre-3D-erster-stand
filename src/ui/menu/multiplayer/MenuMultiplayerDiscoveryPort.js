import { resolveGlobalObject, toCallable } from './MenuMultiplayerBridgeRuntime.js';

const NOOP_UNSUBSCRIBE = () => {};

function toHostList(value) {
    return Array.isArray(value) ? value.filter((host) => host && typeof host === 'object') : [];
}

export function createMenuMultiplayerDiscoveryPort(options = {}) {
    const runtimeGlobal = resolveGlobalObject(options.runtime);
    const discoveryRuntime = options.discoveryRuntime && typeof options.discoveryRuntime === 'object'
        ? options.discoveryRuntime
        : runtimeGlobal?.curviosApp;

    const startDiscovery = toCallable(discoveryRuntime?.startDiscovery, null);
    const stopDiscovery = toCallable(discoveryRuntime?.stopDiscovery, null);
    const getDiscoveredHosts = toCallable(discoveryRuntime?.getDiscoveredHosts, null);
    const onDiscoveredHosts = toCallable(discoveryRuntime?.onDiscoveredHosts, null);

    function isAvailable() {
        return !!(startDiscovery && stopDiscovery && onDiscoveredHosts);
    }

    function start() {
        startDiscovery?.call(discoveryRuntime);
    }

    function stop() {
        stopDiscovery?.call(discoveryRuntime);
    }

    async function getHosts() {
        if (!getDiscoveredHosts) return [];
        try {
            const hosts = await getDiscoveredHosts.call(discoveryRuntime);
            return toHostList(hosts);
        } catch {
            return [];
        }
    }

    function subscribe(onHostsChanged) {
        if (!onDiscoveredHosts || typeof onHostsChanged !== 'function') {
            return NOOP_UNSUBSCRIBE;
        }
        try {
            const dispose = onDiscoveredHosts.call(discoveryRuntime, (hosts) => {
                onHostsChanged(toHostList(hosts));
            });
            return typeof dispose === 'function' ? dispose : NOOP_UNSUBSCRIBE;
        } catch {
            return NOOP_UNSUBSCRIBE;
        }
    }

    return Object.freeze({
        isAvailable,
        start,
        stop,
        getHosts,
        subscribe,
    });
}
