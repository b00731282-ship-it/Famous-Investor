---
name: ai-weekly-intelligence
description: Utiliser quand la demande concerne les nouveautés IA de la semaine, la veille, les annonces récentes, les lancements, les nouveaux modèles, les levées de fonds ou les mouvements de marché. Produit une short-list de signaux sourcés, pas un résumé d'actualité.
---

# AI Weekly Intelligence

Objectif : passer du bruit de l'actualité IA à 3–5 signaux qui méritent l'attention d'un investisseur. Le livrable n'est pas un résumé de la semaine — c'est une sélection argumentée.

## Procédure

### 1. Collecter
- `node scripts/read_rss_feeds.js --days 7` — la veille de base, sur les flux de `config/feeds.json`.
- Recherche web pour compléter : **utilise ton outil WebSearch natif** (meilleur, pas de clé API). Le script `web_search.js` n'est utile qu'en mode headless.
- Requêtes utiles : levées de fonds IA de la semaine, lancements de modèles, chiffres d'usage/revenus publiés, mouvements d'infrastructure, régulation.

Vise large à la collecte (30–60 items), sévère au filtrage (3–5 retenus).

**Ta mémoire n'est pas une source.** Ta connaissance a une date de coupure ; la semaine dernière lui est postérieure. Tout fait cité doit venir d'une source lue pendant la session.

### 2. Filtrer : le test du « et alors ? »
Pour chaque item, une seule question : *qu'est-ce que ça change pour quelqu'un qui déploie du capital ?*

Élimine sans regret :
- les annonces de features incrémentales (« X ajoute un bouton IA ») ;
- les benchmarks battus de 2 % ;
- les levées sans information nouvelle (montant seul, sans thèse ni signal de marché) ;
- les tribunes d'opinion sans donnée ;
- ce que tout le monde a déjà commenté deux jours avant — sauf si tu as un angle que personne n'a pris.

Garde ce qui déplace une ligne : structure de coût, distribution, défensibilité, adoption réelle, capture de valeur, barrière réglementaire, nouveau wedge.

### 3. Qualifier chaque signal retenu
Pour chacun, remplis :

| Champ | Contenu |
|---|---|
| **Fait** | Ce qui s'est passé, en une phrase, sourcé (URL + date). |
| **Pourquoi maintenant** | Qu'est-ce qui rend ça possible/important cette semaine et pas il y a six mois. |
| **Qui gagne / qui perd** | Nommément. Un signal sans gagnant identifiable est mou. |
| **Où va la valeur** | Quelle couche de la stack capture. Modèle, infra, app, distribution, données. |
| **Ce que le marché rate** | L'angle non consensuel. C'est là qu'est le contenu. |
| **Niveau de certitude** | Fait établi / annonce d'entreprise (donc marketing) / rumeur. Ne les traite pas pareil. |

Une annonce d'entreprise est un acte de communication, pas une donnée neutre. Dis-le quand tu t'appuies dessus.

### 4. Prioriser
Classe les signaux par : (1) intérêt pour un investisseur, (2) angle différenciant disponible, (3) fraîcheur.

Le meilleur signal n'est pas le plus gros titre. C'est souvent le petit fait technique dont les conséquences économiques n'ont pas encore été tirées.

### 5. Livrer
1. **Les 3–5 signaux** — fait, source, pourquoi ça compte, angle disponible.
2. **Le signal de la semaine** — celui qui mérite le post LinkedIn le plus fort, et pourquoi.
3. **Sous surveillance** — 2–3 choses à re-regarder la semaine prochaine.
4. **Les sources** — toujours, avec les URLs.

Puis enchaîne : `thesis-building` pour creuser, `linkedin-investor-writing` ou `substack-newsletter-writing` pour produire.

## Règles
- Aucun fait sans URL. Si tu ne peux pas sourcer, tu ne l'écris pas.
- Les chiffres (montants, valorisations, ARR) se citent tels que publiés, avec la source. Jamais de mémoire, jamais d'approximation inventée.
- Si la semaine est pauvre, dis-le. Une semaine sans signal fort existe — mieux vaut un post sur un sujet de fond qu'un commentaire forcé sur une news creuse.
- Ne confonds pas volume médiatique et importance. Ce dont tout le monde parle est souvent le moins rentable à commenter.
