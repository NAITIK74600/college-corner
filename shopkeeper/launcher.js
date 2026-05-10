#!/usr/bin/env node
/**
 * College Corner — Shopkeeper / Print Station Launcher
 *
 * Starts:
 *   1. Backend API  (Express on port 5000)
 *   2. Frontend     (Next.js standalone on port 3000)
 *   3. Opens Chrome/Edge to http://localhost:3000/print-client
 *
 * Keeps both servers alive – auto-restarts on crash.
 * Run this exe on Windows startup via Task Scheduler or Startup folder.
 */

'use strict';

const { spawn } = require('child_process');
const path      = require('path');
const http      = require('http');
const fs        = require('fs');

// ─── Config ──────────────────────────────────────────────────────────────────
const BASE          = path.join(__dirname, '..');            // d:\college corner\
const BACKEND_ENTRY = path.join(BASE, 'backend', 'dist', 'index.js');
const FRONTEND_ENTRY= path.join(BASE, 'frontend', '.next', 'standalone', 'server.js');
const BACKEND_PORT  = 5000;
const FRONTEND_PORT = 3000;
const OPEN_URL      = `http://localhost:${FRONTEND_PORT}/print-client`;
const RESTART_DELAY = 3000; // ms before restarting crashed process
const READY_TIMEOUT = 30000;// ms to wait for a port to become ready

// ─── Logging ─────────────────────────────────────────────────────────────────
const LOG_DIR  = path.join(__dirname, 'logs');
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

const logFile  = fs.createWriteStream(
  path.join(LOG_DIR, `shopkeeper-${new Date().toISOString().slice(0,10)}.log`),
  { flags: 'a' }
);

function log(tag, msg) {
  const line = `[${new Date().toISOString()}] [${tag}] ${msg}`;
  console.log(line);
  logFile.write(line + '\n');
}

// ─── Wait for port ───────────────────────────────────────────────────────────
function waitForPort(port, label, timeoutMs = READY_TIMEOUT) {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeoutMs;
    function attempt() {
      http.get(`http://localhost:${port}/api/health`, res => {
        res.resume();
        if (res.statusCode < 500) { resolve(); return; }
        retry();
      }).on('error', retry);
    }
    function retry() {
      if (Date.now() > deadline) { reject(new Error(`${label} not ready after ${timeoutMs}ms`)); return; }
      setTimeout(attempt, 500);
    }
    attempt();
  });
}

// Also a simple TCP-level check for the frontend (no /api/health there)
function waitForTCP(port, label, timeoutMs = READY_TIMEOUT) {
  return new Promise((resolve, reject) => {
    const net = require('net');
    const deadline = Date.now() + timeoutMs;
    function attempt() {
      const sock = new net.Socket();
      sock.setTimeout(400);
      sock.connect(port, '127.0.0.1', () => { sock.destroy(); resolve(); });
      sock.on('error', () => { sock.destroy(); retry(); });
      sock.on('timeout', () => { sock.destroy(); retry(); });
    }
    function retry() {
      if (Date.now() > deadline) { reject(new Error(`${label} not ready after ${timeoutMs}ms`)); return; }
      setTimeout(attempt, 500);
    }
    attempt();
  });
}

// ─── Process manager ─────────────────────────────────────────────────────────
function launchProcess(label, scriptPath, env = {}) {
  const merged = { ...process.env, ...env };

  function start() {
    log(label, `Starting → ${scriptPath}`);

    if (!fs.existsSync(scriptPath)) {
      log(label, `ERROR: entry file not found: ${scriptPath}`);
      log(label, `Run BUILD.bat first to compile the app, then retry.`);
      return null;
    }

    const child = spawn(process.execPath, [scriptPath], {
      env: merged,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });

    child.stdout.on('data', d => log(label, d.toString().trim()));
    child.stderr.on('data', d => log(label, 'ERR ' + d.toString().trim()));

    child.on('exit', (code, signal) => {
      log(label, `Exited (code=${code}, signal=${signal}). Restarting in ${RESTART_DELAY}ms…`);
      setTimeout(start, RESTART_DELAY);
    });

    return child;
  }

  return start();
}

// ─── Open browser ────────────────────────────────────────────────────────────
async function openBrowser(url) {
  // Try to dynamically require the 'open' package bundled alongside
  try {
    const open = require('open');
    await open(url);
    log('BROWSER', `Opened ${url}`);
  } catch {
    // Fall back to Windows shell
    const { exec } = require('child_process');
    exec(`start "" "${url}"`);
    log('BROWSER', `Launched via start: ${url}`);
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────
(async () => {
  log('LAUNCHER', '═══════════════════════════════════════════');
  log('LAUNCHER', '  College Corner — Shopkeeper Station');
  log('LAUNCHER', '═══════════════════════════════════════════');

  // Backend env vars — reads from backend/.env automatically via dotenv in server
  launchProcess('BACKEND', BACKEND_ENTRY);

  // Wait for backend to be ready before starting frontend
  log('LAUNCHER', `Waiting for backend on :${BACKEND_PORT}…`);
  try {
    await waitForPort(BACKEND_PORT, 'Backend');
    log('LAUNCHER', 'Backend ready ✓');
  } catch (e) {
    log('LAUNCHER', `Backend wait timeout: ${e.message}. Continuing anyway…`);
  }

  // Frontend – Next.js standalone needs HOSTNAME and PORT env vars
  launchProcess('FRONTEND', FRONTEND_ENTRY, {
    PORT: String(FRONTEND_PORT),
    HOSTNAME: '0.0.0.0',
    NODE_ENV: 'production',
  });

  log('LAUNCHER', `Waiting for frontend on :${FRONTEND_PORT}…`);
  try {
    await waitForTCP(FRONTEND_PORT, 'Frontend');
    log('LAUNCHER', 'Frontend ready ✓');
  } catch (e) {
    log('LAUNCHER', `Frontend wait timeout: ${e.message}. Opening browser anyway…`);
  }

  // Small extra delay so the page itself is ready
  await new Promise(r => setTimeout(r, 1500));
  await openBrowser(OPEN_URL);

  log('LAUNCHER', `Print-client open at ${OPEN_URL}`);
  log('LAUNCHER', 'Both servers running. This window can be minimised.');
})();
