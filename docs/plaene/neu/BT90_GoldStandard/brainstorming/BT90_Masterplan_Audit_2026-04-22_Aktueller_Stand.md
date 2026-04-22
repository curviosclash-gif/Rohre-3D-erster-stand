# BT90 Masterplan Audit 2026-04-22 - Aktueller Stand

> [!CAUTION]
> **Gesamtnote: 4+ / C+**
> BT90 ist heute deutlich strukturierter und sinnvoller als die aelteren Audits behaupten. Aber genau dadurch werden die verbleibenden Fehler ernster: Der Draft ist nicht mehr am groben Chaos gescheitert, sondern an subtileren Planungsfehlern. Der groesste Restschaden liegt heute in der Kettenlogik `BT103 -> BT104 -> BT105`, in zu weichen Gates und in einem letzten Block, der eher Handoff-Memo als echter Umsetzungsblock ist.

---

## TEIL 1: HARTE HAUPTBEFUNDE

### 1.1 BLOCKER: Die Blockkette ist logisch nicht sauber

Das aktuell groesste Problem ist nicht mehr die Grundidee, sondern die Freigabelogik zwischen den Spaetbloecken.

- `BT103` darf laut Abschluss-Gate sauber mit `hold` enden.
- `BT104` haengt aber nur an `BT103.99`, nicht an einem tatsaechlich vorhandenen gefrorenen PPO-Kandidaten.
- Damit kann die Kette formal weiterschalten, obwohl der fachliche Input fuer `BT104` fehlt.

Dasselbe Muster kommt eine Stufe spaeter noch einmal:

- `BT104` erzeugt die Urteile `promote|hold|rollback`.
- `BT105` haengt trotzdem nur an `BT104.99`, nicht an einem positiven Urteil.
- Der letzte Block heisst aber "Integrations-Handoff und DQN-Sunset-Vorbereitung" und wirkt damit semantisch wie ein Fortschrittsblock in Richtung Integration.

Das ist kein kleiner Modellierungsfehler. Das ist eine falsche Abhaengigkeitssemantik.

**Urteil:** Der Draft modelliert "Block abgeschlossen" dort, wo er eigentlich "fachliche Freigabe erhalten" modellieren muesste.

### 1.2 KRITISCH: Die Verifikation ist zu generisch und fuer RL-Arbeit zu weich

Der Plan imitiert das VXX-Schema inzwischen formal recht gut: Frontmatter, `scope_files`, `verification`, `updated_at`, DoD und Risiken sind vorhanden.

Der eigentliche Haken:

- In allen BT100-BT105-Bloecken bestehen die `verification`-Eintraege fast nur aus
  - `npm run plan:check`
  - `npm run docs:sync`
  - `npm run docs:check`
  - `npm run build`
- Diese Kommandos pruefen Governance und Repo-Hygiene.
- Sie pruefen aber fast keinen Kern der behaupteten Blockziele.

Beispiele:

- BT100 behauptet Contract-PoC, deterministische 100 Steps und Hardwareprofiling.
- BT101 behauptet stabiles `gymnasium.Env`, Space-Validierung und Multi-Env-Smokes.
- BT102 behauptet Checkpoint-, Eval- und Resume-Reproduzierbarkeit.
- BT104 behauptet belastbare A/B-Evidence.

Dafuer fehlen in `verification:` die blocknahen Befehle.

**Urteil:** Die Gates sehen sauber aus, tragen aber den eigentlichen technischen Wahrheitsanspruch der Bloecke noch nicht.

### 1.3 KRITISCH: BT104 ist besser eingerahmt, aber als Entscheidungsblock immer noch zu weich

Im Vergleich zu den aelteren Fassungen ist BT104 klar verbessert:

- `BT80C 80.9.3` ist nur noch Soft-Dependency.
- `bot:validate` ist nur Zusatzsignal.
- drei gueltige Vergleichspaesse und medianbasierte Auswertung sind sauberer als frueher.

Trotzdem bleibt BT104 der schwachste fachliche Kernblock.

Die Hauptprobleme:

- Es gibt keine harte Effekt-Schwelle fuer `promote`.
- "plausibel mindestens gleichwertig bei besserer Stabilitaet" ist zu weich fuer eine Promotionssprache.
- Es fehlt eine klare Tie-/No-decision-Regel.
- `rollback` ist als Begriff vor produktiver Integration semantisch schief. Vor dem Rollout gibt es nichts zurueckzurollen; gemeint ist eher `reject` oder `do-not-promote`.

Im aktiven Bot-Trainingsplan ist die Sprache hier haerter und operativer:

- drei reproduzierbare Validation-Paesse,
- feste Lane-Logik,
- `hold-champion` bzw. `manual-promotion-required`.

**Urteil:** BT104 ist als Evidence-Block brauchbar, aber noch nicht als belastbares Entscheidungsregime.

### 1.4 KRITISCH: BT105 ist kein gleichwertiger Kernblock

BT105 ist nicht sinnlos. Aber als letzter Block in einer linearen Sechserkette ist er schwach zugeschnitten.

BT100 bis BT104 sind echte Arbeitsbloecke:

- Bootstrap
- Environment
- Baseline
- Ablation/Freeze
- Vergleich

BT105 ist dagegen fast nur noch:

- Touchpoint-Matrix
- Rollout-/Rollback-Regeln
- Folgebacklog
- Intake-Handoff

Das ist eher ein Handoff-Dossier als ein Umsetzungsblock.

Zusatzproblem:

- BT105 ist hart an `BT80C 80.9.3` gekoppelt.
- Fuer einen echten produktiven Sunset-Handoff ist das nachvollziehbar.
- Fuer einen reinen Integrations-Vorbereitungsblock ist die Haerte fragwuerdig.

Ein Handoff-Dokument koennte auch mit roter Validation-Lane wertvoll sein, wenn es diese Rotphase sauber als Restblocker dokumentiert.

**Urteil:** BT105 ist heute eher Appendix in Blockverkleidung als echter Schlussblock derselben Kategorie.

### 1.5 KRITISCH: Der Draft ist als Paket ueberdokumentiert und als Intake-Landung unterdefiniert

BT90 hat heute:

- Root-README
- eigenen Intake-Master
- sechs Blockdateien
- session-uebergreifendes Risiko-Register
- sechs Vertiefungs-Prompts
- Brainstorming-Archiv mit mehreren Audits, Rechecks und Strategiepapieren

Das ist fuer einen noch unbewiesenen Zweitpfad sehr viel planerische Oberflaeche.

Gleichzeitig fehlt ein Punkt, den eure normalen Intake-Drafts oft klarer benennen:

- Wie lautet die spaetere aktive Landing-Zone?
- Welche Block-IDs sollen im echten `docs/bot-training/Bot_Trainingsplan.md` uebernommen werden?
- Unter welchen formalen Bedingungen wird aus BT90 eine echte Uebernahme statt nur "spater vielleicht"?

**Urteil:** Zu viel Metastruktur fuer einen noch unbewiesenen Feasibility-Pfad, aber zu wenig klare Intake-Landungslogik fuer den spaeteren Uebergang.

### 1.6 KRITISCH: Es bleiben fachliche Unklarheiten in Observation-, Telemetrie- und No-Touch-Ownership

Der Draft hat den groben Widerspruchsballast weitgehend entfernt. Ganz sauber ist er trotzdem nicht.

Konkrete Reststellen:

- BT101 nennt `ObservationSchemaV1.js` und `ObservationSchemaV2.js`, bleibt aber bei der Frage zu weich, welches Schema fuer den PPO-Pfad am Ende authoritative ist, falls Transport und Schema nicht ganz deckungsgleich sind.
- BT101/BT102/offene Risiken bauen auf Telemetrie wie `rewardBreakdown`, `terminalReason`, `truncatedReason`, `hybridDecision` und Veto-Hinweisen auf, ohne bereits im Plan zu zeigen, welche Felder wirklich end-to-end gesichert transportiert werden.
- Der Master verspricht einen stark gekapselten Sidecar-Pfad, zieht aber trotzdem Root-Surfaces wie `package.json` und `scripts/training-headless-*.mjs` in den Scope.

Das ist alles nicht toedlich. Aber es ist genau die Sorte Restunschaerfe, die spaeter zu "eigentlich wollten wir read-only bleiben, mussten dann aber doch am Tooling drehen" fuehrt.

**Urteil:** Die fachlichen Restfehler sind heute subtiler, aber noch vorhanden.

---

## TEIL 2: ABGLEICH MIT DEM UMSETZUNGSPLAN UND DEM AKTIVEN BOT-TRAININGSPLAN

### 2.1 Was BT90 inzwischen sichtbar gut uebernimmt

Hier hat sich der Draft klar verbessert und muss fair bewertet werden.

- Der Master ist heute ein kompakter Index und nicht mehr der fruehere Pseudo-Superplan.
- Die Blockdateien nutzen Frontmatter mit `id`, `status`, `depends_on`, `scope_files`, `verification`, `updated_at`.
- `Nicht-Ziel`, DoD und Risiken sind pro Block sauber getrennt.
- Die README markiert BT90 klar als Intake-Draft.
- Der bestehende Bot-Trainingsplan bleibt explizit die einzige aktive Quelle.
- Headless-first und no-touch/read-only sind als Leitplanke mittlerweile konsistent sichtbar.

