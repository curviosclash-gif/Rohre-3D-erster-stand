# BT90 Masterplan Audit 2026-04-22 Recheck

> [!CAUTION]
> **Gesamtnote: 4+ / C+**
> BT90 ist heute klar strukturierter als die fruehen Entwuerfe und fachlich weitgehend sinnvoll aufgebaut. Aber im Vergleich zu eurem normalen Plan-Schema ist der Draft immer noch **nicht sauber normalisiert**: Der Master ist kein kompakter Index, die Blockdateien sind nicht im VXX-Schema, BT104 bleibt methodisch zu weich und BT105 ist eher Handoff-Anhang als echter Umsetzungsblock.

---

## TEIL 1: HARTE HAUPTBEFUNDE

### 1.1 BLOCKER: Der BT90-Master ist kein Master-Index, sondern eine doppelte Detailplanung

Der staerkste strukturelle Fehler ist nicht der PPO-Inhalt, sondern die Planarchitektur.

- `docs/Umsetzungsplan.md:6`, `docs/Umsetzungsplan.md:20`, `docs/Umsetzungsplan.md:31` und `docs/Umsetzungsplan.md:47` zeigen das etablierte Muster: kompakter Master-Index oben, kanonische Blockdetails in separaten Dateien.
- BT90 sagt in `docs/plaene/neu/BT90_GoldStandard/README.md:10`, dass `docs/Umsetzungsplan.md` der kompakte Master bleibt.
- Der BT90-Master verhaelt sich aber nicht so. Ab `docs/plaene/neu/BT90_GoldStandard/BT_PPO_Migration_Masterplan.md:162` beginnt fuer jeden Block erneut DoD, Phasen, Abschluss-Gate und Risiko-Register.
- Dieselben Inhalte liegen danach noch einmal in den Blockdateien, zum Beispiel in `docs/plaene/neu/BT90_GoldStandard/bloecke/BT100_Python_Bootstrap_PoC.md:172`, `docs/plaene/neu/BT90_GoldStandard/bloecke/BT102_PPO_Baseline_Training.md:134` und `docs/plaene/neu/BT90_GoldStandard/bloecke/BT104_AB_Validation_Promotion.md:108`.

Das ist exakt das Gegenteil des Schemas, das der Umsetzungsplan lebt. Statt einer klaren Trennung "Index hier, Details dort" erzeugt BT90 zwei Detail-Ebenen mit derselben Information.

**Urteil:** Solange der Master selbst die Blockinhalte spiegelt, ist BT90 formal nicht "nach eurem ueblichen Schema", sondern ein Hybrid aus Index und Detailplan.

### 1.2 BLOCKER: Der Draft baut sich eine eigene Mini-Governance neben dem echten Plan-System

BT90 ist heute kein formaler Governance-Bruch mehr. Aber er bleibt gefaehrlich nah daran.

- Positiv: `docs/plaene/neu/BT90_GoldStandard/README.md:5`, `:10` und `:76` markieren BT90 korrekt als Intake-Draft.
- Positiv: `docs/plaene/neu/BT90_GoldStandard/prompts/001_BT100_Vertiefung.md:6` wiederholt das ebenfalls sauber.
- Negativ: Der BT90-Master fuehrt trotzdem `Draft-Lock-Status` (`BT_PPO_Migration_Masterplan.md:147`) und einen eigenen `Conflict-Log` (`BT_PPO_Migration_Masterplan.md:443`).
- Negativ: Zusaetzlich tragen die Intake-Bloecke lokale Lock-Kommentare wie `<!-- LOCK: frei -->` in `BT_PPO_Migration_Masterplan.md:168`, `:215`, `:265`, `:314`, `:360`, `:404`.
- Im echten Projektschema liegen operative Locks dagegen zentral in `docs/lock-status/`; siehe `docs/Umsetzungsplan.md:74`, `:76`, `:77`.

Das Problem ist nicht, dass BT90 Begriffe wie "Lock" oder "Conflict-Log" ueberhaupt benutzt. Das Problem ist, dass ein Intake-Draft damit einen zweiten Ordnungsrahmen imitiert, ohne an den echten Projektmechanismus angeschlossen zu sein.

