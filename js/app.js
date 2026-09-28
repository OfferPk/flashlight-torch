/**
 * Offer Torch / Flashlight — main UI controller.
 * Screens: Torch | Strobe/SOS | Screen Light | Themes | Settings
 */
(function (global) {
  'use strict';

  var settings = null;
  var FREE_COLORS = ['#ffffff', '#ff0000'];
  var PREMIUM_COLORS = [
    { id: 'amber', hex: '#ffbf00', label: 'Amber' },
    { id: 'blue', hex: '#3b82f6', label: 'Blue' },
    { id: 'green', hex: '#22c55e', label: 'Green' },
    { id: 'purple', hex: '#a855f7', label: 'Purple' },
    { id: 'pink', hex: '#ec4899', label: 'Pink' },
    { id: 'cyan', hex: '#06b6d4', label: 'Cyan' }
  ];
  var THEMES = [
    { id: 'classic', name: 'Classic Dark', accent: '#fbbf24' },
    { id: 'ocean', name: 'Ocean', accent: '#38bdf8' },
    { id: 'forest', name: 'Forest', accent: '#4ade80' },
    { id: 'rose', name: 'Rose', accent: '#fb7185' }
  ];

  function $(id) {
    return document.getElementById(id);
  }

  function qs(sel, root) {
    return (root || document).querySelector(sel);
  }

  function qsa(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  function toast(msg, ms) {
    var el = $('toast');
    if (!el) return;
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(function () {
      el.hidden = true;
    }, ms || 2200);
  }

  function applyTheme(themeId) {
    var t = THEMES.find(function (x) {
      return x.id === themeId;
    }) || THEMES[0];
    document.documentElement.setAttribute('data-theme', t.id);
    document.documentElement.style.setProperty('--accent', t.accent);
  }

  function showTab(tab) {
    qsa('.tab-panel').forEach(function (p) {
      p.hidden = p.getAttribute('data-tab') !== tab;
    });
    qsa('.nav-btn').forEach(function (b) {
      var on = b.getAttribute('data-tab') === tab;
      b.classList.toggle('active', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    settings.lastTab = tab;
    FlashStorage.save(settings);

    // Banner ONLY settings / themes
    if (tab === 'settings' || tab === 'themes') {
      FlashAds.showBanner(tab);
    } else {
      FlashAds.hideBanner();
    }
  }

  function updateTorchUI() {
    var st = FlashTorch.getState();
    var btn = $('torch-toggle');
    var status = $('torch-status');
    var note = $('torch-note');
    var strengthWrap = $('strength-wrap');
    var unavail = $('torch-unavailable');

    if (btn) {
      btn.classList.toggle('on', !!st.on);
      btn.setAttribute('aria-pressed', st.on ? 'true' : 'false');
      btn.querySelector('.torch-label').textContent = st.on ? 'ON' : 'OFF';
    }
    if (status) {
      status.textContent = st.on ? 'Torch is ON' : 'Torch is OFF';
    }
    if (note) {
      if (!st.isNative || st.available === false) {
        note.hidden = false;
        note.textContent =
          'LED torch needs the Android Torch plugin. On web, use Screen Light (fully working). Strength slider is shown; native API 33+ applies level.';
      } else if (st.unavailableReason === 'camera-in-use') {
        note.hidden = false;
        note.textContent = 'Camera in use — torch unavailable. Close camera apps and retry.';
      } else {
        note.hidden = !st.unavailableReason;
        if (st.unavailableReason) note.textContent = 'Unavailable: ' + st.unavailableReason;
      }
    }
    if (unavail) {
      var show = st.available === false || st.unavailableReason === 'camera-in-use';
      unavail.hidden = !show;
    }
    if (strengthWrap) {
      var tip = $('strength-tip');
      if (tip) {
        tip.textContent = st.strengthSupported
          ? 'Brightness supported (API 33+)'
          : 'Strength UI always shown · applies on devices with setTorchStrength / API 33+';
      }
    }
    var slider = $('strength-slider');
    if (slider) slider.value = String(Math.round(st.strength * 100));
    var val = $('strength-val');
    if (val) val.textContent = Math.round(st.strength * 100) + '%';
  }

  function updateScreenUI() {
    var st = FlashScreenLight.getState();
    var btn = $('screen-toggle');
    if (btn) {
      btn.classList.toggle('on', !!st.on);
      btn.setAttribute('aria-pressed', st.on ? 'true' : 'false');
      btn.querySelector('.screen-label').textContent = st.on ? 'ON — tap screen to exit' : 'OFF';
    }
    var brightness = $('screen-brightness');
    if (brightness) brightness.value = String(Math.round(st.brightness * 100));
    var bv = $('screen-brightness-val');
    if (bv) bv.textContent = Math.round(st.brightness * 100) + '%';
    highlightColorSwatches(st.color);
  }

  function highlightColorSwatches(color) {
    qsa('.color-swatch').forEach(function (s) {
      s.classList.toggle('selected', s.getAttribute('data-color').toLowerCase() === color.toLowerCase());
    });
  }

  function updateStrobeUI() {
    var st = FlashStrobe.getState();
    var runBtn = $('strobe-toggle');
    var sosBtn = $('sos-toggle');
    if (runBtn) {
      runBtn.classList.toggle('on', st.running && st.mode === 'strobe');
      runBtn.textContent = st.running && st.mode === 'strobe' ? 'Stop Strobe' : 'Start Strobe';
    }
    if (sosBtn) {
      sosBtn.classList.toggle('on', st.running && st.mode === 'sos');
      sosBtn.textContent = st.running && st.mode === 'sos' ? 'Stop SOS' : 'Start SOS';
    }
    var hz = $('strobe-hz');
    if (hz) hz.value = String(st.hz || settings.strobeHz);
    var hzVal = $('strobe-hz-val');
    if (hzVal) hzVal.textContent = (st.hz || settings.strobeHz) + ' Hz (max ' + FlashStrobe.MAX_HZ + ')';
  }

  function updateThemesUI() {
    var unlocked = settings.unlockedColors || FREE_COLORS.slice();
    var grid = $('color-grid');
    if (grid) {
      grid.innerHTML = '';
      FREE_COLORS.forEach(function (hex) {
        grid.appendChild(makeSwatch(hex, false));
      });
      PREMIUM_COLORS.forEach(function (c) {
        var locked = unlocked.indexOf(c.hex) === -1 && !settings.removeAds;
        grid.appendChild(makeSwatch(c.hex, locked, c.label));
      });
    }
    var themeList = $('theme-list');
    if (themeList) {
      themeList.innerHTML = '';
      THEMES.forEach(function (t) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'theme-card' + (settings.themeId === t.id ? ' selected' : '');
        b.innerHTML = '<span class="theme-dot" style="background:' + t.accent + '"></span><span>' + t.name + '</span>';
        b.addEventListener('click', function () {
          settings.themeId = t.id;
          FlashStorage.save(settings);
          applyTheme(t.id);
          updateThemesUI();
          toast('Theme: ' + t.name);
        });
        themeList.appendChild(b);
      });
    }
    var adsStatus = $('ads-status');
    if (adsStatus) {
      adsStatus.textContent = settings.removeAds
        ? 'Ads removed (stub unlock active)'
        : 'Banner ads on Settings/Themes only';
    }
  }

  function makeSwatch(hex, locked, label) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'color-swatch' + (locked ? ' locked' : '');
    b.setAttribute('data-color', hex);
    b.style.setProperty('--swatch', hex);
    b.title = (label || hex) + (locked ? ' (unlock)' : '');
    b.innerHTML = locked ? '<span class="lock">🔒</span>' : '';
    b.addEventListener('click', async function () {
      if (locked) {
        var r = await FlashAds.showRewarded('color:' + hex);
        if (r.ok) {
          settings = FlashStorage.load();
          toast('Unlocked ' + (label || hex));
          updateThemesUI();
        }
        return;
      }
      settings.screenColor = hex;
      FlashStorage.save(settings);
      await FlashScreenLight.setColor(hex);
      highlightColorSwatches(hex);
      if (!FlashScreenLight.getState().on) {
        // preview hint
        toast('Color set — open Screen Light to use');
      }
    });
    return b;
  }

  function updateSettingsUI() {
    $('opt-default-on').checked = !!settings.defaultOnLaunch;
    $('opt-default-mode').value = settings.defaultMode || 'torch';
    $('opt-strobe-hz').value = String(settings.strobeHz);
    $('opt-strobe-hz-val').textContent = settings.strobeHz + ' Hz';
    $('opt-off-pause').checked = !!settings.turnOffOnPause;
    $('opt-off-destroy').checked = !!settings.turnOffOnDestroy;
  }

  async function gateEpilepsyThen(startFn) {
    if (FlashStrobe.hasEpilepsyAck()) {
      return startFn({ forceAck: false });
    }
    var modal = $('epilepsy-modal');
    if (!modal) return { ok: false, reason: 'no-modal' };
    return new Promise(function (resolve) {
      modal.hidden = false;
      function cleanup() {
        modal.hidden = true;
        $('epilepsy-accept').removeEventListener('click', onYes);
        $('epilepsy-cancel').removeEventListener('click', onNo);
      }
      async function onYes() {
        cleanup();
        FlashStrobe.setEpilepsyAck(true);
        settings.epilepsyAck = true;
        FlashStorage.save(settings);
        resolve(await startFn({ forceAck: true }));
      }
      function onNo() {
        cleanup();
        resolve({ ok: false, cancelled: true });
      }
      $('epilepsy-accept').addEventListener('click', onYes);
      $('epilepsy-cancel').addEventListener('click', onNo);
    });
  }

  async function allOff() {
    await FlashStrobe.stop();
    await FlashTorch.turnOff();
    await FlashScreenLight.turnOff();
    if (FlashWake) await FlashWake.release();
    updateTorchUI();
    updateScreenUI();
    updateStrobeUI();
  }

  function bind() {
    // Nav
    qsa('.nav-btn').forEach(function (b) {
      b.addEventListener('click', function () {
        showTab(b.getAttribute('data-tab'));
      });
    });

    // Torch
    $('torch-toggle').addEventListener('click', async function () {
      var st = FlashTorch.getState();
      if (!st.isNative || st.available === false) {
        toast('No LED on web — switching to Screen Light');
        showTab('screen');
        await FlashScreenLight.turnOn({ color: settings.screenColor, brightness: settings.screenBrightness });
        updateScreenUI();
        return;
      }
      if (st.on) {
        await FlashTorch.turnOff();
        if (FlashWake) await FlashWake.release('torch');
      } else {
        var r = await FlashTorch.turnOn(settings.torchStrength);
        if (r.ok) {
          if (FlashWake) await FlashWake.request('torch');
        } else {
          toast(r.reason || 'Torch failed');
        }
      }
      updateTorchUI();
    });

    $('strength-slider').addEventListener('input', async function (e) {
      var v = Number(e.target.value) / 100;
      settings.torchStrength = v;
      FlashStorage.save(settings);
      await FlashTorch.setStrength(v);
      updateTorchUI();
    });

    // Screen light
    $('screen-toggle').addEventListener('click', async function () {
      var st = FlashScreenLight.getState();
      if (st.on) {
        await FlashScreenLight.turnOff();
      } else {
        await FlashScreenLight.turnOn({
          color: settings.screenColor,
          brightness: settings.screenBrightness
        });
      }
      updateScreenUI();
    });

    $('screen-brightness').addEventListener('input', async function (e) {
      var v = Number(e.target.value) / 100;
      settings.screenBrightness = v;
      FlashStorage.save(settings);
      await FlashScreenLight.setBrightness(v);
      updateScreenUI();
    });

    $('btn-white').addEventListener('click', async function () {
      settings.screenColor = '#ffffff';
      FlashStorage.save(settings);
      await FlashScreenLight.setColor('#ffffff');
      if (!FlashScreenLight.getState().on) {
        await FlashScreenLight.turnOn({ color: '#ffffff', brightness: settings.screenBrightness });
      }
      updateScreenUI();
    });

    $('btn-red').addEventListener('click', async function () {
      settings.screenColor = '#ff0000';
      FlashStorage.save(settings);
      await FlashScreenLight.setColor('#ff0000');
      if (!FlashScreenLight.getState().on) {
        await FlashScreenLight.turnOn({ color: '#ff0000', brightness: settings.screenBrightness });
      }
      updateScreenUI();
    });

    // Strobe / SOS
    $('strobe-toggle').addEventListener('click', async function () {
      var st = FlashStrobe.getState();
      if (st.running && st.mode === 'strobe') {
        await FlashStrobe.stop();
        updateStrobeUI();
        updateTorchUI();
        updateScreenUI();
        return;
      }
      var hz = FlashStrobe.clampHz(Number($('strobe-hz').value) || settings.strobeHz);
      settings.strobeHz = hz;
      FlashStorage.save(settings);
      var r = await gateEpilepsyThen(function (opts) {
        return FlashStrobe.startStrobe({ hz: hz, target: 'torch', forceAck: opts.forceAck });
      });
      if (r.cancelled) toast('Strobe cancelled');
      else if (!r.ok && r.needsWarning) toast('Acknowledge warning first');
      else if (r.ok) toast('Strobe ' + r.hz + ' Hz via ' + r.target);
      updateStrobeUI();
      updateTorchUI();
      updateScreenUI();
    });

    $('sos-toggle').addEventListener('click', async function () {
      var st = FlashStrobe.getState();
      if (st.running && st.mode === 'sos') {
        await FlashStrobe.stop();
        updateStrobeUI();
        updateTorchUI();
        updateScreenUI();
        return;
      }
      var r = await gateEpilepsyThen(function (opts) {
        return FlashStrobe.startSos({ hz: 3, target: 'torch', forceAck: opts.forceAck });
      });
      if (r.cancelled) toast('SOS cancelled');
      else if (r.ok) toast('SOS via ' + r.target);
      updateStrobeUI();
      updateTorchUI();
      updateScreenUI();
    });

    $('strobe-hz').addEventListener('input', function (e) {
      var hz = FlashStrobe.clampHz(Number(e.target.value));
      e.target.value = String(hz);
      settings.strobeHz = hz;
      FlashStorage.save(settings);
      updateStrobeUI();
    });

    $('strobe-stop-all').addEventListener('click', async function () {
      await allOff();
      toast('All lights off');
    });

    // Themes / ads
    $('btn-remove-ads').addEventListener('click', async function () {
      var r = await FlashAds.purchaseRemoveAds();
      settings = FlashStorage.load();
      if (r.ok) {
        toast('Ads removed (one-time stub)');
        updateThemesUI();
        FlashAds.hideBanner();
      }
    });

    $('btn-reward-colors').addEventListener('click', async function () {
      // Unlock next locked premium color
      var unlocked = settings.unlockedColors || FREE_COLORS.slice();
      var next = PREMIUM_COLORS.find(function (c) {
        return unlocked.indexOf(c.hex) === -1;
      });
      if (!next) {
        toast('All colors unlocked');
        return;
      }
      var r = await FlashAds.showRewarded('color:' + next.hex);
      settings = FlashStorage.load();
      if (r.ok) {
        toast('Unlocked ' + next.label);
        updateThemesUI();
      }
    });

    // Settings
    $('opt-default-on').addEventListener('change', function (e) {
      settings.defaultOnLaunch = !!e.target.checked;
      FlashStorage.save(settings);
    });
    $('opt-default-mode').addEventListener('change', function (e) {
      settings.defaultMode = e.target.value;
      FlashStorage.save(settings);
    });
    $('opt-strobe-hz').addEventListener('input', function (e) {
      var hz = FlashStrobe.clampHz(Number(e.target.value));
      e.target.value = String(hz);
      settings.strobeHz = hz;
      FlashStorage.save(settings);
      $('opt-strobe-hz-val').textContent = hz + ' Hz';
      $('strobe-hz').value = String(hz);
      updateStrobeUI();
    });
    $('opt-off-pause').addEventListener('change', function (e) {
      settings.turnOffOnPause = !!e.target.checked;
      FlashStorage.save(settings);
    });
    $('opt-off-destroy').addEventListener('change', function (e) {
      settings.turnOffOnDestroy = !!e.target.checked;
      FlashStorage.save(settings);
    });
    $('btn-reset-settings').addEventListener('click', function () {
      settings = FlashStorage.reset();
      applyTheme(settings.themeId);
      updateSettingsUI();
      updateThemesUI();
      updateTorchUI();
      updateScreenUI();
      updateStrobeUI();
      toast('Settings reset');
    });

    // Pause / destroy behavior
    document.addEventListener('visibilitychange', async function () {
      if (document.visibilityState === 'hidden' && settings.turnOffOnPause) {
        await allOff();
      }
    });
    window.addEventListener('pagehide', async function () {
      if (settings.turnOffOnDestroy) await allOff();
    });
  }

  async function init() {
    settings = FlashStorage.load();
    applyTheme(settings.themeId);
    bind();
    await FlashTorch.probe();
    FlashTorch.setStrength(settings.torchStrength);
    updateTorchUI();
    updateScreenUI();
    updateStrobeUI();
    updateThemesUI();
    updateSettingsUI();

    var startTab = settings.lastTab || 'torch';
    showTab(startTab);

    if (settings.defaultOnLaunch) {
      if (settings.defaultMode === 'screen') {
        showTab('screen');
        await FlashScreenLight.turnOn({
          color: settings.screenColor,
          brightness: settings.screenBrightness
        });
        updateScreenUI();
      } else {
        var st = FlashTorch.getState();
        if (st.isNative && st.available) {
          await FlashTorch.turnOn(settings.torchStrength);
          if (FlashWake) await FlashWake.request('torch');
          updateTorchUI();
        } else {
          showTab('screen');
          await FlashScreenLight.turnOn({
            color: settings.screenColor,
            brightness: settings.screenBrightness
          });
          updateScreenUI();
        }
      }
    }

    // Register SW for PWA
    if ('serviceWorker' in navigator) {
      try {
        await navigator.serviceWorker.register('./sw.js');
      } catch (_) {}
    }
  }

  global.FlashApp = {
    onScreenLightOff: function () {
      updateScreenUI();
    },
    allOff: allOff,
    showTab: showTab,
    getSettings: function () {
      return settings;
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(typeof window !== 'undefined' ? window : global);
