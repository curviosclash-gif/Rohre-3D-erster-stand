# B10 Recording, Replay und Export - Findings

Stand: 2026-04-29
Status: in Arbeit
Planquelle: [README.md](./README.md)

## Scope

- `src/core/MediaRecorderSystem.js`
- `src/core/recording/DownloadService.js`
- `src/core/recording/MediaRecorderExportFinalizeOps.js`
- `src/core/recording/engines/NativeMediaRecorderEngine.js`
- `src/core/recording/engines/WebCodecsRecorderEngine.js`
- `src/core/replay/ReplayRecorder.js`
- `src/state/recorder/RoundMetricsStore.js`
- `src/state/recorder/RoundSnapshotStore.js`
- `src/core/runtime/GameRuntimeRecordingSupport.js` (nur als externer Consumer der Recorder-Metrics)
- `electron/recording-video-export-job.cjs`

## Prueffokus

- Recorder-Stop-/Dispose-Lifecycle und Export-Finalisierung
- Replay-Serialisierung und Persistenzvertrag
- Metrics-/Summary-Exporte fuer Runtime- und Debug-Consumer
- Result-/Status-Stabilitaet nach Match-Ende und Teardown

## Befunde

| ID | Schwere | Titel | Dateien | Evidenz | Empfehlung | Status |
| --- | --- | --- | --- | --- | --- | --- |
| B10-F01 | mittel | Replay-Dauer driftet nach Stop und Reset weiter | `src/core/replay/ReplayRecorder.js` | `stopRecording()` friert kein Ende ein; `getReplay()` berechnet `duration` immer aus `Date.now() - _startTime`; `reset()` laesst `_startTime` unveraendert | Stop-/Reset-Zeit explizit einfrieren und Export nur aus einem stabilen Replay-Snapshot speisen | offen |
| B10-F02 | mittel | Recorder-Dispose laesst asynchrone Export-Finalisierung nach Teardown weiterlaufen | `src/core/MediaRecorderSystem.js`, `src/core/recording/MediaRecorderExportFinalizeOps.js` | `dispose()` startet nur ein asynchrones `settleRecording()`, raeumt aber sofort Export-State ab; `_finalizeBlobExport()` publiziert danach erneut `_lastExport` samt neuem `objectUrl` | Dispose asynchron machen oder einen Disposed-Guard einfuehren, damit nach Teardown weder Export-State noch Blob-URLs neu entstehen | offen |
| B10-F03 | niedrig | Last-Round-Metrics geben verschachtelte Zaehler mutierbar nach aussen | `src/state/recorder/RoundMetricsStore.js`, `src/core/runtime/GameRuntimeRecordingSupport.js` | `RoundMetricsStore` baut verschachtelte Count-Maps, `getLastRoundMetrics()` gibt aber nur einen Shallow-Copy zurueck; die Runtime-Facade reicht ihn unveraendert weiter | Rueckgaben tief klonen oder einfrieren, damit Debug-/UI-Consumer den Recorder-Status nicht rueckwirkend veraendern koennen | offen |
| B10-F04 | mittel | Partial-Recorder-Exporte verlieren ihren Degradationshinweis auf dem Weg zur UI | `src/core/recording/engines/NativeMediaRecorderEngine.js`, `src/core/recording/engines/WebCodecsRecorderEngine.js`, `src/core/MediaRecorderSystem.js`, `src/core/runtime/GameRuntimeRecordingSupport.js` | Beide Recorder-Engines markieren Timeout-/Flush-Faelle als `partial`, `MediaRecorderSystem` uebernimmt dieses Signal aber nicht und die Runtime meldet anschliessend normales Speichern | Partial-/Timeout-Zustaende bis ins Stop-Result und in die UI-Warnings propagieren | offen |
| B10-F05 | mittel | Export-Job faltet Delivery-Write-Fehler in einen Transcode-Fallback zusammen | `electron/recording-video-export-job.cjs`, `src/core/runtime/GameRuntimeRecordingSupport.js` | Ein gemeinsamer `catch` behandelt sowohl echte Transcode-Fehler als auch `copyFile()`-Fehler auf dem finalen Delivery-Pfad als `native_transcode_failed` und degradiert auf Master-Export | Transcode-, Finalize- und Delivery-Write-Fehler separat behandeln und nur bei echtem Transcode-Ausfall auf Master degradieren | offen |

### B10-F01 - Replay-Dauer driftet nach Stop und Reset weiter

Problem:
`ReplayRecorder` speichert keinen festen Match-Endzeitpunkt. `stopRecording()` schaltet nur `_recording` aus, waehrend `getReplay()` die Dauer weiterhin aus `Date.now() - this._startTime` berechnet. `reset()` setzt ausserdem `_startTime` nicht zurueck.

Risiko:
Das exportierte Replay haengt vom Zeitpunkt des Exports statt vom Zeitpunkt des Match-Endes ab. Schon eine spaetere `persistReplay()`-Ausfuehrung veraendert die aufgezeichnete Dauer, und Reset-/Fehlpfade koennen mit stale Zeitstempeln weiterarbeiten.