**Urteil:** Als Denkstuetze noch okay. Als sauberer Intake nach eurem Standard zu operativ.

### 1.3 BLOCKER: Die Blockdateien sind nicht im kanonischen VXX-Schema und damit nicht uebernahmefertig

Die BT90-Blockdateien sind lesbar, aber nicht im Format eurer aktiven Plaene.

- Ein aktiver Block wie `docs/plaene/aktiv/V76.md:1` beginnt mit Frontmatter fuer `id`, `status`, `depends_on`, `scope_files`, `verification`, `updated_at`.
- BT100, BT101, BT102, BT103, BT104 und BT105 beginnen direkt mit Markdown-Ueberschriften und Fliesstext, zum Beispiel `BT100_Python_Bootstrap_PoC.md:1` und `BT104_AB_Validation_Promotion.md:1`.
- Die aktiven Plaene haben ausserdem explizite Verifikationsbefehle im Kopf (`V76.md:25`), waehrend BT90 nur eine allgemeine Evidence-Regel nennt (`BT_PPO_Migration_Masterplan.md:27`) und in den Blockdateien keine feste `verification`-Liste fuehrt.

Das ist kein bloesser Stilpunkt. Es heisst praktisch:

- BT90 ist lesbar fuer Menschen,
- aber noch nicht normalisiert fuer denselben operativen Tool- und Review-Flow wie eure aktiven VXX-Bloecke.

**Urteil:** Inhaltlich vorarbeitbar, formal noch nicht intake-reif fuer eine direkte Uebernahme ins aktive Planschema.

### 1.4 KRITISCH: BT104 bleibt als Entscheidungsblock zu weich

BT104 ist nicht mehr so falsch eingerahmt wie in den alten Entwuerfen. Das ist die gute Nachricht.

- `docs/plaene/neu/BT90_GoldStandard/bloecke/BT104_AB_Validation_Promotion.md:16` bis `:24` machen `BT80C 80.9.3` korrekt nur noch zum Soft-Dependency.
- `BT104_AB_Validation_Promotion.md:85` und `:136` behandeln `bot:validate` nur noch als Zusatzsignal oder Restblocker.

Die schlechte Nachricht:

- Die eigentliche Bewertungsregel in `BT104_AB_Validation_Promotion.md:101` bis `:106` bleibt zu weich.
- Es gibt keine feste Mindestzahl an Runs.
- Es gibt keinen klaren Effekt-Schwellenwert.
- Es gibt keine definierte Invalidierung bei instabilen oder unehrlichen Laeufen.
- Es gibt keinen harten Unterschied zwischen "mehrheitlich besser" und "relevant besser".

Zum Vergleich: Der aktive Bot-Trainingsplan arbeitet in BT80C mit deutlich haerterer Lane-Logik und einer festen Drei-Pass-Forderung; siehe `docs/bot-training/Bot_Trainingsplan.md:531`, `:532`, `:559`.

**Urteil:** BT104 ist als Evidence-Block brauchbar, aber noch kein belastbares Promotionsschema.

### 1.5 KRITISCH: BT105 ist kein echter Umsetzungsblock, sondern ein Handoff-Anhang in Blockverkleidung

BT105 ist inhaltlich nicht sinnlos. Die Platzierung und Zuschnittlogik sind trotzdem schwach.

- `docs/plaene/neu/BT90_GoldStandard/bloecke/BT105_SelfPlay_Frozen_Pool.md:18` bis `:26` definieren BT105 rein als Vorbereitungs- und Handoff-Block.
- `BT105_SelfPlay_Frozen_Pool.md:90` bis `:93` zeigen, dass die primaeren Schreibziele fast nur noch Dokumente sind.
- `BT105_SelfPlay_Frozen_Pool.md:123` bis `:126` endet in einem Intake-Handoff fuer eine spaetere Uebernahme.

Das kann man machen. Aber dann ist BT105 kein Block derselben Art wie BT100-BT104. Er implementiert keinen Trainingspfad, keine harte Eval-Lane und keinen technischen Vertrag. Er dokumentiert die spaetere Arbeit.

