/**
 * LED Torch — Capacitor plugin interface + web stub.
 *
 * Native (Android): CameraManager.setTorchMode (API 23+)
 *                   turnOnTorchWithStrengthLevel (API 33+/Android 13+)
 * Prefer torch without opening Camera capture session.
 *
 * Web: stub only — use Screen Light as primary mode.
 */
(function (global) {
  'use strict';

  var PLUGIN = 'Torch';
  var state = {
    on: false,
    strength: 1.0,
    available: null, // null = unknown until probe
    unavailableReason: null,
    strengthSupported: false,
    maxStrength: 1
  };

  function hasCapacitor() {
    return !!(global.Capacitor && typeof global.Capacitor.isNativePlatform === 'function' &&
      global.Capacitor.isNativePlatform());
  }

  function getPlugin() {
    if (!hasCapacitor()) return null;
    try {
      if (global.Capacitor.Plugins && global.Capacitor.Plugins[PLUGIN]) {
        return global.Capacitor.Plugins[PLUGIN];
      }
      if (typeof global.Capacitor.registerPlugin === 'function') {
        return global.Capacitor.registerPlugin(PLUGIN);
      }
    } catch (_) {}
    return null;
  }

  async function probe() {
    var plugin = getPlugin();
    if (!plugin) {
      state.available = false;
      state.unavailableReason = 'web-stub-no-led';
      state.strengthSupported = false;
      return {
        available: false,
        reason: state.unavailableReason,
        strengthSupported: false,
        platform: 'web'
      };
    }
    try {
      var info = await plugin.isAvailable();
      state.available = !!info.available;
      state.unavailableReason = info.reason || (info.available ? null : 'unavailable');
      state.strengthSupported = !!info.strengthSupported;
      state.maxStrength = info.maxStrength || 1;
      return {
        available: state.available,
        reason: state.unavailableReason,
        strengthSupported: state.strengthSupported,
        maxStrength: state.maxStrength,
        platform: 'native'
      };
    } catch (e) {
      state.available = false;
      state.unavailableReason = 'probe-error:' + (e && e.message || e);
      return { available: false, reason: state.unavailableReason, platform: 'native' };
    }
  }

  async function turnOn(strength) {
    if (strength !== undefined) state.strength = clamp01(strength);
    var plugin = getPlugin();
    if (!plugin) {
      state.on = false;
      return {
        ok: false,
        stub: true,
        reason: 'LED torch requires Android plugin (CameraManager.setTorchMode). Use Screen Light on web.'
      };
    }
    try {
      var level = state.strength;
      var res;
      if (state.strengthSupported && typeof plugin.turnOnWithStrength === 'function') {
        res = await plugin.turnOnWithStrength({ level: level });
      } else {
        res = await plugin.turnOn({});
      }
      state.on = true;
      return { ok: true, on: true, strength: level, native: res };
    } catch (e) {
      state.on = false;
      var msg = String(e && e.message || e);
      if (/camera.?in.?use|in.?use|busy/i.test(msg)) {
        state.unavailableReason = 'camera-in-use';
      }
      return { ok: false, reason: msg };
    }
  }

  async function turnOff() {
    var plugin = getPlugin();
    state.on = false;
    if (!plugin) return { ok: true, stub: true };
    try {
      await plugin.turnOff({});
      return { ok: true, on: false };
    } catch (e) {
      return { ok: false, reason: String(e && e.message || e) };
    }
  }

  async function setStrength(level) {
    state.strength = clamp01(level);
    if (!state.on) return { ok: true, deferred: true, strength: state.strength };
    if (!state.strengthSupported) {
      return { ok: true, note: 'strength-not-supported-on-this-api', strength: state.strength };
    }
    return turnOn(state.strength);
  }

  async function toggle() {
    if (state.on) return turnOff();
    return turnOn(state.strength);
  }

  function clamp01(n) {
    n = Number(n);
    if (isNaN(n)) return 1;
    if (n < 0) return 0;
    if (n > 1) return 1;
    return n;
  }

  function getState() {
    return {
      on: state.on,
      strength: state.strength,
      available: state.available,
      unavailableReason: state.unavailableReason,
      strengthSupported: state.strengthSupported,
      maxStrength: state.maxStrength,
      isNative: hasCapacitor()
    };
  }

  /**
   * Capacitor plugin TypeScript-style interface (documented for wire-up):
   *
   * interface TorchPlugin {
   *   isAvailable(): Promise<{ available: boolean; reason?: string;
   *     strengthSupported?: boolean; maxStrength?: number }>;
   *   turnOn(): Promise<void>;
   *   turnOnWithStrength(options: { level: number }): Promise<void>; // 0..1
   *   turnOff(): Promise<void>;
   *   addListener(event: 'torchAvailabilityChanged', cb): Promise<PluginListenerHandle>;
   * }
   */

  global.FlashTorch = {
    probe: probe,
    turnOn: turnOn,
    turnOff: turnOff,
    setStrength: setStrength,
    toggle: toggle,
    getState: getState,
    PLUGIN_NAME: PLUGIN
  };
})(typeof window !== 'undefined' ? window : global);
