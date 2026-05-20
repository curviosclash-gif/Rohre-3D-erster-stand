# Curvios Map Tools Android

Capacitor wrapper for the read-only Plan Map and Repo Map viewers.

Build the web assets and sync the Android project from the repository root:

```powershell
npm run app:maps:android:sync
```

Open the native project in Android Studio:

```powershell
npm run app:maps:android:open
```

Build an APK after Android Studio/JDK are installed and `JAVA_HOME` points to
the JDK:

```powershell
npm run app:maps:android:apk
```

The Android app is intentionally separate from Electron. It ships a static
snapshot of the map exports inside the app bundle and does not run Node,
Electron IPC, or a local HTTP server on the device.

The shell reads `map-tools-android.manifest.json` at startup and uses its
GitHub Releases metadata for the in-app update check. The default repository is
derived from `remote.origin.url`; set `CURVIOS_MAP_TOOLS_GITHUB_REPOSITORY` when
building from a fork. The app opens the GitHub release page for APK updates and
keeps the bundled map snapshot as the offline fallback.

The phone layout keeps the Android shell and embedded viewers within the
device-width frame; wide Plan Map canvases scroll inside the map panel. The
launcher icon uses native adaptive Android resources that mirror the map
surface, route, and node vocabulary.
