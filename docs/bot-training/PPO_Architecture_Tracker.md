# PPO Architecture Decision Tracker

Stand: 2026-04-23

Diese Datei trackt Architekturentscheidungen und algorithmische Schulden (ADRs) für den PPO-Zweitpfad. Sie dient der Trennung von Implementierungsphasen (siehe `Bot_Trainingsplan.md`) und architektonischem *Warum*.

| ID | Datum | Kategorie | Problem | Entscheidung / Regel | Ziel-Block | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| PPO-ADR-001 | 2026-04-23 | Throughput | PPO Sample Inefficiency vs. WebSocket Throughput. Bei ~50 Steps/s dauern Updates zu lange. | PPO-Batch-Size muss zwingend mathematisch aus dem gemessenen Throughput abgeleitet werden. Max. akzeptable Update-Wall-Clock-Time muss validiert werden. | BT93A | OFFEN |
| PPO-ADR-002 | 2026-04-23 | Preprocessing | PPO divergiert oft ohne Observation Normalization (Gradient Exploding). | Explizite Integration von State-Normalization (z.B. `VecNormalize`) und Definition der Actor/Critic-Heads als harte Phase vor dem Baseline-Scaffold. | BT93B | OFFEN |
| PPO-ADR-003 | 2026-04-23 | Memory | WebSocket-basierte Headless-Envs neigen bei Langläufern (>100k Steps) zu Memory Leaks. | Einbau von explizitem Python-seitigem Memory-Usage-Tracking in den Boundary-Harness. | BT93A | OFFEN |
