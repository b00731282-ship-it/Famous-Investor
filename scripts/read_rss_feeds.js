#!/usr/bin/env node
'use strict';
/**
 * read_rss_feeds — la veille IA de la semaine, depuis les flux de config/feeds.json.
 *
 *   node scripts/read_rss_feeds.js --days 7
 *   node scripts/read_rss_feeds.js --days 7 --keywords "funding,raise,valuation"
 *   node scripts/read_rss_feeds.js --category vc --limit 30
 *   node scripts/read_rss_feeds.js --check      # teste chaque flux, sans filtre de date
 *
 * Aucun secret : les flux sont publics.
 */

const { ok, fail, parseArgs, helpIfAsked, num, str, isRecent, httpText, stripHtml, loadFeeds, run } = require('./lib/common');

const TOOL = 'read_rss_feeds';

const USAGE = {
  '--days N': 'Ne garder que les articles des N derniers jours (défaut : 7).',
  '--keywords k': 'Filtre : ne garder que les articles contenant un de ces mots (séparés par des virgules).',
  '--category c': 'Filtre par catégorie de flux : labo | media | vc | research.',
  '--limit N': "Nombre maximum d'articles retournés (défaut : 60).",
  '--feeds f': 'Fichier de flux (défaut : config/feeds.json ou RSS_FEEDS_FILE).',
  '--check': 'Teste la santé de chaque flux (ignore le filtre de date).',
};

/** Extrait le contenu d'une balise XML, en tolérant les attributs et les CDATA. */
function tag(xml, name) {
  const m = xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, 'i'));
  if (!m) return null;
  return m[1].replace(/^<!\[CDATA\[([\s\S]*?)\]\]>$/, '$1').trim();
}

/** Le lien Atom est dans un attribut href, pas dans le contenu de la balise. */
function atomLink(xml) {
  const alternate = xml.match(/<link[^>]*rel=["']alternate["'][^>]*href=["']([^"']+)["']/i);
  if (alternate) return alternate[1];
  const any = xml.match(/<link[^>]*href=["']([^"']+)["'][^>]*\/?>/i);
  return any ? any[1] : null;
}

/** Parse RSS 2.0 et Atom avec le même code : on isole les items, puis on lit les champs. */
function parseFeed(xml, feed) {
  const blocks = [
    ...xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi),
    ...xml.matchAll(/<entry(?:\s[^>]*)?>([\s\S]*?)<\/entry>/gi),
  ];

  return blocks.map((m) => {
    const b = m[1];
    const link = tag(b, 'link') || atomLink(b) || tag(b, 'guid');
    const date =
      tag(b, 'pubDate') || tag(b, 'published') || tag(b, 'updated') ||
      tag(b, 'dc:date') || tag(b, 'date');

    const summary =
      tag(b, 'description') || tag(b, 'summary') ||
      tag(b, 'content:encoded') || tag(b, 'content') || '';

    return {
      source: feed.name,
      category: feed.category || 'autre',
      title: stripHtml(tag(b, 'title') || '(sans titre)'),
      url: link ? stripHtml(link) : null,
      published: date ? new Date(date).toISOString().slice(0, 10) : null,
      published_raw: date || null,
      summary: stripHtml(summary, 400),
    };
  }).filter((a) => a.url);
}

async function fetchFeed(feed) {
  const xml = await httpText(feed.url, {}, `Flux ${feed.name}`);
  const articles = parseFeed(xml, feed);
  if (!articles.length) throw new Error('flux lu, mais aucun article reconnu (format inattendu)');
  return articles;
}

run(TOOL, async () => {
  const args = parseArgs();
  helpIfAsked(args, TOOL, USAGE);

  let config;
  try {
    config = loadFeeds(str(args.feeds));
  } catch (e) {
    return fail(TOOL, e.message);
  }

  const category = str(args.category);
  const feeds = category
    ? config.feeds.filter((f) => (f.category || '').toLowerCase() === category.toLowerCase())
    : config.feeds;

  if (!feeds.length) return fail(TOOL, `Aucun flux actif pour la catégorie « ${category} ».`);

  // Les flux sont lus en parallèle : un flux lent ne doit pas bloquer les autres.
  const settled = await Promise.allSettled(feeds.map((f) => fetchFeed(f)));

  const articles = [];
  const health = [];
  settled.forEach((res, i) => {
    const feed = feeds[i];
    if (res.status === 'fulfilled') {
      health.push({ source: feed.name, status: 'ok', articles: res.value.length });
      articles.push(...res.value);
    } else {
      // Un flux mort ne fait pas échouer la veille : on le signale et on continue.
      health.push({ source: feed.name, status: 'échec', error: res.reason.message, url: feed.url });
    }
  });

  if (args.check) {
    const okCount = health.filter((h) => h.status === 'ok').length;
    return ok(TOOL, {
      mode: 'check',
      feeds_file: config.file,
      feeds_ok: okCount,
      feeds_failed: health.length - okCount,
      health,
      hint: "Passe enabled:false sur les flux en échec dans config/feeds.json, ou corrige leur URL.",
    });
  }

  const days = num(args.days, 7);
  const limit = num(args.limit, 60);
  const keywords = str(args.keywords, '').split(',').map((k) => k.trim().toLowerCase()).filter(Boolean);

  let selected = articles.filter((a) => isRecent(a.published_raw, days));

  // Les articles sans date sont gardés à part : les ignorer ferait rater des signaux.
  const undated = articles.filter((a) => !a.published_raw);

  if (keywords.length) {
    const match = (a) => {
      const hay = `${a.title} ${a.summary}`.toLowerCase();
      return keywords.some((k) => hay.includes(k));
    };
    selected = selected.filter(match);
  }

  selected.sort((a, b) => new Date(b.published_raw || 0) - new Date(a.published_raw || 0));
  const truncated = selected.length > limit;
  selected = selected.slice(0, limit);

  const bySource = {};
  for (const a of selected) bySource[a.source] = (bySource[a.source] || 0) + 1;

  const failed = health.filter((h) => h.status !== 'ok');

  ok(TOOL, {
    period_days: days,
    keywords: keywords.length ? keywords : undefined,
    category: category || undefined,
    total_fetched: articles.length,
    matched: selected.length,
    truncated,
    by_source: bySource,
    feeds_failed: failed.length ? failed : undefined,
    undated_articles: undated.length || undefined,
    rappel: "Ces articles sont des sources brutes. Filtre-les : 3 à 5 signaux suffisent. Un titre n'est pas un signal.",
    articles: selected,
  });
});
