import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

const ENV_PATH = path.join(__dirname, '../../.env');

// Sections we expose to the admin UI (keys the admin is allowed to read/write)
const ALLOWED_KEYS = [
  'DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD',
  'JWT_SECRET', 'JWT_EXPIRES_IN',
  'FRONTEND_URL', 'BACKEND_URL',
  'CASHFREE_APP_ID', 'CASHFREE_SECRET_KEY', 'CASHFREE_ENV',
  'PRINT_CLIENT_API_KEY',
  'PORT', 'NODE_ENV',
];

/** Parse .env text into a key→value map, preserving comment lines. */
function parseEnv(text: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    result[key] = val;
  }
  return result;
}

/** Write updated values back into .env, keeping comment lines intact. */
function writeEnv(updates: Record<string, string>): void {
  let text = fs.existsSync(ENV_PATH) ? fs.readFileSync(ENV_PATH, 'utf-8') : '';
  const alreadySet = new Set<string>();

  // Update existing lines
  const lines = text.split('\n').map(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return line;
    const eq = trimmed.indexOf('=');
    if (eq === -1) return line;
    const key = trimmed.slice(0, eq).trim();
    if (key in updates) {
      alreadySet.add(key);
      return `${key}=${updates[key]}`;
    }
    return line;
  });

  // Append any new keys that weren't in the file yet
  for (const [key, val] of Object.entries(updates)) {
    if (!alreadySet.has(key)) {
      lines.push(`${key}=${val}`);
    }
  }

  fs.writeFileSync(ENV_PATH, lines.join('\n'), 'utf-8');

  // Reload into process.env immediately so the server picks them up
  for (const [key, val] of Object.entries(updates)) {
    process.env[key] = val;
  }
}

// ─── GET /api/admin/settings ─────────────────────────────────────────────────
export async function adminGetSettings(req: Request, res: Response): Promise<void> {
  try {
    const fileText = fs.existsSync(ENV_PATH) ? fs.readFileSync(ENV_PATH, 'utf-8') : '';
    const parsed = parseEnv(fileText);

    const settings: Record<string, string> = {};
    for (const key of ALLOWED_KEYS) {
      // Prefer live process.env (already loaded at startup via dotenv)
      settings[key] = process.env[key] ?? parsed[key] ?? '';
    }

    res.json({ success: true, settings });
  } catch (err) {
    res.status(500).json({ error: 'Failed to read settings' });
  }
}

// ─── POST /api/admin/settings ────────────────────────────────────────────────
export async function adminSaveSettings(req: Request, res: Response): Promise<void> {
  try {
    const body: Record<string, string> = req.body ?? {};

    // Only allow whitelisted keys
    const updates: Record<string, string> = {};
    for (const key of ALLOWED_KEYS) {
      if (key in body && typeof body[key] === 'string') {
        updates[key] = body[key].trim();
      }
    }

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: 'No valid settings provided' });
      return;
    }

    writeEnv(updates);
    res.json({ success: true, updated: Object.keys(updates) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save settings' });
  }
}
