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

**Nombre par défaut** : **5 nouveaux contacts par deal actif** de la liste Fundraising. Respecter le nombre demandé si l'utilisatrice en précise un autre.

## Planification — « chaque matin »

Job récurrent armé dans la **session authentifiée** (CronCreate, id `a708a671`, ~08:07 Paris) : source 5 investisseurs par deal actif, matche, écrit dans Specter DB - Day, notifie Telegram.

Limites **assumées** (le job dépend de la session, car les connecteurs Specter/Attio n'existent que là) :
- **Session-only + expiration 7 jours** : si la session redémarre ou après 7 jours, le job disparaît. Il faut le ré-armer.
- **Fallback fiable** : l'utilisatrice peut toujours déclencher à la main sur Telegram (« lance les contacts »).
- **Pour un vrai « set & forget » durable** : câbler Attio (clé API REST) et Specter en direct dans `.mcp.json` / scripts (Option A), ce qui permettrait un cron système headless. Non fait à ce jour.

**Liste Attio cible** : **« Specter DB - Day »** (slug `specter_db_de_2`, list_id `f114ade7-77c9-4836-87c2-1532855ba736`, parent = people). Champs à remplir : `name`, `linkedin`, `job_title` (avec la société), `description` (sur le record people) ; `investments`, `exits`, `country`, `deal_shared` (sur l'entrée de liste).

**Deals à matcher** : lus depuis la liste **Fundraising** (`startup_fundraising`, companies). Deals actifs au 17/07/2026 : **Peec AI** (AI martech) et **LAP Coffee** (consumer/F&B). Le champ `deal_shared` propose NEURA / Peec AI / LAP Coffee. Matcher selon le focus de l'investisseur (AI/robotics → Peec AI ; consumer/F&B → LAP Coffee).

**Limite `country`** : c'est un select à options fixes (12 pays : Germany, US, UK, Spain, Switzerland, Portugal, Poland, Singapore, Austria, UAE, Saudi Arabia, Israel). Attio refuse une valeur hors liste et l'API ne peut pas créer d'option. Pour un pays absent (ex. Sweden, France), laisser `country` vide et le signaler ; l'utilisatrice ajoute l'option dans l'UI Attio, puis on backfill. Le pays réel reste dans `data/outbound/candidates.json`.

**Garde-fou** : le sourcing écrit dans le CRM (action réelle sur le workspace d'un vrai fonds), mais **ne contacte personne**. L'outreach reste séparé et en « rédige, tu envoies » (voir `agents/outreach.md`).
