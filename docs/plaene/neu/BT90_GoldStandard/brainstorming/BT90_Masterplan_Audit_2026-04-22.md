# BT90 Masterplan Audit 2026-04-22

> [!CAUTION]
> **Gesamtnote: 4- / C-**
> Der BT90-Draft ist deutlich besser als der verworfene Ursprung, aber immer noch **nicht aktivierungsreif**. Die ersten drei Bloecke sind brauchbar ausgearbeitet, doch Governance, Cross-Plan-Einordnung, Blockreife ab BT103 und mehrere technische Annahmen sind noch zu schwach oder logisch unsauber.

---

## TEIL 1: BLOCKER UND HAUPTBEFUNDE

### 1.1 BLOCKER: Der Draft baut sich faktisch einen dritten Masterplan

Der staerkste strukturelle Fehler ist nicht technisch, sondern planerisch.

- `docs/bot-training/Bot_Trainingsplan.md` nennt sich die **einzige aktive Quelle fuer Bot-Training**.
- `.agents/rules/planning_and_governance.md` nennt denselben Plan die **sole source** fuer Bot-Training-Phasen.
- `docs/Umsetzungsplan.md` bestaetigt explizit, dass Bot-Training **ausschliesslich** dort geplant und verfolgt wird.
- BT90 nennt dagegen `BT_PPO_Migration_Masterplan.md` im eigenen Ordner den **aktiven Masterplan** und sagt, die PPO-Migrations-Phasen wuerden nur dort gepflegt.

Das ist kein kleiner Formfehler. Das ist ein Governance-Bruch. Der Draft ist damit gleichzeitig Intake und eigener Parallel-Master. Genau dieses Muster soll die bestehende Planstruktur verhindern.

**Urteil:** Solange BT90 in `docs/plaene/neu/` lebt, darf es kein eigener aktiver Master sein. Es muss als Intake-Draft behandelt werden, nicht als dritte operative Wahrheitsquelle.

### 1.2 BLOCKER: BT103-BT105 sind keine vollwertigen Blockplaene

BT100, BT101 und BT102 sind relativ tief ausgearbeitet. Ab BT103 kippt das Niveau sichtbar weg:

- BT103-105 haben zwar Scope, DoD und knappe Risiko-Register.
- Es fehlen aber echte ausgearbeitete Phasen mit derselben Tiefe wie BT100-102.
- Die Detaildateien `BT103_...`, `BT104_...`, `BT105_...` sind im Kern Stubs mit Verweis zurueck auf den Master.

Damit entsteht ein inkonsistentes Paket:

- Vorne wird Produktionsreife simuliert.
- Hinten steht nur Absichtserklaerung.

Nach eurem normalen Arbeitsstil ist das schlecht, weil der Plan scheinbar fertig wirkt, operative Reife aber nur fuer die ersten Bloecke hat.

**Urteil:** BT103-BT105 duerfen in dieser Form hoechstens als Konzeptskizzen gelten, nicht als intake-faehige Blockplaene.

### 1.3 BLOCKER: BT104 haengt an einem bekannten kaputten Gate

Der Draft haengt BT104 hart an `BT80C 80.9.3`, also an einen bekannten Bot-Validation-Blocker:

- `docs/bot-training/Bot_Trainingsplan.md` dokumentiert offen, dass `bot:validate` in klassischen 3D-Matrizen weiterhin nicht sauber terminiert.
- BT90 macht denselben Harness trotzdem zur harten Vorbedingung fuer Promotion.
- Der dokumentierte manuelle Fallback ist kein gleichwertiger Ersatz fuer ein aktives Gate.

Ein A/B-Promotionsblock ohne stabiles objektives Gate ist kein Promotionsblock, sondern eine manuelle Sichtpruefung mit Tabellenkosmetik.

**Urteil:** BT104 ist aktuell logisch blockiert, nicht nur "spaeter". Der Draft behandelt das zu weich.

### 1.4 BLOCKER: Der Plan uebergewichtet Electron-Parallelisierung und untergewichtet vorhandene Headless-Infrastruktur

BT100/BT101 planen stark ueber:

