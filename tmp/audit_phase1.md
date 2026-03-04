## Phase 1: Architektur & Core-Module

- **Boot-Sequenz**: `index.html` lädt `src/core/main.js` als Module. `Game`-Klasse übernimmt DOM-UI Binding, Settings und Profil-Management. Danach wird `initializeMatchSession` aufgerufen.
- **GameLoop**: Eigene Implementierung in `GameLoop.js` mit Fixed Time Step und Frame-Skip Protection. (Sehr gut)
- **Renderer**: Three.js in `Renderer.js`. Sauberes Lifecycle- und Camera-Management (Splitscreen Support). Nutzt `three-disposal.js` zum VRAM Cache bereinigen (gut!).
- **State/Match**: `MatchSessionFactory.js` assembliert das Match-Objekt. `RoundStateController` macht funktionale "Next State" Berechnungen. Architektur scheint eine Mischung aus OOP (Managers) und functional/ECS-Mustern (TickSystems, Ops) zu sein. Gut testbar.
