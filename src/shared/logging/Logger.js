const LOG_LEVEL = Object.freeze({
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
    SILENT: 4,
});

const LEVEL_NAMES = ['debug', 'info', 'warn', 'error', 'silent'];

const DEFAULT_LEVEL = (typeof import.meta !== 'undefined' && import.meta.env?.DEV)
    ? LOG_LEVEL.DEBUG
    : LOG_LEVEL.WARN;

export class Logger {
    constructor(namespace, { level, output } = {}) {
        this._namespace = namespace ? `[${namespace}]` : '';
        this._level = level ?? DEFAULT_LEVEL;
        this._output = output ?? console;
    }

    debug(...args) {
        if (this._level <= LOG_LEVEL.DEBUG) {
            this._output.debug(this._namespace, ...args);
        }
    }

    info(...args) {
        if (this._level <= LOG_LEVEL.INFO) {
            (this._output.info ?? this._output.log).call(this._output, this._namespace, ...args);
        }
    }

    warn(...args) {
        if (this._level <= LOG_LEVEL.WARN) {
            this._output.warn(this._namespace, ...args);
        }
    }

    error(...args) {
        if (this._level <= LOG_LEVEL.ERROR) {
            this._output.error(this._namespace, ...args);
        }
    }

    setLevel(level) {
        if (typeof level === 'string') {
            const idx = LEVEL_NAMES.indexOf(level);
            this._level = idx >= 0 ? idx : DEFAULT_LEVEL;
        } else if (typeof level === 'number') {
            this._level = level;
        }
    }

    child(subNamespace) {
        const parentNs = this._namespace
            ? this._namespace.slice(1, -1)
            : '';
        const ns = parentNs ? `${parentNs}:${subNamespace}` : subNamespace;
        return new Logger(ns, { level: this._level, output: this._output });
    }
}

export { LOG_LEVEL };

export function createLogger(namespace, options) {
    return new Logger(namespace, options);
}
