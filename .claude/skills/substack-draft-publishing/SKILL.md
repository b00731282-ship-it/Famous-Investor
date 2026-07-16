---
name: substack-draft-publishing
description: Utiliser quand il faut créer un brouillon dans le compte Substack de l'utilisateur. Ne publie jamais — crée uniquement des brouillons, après validation explicite du contenu.
---

# Substack Draft Publishing

Objectif : transformer l'article validé en **brouillon** dans le compte Substack. Jamais en publication.

## Règle absolue

> **Tu ne publies jamais. Tu crées un brouillon. L'humain publie.**

Le script `create_substack_draft.js` n'a aucun mode « publier » et n'en aura jamais. Ne cherche pas à en ajouter un, même si l'utilisateur le demande dans un moment d'enthousiasme : proposer de publier automatiquement une analyse de marché signée de son nom est un mauvais service à lui rendre.

## Avant d'appeler l'outil

1. **Montre le contenu complet à l'utilisateur** — titre, sous-titre, corps.
2. **Attends une validation explicite.** « Oui, crée le brouillon » ou équivalent. Un silence n'est pas un accord.
3. Vérifie que `quality-control` est passé. Un brouillon créé à partir d'un contenu non relu finira par être publié tel quel un dimanche soir de fatigue.
4. Vérifie que les sources sont dans le texte.

## Procédure

### 1. Préparer le fichier
Écris l'article en Markdown dans un fichier — par exemple `drafts/2026-w28-titre.md` :

```markdown
---
title: Le vrai gagnant de la guerre des modèles n'écrit pas de modèles
subtitle: Ce que la baisse du coût d'inférence fait aux marges de vos participations
---

Le corps de l'article en Markdown…
```

Le titre et le sous-titre peuvent être dans le frontmatter, ou passés en arguments.

### 2. Créer le brouillon

```bash
node scripts/create_substack_draft.js --file drafts/2026-w28-titre.md
```

Options : `--title`, `--subtitle` (écrasent le frontmatter), `--dry-run` (montre ce qui serait envoyé, sans rien envoyer).

### 3. Vérifier
Le script renvoie l'identifiant et l'URL d'édition du brouillon. **Donne l'URL à l'utilisateur** et dis-lui explicitement d'aller relire dans Substack avant de publier.

## Ce qu'il faut savoir sur Substack — et le dire à l'utilisateur

Substack **ne fournit pas d'API publique documentée**. Le script utilise l'endpoint interne de l'éditeur, authentifié par un cookie de session. Conséquences, à assumer franchement :

- **Ça peut casser sans préavis.** Substack peut changer son endpoint du jour au lendemain. Ce n'est pas une défaillance du script.
- **Le cookie de session expire.** Il faudra le renouveler périodiquement (`SUBSTACK_COOKIE` sur le VPS). Si le script renvoie une erreur d'authentification, c'est presque toujours ça.
- **Le fallback est garanti.** Si l'API échoue, le script écrit un fichier Markdown propre, prêt à coller dans l'éditeur Substack. On ne perd jamais le contenu.

Quand le fallback se déclenche, ne présente pas ça comme un échec : dis à l'utilisateur que le contenu est prêt, où il se trouve, et qu'il n'a qu'à le coller. Le travail intellectuel est fait ; le collage prend trente secondes.

## Le formatage

Substack utilise un éditeur riche (ProseMirror). Le script convertit le Markdown : titres, paragraphes, gras, italique, listes, citations, liens.

Reste simple. Les mises en forme exotiques (tableaux complexes, HTML embarqué) passent mal — écris pour la lecture, pas pour la démonstration typographique.

## Règles
- Jamais de publication automatique. Aucune exception.
- Jamais de secret dans la conversation : le cookie Substack est une variable d'environnement du VPS, il ne se colle pas dans le chat.
- Toujours donner l'URL du brouillon à l'utilisateur après création.
- Si l'authentification échoue, dis-le clairement et bascule sur le fallback Markdown. Ne fais pas semblant que le brouillon a été créé.
