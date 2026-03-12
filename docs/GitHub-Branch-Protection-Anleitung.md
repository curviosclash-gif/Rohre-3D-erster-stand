# Anleitung: GitHub Branch Protection aktivieren

Um den `main`-Branch deines GitHub-Repositories vollständig abzusichern und zu verhindern, dass fehlerhafter Code gemerged wird, musst du die sogenannten "Branch Protection Rules" direkt auf GitHub konfigurieren.

Diese Schritte können nur von einem Repository-Admin (also dir) im Browser durchgeführt werden:

1. **Öffne GitHub:** Gehe zu deinem Projekt auf [github.com](github.com).
2. **Settings öffnen:** Klicke oben rechts auf den Reiter **`Settings`** (Zahnrad-Symbol).
3. **Branches wählen:** Wähle im linken Menü unter "Code and automation" den Menüpunkt **`Branches`**.
4. **Regel hinzufügen:** Klicke in der Mitte auf den Button **`Add branch protection rule`** (Oder "Edit" neben einer bestehenden Regel für `main`).
5. **Branch markieren:** Trage unter **"Branch name pattern"** genau `main` (oder `master`, je nachdem wie dein Haupt-Branch heißt) ein.

### Die wichtigsten Haken aktivieren:

*   [x] **Require a pull request before merging:** 
    *Niemand darf mehr direkt auf `main` pushen. Jede Änderung muss über einen PR (Pull Request) kommen.*
*   [x] (Optional aber empfohlen) **Require approvals:** 
    *Mindestens 1 Person muss den Code absegnen, bevor er gemerged werden darf.*
*   [x] **Require status checks to pass before merging:**
    *Das ist der wichtigste Haken für die CI-Pipeline. Erst wenn alle automatischen Tests grün sind, darf der Code rein.*
    * **Wichtig:** Sobald dieser Haken gesetzt ist, erscheint ein Suchfeld. Suche darin nach `build-and-test` (das ist der Name des Jobs aus unser neuen `.github/workflows/ci.yml`) und wähle ihn aus.
*   [x] **Do not allow bypassing the above settings:** 
    *Auch Admins (wie du) müssen sich an diese Regeln halten. Dies verhindert versehentliche Overrides.*

6. **Speichern:** Ganz unten auf **`Save changes`** klicken.

**Fertig!** Dein Repository ist nun gegen ungetesteten Code und direkte Pushes auf den Haupt-Branch abgesichert.
