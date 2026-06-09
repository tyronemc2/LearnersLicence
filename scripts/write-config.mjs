import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputPath = path.join(projectRoot, 'dist', 'public', 'config.js');
const distIndexPath = path.join(projectRoot, 'dist', 'index.html');
const buildId = new Date().toISOString().slice(0, 10).replace(/-/g, '');

function loadDotEnv(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const env = {};

  for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separator = trimmed.indexOf('=');
    if (separator === -1) {
      continue;
    }

    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }

  return env;
}

function pickSupabaseEnv(env) {
  const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
  const anonKey = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  return { url: url.trim(), anonKey: anonKey.trim() };
}

async function resolveConfig() {
  const localModulePath = path.join(projectRoot, 'config.local.js');
  if (fs.existsSync(localModulePath)) {
    const mod = await import(pathToFileURL(localModulePath).href);
    return mod.default;
  }

  const publicLocalPath = path.join(projectRoot, 'public', 'config.local.js');
  if (fs.existsSync(publicLocalPath)) {
    return fs.readFileSync(publicLocalPath, 'utf8');
  }

  const dotEnv = loadDotEnv(path.join(projectRoot, '.env'));
  const fromFile = pickSupabaseEnv(dotEnv);
  if (fromFile) {
    return fromFile;
  }

  const fromProcess = pickSupabaseEnv(process.env);
  if (fromProcess) {
    return fromProcess;
  }

  return null;
}

function isPlaceholderConfig(config) {
  return !config
    || typeof config.url !== 'string'
    || typeof config.anonKey !== 'string'
    || config.url.includes('YOUR_PROJECT_REF')
    || config.anonKey.includes('YOUR_SUPABASE_ANON_KEY');
}

function stampBuildId() {
  if (!fs.existsSync(distIndexPath)) {
    return;
  }

  const html = fs.readFileSync(distIndexPath, 'utf8').replaceAll('__BUILD_ID__', buildId);
  fs.writeFileSync(distIndexPath, html);
  console.log(`Stamped build id ${buildId} into dist/index.html`);
}

const resolved = await resolveConfig();

if (typeof resolved === 'string') {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, resolved.endsWith('\n') ? resolved : `${resolved}\n`);
  console.log('Copied public/config.local.js to dist/public/config.js');
} else if (!isPlaceholderConfig(resolved)) {
  const content = `window.__SUPABASE_CONFIG__ = ${JSON.stringify(resolved, null, 2)};\n`;
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, content);
  console.log('Wrote Supabase config to dist/public/config.js from .env');
} else {
  console.warn(
    'Supabase config not set. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env, then rebuild.'
  );
}

stampBuildId();
