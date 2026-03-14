export class RoundSnapshotStore {
    constructor({ maxSnapshots = 900, timeProvider = null } = {}) {
        this.maxSnapshots = Math.max(1, Number(maxSnapshots) || 900);
        this.timeProvider = typeof timeProvider === 'function' ? timeProvider : (() => 0);
        this.snapshots = new Array(this.maxSnapshots);
        for (let i = 0; i < this.maxSnapshots; i++) {
            this.snapshots[i] = { time: 0, playerCount: 0, players: [] };
        }
        this.snapshotIndex = 0;
        this.snapshotCount = 0;
    }

    reset() {
        this.snapshotIndex = 0;
        this.snapshotCount = 0;
    }

    capture(players) {
        const snap = this.snapshots[this.snapshotIndex];
        snap.time = this.timeProvider();
        snap.playerCount = players.length;

        while (snap.players.length < players.length) {
            snap.players.push({
                idx: 0,
                alive: false,
                x: 0,
                y: 0,
                z: 0,
                qx: 0,
                qy: 0,
                qz: 0,
                qw: 1,
                bot: false,
            });
        }

        for (let i = 0; i < players.length; i++) {
            const p = players[i];
            const s = snap.players[i];
            s.idx = p.index;
            s.alive = p.alive;
            s.x = +p.position.x.toFixed(1);
            s.y = +p.position.y.toFixed(1);
            s.z = +p.position.z.toFixed(1);
            s.qx = +p.quaternion.x.toFixed(4);
            s.qy = +p.quaternion.y.toFixed(4);
            s.qz = +p.quaternion.z.toFixed(4);
            s.qw = +p.quaternion.w.toFixed(4);
            s.bot = p.isBot;
        }

        this.snapshotIndex = (this.snapshotIndex + 1) % this.maxSnapshots;
        if (this.snapshotCount < this.maxSnapshots) this.snapshotCount++;
    }

    getOrderedSnapshots(limit = null) {
        const ordered = [];
        const totalCount = limit == null
            ? this.snapshotCount
            : Math.min(this.snapshotCount, Math.max(1, Number(limit) || 1));
        const snapStart = this.snapshotCount >= this.maxSnapshots ? this.snapshotIndex : 0;
        const offset = Math.max(0, this.snapshotCount - totalCount);

        for (let i = 0; i < totalCount; i++) {
            const idx = (snapStart + offset + i) % this.maxSnapshots;
            const snapshot = this.snapshots[idx];
            const playerCount = Math.max(0, Number(snapshot?.playerCount) || 0);
            ordered.push({
                time: Number(snapshot?.time) || 0,
                players: snapshot.players.slice(0, playerCount).map((player) => ({
                    idx: Number(player?.idx) || 0,
                    alive: !!player?.alive,
                    x: Number(player?.x) || 0,
                    y: Number(player?.y) || 0,
                    z: Number(player?.z) || 0,
                    qx: Number(player?.qx) || 0,
                    qy: Number(player?.qy) || 0,
                    qz: Number(player?.qz) || 0,
                    qw: Number(player?.qw) || 1,
                    bot: !!player?.bot,
                })),
            });
        }

        return ordered;
    }

    getRecentSnapshotTable(limit = 20) {
        const snapList = [];
        const snapshots = this.getOrderedSnapshots(limit);
        for (let i = 0; i < snapshots.length; i++) {
            const s = snapshots[i];
            const playerStr = s.players
                .filter((p) => p.idx !== undefined)
                .map((p) => `${p.bot ? 'Bot' : 'P'}${p.idx}:${p.alive ? 'alive' : 'dead'}(${p.x},${p.y},${p.z})`)
                .join(' | ');
            snapList.push({ time: `${s.time.toFixed(2)}s`, players: playerStr });
        }
        return snapList;
    }
}
