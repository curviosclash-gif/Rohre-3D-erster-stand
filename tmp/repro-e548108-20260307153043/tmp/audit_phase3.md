## Phase 3: Rendering & UI

- **DOM / Vanilla JS**: Keine Frameworks. Stark Event-getrieben (`MenuController` emittet Custom-Events wie `MENU_CONTROLLER_EVENT_TYPES.SETTINGS_CHANGED`).
- **UIManager / MatchFlowUiController**: Koordinieren den DOM-Zustand. Starten das 3D-Match via Factory. UI-Updates für Score und Inventar im aktiven Match werden gedrosselt (`HudRuntimeSystem._resolveScoreHudInterval`) für Performance-Gewinn.
- **HUD.js**: Pitch-Ladder und Kompass-Tapes werden via CSS-Transforms synchronisiert (Euler-Winkel aus echten 3D-Quaternionen).
- **CSS**: Umfangreiches, sehr modernes CSS (`style.css`), viel mit CSS Math Functions (`clamp`, `calc`), Color-Mix und CSS-Variablen. Keine Tailwind-Abhängigkeit.
