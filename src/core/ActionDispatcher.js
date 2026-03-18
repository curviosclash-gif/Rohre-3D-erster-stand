// ============================================
// ActionDispatcher.js - centralized state change dispatch
// ============================================

/**
 * Centralized dispatcher for game state changes.
 * All state mutations go through dispatch() so they can be:
 * - Validated before applying
 * - Forwarded over the network (host → clients)
 * - Recorded for replay
 *
 * Usage:
 *   const dispatcher = new ActionDispatcher();
 *   dispatcher.on('settings.invertPitch', (action) => { ... });
 *   dispatcher.dispatch({ type: 'settings.invertPitch', payload: { playerIndex: 0, value: true } });
 */

export class ActionDispatcher {
    constructor() {
        this._handlers = new Map();
        this._middleware = [];
    }

    on(type, handler) {
        if (!this._handlers.has(type)) {
            this._handlers.set(type, []);
        }
        this._handlers.get(type).push(handler);
    }

    off(type, handler) {
        const handlers = this._handlers.get(type);
        if (!handlers) return;
        const index = handlers.indexOf(handler);
        if (index >= 0) handlers.splice(index, 1);
    }

    use(middleware) {
        this._middleware.push(middleware);
    }

    dispatch(action) {
        if (!action || typeof action.type !== 'string') return;

        for (const mw of this._middleware) {
            const result = mw(action);
            if (result === false) return;
        }

        const handlers = this._handlers.get(action.type);
        if (handlers) {
            for (const handler of handlers) {
                handler(action);
            }
        }

        const wildcardHandlers = this._handlers.get('*');
        if (wildcardHandlers) {
            for (const handler of wildcardHandlers) {
                handler(action);
            }
        }
    }

    dispose() {
        this._handlers.clear();
        this._middleware.length = 0;
    }
}
