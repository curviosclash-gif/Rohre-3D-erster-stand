# Graph-RAG Evidence Dashboard

Lokaler, read-only Viewer fuer redigierte Graph-RAG-Exporte. Das Dashboard ist
ein Consumer der V120-Outputs und keine Steuerquelle fuer Graph, Plaene,
Contracts, Locks oder Cache.

## Schnellstart

1. Redigierten Export erzeugen:

   ```powershell
   node scripts/graph-rag-viewer-export.mjs --write --runtime rulebased --json
   ```

2. Repo lokal statisch ausliefern, zum Beispiel:

   ```powershell
   npx vite --host 127.0.0.1 --port 4178
   ```

3. `http://127.0.0.1:4178/tools/graph-rag-viewer/index.html` oeffnen.
4. `JSON laden` waehlen und
   `tmp/graph-rag/viewer/graph-rag-viewer-export.json` laden.

Fuer einen kleinen Offline-Smoke kann stattdessen `Fixture laden` genutzt
werden. Das getrackte Fixture liegt unter
`data/contracts/knowledge-graph/graph-rag-viewer-fixture.v1.json`.

## Inputs

- Viewer-Export: `knowledge-graph.graph-rag.viewer-export.v1`
- Chat-Response: `knowledge-graph.graph-rag.chat-response.v1`
- Transiente Viewer-Ausgabe:
  `tmp/graph-rag/viewer/graph-rag-viewer-export.json`
- Transiente Chat-Ausgabe:
  `tmp/graph-rag/chat/graph-rag-chat-response.json`

Der Viewer akzeptiert ausschliesslich versionierte, redigierte JSON-Inputs.
`unsafe-raw` wird abgelehnt. Getrackte Fixtures enthalten keine Secrets und
keinen Raw-Chunk-Text.

## Ask Repo

`Ask Repo` bleibt eine optionale, experimentelle read-only Oberflaeche. Die
Nutzenmessung aus V121 bestaetigt den Dashboard-MVP, aber keinen marginalen
Vorteil des Chat-Panels gegenueber Dashboard-only.

Eine source-backed Chat-Response kann lokal erzeugt werden:

```powershell
node scripts/graph-rag-chat.mjs --block V121 --view dependencies --question "Was blockiert V121?" --json --write
```

Die erzeugte JSON-Datei wird im `Ask Repo`-Panel ueber den lokalen File-Input
geladen. Ohne Ollama oder llama.cpp arbeitet der Wrapper fuer Graph-nahe
Fragen mit `fallback-rulebased`. Bei fehlender Evidence liefert er
`insufficient_context` statt einer freien Antwort.

Der Browser startet keine Node-Prozesse, Modelle oder Adapter. Replay-Befehle
werden nur angezeigt.

## Safety

- Exporte sind standardmaessig `default-redacted`.
- Der Viewer speichert keine Prompts, Antworten oder Evidence-Pakete in
  `localStorage`.
- Quellenanweisungen gelten als Daten und koennen keine Workflows ausloesen.
- Historische Quellen werden als Kontext markiert und sind keine aktive
  Steuerquelle.
- Viewer- und Chat-Ausgaben unter `tmp/graph-rag/` sind transient und nicht
  commitbar.

## Nicht-Ziele

- Keine Bearbeitung von Graph, Plaenen, Contracts, Locks oder Cache.
- Kein automatischer Repo-Crawl aus dem Browser.
- Kein Modell-Download, keine Installation und kein Adapter-Start.
- Keine persistente Chat-History.
- Kein Ersatz fuer `query-knowledge-graph.mjs`, `graph-rag-query.mjs` oder die
  Contract-Tests.

## Historischer Kontext

Die nicht vorhandenen V107/V111-Pfade unter `tools/graph-viewer/` und
`scripts/export-knowledge-graph-view.mjs` werden nicht wiederbelebt. Der
produktive Nachfolger ist der versionierte V121-Pfad unter
`tools/graph-rag-viewer/` mit redigiertem Exportvertrag und Contract-Tests.
