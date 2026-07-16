#!/usr/bin/env bash
# Heartbeat hebdomadaire Ghitastar : chaque vendredi 8h (heure de Paris),
# veille -> article -> brouillon Substack -> notification Telegram.
#
# Lancé par cron (UTC) à 6h01 ET 7h01 le vendredi ; le garde-fou ci-dessous
# ne laisse passer que l'exécution qui correspond à 8h heure de Paris,
# ce qui absorbe le passage heure d'été / heure d'hiver.
set -euo pipefail

# Cron démarre avec un PATH minimal : on remet claude et node à portée.
export PATH="/home/agent/.local/bin:/usr/local/bin:/usr/bin:/bin"

# Garde-fou fuseau : on ne tourne qu'à 8h heure de Paris.
# --force (répétition générale, test manuel) court-circuite le garde-fou.
if [ "${1:-}" != "--force" ] && [ "$(TZ=Europe/Paris date +%H)" != "08" ]; then
  echo "[heartbeat] $(date -u '+%F %T') UTC : pas 8h à Paris, on passe."
  exit 0
fi

cd /home/agent/ghitastar-agent

# Secrets (cookie Substack, etc.) depuis l'environnement du VPS.
if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

echo "[heartbeat] $(date -u '+%F %T') UTC : démarrage du cycle hebdomadaire."

# --strict-mcp-config sans --mcp-config : aucun serveur MCP ne se charge.
# Indispensable : le plugin Telegram démarrerait sinon un second poller et
# déconnecterait la session de canal interactive (conflit 409 Telegram).
claude -p "$(cat scripts/heartbeat_prompt.md)" \
  --allowedTools "Read,Glob,Grep,Write,Edit,WebFetch,WebSearch,Bash(node:*)" \
  --strict-mcp-config \
  2>&1

echo "[heartbeat] $(date -u '+%F %T') UTC : cycle terminé."