Evidenz:
- `src/core/replay/ReplayRecorder.js:71-73` beendet die Aufnahme ohne eingefrorenes `endedAt` oder `duration`.
- `src/core/replay/ReplayRecorder.js:81-88` berechnet `duration` bei jedem Read erneut gegen `Date.now()`.
- `src/core/replay/ReplayRecorder.js:159-165` setzt den Recorder zurueck, laesst `_startTime` aber stehen.

Empfehlung:
Beim Stop einen stabilen Replay-Snapshot mit `endedAt` und `duration` erzeugen und denselben Snapshot fuer `getReplay()`, `exportReplayJSON()` und `persistReplay()` weiterreichen. `reset()` sollte Start-/Endzeit explizit loeschen.

### B10-F02 - Recorder-Dispose laesst asynchrone Export-Finalisierung nach Teardown weiterlaufen

Problem:
`MediaRecorderSystem.dispose()` startet bei aktiver oder pending Aufnahme nur ein asynchrones `settleRecording()`, setzt aber direkt danach `_lastExport = null` und raeumt den restlichen Teardownpfad ab. Wenn der Stop anschliessend erfolgreich durchlaeuft, legt `_finalizeBlobExport()` erneut `_lastExport` inklusive neuem `objectUrl` an.

Risiko:
Ein bereits entsorgter Recorder kann nachtraeglich wieder Export-Metadaten publizieren und Blob-URLs allokieren. Das erzeugt Post-Dispose-State-Drift und kann insbesondere in langen Sessions oder wiederholten Teardowns zu schwer sichtbaren Memory-Leaks fuehren.

Evidenz:
- `src/core/MediaRecorderSystem.js:1107-1155` und `1212-1216` warten beim Stop auf `_finalizeBlobExport()`, bevor `pendingStop` aufgeloest wird.
- `src/core/recording/MediaRecorderExportFinalizeOps.js:150-156` legt fuer jeden Export ein neues `objectUrl` an und schreibt `_lastExport` neu.
- `src/core/recording/MediaRecorderExportFinalizeOps.js:198-245` bereinigt den Recorder erst nach erfolgreicher Finalisierung.
- `src/core/MediaRecorderSystem.js:1304-1315` ruft `settleRecording()` fire-and-forget auf, revoket nur das alte `objectUrl` und kehrt sofort zurueck.

Empfehlung:
Dispose entweder asynchron machen und auf das laufende Stop-/Finalize-Promise warten oder einen Disposed-Guard einfuehren, der nach Teardown keine neue Export-Publikation mehr zulaesst und frisch erzeugte Blob-URLs sofort wieder freigibt.

### B10-F03 - Last-Round-Metrics geben verschachtelte Zaehler mutierbar nach aussen

Problem:
Die Round-Metrics bauen bewusst verschachtelte Zaehlerobjekte (`itemUseModeCounts`, `itemUseTypeCounts`, `actionResultCodeCounts`, `failedItemActionModeCounts`, `failedItemActionCodeCounts`) auf. `getLastRoundMetrics()` kopiert den Summary-Container aber nur shallow, und die Runtime-Facade reicht dieses Objekt unveraendert weiter.

Risiko:
Ein Debug-, HUD- oder Inspector-Consumer kann durch lokale Anreicherung der Rueckgabe unbemerkt den internen Recorder-Status mutieren. Folge-Reads, Dumps oder spaetere Vergleiche arbeiten dann mit bereits verfremdeten KPI-Daten.

Evidenz:
- `src/state/recorder/RoundMetricsStore.js:63-92` definiert die verschachtelten Summary-Zaehler.
- `src/state/recorder/RoundMetricsStore.js:372-403` speichert `_lastRoundSummary` mit diesen Maps und gibt das Objekt im Abschluss-Pfad direkt zurueck.
- `src/state/recorder/RoundMetricsStore.js:406-407` liefert danach nur `{ ...this._lastRoundSummary }`.
- `src/core/runtime/GameRuntimeRecordingSupport.js:152-157` reicht diese Werte ohne weitere Absicherung an Runtime-Consumer weiter.

Empfehlung:
Rueckgaben fuer Last-Round-Metrics tief klonen oder `Object.freeze()`-gesichert nach aussen geben. Falls Mutabilitaet fuer UI-Anreicherung gewollt ist, sollte dafuer explizit ein abgekoppelter View-Mapper existieren.

### B10-F04 - Partial-Recorder-Exporte verlieren ihren Degradationshinweis auf dem Weg zur UI

Problem:
Sowohl der Native-MediaRecorder- als auch der WebCodecs-Pfad koennen bei Stop-/Flush-Timeouts bewusst mit einem partiellen Blob weiterlaufen. Dieses `partial`-/`partialReason`-Signal wird danach aber weder vom `MediaRecorderSystem` noch vom Runtime-Toast weitergereicht.

