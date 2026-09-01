#!/usr/bin/env node
// Cross-platform replacement for what used to be a chained bash command in
// package.json's "prebuild:electron"/"prebuild:electron:linux" scripts.
// `cp -r`, `mkdir -p`, and `$(...)` command substitution are POSIX-shell-only
// — they silently fail with "The syntax of the command is incorrect" on
// Windows, because npm runs package.json scripts through cmd.exe there by
// default, regardless of what shell the surrounding CI step itself uses.
// This script does the same steps (build, copy standalone assets, rebuild
// the native module for the target Electron version) using only Node's own
// APIs, so it behaves identically on Linux, Windows, and macOS.
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
// Pass 'win32' to cross-target Windows' better-sqlite3 build (used when
// building the Windows installer, including from CI); omit it to rebuild
// for the host platform (used for the Linux build).
const targetPlatform = process.argv[2];

function resolveBin(pkgName, binName) {
  const pkgDir = path.join(rootDir, 'node_modules', ...pkgName.split('/'));
  const pkgJson = JSON.parse(fs.readFileSync(path.join(pkgDir, 'package.json'), 'utf8'));
  const binField = pkgJson.bin;
  const binRelative = typeof binField === 'string' ? binField : binField[binName];
  return path.join(pkgDir, binRelative);
}

function runBin(pkgName, binName, args) {
  const binPath = resolveBin(pkgName, binName);
  console.log(`> node ${binPath} ${args.join(' ')}`);
  execFileSync(process.execPath, [binPath, ...args], { stdio: 'inherit', cwd: rootDir });
}

runBin('next', 'next', ['build', '--webpack']);

const standaloneDir = path.join(rootDir, '.next', 'standalone');
fs.cpSync(path.join(rootDir, 'public'), path.join(standaloneDir, 'public'), { recursive: true });
fs.mkdirSync(path.join(standaloneDir, '.next'), { recursive: true });
fs.cpSync(path.join(rootDir, '.next', 'static'), path.join(standaloneDir, '.next', 'static'), { recursive: true });

const electronVersion = JSON.parse(fs.readFileSync(path.join(rootDir, 'node_modules', 'electron', 'package.json'), 'utf8')).version;

const rebuildArgs = ['--module-dir', standaloneDir, '--only', 'better-sqlite3', '--version', electronVersion];
if (targetPlatform === 'win32') {
  rebuildArgs.push('--platform', 'win32', '--arch', 'x64');
}
runBin('@electron/rebuild', 'electron-rebuild', rebuildArgs);