- Python-WebSocket-Server
- mehrere parallele Electron-Clients
- `SubprocVecEnv`
- Port-Ranges
- Electron-Client-Manager

Das Repo besitzt aber bereits:

- `src/state/HeadlessMatchKernelRuntime.js`
- `src/core/MatchKernelTrainingAdapter.js`
- `src/entities/ai/training/DeterministicTrainingStepRunner.js`
- `scripts/headless-match-kernel-smoke.mjs`

Der Draft kennt den Headless-Pfad, behandelt ihn aber praktisch nur als Nebenoption und faellt dann wieder auf den teureren Electron/WebSocket-Faecher zurueck. Das ist planerisch schwach. Bevor man 4-5 Electron-Clients parallelisiert, muss sauber begruendet sein, warum der vorhandene Headless-Kern nicht der Primaerpfad ist.

**Urteil:** Der Plan wirkt hier zu sehr wie "neuen Stack auf vorhandenen Stack draufsetzen" statt "vorhandene Trainingsinfrastruktur maximal ausnutzen".

### 1.5 BLOCKER: BT101 enthaelt einen echten Vertragsbruch im eigenen Text

Im BT101-Block stehen zwei Aussagen nebeneinander, die nicht gleichzeitig stimmen koennen:

- Einmal wird entschieden, dass die Curriculum-Stage **Python-seitig** in `CurviosEnv` aufgeloest wird.
- Spaeter steht im selben Dokument, dass BT101 den Reward **JS-seitig as-is** konsumiert und die Python-Seite die Stage gerade **nicht** authoritative aufloest.

Das ist nicht nur unschoen formuliert. Das ist eine Semantikfrage:

- Wer besitzt den Reward-Vertrag?
- Wer besitzt den Curriculum-Stand?
- Wer ist bei Abweichung "wahr"?

Wenn so ein Widerspruch schon im Plan steht, baut der erste Implementierer fast garantiert auf die falsche Seite.

**Urteil:** Das ist eine konkrete logische Inkonsistenz, kein Stilproblem.

---

## TEIL 2: ABGLEICH MIT DEM UMSETZUNGSPLAN

### 2.1 Was BT90 gut vom Umsetzungsplan uebernimmt

Hier ist der Draft klar besser als der fruehere BT90-Ursprung:

- klare Block-IDs
- Abhaengigkeitstabelle
- Datei-Ownership
- DoDs pro Block
- Risiko-Register pro Block
- `scope_files`-Denke
- Evidence-Pflicht

Das ist sichtbar naeher an eurem normalen Planstandard als der alte "Gold Standard"-Entwurf.

### 2.2 Wo BT90 vom Umsetzungsplan negativ abweicht

Im Vergleich zu `docs/Umsetzungsplan.md` und dem aktiven Bot-Trainingsplan faellt BT90 in mehreren Punkten aus dem Raster:

| Punkt | Umsetzungsplan / aktive Plaene | BT90-Draft | Bewertung |
| --- | --- | --- | --- |
| Master-Rolle | genau ein aktiver Master je Stream | eigener "aktiver Master" im Intake-Ordner | schlecht |
| Intake-Logik | Draft bleibt Draft bis User-Intake | README nennt BT90 schon operativ | schlecht |
| Blockreife | aktive Bloecke haben kanonische Tiefe | BT103-105 nur teilvertieft | schlecht |
| Cross-Plan-Abhaengigkeiten | explizit, knapp, mit Erfuellungsstatus | vorhanden, aber teilweise noch Wunschlogik | mittel |
| Governance-Ton | kompakt, operativ, klar | teils zu narrativ, teils zu absolut | mittel |

### 2.3 Besonders unlogisch: Der Draft will parallel sein und gleichzeitig exklusiv sein

BT90 behauptet an einer Stelle sinngemaess:

- PPO laeuft parallel zum DQN-Pfad.

Gleichzeitig baut die Struktur aber:

- einen eigenen Master,
- eigene Session-Risiken,
- eigene Prompt-Fortschreibung,
- eigene Masterplan-Aktualisierungen,
- eigene "aktive" Terminologie.

