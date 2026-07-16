#!/usr/bin/env node
'use strict';
/**
 * create_substack_draft — crée un BROUILLON dans Substack. Ne publie jamais.
 *
 *   node scripts/create_substack_draft.js --file drafts/article.md
 *   node scripts/create_substack_draft.js --file drafts/article.md --dry-run
 *
 * ┌─ À savoir ────────────────────────────────────────────────────────────────┐
 * │ Substack ne fournit PAS d'API publique documentée. Ce script utilise       │
 * │ l'endpoint interne de l'éditeur, authentifié par un cookie de session.     │
 * │ Conséquences assumées :                                                    │
 * │  - Substack peut le casser sans préavis.                                   │
 * │  - Le cookie expire : il faudra le renouveler (SUBSTACK_COOKIE).           │
 * │  - En cas d'échec, le contenu est TOUJOURS sauvé en Markdown prêt à coller.│
 * └───────────────────────────────────────────────────────────────────────────┘
 *
 * Ce script n'a aucun mode « publier », par conception. La publication est une
 * décision humaine.
 */

const fs = require('node:fs');
const path = require('node:path');
const { emit, ok, fail, parseArgs, helpIfAsked, str, httpJson, projectRoot, run } = require('./lib/common');

const TOOL = 'create_substack_draft';

const USAGE = {
  '--file f': 'Fichier Markdown de l\'article (frontmatter title/subtitle accepté).',
  '--title t': 'Titre (écrase le frontmatter).',
  '--subtitle s': 'Sous-titre (écrase le frontmatter).',
  '--dry-run': "Affiche ce qui serait envoyé, sans rien envoyer.",
  '--fallback-only': 'Ignore l\'API et écrit directement le Markdown prêt à coller.',
};

// ---------------------------------------------------------------------------
// Markdown -> ProseMirror : Substack stocke le corps en JSON ProseMirror.
// On couvre ce qui sert vraiment à un article : titres, paragraphes, listes,
// citations, gras, italique, code, liens.
// ---------------------------------------------------------------------------

/** Découpe une ligne en marques inline (gras, italique, code, lien). */
function inline(text) {
  const nodes = [];
  // L'ordre compte : le code littéral d'abord (il ne doit pas être réinterprété),
  // puis les liens, puis gras/italique.
  const re = /(`[^`]+`)|(\[[^\]]+\]\([^)]+\))|(\*\*[^*]+\*\*)|(\*[^*]+\*|_[^_]+_)/g;
  let last = 0, m;

  const push = (t, marks) => {
    if (t) nodes.push(marks ? { type: 'text', text: t, marks } : { type: 'text', text: t });
  };

  while ((m = re.exec(text)) !== null) {
    push(text.slice(last, m.index));
    const token = m[0];
    if (m[1]) push(token.slice(1, -1), [{ type: 'code' }]);
    else if (m[2]) {
      const link = token.match(/\[([^\]]+)\]\(([^)]+)\)/);
      push(link[1], [{ type: 'link', attrs: { href: link[2] } }]);
    } else if (m[3]) push(token.slice(2, -2), [{ type: 'strong' }]);
    else if (m[4]) push(token.slice(1, -1), [{ type: 'em' }]);
    last = re.lastIndex;
  }
  push(text.slice(last));

  return nodes.length ? nodes : [{ type: 'text', text: text || ' ' }];
}

function markdownToProseMirror(markdown) {
  const lines = markdown.split('\n');
  const content = [];
  let paragraph = [];
  let listItems = null;

  const flushParagraph = () => {
    if (paragraph.length) {
      content.push({ type: 'paragraph', content: inline(paragraph.join(' ')) });
      paragraph = [];
    }
  };
  const flushList = () => {
    if (listItems && listItems.length) {
      content.push({
        type: 'bulletList',
        content: listItems.map((t) => ({
          type: 'listItem',
          content: [{ type: 'paragraph', content: inline(t) }],
        })),
      });
    }
    listItems = null;
  };

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (!line.trim()) { flushParagraph(); flushList(); continue; }

    const heading = line.match(/^(#{1,4})\s+(.*)$/);
    if (heading) {
      flushParagraph(); flushList();
      content.push({
        type: 'heading',
        attrs: { level: heading[1].length },
        content: inline(heading[2]),
      });
      continue;
    }

    const bullet = line.match(/^\s*[-*+]\s+(.*)$/);
    if (bullet) {
      flushParagraph();
      (listItems ||= []).push(bullet[1]);
      continue;
    }

    const quote = line.match(/^>\s?(.*)$/);
    if (quote) {
      flushParagraph(); flushList();
      content.push({
        type: 'blockquote',
        content: [{ type: 'paragraph', content: inline(quote[1]) }],
      });
      continue;
    }

    if (/^(-{3,}|\*{3,})$/.test(line.trim())) {
      flushParagraph(); flushList();
      content.push({ type: 'horizontalRule' });
      continue;
    }

    flushList();
    paragraph.push(line.trim());
  }
  flushParagraph();
  flushList();

  if (!content.length) content.push({ type: 'paragraph', content: [{ type: 'text', text: ' ' }] });
  return { type: 'doc', content };
}

/** Sépare le frontmatter YAML du corps. */
function parseFrontmatter(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { meta: {}, body: raw };
  const meta = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^([A-Za-z_][\w-]*)\s*:\s*(.*)$/);
    if (kv) meta[kv[1].toLowerCase()] = kv[2].trim().replace(/^["']|["']$/g, '');
  }
  return { meta, body: m[2] };
}

/** Filet de sécurité : on ne perd jamais le contenu, même si Substack refuse. */
function writeFallback(title, subtitle, body) {
  const dir = path.join(projectRoot(), 'drafts');
  fs.mkdirSync(dir, { recursive: true });
  const slug = (title || 'article').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
  const file = path.join(dir, `${slug || 'article'}.md`);
  const content = `# ${title}\n${subtitle ? `\n*${subtitle}*\n` : ''}\n${body.trim()}\n`;
  fs.writeFileSync(file, content, 'utf8');
  return file;
}

