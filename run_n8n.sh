#!/bin/bash
set -a
source .env
set +a
export N8N_ENV_VARS_ALLOWED="APIFY_API_KEY,GOOGLE_SHEET_ID,ALERT_EMAIL"
export N8N_BLOCK_ENV_ACCESS_IN_NODE="false"
echo "APIFY_API_KEY is: $APIFY_API_KEY"
npx n8n execute --id=NAQyd5sEAy9aA1K0