Das ist die Logik eines Ersatz-Masters, nicht die Logik eines einfachen parallelen Intake-Pfads.

**Urteil:** BT90 ist organisatorisch nicht sauber als "paralleler Nebenpfad", sondern halb als eigener Stream-Master, halb als Intake formuliert.

---

## TEIL 3: STRUKTURBEWERTUNG DES DRAFTS

### 3.1 Masterplan-Struktur

**Note: 3- / B-**

Staerken:

- klare Gesamtgliederung
- erkennbare Reihenfolge BT100 -> BT105
- gute Trennung von Master, Bloecken, Risiken, Prompts
- file ownership und scope-denke sind sauberer als in vielen eurer aelteren Drafts

Schwaechen:

- der Begriff "aktiver Masterplan" ist im Intake-Kontext falsch
- spaetere Bloecke sind zu duenn im Vergleich zu den fruehen
- der Master wirkt vollstaendiger als er faktisch ist

### 3.2 BT100: Python-Bootstrap und PoC

**Note: 2- / B**

Positiv:

- konkrete IPC-Spezifikation
- saubere Deliverables
- gute Hardware-Profiling-Denke
- Risiken sind greifbar und operativ

Negativ:

- zu starker Fokus auf Electron-Client-PoC statt Headless-First-Pruefung
- GPU-/CUDA-Optimismus ist teilweise groesser als die Evidenzbasis
- der Block unterschlaegt, dass bereits ein Headless-Trainingspfad im Repo existiert

**Urteil:** Solider Feasibility-Block, aber architektonisch noch nicht hart genug gegen unnoetigen Electron-Ballast abgesichert.

### 3.3 BT101: Custom Gymnasium Environment

**Note: 4+ / C+**

Positiv:

- sehr gute Aufbereitung von Observation- und Action-Space
- brauchbare Risikobeschreibung
- Subphasen sind konkret genug, um umgesetzt zu werden

Negativ:

- Curriculum-Vertrag ist intern widerspruechlich
- die Action-Mapping-Erklaerung zu `useItem` ist semantisch unsauber
- der Plan baut direkt auf Multi-Client-Electron-Orchestrierung, obwohl genau dort im Bot-Trainingsplan schon reale Stabilitaetsprobleme dokumentiert sind

**Urteil:** Inhaltlich stark, aber logisch noch nicht geschlossen.

### 3.4 BT102: PPO-Baseline-Training

**Note: 3 / B-**

Positiv:

- deutlich besser als der alte BT90-Ursprung
- Hyperparameter, VecNormalize, Artefakte und Reproduzierbarkeit werden wenigstens ernst genommen
- durchgehender Run-/Checkpoint-/Eval-Gedanke ist sauber

Negativ:

- etliche Telemetrie-Annahmen sind noch nicht hart im Runtime-Code geprueft
- der DQN-Vergleich bleibt zwangslaufig nur provisorisch
- die Zeitbudget-Annahmen wirken knapp, solange BT100.4 nur hypothetisch ist

**Urteil:** Als Forschungs-/Baseline-Block brauchbar. Als produktionsnaher Planblock noch zu unsicher in seinen Messannahmen.

### 3.5 BT103: Tuning, Curriculum, ONNX

**Note: 5 / D**

Positiv:

- die Zielrichtung ist richtig
- Feature-Flag und Inference-Isolation sind im Prinzip gute Leitplanken

Negativ:

- zu wenig ausgearbeitet
- ONNX, Runtime-Inference und Feature-Flag sind keine Restarbeiten, sondern ein eigenstaendiger Integrationsblock
- das Risiko-Register ist dafuer zu klein

**Urteil:** Der Block ist inhaltlich zu gross und planerisch zu klein beschrieben.

### 3.6 BT104: A/B-Validation und Promotion

**Note: 5 / D**

Positiv:

- gleiche Matrix fuer PPO und DQN ist der richtige Anspruch

Negativ:

- haengt an einem instabilen oder noch offenen Gate
- manueller Fallback ist zu weich
- Promotion-Regeln sind fachlich zu grob
- Signifikanz wird angedeutet, aber nicht operationalisiert

