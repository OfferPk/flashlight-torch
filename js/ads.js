/**
 * AdMob stubs — banner / rewarded.
 * Banner ONLY on Settings / Themes — NEVER delay torch ON for an ad.
 * Rewarded unlocks screen-light colors + remove-ads (one-time stub). Prefer one-time remove-ads over coins.
 */
(function (global) {
  'use strict';

  var state = {
    bannerVisible: false,
    removeAds: false,
    lastReward: null
  };

  function syncFromStorage() {
    if (global.FlashStorage) {
      var s = global.FlashStorage.load();
      state.removeAds = !!s.removeAds;
    }
  }

  function showBanner(slot) {
    syncFromStorage();
    if (state.removeAds) {
      hideBanner();
      return { ok: true, skipped: true, reason: 'remove-ads' };
    }
    // Only settings / themes
    if (slot !== 'settings' && slot !== 'themes') {
      return { ok: false, reason: 'banner-not-allowed-on-' + slot };
    }
    state.bannerVisible = true;
    var el = document.getElementById('ad-banner');
    if (el) {
      el.hidden = false;
      el.setAttribute('data-slot', slot);
      el.querySelector('.ad-label').textContent =
        'Ad stub · ' + slot + ' · (AdMob banner placeholder)';
    }
    return { ok: true, stub: true, slot: slot };
  }

  function hideBanner() {
    state.bannerVisible = false;
    var el = document.getElementById('ad-banner');
    if (el) el.hidden = true;
    return { ok: true };
  }

  /**
   * Rewarded video stub — unlocks a color or remove-ads.
   * Never blocks torch ON.
   */
  function showRewarded(rewardId) {
    syncFromStorage();
    return new Promise(function (resolve) {
      // Simulated short delay; real AdMob would show UI
      setTimeout(function () {
        state.lastReward = rewardId || 'generic';
        var s = global.FlashStorage ? global.FlashStorage.load() : {};
        if (rewardId === 'remove-ads') {
          s.removeAds = true;
          state.removeAds = true;
          if (global.FlashStorage) global.FlashStorage.save(s);
          hideBanner();
          resolve({ ok: true, stub: true, reward: 'remove-ads' });
          return;
        }
        if (rewardId && rewardId.indexOf('color:') === 0) {
          var color = rewardId.slice(6);
          var unlocked = s.unlockedColors || ['#ffffff', '#ff0000'];
          if (unlocked.indexOf(color) === -1) unlocked.push(color);
          s.unlockedColors = unlocked;
          if (global.FlashStorage) global.FlashStorage.save(s);
          resolve({ ok: true, stub: true, reward: 'color', color: color });
          return;
        }
        resolve({ ok: true, stub: true, reward: rewardId || 'generic' });
      }, 400);
    });
  }

  function purchaseRemoveAds() {
    // One-time IAP stub (preferred over coins)
    return showRewarded('remove-ads').then(function (r) {
      r.iapStub = true;
      return r;
    });
  }

  function isRemoveAds() {
    syncFromStorage();
    return state.removeAds;
  }

  global.FlashAds = {
    showBanner: showBanner,
    hideBanner: hideBanner,
    showRewarded: showRewarded,
    purchaseRemoveAds: purchaseRemoveAds,
    isRemoveAds: isRemoveAds,
    _state: state
  };
})(typeof window !== 'undefined' ? window : global);
