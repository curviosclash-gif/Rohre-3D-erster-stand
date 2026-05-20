# Curvios Clash Classic Mobile

Capacitor wrapper for the phone-first Classic-only game build. It is separated
from the Map Tools Android wrapper so both apps can keep their own native
project and web bundle.

Build the web bundle from the repository root:

```bash
npm run app:classic:android:build
```

Create the Android project once:

```bash
npm run app:classic:android:add
```

After that, sync or open the native project:

```bash
npm run app:classic:android:sync
npm run app:classic:android:open
```

The native project lives in `android-classic`; the shipped web bundle is
`dist/mobile-classic`.
