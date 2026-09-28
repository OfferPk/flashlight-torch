/**
 * Screen Light — PRIMARY working mode on web.
 * White / red / color at max brightness via CSS + Screen Wake Lock.
 * Optional: attempt screen brightness via Capacitor Brightness plugin stub.
 */
(function (global) {
  'use strict';

  var state = {
    on: false,
    color: '#ffffff',
    brightness: 1.0
  };

  var overlay = null;

  function ensureOverlay() {
    if (overlay) return overlay;
    overlay = document.getElementById('screen-light-overlay');
    return overlay;
  }

  async function setNativeBrightness(level) {
    try {
      if (global.Capacitor && global.Capacitor.Plugins && global.Capacitor.Plugins.Brightness) {
        await global.Capacitor.Plugins.Brightness.setBrightness({ brightness: level });
        return true;
      }
    } catch (_) {}
    return false;
  }

  async function turnOn(opts) {
    opts = opts || {};
    if (opts.color) state.color = opts.color;
    if (opts.brightness !== undefined) state.brightness = clamp01(opts.brightness);
    var el = ensureOverlay();
    if (el) {
      el.style.background = state.color;
      el.style.opacity = String(state.brightness);
      el.hidden = false;
      el.setAttribute('aria-hidden', 'false');
      document.body.classList.add('screen-light-active');
    }
    state.on = true;
    if (global.FlashWake) await global.FlashWake.request('screenlight');
    await setNativeBrightness(Math.max(0.8, state.brightness));
    return { ok: true, on: true, color: state.color, brightness: state.brightness };
  }

  async function turnOff() {
    var el = ensureOverlay();
    if (el) {
      el.hidden = true;
      el.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('screen-light-active');
    }
    state.on = false;
    if (global.FlashWake) await global.FlashWake.release('screenlight');
    return { ok: true, on: false };
  }

  async function toggle(opts) {
    if (state.on) return turnOff();
    return turnOn(opts);
  }

  async function setColor(color) {
    state.color = color;
    if (state.on) {
      var el = ensureOverlay();
      if (el) el.style.background = color;
    }
    return { ok: true, color: color };
  }

  async function setBrightness(level) {
    state.brightness = clamp01(level);
    if (state.on) {
      var el = ensureOverlay();
      if (el) el.style.opacity = String(state.brightness);
      await setNativeBrightness(Math.max(0.5, state.brightness));
    }
    return { ok: true, brightness: state.brightness };
  }

  function clamp01(n) {
    n = Number(n);
    if (isNaN(n)) return 1;
    if (n < 0) return 0;
    if (n > 1) return 1;
    return n;
  }

  function getState() {
    return { on: state.on, color: state.color, brightness: state.brightness };
  }

  // Tap overlay to exit
  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', function () {
      var el = ensureOverlay();
      if (el) {
        el.addEventListener('click', function () {
          turnOff();
          if (global.FlashApp && typeof global.FlashApp.onScreenLightOff === 'function') {
            global.FlashApp.onScreenLightOff();
          }
        });
      }
    });
  }

  global.FlashScreenLight = {
    turnOn: turnOn,
    turnOff: turnOff,
    toggle: toggle,
    setColor: setColor,
    setBrightness: setBrightness,
    getState: getState
  };
})(typeof window !== 'undefined' ? window : global);
