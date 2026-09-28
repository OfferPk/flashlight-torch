/**
 * Strobe / SOS — safe frequency limits (max ~8 Hz default cap 10).
 * Photosensitive epilepsy WARNING must be acknowledged before enable.
 * SOS pattern: ... --- ... (3 short, 3 long, 3 short)
 */
(function (global) {
  'use strict';

  var MAX_HZ = 10;
  var DEFAULT_HZ = 4;
  var MIN_HZ = 1;

  var state = {
    running: false,
    mode: null, // 'strobe' | 'sos'
    hz: DEFAULT_HZ,
    timer: null,
    phaseOn: false,
    sosIndex: 0,
    target: 'torch' // 'torch' | 'screen'
  };

  // SOS units: 1 = short on, 3 = long on, 0 = gap (off unit)
  // Morse SOS: ··· ——— ··· with letter gaps
  var SOS_UNITS = [
    1, 0, 1, 0, 1, // S
    0, 0, 0, // letter gap
    3, 0, 3, 0, 3, // O
    0, 0, 0,
    1, 0, 1, 0, 1, // S
    0, 0, 0, 0, 0, 0, 0 // word gap
  ];

  function clampHz(hz) {
    hz = Number(hz);
    if (isNaN(hz)) return DEFAULT_HZ;
    if (hz < MIN_HZ) return MIN_HZ;
    if (hz > MAX_HZ) return MAX_HZ;
    return hz;
  }

  function hasEpilepsyAck() {
    if (!global.FlashStorage) return false;
    return !!global.FlashStorage.load().epilepsyAck;
  }

  function setEpilepsyAck(v) {
    if (global.FlashStorage) global.FlashStorage.update({ epilepsyAck: !!v });
  }

  async function setOutput(on) {
    state.phaseOn = on;
    if (state.target === 'screen') {
      if (!global.FlashScreenLight) return;
      if (on) {
        var s = global.FlashScreenLight.getState();
        if (!s.on) await global.FlashScreenLight.turnOn({ color: s.color || '#ffffff' });
        var el = document.getElementById('screen-light-overlay');
        if (el) el.style.opacity = '1';
      } else {
        var el2 = document.getElementById('screen-light-overlay');
        if (el2) el2.style.opacity = '0.05';
      }
    } else {
      if (!global.FlashTorch) return;
      if (on) await global.FlashTorch.turnOn();
      else await global.FlashTorch.turnOff();
    }
  }

  function clearTimer() {
    if (state.timer) {
      clearTimeout(state.timer);
      state.timer = null;
    }
  }

  async function stop() {
    clearTimer();
    state.running = false;
    state.mode = null;
    state.sosIndex = 0;
    await setOutput(false);
    if (state.target === 'screen' && global.FlashScreenLight) {
      // leave screen light off after strobe
      await global.FlashScreenLight.turnOff();
    }
    if (global.FlashWake) await global.FlashWake.release('strobe');
    return { ok: true, running: false };
  }

  async function tickStrobe() {
    if (!state.running || state.mode !== 'strobe') return;
    await setOutput(!state.phaseOn);
    var ms = Math.round(1000 / (2 * state.hz));
    state.timer = setTimeout(tickStrobe, ms);
  }

  async function tickSos() {
    if (!state.running || state.mode !== 'sos') return;
    var unit = SOS_UNITS[state.sosIndex % SOS_UNITS.length];
    state.sosIndex++;
    var unitMs = Math.round(1000 / Math.max(2, state.hz)); // base unit ~ related to hz
    if (unit === 0) {
      await setOutput(false);
      state.timer = setTimeout(tickSos, unitMs);
    } else {
      await setOutput(true);
      state.timer = setTimeout(async function () {
        await setOutput(false);
        state.timer = setTimeout(tickSos, unitMs); // inter-element gap
      }, unit * unitMs);
    }
  }

  /**
   * Start strobe. Requires epilepsyAck === true (or pass { forceAck: true } after UI gate).
   */
  async function startStrobe(opts) {
    opts = opts || {};
    if (!opts.forceAck && !hasEpilepsyAck()) {
      return { ok: false, needsWarning: true, reason: 'epilepsy-ack-required' };
    }
    if (opts.forceAck) setEpilepsyAck(true);
    await stop();
    state.hz = clampHz(opts.hz !== undefined ? opts.hz : (global.FlashStorage && global.FlashStorage.load().strobeHz) || DEFAULT_HZ);
    state.target = opts.target || 'torch';
    // On web, torch unavailable → fall back to screen
    if (state.target === 'torch' && global.FlashTorch) {
      var ts = global.FlashTorch.getState();
      if (ts.available === false) state.target = 'screen';
    }
    state.mode = 'strobe';
    state.running = true;
    state.phaseOn = false;
    if (global.FlashWake) await global.FlashWake.request('strobe');
    tickStrobe();
    return { ok: true, mode: 'strobe', hz: state.hz, target: state.target };
  }

  async function startSos(opts) {
    opts = opts || {};
    if (!opts.forceAck && !hasEpilepsyAck()) {
      return { ok: false, needsWarning: true, reason: 'epilepsy-ack-required' };
    }
    if (opts.forceAck) setEpilepsyAck(true);
    await stop();
    state.hz = clampHz(opts.hz !== undefined ? opts.hz : 3);
    state.target = opts.target || 'torch';
    if (state.target === 'torch' && global.FlashTorch) {
      var ts = global.FlashTorch.getState();
      if (ts.available === false) state.target = 'screen';
    }
    state.mode = 'sos';
    state.running = true;
    state.sosIndex = 0;
    if (global.FlashWake) await global.FlashWake.request('strobe');
    tickSos();
    return { ok: true, mode: 'sos', hz: state.hz, target: state.target };
  }

  function getState() {
    return {
      running: state.running,
      mode: state.mode,
      hz: state.hz,
      target: state.target,
      maxHz: MAX_HZ,
      minHz: MIN_HZ,
      epilepsyAck: hasEpilepsyAck()
    };
  }

  global.FlashStrobe = {
    MAX_HZ: MAX_HZ,
    MIN_HZ: MIN_HZ,
    DEFAULT_HZ: DEFAULT_HZ,
    startStrobe: startStrobe,
    startSos: startSos,
    stop: stop,
    clampHz: clampHz,
    hasEpilepsyAck: hasEpilepsyAck,
    setEpilepsyAck: setEpilepsyAck,
    getState: getState
  };
})(typeof window !== 'undefined' ? window : global);