**Urteil:** Als Appendix oder Handoff-Abschnitt sinnvoll. Als letzter "Kernblock" der linearen Migrationskette konzeptionell zu schwach.

### 1.6 KRITISCH: Die Dokumentationshygiene ist besser, aber immer noch nicht sauber

Es gibt mehrere Drift-Indikatoren, die fuer einen Plan dieser Groesse nicht akzeptabel sind.

- BT103 und BT105 tragen bewusst falsche Alt-Dateinamen; siehe `BT103_Hyperparameter_Curriculum_ONNX.md:5` und `BT105_SelfPlay_Frozen_Pool.md:5`.
- Der Root-README wiederholt diese veralteten Namen in `docs/plaene/neu/BT90_GoldStandard/README.md:41` und `:43`.
- Im Brainstorming-Archiv wird `BT90_Masterplan_Audit_2026-04-22.md` in `brainstorming/README.md:18` noch als "Aktuelle Referenz fuer Intake-Reife" gefuehrt.
- Dieses alte Audit kritisiert aber Punkte, die im heutigen Draft bereits korrigiert sind, etwa den angeblich "eigenen aktiven Master" (`BT90_Masterplan_Audit_2026-04-22.md:22`), die harte BT104-Abhaengigkeit (`:43`) oder den angeblichen Electron-Schwerpunkt (`:53`, `:173`, `:193`).

Das ist mehr als Kosmetik. Wenn im selben Ordner veraltete Kritik als aktuelle Referenz markiert bleibt, kippt die Dokumentation gegen sich selbst.

**Urteil:** Der Draft verbessert sich inhaltlich schneller als seine eigene Meta-Doku. Das ist ein Governance-Risiko.

---

## TEIL 2: ABGLEICH MIT DEM UMSETZUNGSPLAN

### 2.1 Was BT90 sichtbar gut uebernimmt

- klare Blockfolge BT100 bis BT105
- explizite Abhaengigkeitstabelle (`BT_PPO_Migration_Masterplan.md:100`)
- saubere read-only-/no-touch-Leitplanken (`BT_PPO_Migration_Masterplan.md:31`, `:120`)
- pro Block klare DoD-, Gate- und Risiko-Struktur in den Blockdateien
- gute headless-first-Korrektur in BT100 und BT101 (`BT100_Python_Bootstrap_PoC.md:61`, `BT101_Custom_Gymnasium_Environment.md:60`)
- brauchbares Prompt-System, das den korrigierten Zuschnitt stabilisiert (`prompts/001_BT100_Vertiefung.md:36`, `prompts/003_BT102_Vertiefung.md:39`, `prompts/006_BT105_Vertiefung.md:39`)

### 2.2 Wo BT90 vom etablierten Schema negativ abweicht

| Punkt | Umsetzungsplan / aktive VXX-Plaene | BT90 aktuell | Bewertung |
| --- | --- | --- | --- |
| Rolle des Masters | kompakter Index, Details in Blockdateien | Master spiegelt DoD, Phasen, Risiken noch einmal | schlecht |
| Blockschema | Frontmatter + `scope_files` + `verification` + Phasen | freie Markdown-Form, keine Frontmatter-Normalisierung | schlecht |
| Lock-Modell | zentrale Lock-Fuehrung in `docs/lock-status/` | lokaler Draft-Lock-Status + Lock-Kommentare | schlecht |
| Single Source je Ebene | Master zeigt auf genau einen Detailblock | Master und Blockdatei enthalten parallel denselben Inhalt | schlecht |
| Evidence/Verifikation | feste Verifikationsliste im Blockkopf | Evidence-Pflicht vorhanden, aber wenig operationalisiert | mittel |
| Abschlusslogik | Gates meist direkt an konkrete Befehle/Artefakte gebunden | Gates teilweise noch dokumentarisch und weich | mittel |
| Hygiene / Freshness | Dateinamen und Referenzen sind stabil | Alt-Namen und veraltetes Referenz-Audit bleiben sichtbar | mittel bis schlecht |