**Urteil:** Als Produktionsgate aktuell nicht belastbar.

### 3.7 BT105: Self-Play

**Note: 5- / D-**

Positiv:

- Frozen-Pool ist deutlich realistischer als ein volles League-System

Negativ:

- immer noch kaum ausgearbeitet
- Nutzen ist fuer die aktuelle Projektlage nicht sauber priorisiert
- Self-Play ist der falsche Ort fuer Plan-Knappheit; genau dort braucht man harte Semantik, Snapshot-Regeln und klare Abbruchkriterien

**Urteil:** Der Block ist aktuell eher Zukunftsidee als umsetzbarer Plan.

---

## TEIL 4: KONKRETE UNLOGISCHE ODER SCHWACHE AUSSAGEN

### 4.1 "Aktiver Masterplan" im Intake-Ordner

Das ist die unlogischste Aussage des gesamten Pakets.

- Wenn der Draft in `docs/plaene/neu/` liegt, ist er per Definition Intake.
- Wenn er "aktiver Masterplan" sein soll, ist er am falschen Ort und im Konflikt mit dem aktiven Bot-Trainingsplan.

Das ist kein wording issue. Das ist ein Rollenfehler.

### 4.2 "Headless ist nur Nebenpfad" trotz vorhandener Headless-Adapter

BT100 formuliert den Headless-Kern sinngemaess als etwas, das erst noch fuer die Bridge angepasst werden muesse. Gleichzeitig existieren aber bereits Headless-Laufzeit und Trainingsadapter im Repo.

Das heisst nicht automatisch, dass Headless sofort der perfekte PPO-Pfad ist. Aber der Draft argumentiert diese Abwaegung nicht sauber. Er faellt zu schnell auf Electron und Port-Orchestrierung zurueck.

### 4.3 `useItem`-Semantik ist zu locker beschrieben

Im BT101-Action-Mapping wird `useItem: 0` praktisch wie "aktiver Slot" dargestellt. Im laufenden Code ist `useItem` jedoch ein konkreter Inventory-Index, der geclamped und direkt konsumiert wird.

Das ist klein, aber gefaehrlich:

- fuer jemanden ausserhalb des Codes klingt "0" wie generisches "nutze aktuelles Item"
- technisch ist es Slot 0 bzw. ein expliziter Indexvertrag

**Urteil:** Kein riesiger Blocker, aber ein echter Semantikschlupf.

### 4.4 Die KPI-Zielwerte sind ambitioniert, aber als Plan-Leitwerte zu wenig geerdet

`3x averageBotSurvival` und `+200% avgStepsPerEpisode` koennen als Fernziel legitim sein.

Als oberste Leit-KPI eines Drafts mit:

- kaputtem Promotions-Harness,
- noch ungeklaertem Trainingspfad,
- unbewiesenem PPO-Env,
- unklarer Electron-Skalierung

wirken sie aber zu gross fuer den aktuellen Reifegrad. Es fehlen Zwischenziele, die realistischer an die vorhandene Datenlage andocken.

### 4.5 Dokumentations-Freshness ist schon im Draft nicht stabil

Konkretes Beispiel:

- `README.md` nennt `003_BT102_Vertiefung.md` noch als "naechsten Schritt".
- Im Ordner liegt aber bereits `004_BT103_Vertiefung.md`.

Das ist klein, aber aufschlussreich. Wenn ein Draft schon im Entstehungsprozess seine eigene Fortschreibung nicht sauber haelt, ist die Gefahr gross, dass spaeter Prompts, Blockstatus und Master auseinanderlaufen.

---

## TEIL 5: RISIKOREGISTER, DoD, GATES

### 5.1 Risiko-Register

**Note: 3- / B-**

Besser als frueher:

- konkrete IDs
- Trigger
- Mitigation
- Ownership

Aber:

- die kritischsten Risiken liegen oft nicht im Register, sondern in den Querverweisen
- Cross-Plan-Risiken werden benannt, aber operativ nicht hart genug behandelt
- BT103-105 haben fuer ihre Groesse zu schmale Risiko-Register

