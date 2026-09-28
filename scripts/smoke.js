#!/usr/bin/env node
/**
 * Smoke tests without hardware:
 * - node syntax already covered by npm run check
 * - storage persist
 * - strobe epilepsy gate
 * - screen light / torch stub APIs (jsdom-less via vm + mocks)
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.join(__dirname, '..');
let passed = 0;
function ok(name) {
  passed++;
  console.log('  ✓', name);
}

// --- Minimal browser mocks ---
const store = {};
const localStorage = {
  getItem: (k) => (store[k] === undefined ? null : store[k]),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; }
};

const overlay = {
  style: { background: '', opacity: '' },
  hidden: true,
  setAttribute: function () {},
  addEventListener: function () {}
};

const bodyClass = { list: [], add: function (c) { this.list.push(c); }, remove: function (c) { this.list = this.list.filter((x) => x !== c); } };

const documentMock = {
  body: { classList: bodyClass },
  getElementById: function (id) {
    if (id === 'screen-light-overlay') return overlay;
    return null;
  },
  addEventListener: function () {},
  readyState: 'complete',
  visibilityState: 'visible'
};

const navigatorMock = {
  wakeLock: {
    request: async function () {
      return {
        addEventListener: function () {},
        release: async function () {}
      };
    }
  }
};

const sandbox = {
  console,
  localStorage,
  document: documentMock,
  navigator: navigatorMock,
  window: {},
  setTimeout,
  clearTimeout,
  global: {}
};
sandbox.window = sandbox;
sandbox.global = sandbox;

function load(rel) {
  const code = fs.readFileSync(path.join(root, rel), 'utf8');
  vm.runInNewContext(code, sandbox, { filename: rel });
}

console.log('Smoke: Offer Torch');

load('js/storage.js');
load('js/ads.js');
load('js/wake.js');
load('js/torch.js');
load('js/screenlight.js');
load('js/strobe.js');

(async function main() {
  // Settings persist
  const s1 = sandbox.FlashStorage.load();
  assert.strictEqual(s1.version, '1.0.0-complete');
  sandbox.FlashStorage.update({ strobeHz: 7, themeId: 'ocean', defaultOnLaunch: true });
  const s2 = sandbox.FlashStorage.load();
  assert.strictEqual(s2.strobeHz, 7);
  assert.strictEqual(s2.themeId, 'ocean');
  assert.strictEqual(s2.defaultOnLaunch, true);
  ok('settings persist (strobeHz/theme/defaultOnLaunch)');

  // Torch stub on web
  const probe = await sandbox.FlashTorch.probe();
  assert.strictEqual(probe.available, false);
  assert.ok(String(probe.reason).includes('web-stub') || probe.platform === 'web');
  const on = await sandbox.FlashTorch.turnOn(0.8);
  assert.strictEqual(on.ok, false);
  assert.ok(on.stub);
  ok('torch web stub rejects LED ON with guidance');

  // Screen light works
  const sl = await sandbox.FlashScreenLight.turnOn({ color: '#ff0000', brightness: 1 });
  assert.strictEqual(sl.ok, true);
  assert.strictEqual(sl.on, true);
  assert.strictEqual(overlay.hidden, false);
  assert.strictEqual(overlay.style.background, '#ff0000');
  await sandbox.FlashScreenLight.setColor('#ffffff');
  assert.strictEqual(overlay.style.background, '#ffffff');
  await sandbox.FlashScreenLight.turnOff();
  assert.strictEqual(overlay.hidden, true);
  ok('screen light toggle + color (web primary)');

  // Wake lock logical
  await sandbox.FlashWake.request('test');
  assert.ok(sandbox.FlashWake.isActive());
  await sandbox.FlashWake.release('test');
  ok('wake lock request/release');

  // Strobe epilepsy gate
  sandbox.FlashStorage.update({ epilepsyAck: false });
  const blocked = await sandbox.FlashStrobe.startStrobe({ hz: 4, target: 'screen' });
  assert.strictEqual(blocked.ok, false);
  assert.strictEqual(blocked.needsWarning, true);
  ok('strobe blocked without epilepsy ack');

  const allowed = await sandbox.FlashStrobe.startStrobe({ hz: 4, target: 'screen', forceAck: true });
  assert.strictEqual(allowed.ok, true);
  assert.strictEqual(sandbox.FlashStrobe.hasEpilepsyAck(), true);
  assert.ok(sandbox.FlashStrobe.getState().running);
  // Hz clamp
  assert.strictEqual(sandbox.FlashStrobe.clampHz(99), 10);
  assert.strictEqual(sandbox.FlashStrobe.clampHz(0), 1);
  await sandbox.FlashStrobe.stop();
  assert.strictEqual(sandbox.FlashStrobe.getState().running, false);
  ok('strobe starts after ack + Hz clamp + stop');

  const sos = await sandbox.FlashStrobe.startSos({ forceAck: true, target: 'screen' });
  assert.strictEqual(sos.ok, true);
  await sandbox.FlashStrobe.stop();
  ok('SOS start/stop');

  // Ads: banner only settings/themes; torch blocked
  const bad = sandbox.FlashAds.showBanner('torch');
  assert.strictEqual(bad.ok, false);
  const good = sandbox.FlashAds.showBanner('settings');
  assert.strictEqual(good.ok, true);
  const reward = await sandbox.FlashAds.purchaseRemoveAds();
  assert.strictEqual(reward.ok, true);
  assert.strictEqual(sandbox.FlashStorage.load().removeAds, true);
  ok('ads banner gated + remove-ads stub');

  // Files exist
  for (const f of [
    'index.html', 'privacy.html', 'capacitor.config.json', 'STATUS.md', 'README.md',
    'android-plugin/src/main/java/com/offerpk/flashlight/torch/TorchPlugin.kt',
    'plugins/TorchPlugin/README.md', 'manifest.webmanifest', 'sw.js'
  ]) {
    assert.ok(fs.existsSync(path.join(root, f)), 'missing ' + f);
  }
  ok('required files present');

  // package version
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  assert.strictEqual(pkg.version, '1.0.0-complete');
  assert.strictEqual(JSON.parse(fs.readFileSync(path.join(root, 'capacitor.config.json'), 'utf8')).appId, 'com.offerpk.flashlight');
  ok('version 1.0.0-complete + appId');

  console.log('\nAll smoke checks passed:', passed);
})().catch((e) => {
  console.error('SMOKE FAIL', e);
  process.exit(1);
});
