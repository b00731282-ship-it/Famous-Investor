---
name: deal-signal-detection
description: Utiliser quand il faut repérer dans l'actualité IA les signaux utiles à un investisseur : levées, acquisitions, mouvements stratégiques, signaux faibles, catégories qui attirent le capital, nouveaux wedges.
---

# Deal Signal Detection

Objectif : repérer ce que la plupart des lecteurs ne voient pas. Le signal fort est déjà dans les titres, donc déjà commenté, donc sans valeur pour te différencier. La valeur est dans le signal faible.

## Les signaux forts (à connaître, rarement à commenter seuls)

- Levées de fonds : montant, stage, investisseurs, valorisation si publiée.
- Acquisitions et acqui-hires.
- Lancements de modèles et de produits majeurs.
- Changements de pricing des grands acteurs.

Ils ne sont utiles que **par ce qu'ils révèlent** : où va le capital, ce que les fonds intelligents croient, quelles catégories se forment. Un montant de levée n'est pas un contenu. Ce que ce montant implique sur la structure de coût du secteur, oui.

## Les signaux faibles (là où est ton avantage)

Voilà ce qu'il faut chercher activement, parce que personne ne le met en titre :

- **Un prix qui bouge.** Une baisse du coût d'inférence ou du compute déplace la frontière du viable. C'est le signal le plus prédictif et le moins commenté.
- **Un recrutement révélateur.** Une entreprise qui recrute massivement sur une compétence annonce sa direction 12 mois à l'avance.
- **Une brique qui devient gratuite.** Quand un acteur offre ce que d'autres vendent, une catégorie entière meurt et une autre s'ouvre.
- **Un changement de licence ou de conditions d'API.** Signal direct sur qui veut capturer la valeur, et sur la dépendance des acteurs en aval.
- **Un incumbent qui bouge.** Quand un acteur établi lance ou rachète, il valide un marché — et souvent condamne les startups qui n'étaient qu'une feature.
- **Une contrainte réglementaire qui se précise.** Elle crée des moats de conformité : mauvaise nouvelle pour les startups légères, excellente pour celles qui l'anticipent.
- **Un usage détourné.** Quand les utilisateurs se servent d'un outil pour autre chose que prévu, il y a un produit à construire.
- **Un départ de fondateur ou d'équipe clé.** Souvent le premier signe d'un problème — ou d'une nouvelle société à venir.
- **Un silence.** Un acteur attendu qui ne sort rien, un rapport repoussé, une roadmap qui glisse. L'absence d'annonce est une information.

## Procédure

1. **Collecte** — `read_rss_feeds.js --days 7`, plus recherche web ciblée (outil WebSearch natif de préférence).
2. **Trie** entre signaux forts et signaux faibles.
3. **Pour chaque signal faible**, demande : *si c'est vrai, qu'est-ce que ça implique dans 12 mois ?* La réponse est ton contenu.
4. **Croise.** Deux signaux faibles indépendants qui pointent dans la même direction valent mieux qu'un gros titre. C'est là qu'on trouve les catégories avant les autres.
5. **Repère les wedges** : quel point d'entrée étroit permet à une startup de s'installer avant d'élargir ? Distribution négligée, segment mal servi, workflow que l'incumbent ne veut pas toucher.
6. **Note ce qui est à surveiller** — les signaux qui ne sont pas encore mûrs. Ils font la valeur d'une veille suivie dans le temps, et donnent au lecteur une raison de revenir.

## Livrable

- **Signaux de la semaine** : fait, source, lecture.
- **Signaux faibles retenus** : ce que personne ne dit, et l'implication à 12 mois.
- **Où va le capital** : quelles catégories se financent, quelles catégories se tarissent.
- **Wedges repérés.**
- **Watchlist** : à re-regarder la semaine prochaine.

## Règles
- Un chiffre de levée ou de valorisation se cite **avec sa source**, tel que publié. Ne jamais reconstituer un montant de mémoire.
- Distingue « annoncé » de « bouclé », et « valorisation » de « montant levé ». Confondre les deux te grille auprès d'un vrai VC.
- Ne surinterprète pas un signal isolé. Dis « signal à confirmer » quand c'en est un — la prudence bien placée est un marqueur de sérieux.
- Le meilleur signal est souvent ennuyeux en apparence : une ligne de pricing, une note de version, un changement de conditions.
