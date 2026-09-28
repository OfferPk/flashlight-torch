/**
 * Screen Wake Lock (web) + Capacitor KeepAwake stub interface.
 * Keep awake while torch / screen-light is on.
 */
(function (global) {
  'use strict';

  var sentinel = null;
  var active = false;
  var reasons = {};

  function isSupported() {
    return !!(typeof navigator !== 'undefined' && navigator.wakeLock && navigator.wakeLock.request);
  }

  async function request(reason) {
    reasons[reason || 'default'] = true;
    if (active && sentinel) return { ok: true, already: true };
    if (!isSupported()) {
      active = true; // logical flag even without API
      return { ok: false, reason: 'wake-lock-unsupported', logical: true };
    }
    try {
      sentinel = await navigator.wakeLock.request('screen');
      active = true;
      sentinel.addEventListener('release', function () {
        sentinel = null;
        active = false;
      });
      return { ok: true };
    } catch (e) {
      active = true;
      return { ok: false, reason: String(e && e.message || e), logical: true };
    }
  }

  async function release(reason) {
    if (reason) delete reasons[reason];
    else reasons = {};
    if (Object.keys(reasons).length > 0) {
      return { ok: true, deferred: true, remaining: Object.keys(reasons) };
    }
    if (sentinel) {
      try {
        await sentinel.release();
      } catch (_) {}
      sentinel = null;
    }
    active = false;
    return { ok: true };
  }

  function isActive() {
    return active || Object.keys(reasons).length > 0;
  }

  // Re-acquire on visibility change if still needed
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible' && Object.keys(reasons).length > 0) {
        request(Object.keys(reasons)[0]);
      }
    });
  }

  global.FlashWake = {
    isSupported: isSupported,
    request: request,
    release: release,
    isActive: isActive
  };
})(typeof window !== 'undefined' ? window : global);