run(TOOL, async () => {
  const args = parseArgs();
  helpIfAsked(args, TOOL, USAGE);

  const file = str(args.file);
  if (!file) return fail(TOOL, '--file est requis (un fichier Markdown).', { usage: USAGE });
  if (!fs.existsSync(file)) return fail(TOOL, `Fichier introuvable : ${file}`);

  const raw = fs.readFileSync(file, 'utf8');
  const { meta, body } = parseFrontmatter(raw);

  const title = str(args.title) || meta.title;
  const subtitle = str(args.subtitle) || meta.subtitle || '';

  if (!title) {
    return fail(TOOL, "Titre manquant : ajoute 'title:' dans le frontmatter, ou passe --title.");
  }
  if (!body.trim()) return fail(TOOL, "Le corps de l'article est vide.");

  const doc = markdownToProseMirror(body);

  const payload = {
    draft_title: title,
    draft_subtitle: subtitle,
    draft_body: JSON.stringify(doc),
    type: 'newsletter',
    audience: 'everyone',
    // Sécurité explicite : ce brouillon ne doit jamais partir en publication.
    should_send_email: false,
    is_published: false,
  };

  if (args['dry-run']) {
    return ok(TOOL, {
      mode: 'dry-run',
      applied: false,
      title,
      subtitle,
      blocks: doc.content.length,
      body_preview: doc.content.slice(0, 3),
      message: "Rien n'a été envoyé. Relance sans --dry-run pour créer le brouillon.",
    });
  }

  const publication = (process.env.SUBSTACK_PUBLICATION_URL || '').replace(/\/+$/, '');
  const cookie = process.env.SUBSTACK_COOKIE;

  // Chemin de secours, explicite ou forcé par l'absence de configuration.
  if (args['fallback-only'] || !publication || !cookie) {
    const out = writeFallback(title, subtitle, body);

    if (args['fallback-only']) {
      return ok(TOOL, {
        mode: 'fallback',
        applied: false,
        draft_file: out,
        next_step: `Ouvre Substack, crée un nouveau post, et colle le contenu de ${out}.`,
      });
    }

    // Substack n'est pas configuré : on le dit ET on signale que le contenu est sauvé.
    // Renvoyer un simple missing_env ferait croire que le travail est perdu.
    return emit({
      ok: false,
      tool: TOOL,
      error: 'missing_env',
      missing: ['SUBSTACK_PUBLICATION_URL', 'SUBSTACK_COOKIE'],
      fallback: {
        draft_file: out,
        next_step: `Le contenu n'est pas perdu : ouvre Substack, crée un post, et colle le contenu de ${out}.`,
      },
      hint: "Substack n'a pas d'API publique : le script a besoin de l'URL de la publication et d'un cookie de session (voir .env.example). Sans ça, il produit un Markdown prêt à coller — ce qui reste parfaitement utilisable.",
    });
  }

  // --- Endpoint interne de Substack. Non officiel : peut casser sans préavis. ---
  let res;
  try {
    res = await httpJson(`${publication}/api/v1/drafts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookie,
        Origin: publication,
        Referer: `${publication}/publish/post`,
      },
      body: JSON.stringify(payload),
    }, 'Substack');
  } catch (e) {
    // Le contenu ne doit jamais être perdu à cause d'un cookie expiré.
    const out = writeFallback(title, subtitle, body);
    return fail(TOOL, `Substack a refusé la création du brouillon : ${e.message}`, {
      cause_probable: "Cookie de session expiré ou invalide (SUBSTACK_COOKIE), ou endpoint interne modifié par Substack.",
      fallback: {
        draft_file: out,
        next_step: `Le contenu n'est pas perdu : ouvre Substack, crée un post, et colle le contenu de ${out}.`,
      },
    });
  }

  const id = res.id ?? res.draft_id;
  ok(TOOL, {
    mode: 'api',
    applied: true,
    published: false,
    draft_id: id,
    edit_url: id ? `${publication}/publish/post/${id}` : undefined,
    title,
    subtitle,
    next_step: "Brouillon créé — il n'est PAS publié. Relis-le dans Substack, puis publie toi-même si tu le valides.",
  });
});
