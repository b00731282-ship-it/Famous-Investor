#!/usr/bin/env node
'use strict';
/**
 * web_search — recherche web (mode headless : cron, script).
 *
 * IMPORTANT : dans le canal Claude, préfère l'outil WebSearch natif.
 * Il est meilleur, ne consomme aucune clé API, et ne nécessite aucune configuration.
 * Ce script existe pour le cas où Ghitastar tourne sans session interactive.
 *
 *   node scripts/web_search.js --query "AI funding round this week" --days 7
 *
 * Fournisseurs supportés (une seule clé suffit) : Brave, Tavily, Serper.
 */

const { ok, fail, missingEnv, parseArgs, helpIfAsked, num, str, httpJson, run } = require('./lib/common');

const TOOL = 'web_search';

const USAGE = {
  '--query q': 'La recherche. Requis.',
  '--days N': 'Fraîcheur : ne garder que les N derniers jours (défaut : 7).',
  '--limit N': 'Nombre de résultats (défaut : 10).',
  '--provider p': 'brave | tavily | serper (défaut : selon la clé configurée).',
};

async function brave(query, days, limit) {
  // freshness Brave : pd (24h), pw (7j), pm (31j), py (1 an)
  const freshness = days <= 1 ? 'pd' : days <= 7 ? 'pw' : days <= 31 ? 'pm' : 'py';
  const url = `https://api.search.brave.com/res/v1/web/search?${new URLSearchParams({
    q: query, count: String(Math.min(limit, 20)), freshness,
  })}`;
  const res = await httpJson(url, {
    headers: { Accept: 'application/json', 'X-Subscription-Token': process.env.BRAVE_SEARCH_API_KEY },
  }, 'Brave Search');

  return (res.web?.results || []).map((r) => ({
    title: r.title,
    url: r.url,
    published: r.page_age ? String(r.page_age).slice(0, 10) : null,
    snippet: r.description,
  }));
}

async function tavily(query, days, limit) {
  const res = await httpJson('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: process.env.TAVILY_API_KEY,
      query,
      max_results: Math.min(limit, 20),
      days,
      topic: 'news',
      search_depth: 'advanced',
    }),
  }, 'Tavily');

  return (res.results || []).map((r) => ({
    title: r.title,
    url: r.url,
    published: r.published_date ? String(r.published_date).slice(0, 10) : null,
    snippet: r.content,
  }));
}

async function serper(query, days, limit) {
  const tbs = days <= 1 ? 'qdr:d' : days <= 7 ? 'qdr:w' : days <= 31 ? 'qdr:m' : 'qdr:y';
  const res = await httpJson('https://google.serper.dev/news', {
    method: 'POST',
    headers: { 'X-API-KEY': process.env.SERPER_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: query, num: Math.min(limit, 20), tbs }),
  }, 'Serper');

  return (res.news || []).map((r) => ({
    title: r.title,
    url: r.link,
    published: r.date || null,
    snippet: r.snippet,
  }));
}

run(TOOL, async () => {
  const args = parseArgs();
  helpIfAsked(args, TOOL, USAGE);

  const query = str(args.query);
  if (!query) return fail(TOOL, '--query est requis.', { usage: USAGE });

  const providers = {
    brave: Boolean(process.env.BRAVE_SEARCH_API_KEY),
    tavily: Boolean(process.env.TAVILY_API_KEY),
    serper: Boolean(process.env.SERPER_API_KEY),
  };

  const provider = str(args.provider) || Object.keys(providers).find((p) => providers[p]);

  if (!provider) {
    return missingEnv(TOOL, ['BRAVE_SEARCH_API_KEY', 'TAVILY_API_KEY', 'SERPER_API_KEY'],
      "Aucune clé de recherche configurée (une seule suffit). Dans le canal Claude, ce n'est pas bloquant : utilise l'outil WebSearch natif, qui est meilleur et ne demande aucune clé. Ce script ne sert qu'au mode headless (cron).");
  }
  if (!providers[provider]) {
    return missingEnv(TOOL, [`${provider.toUpperCase()}_API_KEY`], `Le fournisseur « ${provider} » est demandé mais sa clé n'est pas configurée.`);
  }

  const days = num(args.days, 7);
  const limit = num(args.limit, 10);

  const impl = { brave, tavily, serper }[provider];
  if (!impl) return fail(TOOL, `Fournisseur inconnu : ${provider}`, { supported: ['brave', 'tavily', 'serper'] });

  const results = await impl(query, days, limit);

  ok(TOOL, {
    provider,
    query,
    days,
    count: results.length,
    rappel: "Vérifie chaque fait sur la source avant de l'écrire. Un extrait de moteur de recherche n'est pas une source lue.",
    results,
  });
});