Risiko:
Abgeschnittene oder unvollstaendige Videos werden fuer erfolgreich und sauber gespeichert gehalten. Nutzer und nachgelagerte Diagnosepfade sehen keinen Unterschied zwischen vollstaendigem Export und Timeout-Restpuffer.

Evidenz:
- `src/core/recording/engines/NativeMediaRecorderEngine.js:161-176` loest bei Stop-Timeout mit `partial: true` und `partialReason: 'stop_timeout'` auf.
- `src/core/recording/engines/WebCodecsRecorderEngine.js:241-281` finalisiert bei Flush-Timeout explizit einen partiellen Buffer mit `partial: true` und `partialReason: 'flush_timeout'`.
- `src/core/MediaRecorderSystem.js:1134-1155` und `1195-1216` pruefen danach nur `ok` plus `blob` und reichen an `_finalizeBlobExport()` lediglich Blob/MimeType weiter.
- `src/core/runtime/GameRuntimeRecordingSupport.js:83-119` behandelt jedes `result.stopped` anschliessend als normales Speichern und unterscheidet keinen Partial-Fall.

Empfehlung:
`partial` und `partialReason` als festen Bestandteil des Stop-/Export-Resultats propagieren und in der Runtime mindestens als Warnung oder degradierte Erfolgsmeldung sichtbar machen.

### B10-F05 - Export-Job faltet Delivery-Write-Fehler in einen Transcode-Fallback zusammen

Problem:
Der Electron-Export-Job behandelt den gesamten MP4-Transcode- und Finalize-Pfad in einem gemeinsamen `try/catch`. Schlaegt also nicht der Transcode selbst, sondern erst das Kopieren des fertigen Delivery-Artefakts auf den finalen Zielpfad fehl, wird derselbe Catch aktiviert und der Fehler wie ein normaler `native_transcode_failed`-Fallback behandelt.

Risiko:
Dateisystem-, Berechtigungs- oder Out-of-space-Fehler auf dem finalen Delivery-Pfad werden falsch klassifiziert. Statt eines klaren Fehlers bekommt der Nutzer im Erfolgsfall nur einen degradierten Master-Export und im UI den Eindruck, es habe lediglich den MP4-Transcode getroffen.

Evidenz:
- `electron/recording-video-export-job.cjs:837-853` schreibt Master-Tempdatei, transkodiert und kopiert das Delivery-Artefakt per `copyFile()` auf den finalen Zielpfad.
- `electron/recording-video-export-job.cjs:870-917` faengt jeden Fehler aus diesem Gesamtblock gemeinsam ab, persistiert dann den Master-Fallback und setzt `failureReason: 'native_transcode_failed'`.
- `src/core/runtime/GameRuntimeRecordingSupport.js:95-113` kommuniziert degradierte Master-Delivery danach als normale Info-Meldung statt als finalen Write-Fehler.

Empfehlung:
Transcode-Ausfall, Delivery-Write-Fehler und Master-Fallback sauber trennen. Nur ein echter Transcode-Fehler sollte in den degradierten Master-Pfad laufen; finale Write-Fehler auf dem Zielpfad brauchen einen eigenen Fehlercode und UI-Pfad.

## Offene Fragen

- Soll `ReplayRecorder` einen expliziten `endedAt`-/`duration`-Vertrag bekommen, damit Exporte und Persistenz denselben eingefrorenen Snapshot verwenden?
- Soll `MediaRecorderSystem.dispose()` kuenftig bewusst asynchron sein oder muss die API synchron bleiben und deshalb intern einen harten Disposed-Guard tragen?
- Soll ein partieller Export produktseitig als Warn-Erfolg gelten oder als expliziter Fehler, der einen erneuten Export anraet?

## Folgearbeit

- B10 im naechsten Schritt gegen `electron/recording-video-export-job.cjs`, `src/core/recording/engines/*`, `src/core/renderer/RecordingCapturePipeline.js`, `src/core/renderer/camera/RecordingOrbitCameraDirector.js`, `src/state/recorder/RoundEventStore.js` und `src/state/recorder/RoundSnapshotStore.js` weiterpruefen.
- Bei Fix-Planung fuer Replay zuerst den Snapshot-/Duration-Vertrag von `ReplayRecorder` klaeren, damit Persistenz und spaetere Replays denselben eingefrorenen Datensatz teilen.
- Bei Fix-Planung fuer Recorder-Teardown die Verantwortung zwischen `dispose()`, `_pendingStop` und `_finalizeBlobExport()` entflechten, damit Export-State nicht mehr nachtraeglich wieder auftaucht.
- Bei Fix-Planung fuer Export-Hardening die Error-Codes fuer Partial-, Transcode- und Delivery-Write-Faelle auseinanderziehen, damit Runtime-Feedback und Persistenzvertrag dieselbe Wahrheit sprechen.
