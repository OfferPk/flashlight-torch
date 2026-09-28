# TorchPlugin (Android Capacitor scaffold)

Package: `com.offerpk.flashlight.torch`  
Capacitor plugin name: **`Torch`**  
App id: `com.offerpk.flashlight`

## What it does

- Controls rear LED via `CameraManager.setTorchMode` (API **23+**) — **no capture preview**.
- On API **33+** / Android 13+: `turnOnTorchWithStrengthLevel` when `FLASH_INFO_STRENGTH_MAXIMUM_LEVEL` > 1.
- Registers `CameraManager.TorchCallback` so UI can show **unavailable / camera in use**.

## Wire-up (Android Studio)

1. `npm install && npm run build:web && npx cap add android` (once) then `npx cap sync android`.
2. Copy `TorchPlugin.kt` into the Android app, e.g.  
   `android/app/src/main/java/com/offerpk/flashlight/torch/TorchPlugin.kt`
3. Merge permissions / uses-feature from `AndroidManifest.xml` (camera/flash **required=false**).
4. Register the plugin (Capacitor 6 annotation usually auto-discovers `@CapacitorPlugin`; if not, register in `MainActivity`).
5. Target **API 36+** in `android/variables.gradle` / `compileSdk` / `targetSdk`.
6. Build debug: `cd android && ./gradlew assembleDebug`.

## JS interface (already in `js/torch.js`)

```ts
interface TorchPlugin {
  isAvailable(): Promise<{
    available: boolean;
    reason?: string;
    strengthSupported?: boolean;
    maxStrength?: number;
  }>;
  turnOn(): Promise<{ on: boolean }>;
  turnOnWithStrength(options: { level: number }): Promise<{ on: boolean; strength: number }>;
  turnOff(): Promise<{ on: boolean }>;
  addListener(
    event: 'torchAvailabilityChanged',
    cb: (info: { available: boolean; reason?: string }) => void
  ): Promise<PluginListenerHandle>;
}
```

## Notes

- Prefer torch **without** opening `Camera` capture.
- Never commit keystores / `key.properties` / `*.jks`.
- Owner-signed AAB for Play; Data safety: no personal data collection for core torch.
- Store listing must mention **photosensitive epilepsy / strobe warning**.
