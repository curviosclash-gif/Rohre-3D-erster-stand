# CurviosClash Map Tools

Separate Electron shell for the read-only Plan Map and Repo Map viewers.

Start from the repository root:

```powershell
npm run app:maps:start
```

The app refreshes both map exports on startup:

- `scripts/export-plan-map.mjs` -> `tmp/plan-map/plan-map.json`
- `scripts/export-repo-map.mjs` -> `tmp/repo-map/repo-map.json`

The native menu switches between Plan Map and Repo Map, refreshes exports, opens
the repository folder, and links the existing viewer READMEs. The local server is
whitelisted to `tools/*-map/` and `tmp/*-map/` so the shell can reuse the static
viewers without exposing the whole repository over HTTP.

The shell remains read-only. It does not write plan status, locks, graph files,
source files, or governance files; only the transient export JSON under `tmp/`
is regenerated.
