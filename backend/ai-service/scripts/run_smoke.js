// ─────────────────────────────────────────────────────────────
//  scripts/run_smoke.js — cross-platform smoke-test launcher
//  Windows: uses the service .venv (created by `npm install`-side
//  setup / deploy). Linux/CI: falls back to python3.
//  Keeps `npm test` identical everywhere — smoke_test.py itself
//  is the actual suite (24/24 TF, 20/20 rule).
// ─────────────────────────────────────────────────────────────
const { spawnSync } = require('child_process');
const path = require('path');

const win = process.platform === 'win32';
const python = win ? path.join('.venv', 'Scripts', 'python.exe') : 'python3';

const run = spawnSync(python, ['scripts/smoke_test.py'], { stdio: 'inherit' });
process.exit(run.status ?? 1);