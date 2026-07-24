import fs from 'fs';
import path from 'path';

/**
 * Returns the OpenRouter API key, preferring the project's .env file over any
 * value inherited from the parent shell environment.
 *
 * Why: Next.js never overrides an env var that already exists in process.env.
 * A stale `export OPENROUTER_API_KEY=...` in a shell profile (~/.zshrc) was
 * silently shadowing the valid key in .env, causing 401 "User not found" on
 * every TTS and vision call. Reading .env directly makes the project key
 * authoritative in development; in production (no .env on disk) this falls
 * back to process.env as normal.
 */
let cachedKey: string | null = null;

export function getOpenRouterKey(): string {
  if (cachedKey !== null) return cachedKey;

  try {
    const envFile = fs.readFileSync(path.join(process.cwd(), '.env'), 'utf8');
    const match = envFile.match(/^\s*OPENROUTER_API_KEY\s*=\s*(.+?)\s*$/m);
    if (match && match[1] && !match[1].startsWith('your_')) {
      cachedKey = match[1];
      return cachedKey;
    }
  } catch {
    // .env not present (e.g. production) — use process env below.
  }

  cachedKey = process.env.OPENROUTER_API_KEY || '';
  return cachedKey;
}
