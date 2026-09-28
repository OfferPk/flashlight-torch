/**
 * Persistent settings via localStorage (offline-first).
 */
(function (global) {
  'use strict';

  var KEY = 'offerpk.flashlight.settings.v1';
  var DEFAULTS = {
    version: '1.0.0-complete',
    defaultOnLaunch: false,
    defaultMode: 'torch', // torch | screen
    strobeHz: 4,
    turnOffOnPause: true,
    turnOffOnDestroy: true,
    torchStrength: 1.0,
    screenColor: '#ffffff',
    screenBrightness: 1.0,
    themeId: 'classic',
    removeAds: false,
    unlockedColors: ['#ffffff', '#ff0000'],
    epilepsyAck: false,
    lastTab: 'torch'
  };

  function deepClone(o) {
    return JSON.parse(JSON.stringify(o));
  }

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return deepClone(DEFAULTS);
      var parsed = JSON.parse(raw);
      var out = deepClone(DEFAULTS);
      Object.keys(DEFAULTS).forEach(function (k) {
        if (parsed[k] !== undefined) out[k] = parsed[k];
      });
      return out;
    } catch (e) {
      return deepClone(DEFAULTS);
    }
  }

  function save(settings) {
    try {
      localStorage.setItem(KEY, JSON.stringify(settings));
      return true;
    } catch (e) {
      return false;
    }
  }

  function update(patch) {
    var s = load();
    Object.keys(patch).forEach(function (k) {
      s[k] = patch[k];
    });
    save(s);
    return s;
  }

  function reset() {
    save(deepClone(DEFAULTS));
    return deepClone(DEFAULTS);
  }

  global.FlashStorage = {
    KEY: KEY,
    DEFAULTS: DEFAULTS,
    load: load,
    save: save,
    update: update,
    reset: reset
  };
})(typeof window !== 'undefined' ? window : global);
