# BT90 Masterplan Audit 2026-04-22 - BT100/BT101 Fokus

> [!CAUTION]
> **Gesamtnote: 4 / C**
> BT90 ist als Richtung sinnvoll, aber als ausfuehrbarer Plan immer noch schwaecher, als die saubere Oberflaeche vermuten laesst. Die groesste Enttaeuschung liegt nicht mehr in der Grundidee, sondern in der operativen Reife: `BT100` und vor allem `BT101` sehen bereits nach Blockplaenen aus, arbeiten aber in wichtigen Punkten noch wie Architektur-Memos statt wie echte VXX-Ausfuehrungsbloecke.

---

## TEIL 1: HARTE HAUPTBEFUNDE

### 1.1 KRITISCH: BT90 uebernimmt die VXX-Optik, aber nicht die VXX-Ausfuehrungsdisziplin

Der wichtigste Vergleich mit dem Umsetzungsplan faellt fuer BT90 schlechter aus, als es auf den ersten Blick aussieht.

Aktive VXX-Bloecke wie `V95` arbeiten mit:

- klaren Phasen
- nummerierten Subphasen
- Checkbox-Status
- Evidence direkt an jedem abgeschlossenen Punkt
- operativ belastbaren Nachweisen pro Teilziel

`BT100` und `BT101` uebernehmen davon nur die Huelse:

- Frontmatter
- `scope_files`
- `verification`
- DoD
- Risiko-Register

Was fehlt, ist der eigentliche Vollzug:

- keine nummerierten Subphasen wie `100.1.1`, `100.1.2`, `101.2.1`
- keine Checkboxen pro Arbeitspunkt
- keine vorbereitete Evidence-Struktur an den eigentlichen Unteraufgaben
- keine echte Statusfaehigkeit fuer Teilfortschritt

Damit sind `BT100` und `BT101` formal planartig, aber operativ klar schwaecher als ein echter aktiver Block.

**Urteil:** Das ist nicht derselbe Planstandard wie im Umsetzungsplan. Es ist nur dieselbe Verpackung.

### 1.2 KRITISCH: BT100 ist fuer einen Startblock immer noch zu breit und zu schwer

BT100 will gleichzeitig:

1. Python-Stack pinnen
2. den Contract `v1` gegen einen externen Sidecar beweisen
3. einen JS-Headless-Worker anbinden
4. 1-, 2- und 4-Worker-Profiling fahren

Das sind vier verschiedene Risikoklassen:

- Toolchain-/Install-Risiko
- Transport-/Contract-Risiko
- Headless-/Kernel-Adapter-Risiko
- Performance-/Parallelitaets-Risiko

Fuer einen "Wahrheitsblock" ist das zu viel Last in einem einzigen Startblock.
Wenn BT100 kippt, ist unklar, ob der eigentliche Fehler in Python, im Contract, im Worker-Harness oder nur im voreiligen Profiling liegt.

**Urteil:** BT100 ist der beste Block des Pakets, aber immer noch kein sauber kleiner Startblock.

### 1.3 KRITISCH: BT101 widerspricht seiner eigenen Minimalspur

BT101 behauptet an mehreren Stellen zurecht:

- zuerst `101.1` bis `101.3`
- zuerst Single-Env
- Vector-Env erst spaeter
- Mehr-Worker nur nach gruener Minimalspur

Aber derselbe Block fordert zugleich:

- `python/envs/vector_env.py` bereits im `scope_files`
- DoD.5 fuer `2 bis 4 Headless-Envs`
- Verifikation fuer `vector_env`
- Abschluss-Gate, das Mehr-Env explizit mitfordert

Das ist keine Kleinigkeit, sondern ein echter Strukturbruch.
Ein Block kann nicht gleichzeitig sagen "das hier ist Folgearbeit" und "ohne diese Folgearbeit schliesst der Block nicht".

**Urteil:** BT101 ist logisch nicht sauber geschnitten. Die behauptete Minimalspur ist im Gate-Design nicht wirklich minimal.

### 1.4 KRITISCH: Die Verifikation ist in BT100/BT101 teilweise formal, aber nicht sauber trennscharf

Die Verifikation ist besser als in den aelteren BT90-Fassungen, aber immer noch nicht hart genug.

Konkrete Probleme:

- In `BT100` wird ehrlicher Downgrade fuer 4 Worker erlaubt, die Verifikation verlangt aber trotzdem explizit `--workers 1,2,4`.
- In `BT101` steht als Verifikation `python -c "from gymnasium.utils.env_checker import check_env"`.
  Das prueft gar nichts. Das importiert nur eine Funktion.
- `BT101` verifiziert `vector_env`, obwohl der Text selbst sagt, dass genau dieser Teil erst nach stabiler Single-Env-Lage gezogen werden soll.

Das sind keine Stilfragen. Das sind echte Gate-Fehler.

**Urteil:** Teile der Verifikation sehen konkret aus, sind aber in mehreren Punkten logisch oder technisch unbrauchbar.

### 1.5 KRITISCH: Der Plan ist bei BT100 und BT101 strenger im Ton als in der tatsaechlichen Isolierung

BT90 verkauft den Zweitpfad stark als:

- sidecar-first
- headless-first
- read-only gegen produktive Surfaces
- ausserhalb des produktiven Runtime-Pfads

Tatsaechlich zieht schon `BT100` frueh Root-Surfaces in den Scope:

- `package.json`
- `scripts/training-headless-worker.mjs`

Und `BT101` zieht direkt Orchestrierungs- und Vector-Themen nach:

- `scripts/training-headless-worker.mjs`
- `python/envs/vector_env.py`

Das ist nicht automatisch falsch.
Aber die praktische Isolation ist schwaecher als die Rhetorik.

**Urteil:** Der Plan redet ueber einen stark gekapselten Pfad, arbeitet aber frueh mit repo-weiten Boundary-Dateien mit.

---

## TEIL 2: FOKUS AUF BT100

### 2.1 Was an BT100 wirklich gut ist

Das muss fair gesagt werden:

- BT100 startet am richtigen Ort, naemlich vor jeder Produktivumschaltung.
- Der Sidecar-Gedanke ist wesentlich sauberer als direkte Runtime-Integration.
- Headless-/Kernel-Pfad statt Electron-first ist die richtige Grundrichtung.
- Die No-Touch-Leitplanke ist sichtbar und diesmal nicht nur Dekoration.

Strategisch ist BT100 damit klar der staerkste Teil des gesamten BT90-Pakets.

### 2.2 Warum BT100 trotzdem deutlich ueberbewertet waere, wenn man ihn schon als "umsetzungsreif" liest

#### A. Bootstrap und RL-Stack werden zu frueh miteinander verkoppelt

BT100 will fuer einen Contract-PoC schon direkt:

- `stable-baselines3`
- `gymnasium`
- `torch`

mit in den Zielstack ziehen.

Das ist fuer einen echten Bootstrap zu schwer.
Ein sauberer Startblock sollte zuerst beweisen:

- Python laeuft
- Sidecar spricht Contract `v1`
- Headless-Worker liefert deterministische Transitions

Der eigentliche RL-Stack haette spaetestens ab BT101 oder BT102 Gewicht.
So koppelt der Plan den fruehesten Machbarkeitsbeweis direkt an den schwersten Installationspfad.

**Harte Kritik:** Der Block macht den fruehesten Wahrheitsbeweis unnoetig teuer.

#### B. Das "optionale" Worker-Skript ist in Wahrheit nicht optional

BT100 beschreibt `scripts/training-headless-worker.mjs` als optionalen Wrapper an der Boundary.
In der Praxis ist es aber:

- im `scope_files`
- in der Verifikation
- im PoC-Ablauf

Wenn Verifikation und Ablauf ohne dieses Skript nicht gedacht sind, ist es kein optionaler Wrapper, sondern ein Kernbestandteil des Blocks.

**Harte Kritik:** Der Text verschleiert hier die echte Abhaengigkeit.

#### C. Profiling kommt zu frueh und misst wahrscheinlich den falschen Wahrheitsgrad

BT100 will bereits 1, 2 und 4 Worker fuer BT101/BT102 "ehrlich vermessen".
Das klingt gut, ist aber fachlich nur bedingt belastbar:

- Zu dem Zeitpunkt existiert das echte Gym-Env noch nicht.
- PPO-Loop, VecEnv-Verhalten und Python-seitige Step-/Reset-Kosten sind noch gar nicht final da.
- Gemessen wird damit eher ein Contract-/Worker-PoC als der spaetere Trainingspfad.

