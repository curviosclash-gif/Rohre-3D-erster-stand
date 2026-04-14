# Archiv: Abgeschlossene Bloecke

Ablage fuer `status: done`-Bloecke, die vom aktiven Master-Index (`docs/plaene/Umsetzungsplan.md`) entlastet wurden. Die kanonischen Blockdateien liegen weiter unter `docs/plaene/aktiv/VXX.md` bzw. `docs/plaene/alt/VXX.md`; diese Uebersicht ist nur ein Referenz-Index.

Im Master-Index bleiben nur Abschluesse, die von offenen Deps aktiver Bloecke noch aktuell referenziert werden (Stand 2026-04-14: V71, V72, V74, V77, V91, V92).

## Archivierte abgeschlossene Bloecke

| id | titel | status | prio | depends_on | current_phase | plan_file |
| --- | --- | --- | --- | --- | --- | --- |
| V83 | Architektur SessionRuntime und Plattform-Capabilities | done | P1 | V74.99 | 83.99 | `docs/plaene/alt/V83.md` |
| V84 | Headless MatchKernel und einheitliche GameMode-API | done | P2 | V83.99 | 84.99 | `docs/plaene/alt/V84.md` |
| V85 | Persistence-, Content-Contracts und Schema-Migrationen | done | P2 | V83.99 | 85.99 | `docs/plaene/aktiv/V85.md` |
| V87 | Runtime-Hardening-Followup | done | P2 | V83.99 | 87.99 | `docs/plaene/aktiv/V87.md` |
| V88 | Testarchitektur und Verifikationsvertraege | done | P2 | V87.99 | 88.99 | `docs/plaene/aktiv/V88.md` |
| V89 | Desktop-first Testarchitektur und Desktop-Verifikation | done | P1 | V74.99,V88.99 | 89.99 | `docs/plaene/aktiv/V89.md` |
