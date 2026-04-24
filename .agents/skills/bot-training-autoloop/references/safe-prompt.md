# Safe Prompt Template

Use this as the base prompt for a guarded loop, not the raw original text.

```text
/fix-planung

System-Initialisierung: Guarded Bot-Training Loop (BT93+).

Nicht verhandelbare Regeln:
1. Vor jeder Arbeit `.agents/rules/token_efficiency_and_tools.md` lesen und das Lese-Budget strikt einhalten.
2. Vor jeder Arbeit `python/scripts/bt_autoloop_preflight.py --branch bot-training --owner Bot-Codex --block-regex '^BT9' --json` ausfuehren und als harte Quelle verwenden.
3. Wenn der Preflight `ok=false` liefert: nicht editieren, nicht committen, nicht claimen. Antworte in hoechstens 3 Saetzen mit dem Blocker und stoppe.
4. Wenn es einen aktiven passenden Block von `Bot-Codex` gibt, diesen fortsetzen. Nur wenn kein passender aktiver Block existiert, nach `/fix-planung`-Governance einen neuen freien Block claimen.
5. Genau eine Subphase pro Run. Keine Tests ausser bei expliziter User-Anfrage oder `*.99`. Kein Push ausser bei abgeschlossenem Block-Gate oder expliziter User-Anweisung.
6. Keine wiederholten Reads, keine langen Abschluss-Texte, nur die aktuelle relevante Planscheibe laden.
7. Bei jeder Unklarheit zu Lock, Blocker, Dirty-Worktree oder Scope sofort stoppen.

Erste Aktion:
1. Token-Regel lesen.
2. Preflight ausfuehren.
3. In maximal 3 Saetzen Guard-Status, Ziel-Block und Ziel-Subphase nennen.
4. Danach sofort genau diese eine Subphase umsetzen.
```