Das heisst:

- als Infrastruktur-Signal ist das nuetzlich
- als Planungsgrundlage fuer BT102 nur eingeschraenkt belastbar

**Harte Kritik:** BT100 verkauft Vorprofiling zu leicht als brauchbare Entscheidungsbasis fuer spaetere PPO-Last.

#### D. Der Block ist zu gross fuer das, was er "Wahrheitsblock" nennt

Wenn ein Block "Wahrheitsblock" sein soll, muss er die riskanteste Hypothese moeglichst klein pruefen.
BT100 prueft aber nicht nur eine Hypothese, sondern fast den ganzen Infrastruktur-Unterbau auf einmal.

Ein saubererer Zuschnitt waere eher:

1. Python + Contract-Smoke
2. Headless-Adapter-Smoke
3. erst danach Profiling

BT100 mischt das bereits wieder in einem Block.

**Urteil zu BT100:** Guter Richtungsblock, aber noch zu gross, zu schwer und an einigen Stellen logisch unsauber.

### 2.3 Note fuer BT100

**Note: 3- / B-**

Begruendung:

- strategisch stark
- architektonisch plausibel
- operativ aber noch kein sauberer Startblock
- zu viel Scope fuer den ersten echten Wahrheitsbeweis

---

## TEIL 3: FOKUS AUF BT101

### 3.1 Was an BT101 wirklich gut ist

BT101 hat einige klar starke Punkte:

- Adapter-Denke statt zweitem fachlichen Kernel
- JS bleibt authoritative fuer Reward, `done`, `truncated` und Curriculum-Semantik
- Single-Env-zuerst ist als Leitidee richtig
- Headless-Pfad bleibt Grundannahme

Damit ist BT101 inhaltlich viel besser als viele typische "wir bauen mal schnell ein Gym-Env"-Plaene.

### 3.2 Warum BT101 trotz guter Grundidee der schwaechere der beiden Startbloecke ist

#### A. Minimalspur und Abschlusslogik passen nicht zusammen

Das ist der groesste Fehler in BT101.

Der Text sagt:

- erst Single-Env
- Mehr-Worker spaeter
- Vector-Env erst bei gruener Lage

Die operative Struktur sagt aber:

- `vector_env.py` gehoert schon in den Blockscope
- `vector_env` gehoert schon in die Verifikation
- DoD.5 verlangt 2 bis 4 Envs oder Downgrade
- `101.99` verlangt damit implizit schon eine Parallelitaetsentscheidung

Das ist genau die Art Widerspruch, die spaeter dazu fuehrt, dass ein angeblich "kleiner" Startblock doch wieder in Nebenbaustellen rutscht.

**Harte Kritik:** BT101 ist als Startblock unehrlich klein gerechnet.

#### B. Die `check_env`-Verifikation ist technisch falsch

Der Verifikationsbefehl

`python -c "from gymnasium.utils.env_checker import check_env"`

prueft kein Env.
Er importiert nur eine Funktion.

Damit ist einer der wichtigsten Verifikationspunkte des Blocks aktuell schlicht wertlos.

**Harte Kritik:** So etwas darf in einem Plan mit VXX-Anspruch nicht stehen.

#### C. Der Action-Contract ist unterreferenziert

BT101 spricht mehrfach darueber, dass Python exakt dasselbe JSON-Format fuer Aktionen verwenden soll wie der bestehende Contract.
Aber in den Referenzen fehlt die offensichtliche kanonische Action-Quelle:

- `src/entities/ai/actions/BotActionContract.js`

Gerade bei Themen wie:

- `useItem`
- Clamping
- Inventory-Index
- Invalid-Handling

ist das keine Nebensache.
Wenn der Block die Action-Sprache hart nicht neu erfinden will, dann muss er die zentrale Action-Contract-Datei auch explizit als Referenz fuehren.

**Harte Kritik:** BT101 redet ueber Contract-Treue, referenziert aber die wichtigste Action-Quelle nicht einmal.

#### D. Die Authority-Regel kapselt Drift, statt sie wirklich zu schliessen

BT101 sagt sinngemaess:

1. real transportierter Payload ist Wahrheit
2. dann Laufzeitfelder
3. dann statische Schemadateien

Das ist pragmatisch.
Aber es ist auch gefaehrlich.

