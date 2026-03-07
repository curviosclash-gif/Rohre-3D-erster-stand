export class DemoInput {
    constructor() {
        this.keys = new Set();
        this._justPressed = new Set();

        this._onKeyDown = (event) => {
            if (!this.keys.has(event.code)) {
                this._justPressed.add(event.code);
            }
            this.keys.add(event.code);
        };

        this._onKeyUp = (event) => {
            this.keys.delete(event.code);
        };

        window.addEventListener('keydown', this._onKeyDown);
        window.addEventListener('keyup', this._onKeyUp);
        window.addEventListener('blur', this._onKeyUpAll);
    }

    _onKeyUpAll = () => {
        this.keys.clear();
        this._justPressed.clear();
    };

    isDown(code) {
        return this.keys.has(code);
    }

    consumePressed(code) {
        const pressed = this._justPressed.has(code);
        if (pressed) this._justPressed.delete(code);
        return pressed;
    }

    getAxis(negativeCodes, positiveCodes) {
        const neg = negativeCodes.some((code) => this.keys.has(code)) ? 1 : 0;
        const pos = positiveCodes.some((code) => this.keys.has(code)) ? 1 : 0;
        return pos - neg;
    }

    dispose() {
        window.removeEventListener('keydown', this._onKeyDown);
        window.removeEventListener('keyup', this._onKeyUp);
        window.removeEventListener('blur', this._onKeyUpAll);
    }
}
