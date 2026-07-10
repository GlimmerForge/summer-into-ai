/**
 * tools/add-vercel-env.mjs
 * After creating a new Vercel project via API, add standard env vars automatically.
 * Reads real key values from .env.shared at repo root (gitignored).
 *
 * Usage:
 *   node tools/add-vercel-env.mjs --project prj_xxx [--elevenlabs] [--fec] [--replicate]
 *
 * .env.shared format (gitignored — never commit):
 *   ANTHROPIC_API_KEY=sk-ant-...
 *   ELEVENLABS_API_KEY=...
 *   FEC_API_KEY=...
 *   REPLICATE_API_TOKEN=r8_...
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// Parse CLI args
const args = {};
for (let i = 2; i < process.argv.length; i++) {
  const v = process.argv[i];
  if (v.startsWith('--')) {
    // flags like --elevenlabs or key=value like --project prj_xxx
    const next = process.argv[i + 1];
    if (next && !next.startsWith('--')) {
      args[v.slice(2)] = next;
      i++;
    } else {
      args[v.slice(2)] = true;
    }
  }
}

const { project, elevenlabs, fec, replicate } = args;
if (!project) {
  console.error('Usage: node tools/add-vercel-env.mjs --project prj_xxx [--elevenlabs] [--fec]');
  process.exit(1);
}

// Load shared secrets from .env.shared
const sharedEnvPath = resolve(ROOT, '.env.shared');
if (!existsSync(sharedEnvPath)) {
  console.error(`ERROR: .env.shared not found at ${sharedEnvPath}`);
  console.error('Create it with:\n  ANTHROPIC_API_KEY=sk-ant-...\n  ELEVENLABS_API_KEY=...\n  FEC_API_KEY=...');
  process.exit(1);
}

const sharedEnv = {};
for (const line of readFileSync(sharedEnvPath, 'utf8').split('\n')) {
  const [k, ...rest] = line.split('=');
  if (k && rest.length) sharedEnv[k.trim()] = rest.join('=').trim();
}

// Load Vercel token
const tokenPaths = [
  `${process.env.APPDATA}\\xdg.data\\com.vercel.cli\\auth.json`,
  `${process.env.HOME}/.local/share/com.vercel.cli/auth.json`
];

let vercelToken = null;
for (const p of tokenPaths) {
  if (p && existsSync(p)) {
    try {
      const auth = JSON.parse(readFileSync(p, 'utf8'));
      vercelToken = auth.token;
      if (vercelToken) break;
    } catch {}
  }
}

if (!vercelToken) {
  console.error('ERROR: Could not find Vercel token. Run: vercel login');
  process.exit(1);
}

// Load team ID from vercel-projects.json (any entry will do)
const projectsJson = JSON.parse(readFileSync(resolve(ROOT, 'vercel-projects.json'), 'utf8'));
const teamId = Object.values(projectsJson)[0]?.orgId;
if (!teamId) {
  console.error('ERROR: Could not find teamId in vercel-projects.json');
  process.exit(1);
}

async function addEnvVar(key, value) {
  if (!value) {
    console.warn(`  SKIP ${key} — not found in .env.shared`);
    return false;
  }

  const url = `https://api.vercel.com/v10/projects/${project}/env?teamId=${teamId}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${vercelToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      key,
      value,
      type: 'encrypted',
      target: ['production', 'preview', 'development']
    })
  });

  if (res.ok) {
    console.log(`  ✓ ${key}`);
    return true;
  } else {
    const body = await res.text();
    // Already exists is fine — just note it
    if (body.includes('already exists') || res.status === 400) {
      console.log(`  ~ ${key} (already set)`);
      return true;
    }
    console.error(`  ✗ ${key}: HTTP ${res.status} — ${body.slice(0, 120)}`);
    return false;
  }
}

async function run() {
  console.log(`\nAdding env vars to Vercel project: ${project}\n`);

  const vars = [
    ['ANTHROPIC_API_KEY', sharedEnv.ANTHROPIC_API_KEY]
  ];

  if (elevenlabs) vars.push(['ELEVENLABS_API_KEY', sharedEnv.ELEVENLABS_API_KEY]);
  if (fec) vars.push(['FEC_API_KEY', sharedEnv.FEC_API_KEY]);
  if (replicate) vars.push(['REPLICATE_API_TOKEN', sharedEnv.REPLICATE_API_TOKEN]);

  let ok = 0;
  for (const [key, val] of vars) {
    if (await addEnvVar(key, val)) ok++;
  }

  console.log(`\nDone: ${ok}/${vars.length} vars added.\n`);
  if (ok < vars.length) process.exit(1);
}

run().catch(e => { console.error(e); process.exit(1); });