### 2.3 Klarer Kernunterschied

Der Umsetzungsplan ist bei euch bewusst langweilig, knapp und toolbar.
BT90 ist dagegen noch ein argumentativer Design-Draft mit operativen Ambitionen.

Genau darin liegt der strukturelle Unterschied:

- Der Umsetzungsplan ist eine Arbeitssteuerung.
- BT90 ist derzeit noch eine gut ausgearbeitete Diskussions- und Vorbereitungsgrundlage.

**Urteil:** BT90 ist nicht unstrukturiert. Aber er ist noch nicht in derselben Betriebsform wie eure normalen Plaene.

---

## TEIL 3: GEGENCHECK ZUM AELTEREN AUDIT

Das ist wichtig, weil im BT90-Ordner selbst noch veraltete Kritik als "aktuelle Referenz" markiert ist.

### 3.1 Kritikpunkte, die heute NICHT mehr sauber stimmen

- "BT90 nennt sich eigener aktiver Master": Das war einmal ein valider Vorwurf, trifft aber auf den jetzigen Stand nicht mehr zu. Siehe `README.md:5`, `:10` und `prompts/001_BT100_Vertiefung.md:6`.
- "BT104 haengt hart an BT80C 80.9.3": Ebenfalls ueberholt. Siehe `BT104_AB_Validation_Promotion.md:16` bis `:24`.
- "BT100/BT101 bauen wieder auf Electron als Primaerpfad": In der aktuellen Fassung ist das eher umgekehrt; siehe `BT100_Python_Bootstrap_PoC.md:61` und `BT101_Custom_Gymnasium_Environment.md:60`.
- "BT103 ist ONNX- oder Runtime-Integrationsblock": Der Rest des Alt-Scope lebt noch im Dateinamen, aber nicht mehr im Inhalt; siehe `BT103_Hyperparameter_Curriculum_ONNX.md:5`, `:49`, `:150`.
- "BT105 ist noch echter Self-Play-Block": Auch das stimmt inhaltlich nicht mehr; nur der Dateiname ist alt. Siehe `BT105_SelfPlay_Frozen_Pool.md:5`, `:37`, `:133`.

### 3.2 Was aus der alten Kritik weiterhin gueltig bleibt

- BT90 ist formal noch nicht im selben Planschema wie die aktiven Bloecke.
- BT104 ist methodisch noch nicht hart genug.
- BT105 ist als Blocktyp zu duenn.
- Der Draft ist dokumentarisch noch driftanfaellig.

**Urteil:** Das alte Audit ist nicht komplett falsch, aber als "aktuelle Referenz" in Teilen veraltet und damit selbst Teil des Problems.

---

## TEIL 4: NOTEN ZU DEN BESTANDTEILEN

| Bestandteil | Note | Urteil |
| --- | --- | --- |
| Governance / Source-of-Truth-Einordnung | 4 | sauberer als frueher, aber noch zu nah an einer Parallel-Governance |
| Master-/Index-Struktur | 5 | groesster Formfehler: kein kompakter Index, sondern Doppelhaltung |
| Vergleich mit Umsetzungsplan-Schema | 5 | Form wird imitiert, aber die eigentliche Trennung von Index und Detail nicht eingehalten |
| BT100 | 2 | klarer, fokussierter Bootstrap-Block mit guter Headless-Leitplanke |
| BT101 | 2- | fachlich sauber und heute logisch konsistent |
| BT102 | 3 | brauchbarer Baseline-Block, aber noch nicht hart genug in Mess- und Vergleichslogik |
| BT103 | 3- | solide fokussiert, aber noch etwas duenn fuer einen Freeze-/Ablationsblock |
| BT104 | 4 | besser eingerahmt, aber methodisch zu weich fuer ein echtes Urteil `promote|hold|rollback` |
| BT105 | 5 | eher Handoff-/Appendix-Block als echter Umsetzungsblock |
| Risiko-Register gesamt | 3 | brauchbar und deutlich besser als frueher, aber nicht ueberall gleich tief |
| DoD / Gates | 4- | vorhanden, aber haeufig noch zu dokumentarisch statt operativ messbar |
| Prompt-System | 2- | einer der staerksten Teile des Pakets; stabilisiert den korrigierten Zuschnitt gut |
| Dokumentationshygiene / Freshness | 4- | Alt-Dateinamen und veraltete Referenz-Audits untergraben die Reife |