### 5.2 DoD und Gates

**Note: 4 / C-**

Positiv:

- deutlich pruefbarer als der alte BT90
- mehr echte PASS/FAIL-Kriterien

Negativ:

- spaetere Bloecke sind zu allgemein
- Promotion-/A/B-Gates haengen an einem kaputten externen Gate
- einige Kriterien haengen an Metriken, die im aktuellen Runtime-Payload noch gar nicht voll gesichert sind

### 5.3 Evidence-Qualitaet

**Note: 3 / B-**

Die Evidence-Disziplin ist gut gemeint und meist brauchbar. Allerdings bleibt ein Teil der Evidence-Logik noch zu sehr auf "Command + Output" stehen, waehrend fuer echte RL-Abnahme oft Artefakt-Konsistenz, Vergleichsbasis und Semantik-Freeze wichtiger sind als bloss ein PASS-Log.

---

## TEIL 6: NOTENMATRIX

| Bestandteil | Note | Urteil |
| --- | --- | --- |
| Governance / Einordnung | 5 | derzeit der groesste strukturelle Fehler |
| Vergleich mit Umsetzungsplan | 5 | uebernimmt Form, verletzt aber Source-of-Truth-Logik |
| Masterplan-Struktur gesamt | 3- | vorne stark, hinten deutlich zu duenn |
| BT100 | 2- | guter PoC-Block mit falscher Primaerarchitektur-Tendenz |
| BT101 | 4+ | fachlich stark, logisch noch nicht sauber |
| BT102 | 3 | brauchbarer Baseline-Block |
| BT103 | 5 | zu klein geplant fuer den Scope |
| BT104 | 5 | auf kaputtem Gate aufgebaut |
| BT105 | 5- | eher Idee als echter Plan |
| Risiko-Register gesamt | 3- | solide, aber ungleichmaessig |
| DoD / Gates | 4 | teilweise belastbar, spaeter zu weich |
| Dokumentationshygiene / Freshness | 4 | erste Drift schon sichtbar |

---

## TEIL 7: KLARE EMPFEHLUNG

### 7.1 Was ich mit dem Plan NICHT tun wuerde

- nicht als aktiven Stream-Master uebernehmen
- nicht in den Bot-Trainingsplan intaken, solange BT103-105 nur Halb-Stubs sind
- nicht auf Electron-Parallelisierung festlegen, bevor der Headless-Pfad hart bewertet ist
- nicht BT104 als echtes Promotionsgate verkaufen, solange `bot:validate` auf BT80C-Ebene offen ist

### 7.2 Was ich mit dem Plan als naechstes tun wuerde

1. Governance reparieren
   BT90 klar als Intake-Draft markieren, nicht als aktiven Master.

2. BT103-BT105 auf dasselbe Detailniveau wie BT100-BT102 bringen
   Sonst bleibt das Paket unausgewogen und intake-unreif.

3. BT101-Widerspruch aufloesen
   Reward-/Curriculum-Ownership muss eindeutig sein.

4. Headless-vs-Electron als Architekturentscheidung explizit vorziehen
   Nicht stillschweigend den teureren Pfad zum Default machen.

5. BT104 an die Realitaet des Validation-Harness anpassen
   Entweder BT80C zuerst schliessen oder BT104 ehrlich als blockiert kennzeichnen.

### 7.3 Endurteil

Der Plan ist **nicht unsinnig**. Im Gegenteil: Er ist erstmals so strukturiert, dass man ihn ernsthaft diskutieren kann. Aber genau deshalb muss die Kritik hart sein.

BT90 ist aktuell:

- **formal deutlich besser** als der alte Entwurf,
- **inhaltlich in BT100-BT102 brauchbar**,
- **organisatorisch falsch eingerahmt**,
- **ab BT103 klar untervertieft**,
- **und fuer Aktivierung noch nicht sauber genug**.

Wenn ihr nur wissen wollt, ob der Draft "gut genug zum Loslegen" ist, ist die Antwort klar:

**Nein. Noch nicht.**
