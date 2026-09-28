# Offer Torch / Flashlight

**Version:** `1.0.0-complete`  
**Package id:** `com.offerpk.flashlight`  
**App name:** Offer Torch / Flashlight  
**Stack:** Capacitor 6 + HTML/CSS/JS PWA (offline-first)

LED torch (Android plugin) + **Screen Light** (fully works in browser) + Strobe/SOS + Themes + Settings.

## Quick start (web / offline)

```bash
cd /workspace/apps/flashlight-torch
npm run check          # node --check all JS
npm run smoke          # persist + screen light + strobe gate smoke
npm run build:web      # → www/ + docs/ + dist/flashlight-web-windows.zip
npm start              # serve on :4181
```

**Windows zip:** open `dist/flashlight-web-windows.zip`, extract, double-click `PLAY-WINDOWS.bat` (opens `index.html`).

## Screens

| Tab | Features |
|-----|----------|
| **Torch** | Big ON/OFF; brightness/strength slider (native API 33+); clear UI if unavailable / camera in use |
| **Strobe/SOS** | Max ~10 Hz; **photosensitive epilepsy WARNING** gate; SOS Morse pattern |
| **Screen Light** | White/red/color; Screen Wake Lock; **primary mode on web** |
| **Themes** | Screen-light colors; rewarded stub unlocks; app themes; remove-ads stub |
| **Settings** | Default on launch; strobe speed; turn off on pause/destroy; battery notes |

**Monetization:** Banner **only** on Settings/Themes — **never** delays Torch ON. Prefer one-time remove-ads stub over coins.

## What works where

| Feature | Web / PWA | Android (+ Torch plugin) |
|---------|-----------|---------------------------|
| Screen Light white/red/color | ✅ | ✅ |
| Screen Wake Lock | ✅ (where supported) | ✅ (+ optional Brightness plugin) |
| Settings persist | ✅ localStorage | ✅ |
| Strobe warning gate + SOS/strobe via screen | ✅ | ✅ |
| LED torch ON/OFF | Stub (points to Screen Light) | ✅ `CameraManager.setTorchMode` |
| Torch strength slider | UI + fallback note | ✅ API 33+ `turnOnTorchWithStrengthLevel` |
| Torch unavailable / camera in use UI | Note shown | ✅ TorchCallback |

## Android Studio build + plugin wire-up

1. Install deps: `npm install`
2. Build web assets: `npm run build:web`
3. Add Android platform (once): `npx cap add android`
4. Sync: `npx cap sync android`
5. Copy plugin: see `android-plugin/README.md` and `plugins/TorchPlugin/`
   - Kotlin: `TorchPlugin.kt` → app java package
   - Merge manifest: `camera` / `camera.flash` **required=false**; no location/mic/storage/contacts
6. Open: `npx cap open android` (or Android Studio → `android/`)
7. Set **compileSdk / targetSdk 36+**
8. Debug APK: `cd android && ./gradlew assembleDebug`

Prefer torch **without** opening a Camera capture session.

## Play checklist

- [ ] Store description includes **photosensitive epilepsy / strobe flashing lights warning**
- [ ] Data safety: core torch does not collect personal data; declare ad SDK if/when live
- [ ] Privacy policy URL (ship `privacy.html` or hosted copy) — torch permission explanation
- [ ] **Owner-signed AAB** (upload key in Play App Signing)
- [ ] **Never commit** keystore / `*.jks` / `key.properties` (see `.gitignore`)
- [ ] `targetSdkVersion` **36+**
- [ ] uses-feature camera/flash `required="false"`
- [ ] No unnecessary permissions (no location/mic/storage/contacts)
- [ ] Strobe frequency capped; warning before enable
- [ ] Ads: banners not on Torch ON path

## Project layout

```
flashlight-torch/
  index.html, privacy.html, css/, js/, icons/, sw.js, manifest.webmanifest
  capacitor.config.json, package.json
  android-plugin/          Kotlin scaffold + manifest snippet
  plugins/TorchPlugin/     README + definitions.ts + Kotlin copy
  scripts/build-web.js     → www + docs + Windows zip
  scripts/smoke.js
  www/                     Capacitor webDir (generated)
  docs/                    Pages-ready copy + README/STATUS + zip
  dist/flashlight-web-windows.zip
  STATUS.md
```

## License

MIT · OfferPk / Mia Smith
