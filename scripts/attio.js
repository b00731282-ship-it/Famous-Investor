#!/usr/bin/env node
'use strict';
// Client Attio headless — API REST v2, clé lue dans ATTIO_API_KEY.
// Permet d'écrire dans le CRM sans les connecteurs claude.ai (donc en cron).
// Zéro dépendance npm.
//
// Base: https://api.attio.com/v2  ·  Auth: Authorization: Bearer <key>
// Usage:
//   node scripts/attio.js self
//   node scripts/attio.js deals                       # deals actifs (liste Fundraising)
//   node scripts/attio.js list-entries <listSlug>     # entrées d'une liste (dédup)
//   node scripts/attio.js create-person '<json values>'
//   node scripts/attio.js add-to-list <listSlug> <recordId> '<json entry_values>'

const BASE = 'https://api.attio.com/v2';
const FUNDRAISING = 'startup_fundraising';

function key() {
  const k = process.env.ATTIO_API_KEY;
  if (!k) { console.error(JSON.stringify({ ok: false, error: 'missing_env', missing: ['ATTIO_API_KEY'] })); process.exit(1); }
  return k;
}

async function call(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { Authorization: `Bearer ${key()}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data; try { data = JSON.parse(text); } catch { data = text; }
  if (!res.ok) throw new Error(`Attio ${res.status}: ${typeof data === 'string' ? data : JSON.stringify(data)}`);
  return data;
}

const self = () => call('GET', '/self');

// Deals actifs = entrées de la liste Fundraising (companies).
const deals = () => call('POST', `/lists/${FUNDRAISING}/entries/query`, { limit: 50 });

// Entrées d'une liste (pour déduplication).
const listEntries = (listSlug) => call('POST', `/lists/${listSlug}/entries/query`, { limit: 500 });

// Crée un record people. values = objet Attio (name, linkedin, job_title, description...).
const createPerson = (values) => call('POST', '/objects/people/records', { data: { values } });

// Ajoute un record à une liste avec ses entry_values.
const addToList = (listSlug, recordId, entryValues) =>
  call('POST', `/lists/${listSlug}/entries`, {
    data: { parent_object: 'people', parent_record_id: recordId, entry_values: entryValues || {} },
  });

module.exports = { self, deals, listEntries, createPerson, addToList };

if (require.main === module) {
  (async () => {
    const [cmd, a, b, c] = process.argv.slice(2);
    try {
      let out;
      if (cmd === 'self') out = await self();
      else if (cmd === 'deals') out = await deals();
      else if (cmd === 'list-entries') out = await listEntries(a);
      else if (cmd === 'create-person') out = await createPerson(JSON.parse(a));
      else if (cmd === 'add-to-list') out = await addToList(a, b, JSON.parse(c));
      else { console.error('cmd: self|deals|list-entries|create-person|add-to-list'); process.exit(1); }
      console.log(JSON.stringify(out));
    } catch (e) {
      console.error(JSON.stringify({ ok: false, error: e.message }));
      process.exit(1);
    }
  })();
}