---

## TEIL 5: EINZELURTEIL ZUR STRUKTURFRAGE

### 5.1 Ist der Plan sinnvoll?

**Ja, grundsaetzlich schon.**

Der Plan verfolgt heute einen vernuenftigen Kern:

- sidecar statt stiller Runtime-Umschaltung
- headless-first statt Electron-first
- Reward-/Safety-/Intent-Semantik bleibt im JS-Pfad authoritative
- DQN-Ablosung wird nicht vorschnell in die fruehen Bloecke gezogen

Das ist fachlich deutlich sinnvoller als die fruehen BT90-Entwuerfe.

### 5.2 Ist der Plan strukturiert aufgebaut?

**Ja, aber nicht im selben Schema wie eure aktiven Plaene.**

Er ist intern lesbar und logisch gegliedert. Trotzdem ist die Struktur noch nicht "sauber projektkonform", weil:

- der Master zu viel Detail doppelt haelt,
- die Blockdateien nicht normalisiert sind,
- und Dokumentation, Archiv und Recheck nicht sauber getrennt sind.

### 5.3 Gibt es unlogische Aussagen?

**Nur noch wenige echte inhaltliche Unlogiken.**

Die groben fachlichen Widersprueche aus alten Fassungen sind weitgehend bereinigt.
Die heutigen Schwaechen sind weniger "Widerspruch im Satz" und mehr:

- falsche Dokumentationsrolle,
- doppelte Wahrheitsebenen,
- weiche Bewertungsregeln,
- und Alt-Namen, die den korrigierten Scope immer noch verschleiern.

---

## TEIL 6: KLARE EMPFEHLUNG

### 6.1 Was ich mit diesem Stand nicht tun wuerde

- BT90 nicht als "fertig im ueblichen Planschema" behandeln
- BT90 nicht ohne Normalisierung in einen aktiven Blockfluss uebernehmen
- BT104 nicht als belastbares Promotionsregime verkaufen
- BT105 nicht als gleichwertigen Kernblock neben BT100-BT104 lesen

### 6.2 Was als naechstes noetig ist

1. **Master verschlanken**
   `BT_PPO_Migration_Masterplan.md` auf echten Index reduzieren: Block-ID, Kurzrolle, Status, Abhaengigkeit, Link zur Blockdatei. DoD, Phasen und Risiko-Register gehoeren in die Blockdateien.

2. **Blockdateien normalisieren**
   Frontmatter, `verification`, `updated_at`, `depends_on`, `status` und eindeutige `scope_files` analog zu `docs/plaene/aktiv/V76.md`.

3. **Draft-Lock-/Conflict-Mechanik entschlacken**
   Entweder ganz entfernen oder sichtbar als rein informativen Archivzusatz markieren. Nicht weiter wie ein zweiter operativer Lock-Layer wirken lassen.

4. **BT104 operationalisieren**
   Feste Run-Anzahl, Abbruch-/Invalidierungsregeln, Mindestdeltas und Urteilsschwellen definieren.

5. **BT105 aus der Kernkette herausziehen oder umetikettieren**
   Als Appendix, Handoff-Block oder separater Folge-Intake waere BT105 sauberer als als sechster "Kernblock".

6. **Meta-Doku aufraeumen**
   Alt-Dateinamen bereinigen oder bewusst archival markieren. Das veraltete Audit im Brainstorming-README nicht weiter als aktuelle Referenz fuehren.

### 6.3 Endurteil

BT90 ist **heute nicht unsinnig** und **auch nicht chaotisch**.
Aber gemessen an eurem eigenen Standard ist der Plan noch **zu uneinheitlich, zu doppelt und zu wenig normalisiert**.

Die haerteste und fairste Kurzfassung lautet:

**Fachlich brauchbarer Draft. Formal noch kein Plan "nach eurem normalen Schema".**
