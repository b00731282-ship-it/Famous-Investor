# Ghitastar

Agent de personal branding pour un investisseur IA. Transforme les nouveautés IA de la semaine en contenus LinkedIn et Substack conçus pour capter l'attention des VCs, angels, family offices et fondateurs — et déclencher des prises de contact.

## Utilisation

```bash
cd ~/ghitastar-agent
claude
```

`CLAUDE.md` se charge automatiquement, les compétences se déclenchent selon la demande.

Le cycle hebdomadaire type :

- « Fais la veille de la semaine et sors-moi les 5 signaux qui comptent. »
- « Le signal sur le coût d'inférence — transforme-le en thèse. »
- « Écris-moi le post LinkedIn de mardi là-dessus. »
- « Écris la newsletter Substack de dimanche, puis crée le brouillon. »
- « Planifie la semaine prochaine. »

Premier réflexe en session :

```bash
node scripts/doctor.js          # que peut réellement faire l'agent ?
```

## Deux garanties, par conception

**L'agent ne publie jamais.** Il crée des brouillons Substack et livre les posts LinkedIn prêts à copier. `create_substack_draft.js` n'a aucun mode « publier » et n'en aura pas. La publication est une décision humaine.

**L'agent n'invente aucun chiffre.** Un investisseur qui se trompe publiquement sur un montant de levée perd plus que ce que dix bons posts lui rapportent. Tout fait cité doit venir d'une source lue pendant la session — pas de la mémoire du modèle, qui a une date de coupure. Ce qui n'est pas sourçable est marqué `[À VÉRIFIER]` ou retiré.

## Outils

Quatre scripts Node, **zéro dépendance npm**. Tous acceptent `--help` et renvoient du JSON.

| Script | Rôle | Secret requis |
|---|---|---|
| `doctor.js` | Ce qui est réellement configuré | aucun |
| `read_rss_feeds.js` | La veille : 12 flux IA / VC / research | **aucun** |
| `web_search.js` | Recherche web en mode headless | une clé (optionnel) |
| `create_substack_draft.js` | Crée un **brouillon** Substack | cookie (optionnel) |

```bash
node scripts/read_rss_feeds.js --days 7                          # la veille
node scripts/read_rss_feeds.js --days 7 --keywords "funding,raise,valuation"
node scripts/read_rss_feeds.js --category vc                     # labo | media | vc | research
node scripts/read_rss_feeds.js --check                           # santé des flux
node scripts/create_substack_draft.js --file drafts/article.md --dry-run
```

### La veille (le socle — rien à configurer)

12 flux publics dans `config/feeds.json`, répartis en quatre catégories : `labo` (annonces produit), `media` (couverture), `vc` (capital), `research` (signaux faibles techniques). Ajoute ou retire des flux librement, puis vérifie avec `--check`.

Un flux mort ne casse jamais la veille : il est signalé, les autres continuent.

### La recherche web

Dans le canal Claude, l'agent utilise son **outil WebSearch natif** — meilleur, sans clé API, sans configuration. `web_search.js` n'est utile qu'en mode headless (cron), et accepte une clé Brave, Tavily ou Serper.

### Substack — à lire avant de configurer

**Substack ne fournit aucune API publique.** Le script utilise l'endpoint interne de l'éditeur, authentifié par un cookie de session. Conséquences assumées :

- Substack peut le casser sans préavis. Ce ne sera pas une défaillance du script.
- Le cookie de session expire ; il faudra le renouveler. Une erreur d'authentification, c'est presque toujours ça.
- **Le fallback est garanti** : si l'API échoue — ou si rien n'est configuré — le script écrit un Markdown propre dans `drafts/`, prêt à coller dans Substack. Le contenu n'est jamais perdu.

Autrement dit : la configuration Substack fait gagner trente secondes de copier-coller. Elle n'est pas nécessaire pour que l'agent soit utile.

## Configuration

Tout est optionnel. L'agent fonctionne dès maintenant : la veille ne demande aucun secret.

```bash
cp .env.example .env      # renseigner ce dont tu as besoin
set -a && source .env && set +a
node scripts/doctor.js
```

Aucun secret n'est écrit dans le code ni demandé dans la conversation : tout est lu depuis l'environnement du VPS.

## Compétences

| Compétence | Se charge quand |
|---|---|
| `ai-weekly-intelligence` | Veille, news de la semaine, annonces, levées |
| `investor-trend-analysis` | Lire une tendance avec un regard VC / angel / family office |
| `deal-signal-detection` | Repérer les signaux faibles, les wedges, où va le capital |
| `thesis-building` | Transformer une news en thèse réfutable |
| `audience-positioning` | Territoire, ligne éditoriale, cohérence dans la durée |
| `linkedin-investor-writing` | Écrire les posts LinkedIn |
| `substack-newsletter-writing` | Écrire la newsletter |
| `content-repurposing` | Décliner un insight sans se répéter |
| `editorial-calendar` | Cadence, rotation des angles, semaines pauvres |
| `substack-draft-publishing` | Créer le brouillon |
| `voice-and-charisma` | Dé-génériciser un texte plat |
| `quality-control` | **Obligatoire avant toute livraison** |

`quality-control` a le droit de refuser de livrer. C'est voulu : un contenu générique ne fait pas zéro, il abîme le positionnement.

## État des tests

Vérifié sur ce VPS (Node v24, le 14 juillet 2026) :

- les 4 scripts passent le contrôle de syntaxe et répondent à `--help` ;
- **veille testée en réel** : 12 des 13 flux répondent, 60 articles datés du jour récupérés et triés (a16z renvoie 404 — désactivé dans `config/feeds.json`, pas supprimé) ;
- **conversion Substack testée** : titres, gras, italique, liens, listes, citations et code inline se convertissent correctement en blocs d'éditeur Substack ;
- **fallback testé** : sans configuration Substack, le Markdown est écrit dans `drafts/` et le script le dit explicitement ;
- sans clé, `web_search.js` renvoie `missing_env` en nommant la variable manquante, sans planter.

Non testable ici, faute d'identifiants : la création réelle d'un brouillon dans un compte Substack. Le premier essai avec un vrai cookie le confirmera — et en cas d'échec, le fallback prend le relais.