Denn damit wird ein Drift zwischen:

- realem Transport
- Schema-Dateien
- Dokumentation

nicht als Contract-Problem behandelt, sondern als Adapterrealitaet akzeptiert.

Kurzfristig ist das bequem.
Langfristig ist es schlechtere Architekturhygiene.

**Harte Kritik:** Der Block droht Schema-Drift zu kapseln, statt sie sauber offenzulegen und zu entscheiden.

#### E. BT101 ist als Block schlicht zu gross

Selbst wenn man die Grundidee akzeptiert, enthaelt BT101:

- Validatoren
- Single-Env
- Reward-/Episode-Verifikation
- Mehr-Worker-Harness
- Vector-Env-Smokes
- Throughput-Bewertung
- BT102-Handover

Das ist kein kleiner Anschlussblock mehr.
Das ist bereits ein halber Folgepfad.

**Harte Kritik:** BT101 haette spaetestens nach `101.3` in einen neuen aktiven Block geschnitten werden muessen.

### 3.3 Note fuer BT101

**Note: 4+ / C+**

Begruendung:

- gute fachliche Grundidee
- aber klare innere Widersprueche
- kaputte Verifikation
- Scope deutlich zu gross fuer den behaupteten Minimalstart

---

## TEIL 4: ABGLEICH MIT DEM UMSETZUNGSPLAN

### 4.1 Was BT90 inzwischen sichtbar richtig macht

Der Draft ist heute deutlich reifer als fruehere Fassungen:

- Intake-Rolle ist klarer
- Bot-Trainingsplan bleibt aktive Quelle
- Master ist kompakter Index
- Blockdateien haben Frontmatter, DoD und Risiken
- Headless-first/read-only ist konsistenter formuliert

Das ist gut und muss anerkannt werden.

### 4.2 Wo BT100 und BT101 gegen den echten VXX-Standard abfallen

Im Vergleich zu aktiven Bloecken wie `V95` bleiben die Unterschiede deutlich:

| Punkt | Aktive VXX-Bloecke | BT100 / BT101 | Bewertung |
| --- | --- | --- | --- |
| Subphasen | nummeriert und evidence-faehig | nur beschreibende Bullet-Listen | schlecht |
| Statusfaehigkeit | `[ ]`, `[/]`, `[x]` pro Arbeitspunkt | nur `status: open` pro Phase | schlecht |
| Gate-Qualitaet | direkt mit Teilzielen verbunden | teilweise widerspruechlich oder technisch unbrauchbar | schlecht |
| Scope-Schnitt | haeufig enger und sequentieller | BT100 und BT101 laden zu viele Risikoklassen in einen Block | schlecht |
| Evidence-Hygiene | fuer Ausfuehrung vorbereitet | fuer spaetere Ausfuehrung erst nachzuschneiden | mittel bis schlecht |

### 4.3 Das eigentliche Urteil im Vergleich zum Umsetzungsplan

BT90 ist strukturiert.
Aber BT100 und BT101 sind noch keine Plaene in derselben operativen Qualitaet wie eure aktiven VXX-Bloecke.

Sie sind aktuell eher:

- gute Architektur- und Durchfuehrungsentwuerfe
- mit brauchbarer Richtung
- aber noch ohne dieselbe Vollzugsreife

**Urteil:** Gegen den Umsetzungsplan wirkt BT90 sauberer als frueher, aber immer noch zu weich und zu gross geschnitten.

---

## TEIL 5: KONKRETE UNLOGISCHE ODER SCHWACHE AUSSAGEN

### 5.1 BT100 erlaubt Downgrade, verifiziert aber trotzdem starr 4 Worker

Textlogik:

- 4 Worker duerfen ehrlich downgraded werden

Verifikationslogik:

- `--workers 1,2,4`

Das passt nicht zusammen.

### 5.2 BT100 nennt `scripts/training-headless-worker.mjs` optional, behandelt es aber als Pflichtbestandteil

Auch das ist eine echte Inkonsistenz:

- optional im Text
- verpflichtend in Scope und Verifikation

### 5.3 BT101 nennt Mehr-Env Folgearbeit, zieht Mehr-Env aber in DoD und Gate

Das ist der groesste Logikfehler von BT101.

### 5.4 BT101s `check_env`-Verifikation ist keine Verifikation

