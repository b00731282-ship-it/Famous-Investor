'use strict';
/**
 * Bibliothèque commune aux outils Ghitastar.
 * Zéro dépendance npm : uniquement les modules natifs de Node (>= 18).
 */

const fs = require('node:fs');
const path = require('node:path');

// ---------------------------------------------------------------------------
// Sortie : tous les scripts parlent le même JSON. { ok: true, ... } | { ok: false, error, ... }
// ---------------------------------------------------------------------------

function emit(obj) {
  process.stdout.write(JSON.stringify(obj, null, 2) + '\n');
}

function ok(tool, data) {
  emit({ ok: true, tool, ...data });
  process.exit(0);
}

function fail(tool, error, extra = {}) {
  emit({ ok: false, tool, error, ...extra });
  process.exit(1);
}

/** Intégration non configurée. Contrat lu par CLAUDE.md : error === "missing_env". */
function missingEnv(tool, vars, hint) {
  emit({
    ok: false,
    tool,
    error: 'missing_env',
    missing: Array.isArray(vars) ? vars : [vars],
    hint: hint || "Configure ces variables d'environnement sur le VPS (voir .env.example).",
  });
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Arguments
// ---------------------------------------------------------------------------

function parseArgs(argv = process.argv.slice(2)) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) {
      args[key] = true;
    } else {
      args[key] = next;
      i++;
    }
  }
  return args;
}

function num(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/** Récupère une option texte, en ignorant les flags booléens. */
function str(value, fallback = null) {
  return value && value !== true ? String(value) : fallback;
}

function helpIfAsked(args, tool, usage) {
  if (args.help) {
    emit({ ok: true, tool, usage });
    process.exit(0);
  }
}

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------

function daysAgo(days) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d;
}

function isRecent(dateString, days) {
  if (!dateString) return false;
  const t = new Date(dateString).getTime();
  if (!Number.isFinite(t)) return false;
  return t >= daysAgo(days).getTime();
}

// ---------------------------------------------------------------------------
// HTTP
// ---------------------------------------------------------------------------

const UA = 'Mozilla/5.0 (compatible; GhitastarBot/1.0; veille IA)';

async function httpText(url, options = {}, label = 'HTTP') {
  let res;
  try {
    res = await fetch(url, {
      ...options,
      headers: { 'User-Agent': UA, ...(options.headers || {}) },
      signal: AbortSignal.timeout(options.timeoutMs || 20000),
    });
  } catch (e) {
    throw new Error(`${label} : requête échouée (${e.message}).`);
  }
  const text = await res.text();
  if (!res.ok) throw new Error(`${label} (${res.status}) : ${text.slice(0, 200)}`);
  return text;
}

async function httpJson(url, options = {}, label = 'API') {
  const text = await httpText(url, options, label);
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`${label} : réponse non-JSON inattendue : ${text.slice(0, 200)}`);
  }
}

// ---------------------------------------------------------------------------
// Texte : nettoyage du HTML des flux RSS
// ---------------------------------------------------------------------------

const ENTITIES = {
  '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'",
  '&#39;': "'", '&nbsp;': ' ', '&rsquo;': '’', '&lsquo;': '‘',
  '&ldquo;': '“', '&rdquo;': '”', '&mdash;': '—', '&ndash;': '–', '&hellip;': '…',
};

function decodeEntities(s) {
  return String(s)
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&[a-z]+;|&#\d+;/gi, (m) => ENTITIES[m.toLowerCase()] ?? m);
}

/** Enlève le HTML et normalise les espaces — les descriptions RSS en sont pleines. */
function stripHtml(s, maxLength = 0) {
  let out = decodeEntities(
    String(s || '')
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
  ).replace(/\s+/g, ' ').trim();
  if (maxLength && out.length > maxLength) out = out.slice(0, maxLength).trimEnd() + '…';
  return out;
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

function projectRoot() {
  return path.resolve(__dirname, '..', '..');
}

function loadFeeds(customPath) {
  const file = customPath || process.env.RSS_FEEDS_FILE || path.join(projectRoot(), 'config', 'feeds.json');
  if (!fs.existsSync(file)) {
    throw new Error(`Fichier de flux introuvable : ${file}. Crée-le (voir config/feeds.json) ou renseigne RSS_FEEDS_FILE.`);
  }
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    throw new Error(`config des flux illisible (${file}) : ${e.message}`);
  }
  const feeds = Array.isArray(parsed) ? parsed : parsed.feeds;
  if (!Array.isArray(feeds) || !feeds.length) {
    throw new Error(`Aucun flux dans ${file}.`);
  }
  return { file, feeds: feeds.filter((f) => f && f.url && f.enabled !== false) };
}

function run(tool, main) {
  main().catch((e) => fail(tool, e.message || String(e)));
}

module.exports = {
  emit, ok, fail, missingEnv,
  parseArgs, helpIfAsked, num, str,
  daysAgo, isRecent,
  httpText, httpJson,
  stripHtml, decodeEntities,
  projectRoot, loadFeeds,
  run,
};
