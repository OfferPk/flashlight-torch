# STATUS — Offer Torch / Flashlight

**Version:** `1.0.0-complete`  
**Path:** `/workspace/apps/flashlight-torch`  
**Owner pass:** COMPLETE (v1 offline)  
**Date:** 2026-09-28 (Asia/Karachi)

## Checklist

- [x] Capacitor + HTML/CSS/JS PWA scaffold
- [x] Package id `com.offerpk.flashlight` · App name Offer Torch / Flashlight
- [x] Torch screen — big ON/OFF + strength slider + unavailable/camera-in-use UI
- [x] Strobe/SOS — max Hz cap, epilepsy WARNING modal before enable, SOS pattern
- [x] Screen Light — white/red/color, Wake Lock, primary web mode
- [x] Themes — colors, rewarded stub, remove-ads stub, app themes
- [x] Settings — default on launch, strobe speed, pause/destroy off, battery notes
- [x] Keep awake while torch/screen-light on (`FlashWake`)
- [x] Banner ONLY settings/themes; never delay torch ON
- [x] `privacy.html` local — torch permission explanation; no loc/mic/storage/contacts
- [x] Kotlin plugin scaffold `android-plugin/` + `plugins/TorchPlugin` + README
- [x] uses-feature camera/flash required=false (manifest snippet)
- [x] PWA manifest + service worker
- [x] `capacitor.config.json`
- [x] Ads stubs (`js/ads.js`)
- [x] `README.md` — Android Studio, plugin wire-up, Play checklist (API 36+, no keystore commit, strobe warning, Data safety, owner-signed AAB)
- [x] `build-web` → `www/` + `docs/`
- [x] `dist/flashlight-web-windows.zip` + `PLAY-WINDOWS.bat`
- [x] `node --check` + smoke (screen light, strobe gate, settings persist)
- [x] No git push · no secrets/keystores

## Verify commands

```bash
npm run check
npm run smoke
npm run build:web
```

## Web vs Android

- **Works on web now:** Screen Light, themes/settings persist, strobe/SOS via screen + warning gate, PWA offline shell, ads stubs.
- **Needs Android Torch plugin:** Real LED ON/OFF, strength level (API 33+), TorchCallback unavailable / camera-in-use.

## Monetization note

Rewarded stub unlocks colors / remove-banner. Prefer one-time remove-ads over coins. Torch path ad-free.