Der Befehl importiert nur.
Er testet nichts.

### 5.5 BT101 fordert exakten Action-Contract, ohne die kanonische Action-Contract-Datei zu referenzieren

Gerade bei `useItem` und Clamping ist das zu duenn.

### 5.6 BT101 behandelt moegliche Schema-Drift zu pragmatisch

Der Adaptergedanke ist sinnvoll.
Aber wenn reale Payloads und statische Schemata auseinanderlaufen, braucht es spaetestens im Plan eine haertere Entscheidung, nicht nur eine Prioritaetsliste fuer den Adapter.

---

## TEIL 6: NOTENMATRIX

| Bestandteil | Note | Urteil |
| --- | --- | --- |
| Sinnhaftigkeit der Grundidee | 2- | strategisch plausibel und deutlich besser als fruehere Fassungen |
| Governance / Intake-Rolle | 3 | inzwischen brauchbar eingerahmt |
| Vergleich mit Umsetzungsplan-Schema | 4 | gleiche Huelle, aber deutlich schwaechere Vollzugsreife |
| Master- und Root-Struktur | 3 | ordentlich, aber noch stark dokumentenlastig |
| BT100 strategischer Zuschnitt | 2- | richtiger Startort, gute no-touch-Richtung |
| BT100 operative Reife | 3- | zu breit, zu schwer, teilweise inkonsistent |
| BT101 fachlicher Zuschnitt | 3- | gute Adapter-Idee, aber unklarer Blockschnitt |
| BT101 operative Reife | 4+ | Minimalspur widerspricht Gate-Logik; Verifikation fehlerhaft |
| BT102-BT105 Kettenlogik | 3- | heute besser als frueher, aber nicht Fokusstaerke des Pakets |
| Verifikation / Gates gesamt | 4+ | teils konkret, teils logisch oder technisch kaputt |
| Dokumentationshygiene | 3 | insgesamt verbessert, aber noch nicht auf Aktivblock-Niveau |

---

## TEIL 7: KLARE EMPFEHLUNG

### 7.1 Was ich mit diesem Stand nicht tun wuerde

- BT100 nicht als "kleinen ersten Umsetzungsblock" verkaufen
- BT101 nicht in einem Stueck aktiv intaken
- BT101 nicht mit Multi-Env im selben Block schliessen wollen
- die aktuelle Verifikation von BT101 nicht als belastbares Gate akzeptieren

### 7.2 Was ich konkret nachschaerfen wuerde

1. `BT100` inhaltlich entschlacken
   Contract-/Sidecar-Smoke haerter vom spaeteren RL-Stack und vom Profiling trennen.

2. `BT100` Verifikation an den Downgrade-Text anpassen
   Kein starres `1,2,4`, wenn der Block selbst ehrlichen Downgrade erlaubt.

3. `BT101` nach `101.3` hart schneiden
   Mehr-Env, Vector-Env und Throughput gehoeren in einen Folgeblock, nicht in dieselbe Abschlusslogik.

4. `BT101` Verifikation reparieren
   `check_env(...)` wirklich auf ein erzeugtes Env anwenden und Single-Env zuerst als einziges Pflichtgate lesen.

5. `BT101` Action-Contract schaerfen
   `BotActionContract.js` als harte Referenz und Action-Mapping expliziter dokumentieren.

6. BT90 nur dann als wirklich VXX-nah bewerten, wenn BT100/BT101 echte Subphasen mit Evidence-Hooks bekommen
   Sonst bleibt das Paket ein gut formulierter Draft, aber kein aktiver Vollzugsplan.

### 7.3 Endurteil

Der Plan ist **sinnvoll**.
Der Plan ist **deutlich strukturierter als frueher**.
Der Plan ist **nicht chaotisch**.

Aber die harte Bewertung lautet trotzdem:

- `BT100` ist noch zu gross fuer einen echten Wahrheitsblock.
- `BT101` ist in seiner jetzigen Form nicht sauber geschnitten.
- Beide Bloecke sehen mehr nach aktiven VXX-Bloecken aus, als sie es operativ wirklich schon sind.

Die fairste kurze Zusammenfassung ist deshalb:

**Gute Richtung, brauchbarer Draft, noch kein sauber ausfuehrbarer Startplan auf VXX-Niveau.**
