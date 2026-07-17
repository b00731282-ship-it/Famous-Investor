# Triggers Telegram — outbound à la demande

Ces déclencheurs s'exécutent dans la **session de canal authentifiée** (celle qui reçoit Telegram et a les connecteurs Specter/Attio). Ils ne tournent jamais en cron headless.

## « Contacts du matin » — sourcing + matching pipeline

**Déclencheur** : un message Telegram du type « lance-moi 10 nouveaux contacts », « source 10 investisseurs », « mes contacts du matin ».

**Ce que fait l'agent** (suivre `agents/sourcing.md`) :
1. Recherche Specter d'investisseurs / family offices / angels pertinents pour le pipeline (NEURA, Peec AI, LAP Coffee — IA/robotics + consumer, Europe/Allemagne). Adapter au brief si l'utilisatrice en donne un.
2. Dédupliquer contre `data/outbound/candidates.json` **et** contre la liste Attio cible (ne jamais re-proposer un contact déjà présent).
3. Enrichir chaque candidat via `get_person_profile` : prénom, nom, pays, société, LinkedIn, # investments (+ # exits si dispo).
4. Matcher au pipeline via le champ `deal_shared` (NEURA / Peec AI / LAP Coffee).
5. Écrire dans la liste Attio cible (voir ci-dessous) : créer le record `people` s'il n'existe pas, l'ajouter à la liste avec `investments`, `country`, `deal_shared`.
6. Répondre sur Telegram : tableau des N contacts (nom, société, pays, # investments, deal matché, lien LinkedIn), + le lien de la liste Attio.

**Nombre par défaut** : 10. Respecter le nombre demandé.

**Liste Attio cible** : `<À CONFIRMER avec l'utilisatrice>`. Le champ de matching `deal_shared` (options NEURA / Peec AI / LAP Coffee) existe aujourd'hui sur la liste « Specter DB - DE » (`db_specter`). Une nouvelle liste dédiée « Daily Sourcing » nécessite que ces attributs personnalisés (#investments, deal_shared…) y soient créés dans l'UI Attio avant que l'agent puisse les remplir.

**Garde-fou** : le sourcing écrit dans le CRM (action réelle sur le workspace d'un vrai fonds), mais **ne contacte personne**. L'outreach reste séparé et en « rédige, tu envoies » (voir `agents/outreach.md`).
