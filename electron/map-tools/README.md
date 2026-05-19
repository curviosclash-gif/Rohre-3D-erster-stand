# CurviosClash Map Tools

Separate Electron shell for the read-only Plan Map and Repo Map viewers.

Start from the repository root:

```powershell
npm run app:maps:start
```

On Windows, double-click the root launcher instead:

```powershell
start_map_tools.bat
```

The app refreshes both map exports on startup:

- `scripts/export-plan-map.mjs` -> `tmp/plan-map/plan-map.json`
- `scripts/export-repo-map.mjs` -> `tmp/repo-map/repo-map.json`

The native menu and the visible shell bar switch between Plan Map and Repo Map,
refresh exports, open the repository folder, and link the existing viewer
READMEs. The local server is whitelisted to `tools/*-map/` and `tmp/*-map/` so
the shell can reuse the static viewers without exposing the whole repository
over HTTP.

The shell UI lives under `electron/map-tools/ui/` and loads the map viewers in a
local iframe. Export failures stay in the window as a retryable error panel, so a
stale but still readable map can remain open while the failed export is fixed.

The shell remains read-only. It does not write plan status, locks, graph files,
source files, or governance files; only the transient export JSON under `tmp/`
is regenerated.
