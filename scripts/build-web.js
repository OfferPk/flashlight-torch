#!/usr/bin/env node
/**
 * build-web → www/ (Capacitor) + docs/ (Pages) + dist/flashlight-web-windows.zip
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = path.join(__dirname, '..');
const www = path.join(root, 'www');
const docs = path.join(root, 'docs');
const dist = path.join(root, 'dist');

const WEB_FILES = [
  'index.html',
  'privacy.html',
  'manifest.webmanifest',
  'sw.js',
  'css',
  'js',
  'icons'
];

function rmrf(p) {
  if (!fs.existsSync(p)) return;
  fs.rmSync(p, { recursive: true, force: true });
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const e of fs.readdirSync(src)) {
    const s = path.join(src, e);
    const d = path.join(dest, e);
    if (fs.lstatSync(s).isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

function copyWebInto(dest) {
  rmrf(dest);
  fs.mkdirSync(dest, { recursive: true });
  for (const f of WEB_FILES) {
    const s = path.join(root, f);
    const d = path.join(dest, f);
    if (!fs.existsSync(s)) continue;
    if (fs.lstatSync(s).isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

function zipDir(srcDir, zipPath) {
  if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
  try {
    execSync('zip -qr ' + JSON.stringify(zipPath) + ' .', { cwd: srcDir, stdio: 'inherit' });
    return;
  } catch (_) {
    /* fall through */
  }
  const py = [
    'import zipfile, pathlib, sys',
    'root = pathlib.Path(sys.argv[1])',
    'out = pathlib.Path(sys.argv[2])',
    "z = zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED)",
    'for p in root.rglob("*"):',
    '    if p.is_file():',
    '        z.write(p, p.relative_to(root).as_posix())',
    'z.close()',
    'print("zipped", out)'
  ].join('\n');
  const script = path.join(dist, '_zip_helper.py');
  fs.mkdirSync(dist, { recursive: true });
  fs.writeFileSync(script, py);
  execSync(`python3 ${JSON.stringify(script)} ${JSON.stringify(srcDir)} ${JSON.stringify(zipPath)}`, {
    stdio: 'inherit'
  });
  fs.unlinkSync(script);
}

copyWebInto(www);
console.log('Built www/ for Capacitor');

copyWebInto(docs);
for (const extra of ['README.md', 'STATUS.md']) {
  const s = path.join(root, extra);
  if (fs.existsSync(s)) fs.copyFileSync(s, path.join(docs, extra));
}
console.log('Built docs/');

fs.mkdirSync(dist, { recursive: true });
const staging = path.join(dist, '_win_staging');
rmrf(staging);
copyWebInto(staging);
fs.writeFileSync(
  path.join(staging, 'PLAY-WINDOWS.bat'),
  '@echo off\r\ncd /d "%~dp0"\r\necho Offer Torch / Flashlight — opening offline UI...\r\nstart "" "index.html"\r\n'
);
const zipPath = path.join(dist, 'flashlight-web-windows.zip');
zipDir(staging, zipPath);
fs.copyFileSync(zipPath, path.join(docs, 'flashlight-web-windows.zip'));
rmrf(staging);
console.log('Packed', zipPath);
console.log('Done.');
