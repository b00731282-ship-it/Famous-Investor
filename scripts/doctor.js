#!/usr/bin/env node
'use strict';
/**
 * doctor — que peut réellement faire Ghitastar en ce moment ?
 *
 *   node scripts/doctor.js
 *
 * À lancer en début de session. L'agent ne doit jamais supposer qu'une
 * intégration fonctionne.
 */

const fs = require('node:fs');
const path = require('node:path');
const { emit, parseArgs, helpIfAsked, loadFeeds, projectRoot, run } = require('./lib/common');

const TOOL = 'doctor';

run(TOOL, async () => {
  const args = parseArgs();
  helpIfAsked(args, TOOL, { '(aucun)': 'Vérifie la configuration.' });

  // --- Veille RSS : aucun secret requis, c'est le socle de l'agent ---
  const rss = { tool: 'read_rss_feeds', needs: ['(aucun secret)'] };
  try {
    const { file, feeds } = loadFeeds();
    rss.configured = feeds.length > 0;
    rss.feeds_file = file;
    rss.active_feeds = feeds.length;
    rss.categories = [...new Set(feeds.map((f) => f.category || 'autre'))];
    rss.note = "Lance `node scripts/read_rss_feeds.js --check` pour tester la santé réelle des flux.";
  } catch (e) {
    rss.configured = false;
    rss.detail = e.message;
  }

  // --- Recherche web : l'outil natif du canal Claude est préférable ---
  const providers = {
    brave: Boolean(process.env.BRAVE_SEARCH_API_KEY),
    tavily: Boolean(process.env.TAVILY_API_KEY),
    serper: Boolean(process.env.SERPER_API_KEY),
  };
  const search = {
    tool: 'web_search',
    configured: Object.values(providers).some(Boolean),
    provider: Object.keys(providers).find((p) => providers[p]) || null,
    needs: ['BRAVE_SEARCH_API_KEY ou TAVILY_API_KEY ou SERPER_API_KEY'],
    note: "Non bloquant : dans le canal Claude, utilise l'outil WebSearch natif (meilleur, sans clé). Ce script ne sert qu'au mode headless (cron).",
  };

  // --- Substack : pas d'API publique, donc chemin dégradé assumé ---
  const substack = {
    tool: 'create_substack_draft',
    configured: Boolean(process.env.SUBSTACK_PUBLICATION_URL && process.env.SUBSTACK_COOKIE),
    publication: process.env.SUBSTACK_PUBLICATION_URL || null,
    needs: ['SUBSTACK_PUBLICATION_URL', 'SUBSTACK_COOKIE'],
    note: "Substack n'a pas d'API publique : le script utilise l'endpoint interne (cookie de session, peut casser). Sans configuration, il écrit un Markdown prêt à coller — l'agent reste pleinement utilisable.",
    publication_impossible: true,
    garantie: "Ce script ne publie jamais. Il crée uniquement des brouillons.",
  };

  const draftsDir = path.join(projectRoot(), 'drafts');
  if (fs.existsSync(draftsDir)) {
    substack.drafts_locaux = fs.readdirSync(draftsDir).filter((f) => f.endsWith('.md')).length;
  }

  const integrations = { rss, search, substack };
  const ready = Object.entries(integrations).filter(([, v]) => v.configured).map(([k]) => k);

  emit({
    ok: true,
    tool: TOOL,
    node: process.version,
    integrations,
    ready,
    verdict: rss.configured
      ? `Veille RSS opérationnelle (${rss.active_feeds} flux). ` +
        (search.configured ? `Recherche web headless : ${search.provider}. ` : "Recherche web headless non configurée — sans effet dans le canal Claude, où l'outil WebSearch natif prend le relais. ") +
        (substack.configured ? 'Brouillons Substack : API configurée.' : 'Brouillons Substack : mode Markdown prêt à coller (aucune configuration requise).')
      : "La veille RSS n'est pas opérationnelle : c'est le socle de l'agent, corrige config/feeds.json en priorité.",
    rappel: "Ghitastar ne publie jamais et n'invente jamais un chiffre. Tout fait cité doit venir d'une source lue pendant la session.",
  });
});
