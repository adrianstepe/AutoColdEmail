#!/bin/bash
set -a
source .env 2>/dev/null || true
set +a
export N8N_BLOCK_ENV_ACCESS_IN_NODE="false"
echo "Starting n8n execution for leads 3 and 4..."
npx n8n execute --id=4UshwZ0BrsrgTQ5m
echo "Execution finished."
