export class PowerupPrototypeManager {
    constructor() {
        this.powerups = [];
    }

    add(powerup) {
        this.powerups.push(powerup);
        return powerup;
    }

    update(dt, time, context) {
        for (let i = 0; i < this.powerups.length; i++) {
            this.powerups[i].step(dt, time, context);
        }
    }

    dispose() {
        for (let i = 0; i < this.powerups.length; i++) {
            this.powerups[i]?.dispose?.();
        }
        this.powerups.length = 0;
    }
}
