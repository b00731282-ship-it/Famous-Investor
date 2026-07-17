#!/usr/bin/env node
'use strict';
// Client Specter headless — API REST directe, clé lue dans SPECTER_API_KEY.
// Permet au sourcing de tourner sans les connecteurs claude.ai (donc en cron).
// Zéro dépendance npm.
//
// Base: https://app.tryspecter.com/api/v1  ·  Auth: header X-API-Key
// Usage:
//   node scripts/specter.js search "<requête NL>" [people|company|investors]
//   node scripts/specter.js person <linkedin_url>
//   node scripts/specter.js company <domain>

const BASE = 'https://app.tryspecter.com/api/v1';

function key() {
  const k = process.env.SPECTER_API_KEY;
  if (!k) { console.error(JSON.stringify({ ok: false, error: 'missing_env', missing: ['SPECTER_API_KEY'] })); process.exit(1); }
  return k;
}

async function call(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'X-API-Key': key(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data; try { data = JSON.parse(text); } catch { data = text; }
  if (!res.ok) throw new Error(`Specter ${res.status}: ${typeof data === 'string' ? data : JSON.stringify(data)}`);
  return data;
}

// Découverte en langage naturel. product: people | company | investors | ...
const search = (query, product = 'people') => call('/search', { query, product });
// Enrichissement d'une personne par URL LinkedIn (renvoie le profil complet).
const person = (linkedin_url) => call('/people', { linkedin_url });
// Données société par domaine.
const company = (domain) => call('/companies', { domain });

module.exports = { search, person, company };

if (require.main === module) {
  (async () => {
    const [cmd, a, b] = process.argv.slice(2);
    try {
      let out;
      if (cmd === 'search') out = await search(a, b || 'people');
      else if (cmd === 'person') out = await person(a);
      else if (cmd === 'company') out = await company(a);
      else { console.error('cmd: search|person|company'); process.exit(1); }
      console.log(JSON.stringify(out));
    } catch (e) {
      console.error(JSON.stringify({ ok: false, error: e.message }));
      process.exit(1);
    }
  })();
}