Das ist naeher am echten Projektschema als die alten Audits noch annehmen.

### 2.2 Wo BT90 trotzdem negativ abweicht

| Punkt | Umsetzungsplan / aktive Plaene | BT90 aktuell | Bewertung |
| --- | --- | --- | --- |
| Master-Rolle | kompakter Index mit klarer Landing-Logik | kompakter Index, aber spaetere aktive Uebernahme bleibt formell diffus | mittel |
| Block-Gates | `verification` ist meist direkt am Blockkern orientiert | `verification` ist zu stark auf globale Repo-Gates reduziert | schlecht |
| Abhaengigkeitssemantik | Abschluss und fachliche Freigabe sind meist deckungsgleich | `BT103.99` und `BT104.99` koennen trotz negativem Ergebnis die Kette weiter oeffnen | schlecht |
| Blocktyp-Konsistenz | aktive Bloecke sind ueberwiegend gleichartige Umsetzungsbloecke | BT105 ist eher Handoff-Memo als Kernblock | schlecht |
| Intake-Handoff | Feature-Drafts nennen Ziel-Master, Vorschlags-ID und manuellen Intake explizit | BT90 nennt die spaetere Uebernahme nur grob, aber nicht operativ genug | mittel bis schlecht |
| Meta-Doku | Historie vorhanden, aber meist klar von operativer Sicht getrennt | Brainstorming-Audits und Rechecks koennen sich gegenseitig ueberholen | mittel |

### 2.3 Der entscheidende Unterschied

Der Umsetzungsplan und die besseren aktiven VXX-Bloecke sind betriebsnah.
BT90 ist trotz guter Struktur immer noch vor allem ein Design- und Governance-Draft.

Das ist nicht automatisch schlecht.
Es bedeutet aber:

- BT90 ist heute lesbar und argumentativ stark,
- aber noch nicht gleich robust in seiner operativen Schliesslogik.

**Urteil:** BT90 ist nicht chaotisch. Er ist nur noch nicht hart genug.

---

## TEIL 3: BEWERTUNG DER EINZELNEN BESTANDTEILE

### 3.1 Master / Root-Struktur

**Note: 3 / B-**

Positiv:

- kompakter Master
- klare Blockfolge
- read-only-/headless-first-Leitplanken
- saubere Trennung von Root, Bloecken, Risiken und Prompts

Negativ:

- zu viel Gesamtpaket fuer einen noch unbewiesenen Pfad
- spaetere Uebernahme in den aktiven Bot-Trainingsplan ist nicht scharf genug modelliert

### 3.2 BT100: Python-Bootstrap und Headless-Contract-PoC

**Note: 2 / B**

Positiv:

- sinnvoller Einstieg
- sauberer Fokus auf Sidecar statt Produktivumschaltung
- harte No-Touch-Leitplanke
- ehrliche Downgrade-Logik bei Worker-Skalierung

Negativ:

- Profiling fuer 1, 2 und 4 Worker sitzt sehr frueh im Plan
- Root-Tooling (`package.json`, Helper-Skripte) schwimmt staerker mit, als die No-Touch-Rhetorik vermuten laesst
- `verification` bildet die Kernbehauptungen nicht ab

### 3.3 BT101: Headless Gymnasium Environment

**Note: 3 / B-**

Positiv:

- guter Adapter-Gedanke statt zweitem fachlichen Kernel
- klare JS-authoritative Regel fuer Reward-, Done- und Curriculum-Semantik
- sinnvoller Single-Env-zuerst-Zuschnitt

Negativ:

- Observation-Authority zwischen `ObservationSchemaV1`, `ObservationSchemaV2` und realem Transport ist noch nicht scharf genug
- Telemetrie-/Veto-Felder werden als wichtig vorausgesetzt, obwohl ihre Transportreife noch selbst als Risiko auftaucht
- Multi-Env bleibt als Leistungserwartung im Block, bevor der echte Single-Env-Pfad bewiesen ist

### 3.4 BT102: PPO-Baseline-Training

**Note: 3- / B-**

Positiv:

- konservativer Zuschnitt
- Reproduzierbarkeit, Resume und Artefaktpaket werden ernst genommen
- Vorvergleich gegen DQN bleibt explizit kein Rolloutsignal

Negativ:

- die Step-Ziele wirken noch immer halb aus der Luft gegriffen, solange BT100/BT101 noch keine echten Throughput-Daten geliefert haben
- `verification` ist fuer einen Reproduzierbarkeitsblock zu schwach
- der Block lebt stark von Telemetrie- und Vergleichsannahmen, die noch nicht praktisch verifiziert sind

### 3.5 BT103: Hyperparameter, Curriculum, Candidate Freeze

**Note: 4 / C**

Positiv:

- kleine statt endloser Ablationsmatrix
- `hold` als ehrliches Ergebnis ist richtig
- Candidate-Freeze wird nicht nur als Checkpoint verstanden

Negativ:

- die Blockgrenze zu BT104 ist unsauber
- BT103 ordnet den Kandidaten schon gegen DQN ein, obwohl BT104 genau fuer die externe A/B-Evidence da ist
- der Block darf mit `hold` enden, ohne dass die Kette danach logisch sauber stoppt

### 3.6 BT104: Externe A/B-Validation und Promotions-Evidence

**Note: 5 / D**

Positiv:

- feste Matrix
- mindestens drei gueltige Vergleichspaesse
- invalidierte Paesse werden nicht still mitgezaehlt
- `bot:validate` nur als Zusatzsignal

Negativ:

- Bewertungsregel noch zu weich
- kein sauberer numerischer Promote-Schwellenwert
- kein klarer Sprachgebrauch fuer "vor Integration ablehnen" statt `rollback`
- BT104 kann formal sauber schliessen, ohne dass daraus eine eindeutige Folgelogik fuer BT105 entsteht

### 3.7 BT105: Integrations-Handoff und DQN-Sunset-Vorbereitung

**Note: 5- / D-**

Positiv:

- trennt Self-Play sauber aus dem Kernpfad
- haelt User-Entscheid und separaten Integrationsblock als Pflicht fest
- benennt Touchpoints und Sunset-Bedingungen offen

Negativ:

- als Blocktyp zu duenn
- zu dokumentarisch fuer einen linearen Kernblock
- harte BT80C-Abhaengigkeit ist fuer einen Handoff-Block mindestens diskussionswuerdig
- die Kette endet hier in Planung ueber Planung statt in einer klaren technischen Freigabelogik

### 3.8 Prompt-System

**Note: 2- / B**

Positiv:

- deutlich konsistenter als viele Planpakete
- headless-first, intake-only und no-touch werden sauber gespiegelt
- gute Gegensteuerung gegen alte Electron- und Aktiv-Master-Ideen

Negativ:

- das Prompt-System stabilisiert den Draft gut, kann aber die schwache Blockkette nicht heilen

### 3.9 Risiko-Register und Gates

**Note: 4 / C-**

Positiv:

- session-uebergreifende Risiken sind sichtbar
- per-Block-Risiken sind insgesamt brauchbar

Negativ:

- die haertesten Probleme liegen nicht im Risiko-Register, sondern in der Logik der Blockfolge
- Gates sind zu dokumentarisch und zu wenig befehlsnah
- mehrere Wahrheitsflaechen fuer Risiken und Kritik machen das Paket schwerer als noetig

---

## TEIL 4: KONKRETE UNLOGISCHE ODER SCHWACHE AUSSAGEN

### 4.1 `BT103.99` ist als Dependency-Ziel zu grob

Wenn `BT103` mit `hold` endet, gibt es gerade keinen eingefrorenen Kandidaten fuer `BT104`.
Trotzdem reicht `BT103.99` formal als Abhaengigkeit.

**Urteil:** Das ist eine echte Kettenlogik-Luecke.

### 4.2 `BT104` verwendet `rollback` im falschen Lebenszyklus

Vor produktiver Integration ist `rollback` der falsche Begriff.
Es gibt nichts, was bereits produktiv ausgerollt wurde.

**Besser waere:** `reject`, `do-not-promote` oder `discard-candidate`.

### 4.3 `BT104.99` ist nicht dasselbe wie "Integration sinnvoll vorbereitet"

Ein sauber abgeschlossenes BT104 mit Urteil `hold` oder `rollback` kann nicht dieselbe Folge freischalten wie ein sauberes `promote`.

**Urteil:** Hier fehlt eine verdict-sensitive Verzweigung statt einer reinen Phasenfreigabe.

### 4.4 BT105 ist wahrscheinlich zu hart an `BT80C 80.9.3` gekoppelt

Wenn BT105 wirklich nur vorbereiten und dokumentieren soll, kann es die rote Validation-Lane auch als offenen Restblocker dokumentieren.
Als harte Vorbedingung wirkt `BT80C 80.9.3` eher wie eine Freigabebedingung fuer einen spaeteren Rollout-Block als fuer den Handoff selbst.

