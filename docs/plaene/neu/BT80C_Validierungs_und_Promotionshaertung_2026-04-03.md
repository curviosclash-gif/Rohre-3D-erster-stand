# BT80C Validierungs- und Promotionshaertung

Stand: 2026-04-03
Status: Entwurf
Owner: Codex

## Anlass

- BT80C ist repo-technisch weitgehend verdrahtet, aber noch nicht betrieblich abgeschlossen.
- Der erste echte Challenger-Kandidatenlauf zeigt: `training-run`, `eval` und `gate` sind anstossbar, die Pflicht-Lane `bot:validate` blockiert aktuell noch im Runtime-Startpfad (`MENU -> PLAYING`).
- Ohne stabile Validation-Lane wuerde weiterer Algorithmus- oder High-Util-Aufwand nur mehr Artefakte ohne belastbare Promotion-Aussage erzeugen.

## Ziel

BT80C so nachschaerfen, dass die naechsten operativen Schritte in einer sinnvollen Reihenfolge passieren:

1. zuerst Validation-Harness stabilisieren,
2. dann hardware-passende Kandidatenleiter fahren,
3. dann semantikstabile Benchmark-Evidence erzeugen,
4. erst danach Promotion- oder High-Util-Entscheidungen treffen.

## Leitregeln

- `bot:validate` ist Vorbedingung fuer jede ernsthafte BT80C-Kandidatenbewertung.
- Kein Champion-Wechsel ohne volle Evidence aus `run`, `bot:validate`, `eval`, `gate`, Resume-Health und Benchmark-Report.
- Benchmark-Vergleiche bleiben nur gueltig, solange dieselbe Gameplay-, Observation-, Action-, Reward- und Validation-Semantik gilt.
- `operator-high-util` folgt erst nach gruener Kandidatenleiter; kein Betriebswissen darf nur in Terminal-Historie existieren.

## Nachgeschaerfte Reihenfolge

### 1. Validation-Harness zuerst

- `bot:validate` fuer die feste Matrix wieder reproduzierbar von `MENU` nach `PLAYING` bringen.
- Drei aufeinanderfolgende Validation-Paesse auf fixer Matrix verlangen, bevor ein BT80C-Kandidatenlauf als vollwertige Evidence zaehlt.
- Validation-Fehler als Harness-/Runtime-Blocker klassifizieren, nicht als Modellregression.

### 2. Hardware-passende Kandidatenleiter

- `candidate-smoke`: minimaler Bridge-/Resume-/Artifact-Check mit kleinem Episodenbudget.
- `candidate-benchmark`: kurzer, aber vollstaendiger Challenger-Lauf mit `bot:validate`, `eval`, `gate` und Benchmark-Report.
- `operator-high-util`: erst nach gruener Kandidatenleiter; kein Freigabeersatz fuer fehlende Candidate-Evidence.

## Semantik-Freeze und Invalidation

Die laufende BT80C-Vergleichsbasis gilt nur fuer dasselbe Semantikfenster. Ein frischer Benchmark-Freeze ist noetig, wenn sich eines dieser Felder aendert:

- Matchstart-/Roundstart-Verhalten
- Portale, Gates, Items, Shield oder Gegner-/Kollisionssemantik
- Observation-Schema oder Tracker-Memory
- Action-Vocabulary oder Safety-/Intent-/Control-Invarianten
- Reward-Shaping oder Terminal-Gruende
- Validation-Matrix, Scenario-Auswahl oder Pflichtreportstruktur

Bis zum neuen Freeze gelten alte Champion-/Kandidatenvergleiche nur noch als historische Referenz, nicht als Promotion-Grundlage.

## Promotionsregel fuer BT80C

- mindestens drei vollstaendige Kandidatenlaeufe derselben Lane und desselben Semantikfensters
- alle drei mit vorhandener `bot:validate`-Lane und `gate.ok=true`
- positiver Median-Delta in `averageBotSurvival` gegen den eingefrorenen Champion
- `forcedRoundRate=0` und `timeoutRoundRate=0` fuer die Promotionslane
- Promotion bleibt manuell; ein gruener Lauf erzeugt hoechstens `manual-promotion-required`

## Operative Runbooks

Vor Freigabe von `operator-high-util` und `marathon` muessen als Repo-Artefakte dokumentiert sein:

- Start
- Resume
- Pause
- Stop
- Benchmark-Trigger
- Ueberlast-Reaktion
- Recovery / Rollback

## Exit-Kriterien fuer die Nachschaerfung

- Validation-Harness ist dreimal reproduzierbar gruen.
- Kandidatenleiter `candidate-smoke -> candidate-benchmark -> operator-high-util` ist im Plan und in der Roadmap verdrahtet.
- Invalidation-Regeln fuer Benchmark-Semantik sind dokumentiert.
- Promotionslogik fordert explizit drei vollstaendige Evidenzlaeufe.
- BT80C kann danach wieder entlang derselben Reihenfolge operativ ausgefuehrt werden.
