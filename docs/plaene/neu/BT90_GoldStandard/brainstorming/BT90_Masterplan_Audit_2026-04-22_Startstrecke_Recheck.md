# BT90 Masterplan Audit 2026-04-22 - Startstrecke Recheck

> [!NOTE]
> **Kurzurteil: 2 / B**
> Die verkleinerte BT90-Startstrecke ist jetzt in sich schluessig. BT100 und BT101 tragen den echten Wahrheitskern, waehrend Mehr-Env, VecEnv und voller PPO-/Torch-Druck sichtbar ausserhalb des Closure-Scope bleiben. Fuer einen spaeteren kleinen aktiven Intake wirkt der Pfad `BT90 -> BT91 -> BT92` damit belastbar.

## 1. Kernbefund

- Der Master ist wieder ein echter kompakter Index und zieht den Start nur ueber `BT100`, `BT101.1` bis `101.3` und danach getrennte Folgepfade auf (`docs/plaene/neu/BT90_GoldStandard/BT_PPO_Migration_Masterplan.md:5`, `:21`, `:24`, `:126`, `:137`).
- Root-README und Implementierungs-README spiegeln denselben Zuschnitt; die spaetere aktive Landung ueber `BT90`, `BT91` und `BT92` ist jetzt explizit statt diffus (`docs/plaene/neu/BT90_GoldStandard/README.md:41`, `:47`; `docs/plaene/neu/BT90_GoldStandard/IMPLEMENTATION_README.md:23`, `:26`, `:50`, `:53`).
- BT100 ist sauber auf Minimal-Bootstrap, JS-seitige Contract-Wahrheit, externen Sidecar und genau eine deterministische 1-Worker-100-Step-Lane begrenzt (`docs/plaene/neu/BT90_GoldStandard/bloecke/BT100_Python_Bootstrap_PoC.md:37`, `:43`, `:49`, `:65`, `:193`, `:234`, `:303`).
- BT101 schliesst bewusst nur noch ueber `101.1` bis `101.3`; `101.4` bis `101.6` sind klar als nachgelagerte Folgespur ausserhalb von `101.99` markiert (`docs/plaene/neu/BT90_GoldStandard/bloecke/BT101_Custom_Gymnasium_Environment.md:39`, `:45`, `:55`, `:63`, `:216`, `:258`, `:296`).
- Die Authority fuer den aktiven Startpfad ist jetzt explizit an `TrainerPayloadAdapter`, `TrainingContractV1`, `ObservationSchemaV2` und `BotActionContract.js` festgezogen (`docs/plaene/neu/BT90_GoldStandard/bloecke/BT101_Custom_Gymnasium_Environment.md:99`, `:100`, `:101`, `:136`, `:213`, `:236`, `:238`).
- `offene_risiken.md` und die Vertiefungs-Prompts 001/002 ziehen den kleineren Scope sichtbar mit und holen die alten Widersprueche nicht mehr durch die Hintertuer zurueck (`docs/plaene/neu/BT90_GoldStandard/offene_risiken.md:12`, `:14`, `:16`, `:31`; `docs/plaene/neu/BT90_GoldStandard/prompts/001_BT100_Vertiefung.md:40`, `:45`, `:50`; `docs/plaene/neu/BT90_GoldStandard/prompts/002_BT101_Vertiefung.md:37`, `:40`, `:46`, `:54`).

## 2. Was fuer die Startstrecke nicht mehr als Blocker gilt

- Die fruehere Kritik, BT100 ziehe schon 2-/4-Worker, Vector-Env oder den vollen PPO-/Torch-Stack in den Closure-Scope, trifft auf den aktuellen Block nicht mehr zu.
- Die fruehere Kritik, BT101 verlange Mehr-Env bereits in `101.99`, trifft auf den aktuellen Block ebenfalls nicht mehr zu.
- Die fruehere Kritik, die spaetere aktive Landing-Zone in den Bot-Trainingsplan bleibe unklar, ist fuer den Startpfad weitgehend behoben, weil `IMPLEMENTATION_README.md` den Split nach `BT90`, `BT91` und `BT92` jetzt sauber benennt.

## 3. Echte Restpunkte

- `BT102` bis `BT105` bleiben bewusst rolling drafts und sollten weiter nicht als startnahe Closure-Bloecke gelesen werden (`docs/plaene/neu/BT90_GoldStandard/BT_PPO_Migration_Masterplan.md:24`, `:128`, `:131`; `docs/plaene/neu/BT90_GoldStandard/IMPLEMENTATION_README.md:26`, `:53`, `:55`, `:164`).
- Der groesste verbleibende Doku-Restpunkt ist Meta-Freshness: mehrere aeltere Audits im `brainstorming/` beschreiben einen ueberholten Stand und taugen nur noch als Historie.

## 4. Endurteil

- Fuer die verkleinerte Startstrecke ist BT90 jetzt logisch und governance-seitig tragfaehig.
- Der naechste sinnvolle aktive Intake bleibt klein: erst `BT100.1` bis `BT100.2`, dann `BT100.3` bis `BT100.5`, dann `BT101.1` bis `BT101.3`.
- Fuer die Bewertung dieses Starts sollte dieses Recheck-Dokument die aktuelle Referenz sein; aeltere Audits bleiben bewusst historisch.