### 4.5 "No-Touch" ist etwas sauberer behauptet als praktisch abgesichert

Der Plan sagt Sidecar und read-only gegen produktive Surfaces.
Gleichzeitig liegen Root-JS-Skripte und `package.json` im Scope.

Das ist nicht automatisch falsch.
Aber es ist weniger isoliert, als die Rhetorik vermuten laesst.

### 4.6 Die aeltere Kritik ist teilweise selbst schon veraltet

Wichtig fuer die Fairness:

- Der heutige Draft nennt sich nicht mehr als eigener aktiver Bot-Master.
- Der heutige Draft ist klar headless-first.
- Die Blockdateien sind inzwischen formal deutlich naeher am VXX-Schema.

Die neue Kritik muss deshalb haerter auf die echten Restfehler gehen und darf nicht die alten, bereits korrigierten Punkte nachbeten.

---

## TEIL 5: NOTENMATRIX

| Bestandteil | Note | Urteil |
| --- | --- | --- |
| Sinnhaftigkeit der Grundidee | 2- | strategisch plausibel und deutlich besser als die Ursprungsidee |
| Vergleich mit Umsetzungsplan-Schema | 3- | formal nah dran, operativ noch nicht hart genug |
| Governance / Intake-Einordnung | 3 | inzwischen sauber, aber Landing-Logik noch diffus |
| Master- und Root-Struktur | 3 | ordentlich, aber zu viel Planungsoberflaeche |
| BT100 | 2 | guter Bootstrap-Block |
| BT101 | 3 | sinnvoll, aber noch nicht ganz scharf in Schema- und Telemetry-Authority |
| BT102 | 3- | brauchbarer Baseline-Block mit zu weichen Verifikationen |
| BT103 | 4 | solide Idee, aber unsauber zur Folgekette abgegrenzt |
| BT104 | 5 | methodisch noch zu weich fuer eine harte Promotionsrolle |
| BT105 | 5- | eher Dossier als echter Schlussblock |
| Prompt-System | 2- | einer der staerksten Teile des Pakets |
| Risiko-Register / Gates | 4 | brauchbar, aber nicht die Stelle, an der die haertesten Probleme geloest werden |
| Dokumentationshygiene / Freshness | 4- | der Draft ist weiter als Teile seiner Meta-Doku |

---

## TEIL 6: KLARE EMPFEHLUNG

### 6.1 Was ich mit diesem Stand nicht tun wuerde

- BT90 nicht als bereits intake-reifen Komplettpfad behandeln.
- BT104 nicht als echtes Promotionsregime verkaufen.
- BT105 nicht als gleichwertigen Kernblock neben BT100-BT104 lesen.
- Die spaeten Freigaben nicht weiter nur an `*.99` statt an fachliche Urteile haengen.

### 6.2 Was ich als naechstes tun wuerde

1. **Kettenlogik reparieren**
   `BT104` darf nicht nur an `BT103.99`, sondern an einen vorhandenen Freeze-/Kandidatenzustand gekoppelt sein.
   `BT105` darf nicht nur an `BT104.99`, sondern muss verdict-sensitiv auf `promote` reagieren oder als reiner No-go-Handoff neu geschnitten werden.

2. **`verification` pro Block haerten**
   BT100-BT105 brauchen jeweils blocknahe Kernbefehle, nicht nur globale Repo-Gates.

3. **BT104 operationalisieren**
   klare Promote-Schwellen, Tie-Regeln, Ablehnungsbegriff statt `rollback`, sauberer Vergleich zu BT80C-Sprache.

4. **BT105 umetikettieren oder aus der Kernkette ziehen**
   Entweder als Appendix/Handoff oder als eigener Folge-Intake. In der aktuellen Form traegt der Block die lineare Kette nicht.

5. **Intake-Landung explizit machen**
   Ziel-Master, spaetere Block-IDs, Uebernahmebedingungen und manuelle Intake-Regeln klarer formulieren.

### 6.3 Endurteil

Der Plan ist **sinnvoll**.
Der Plan ist **strukturiert**.
Der Plan ist **nicht chaotisch**.

Aber:

- die eigentliche Freigabelogik ist noch nicht sauber,
- die Gates sind fuer RL-Arbeit zu weich,
- und der letzte Drittel des Plans ist deutlich schwaecher als der Anfang.

Die haerteste faire Kurzfassung lautet deshalb:

**Guter Draft mit echter Richtung. Noch kein belastbarer End-to-End-Plan.**
