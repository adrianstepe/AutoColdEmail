#!/bin/bash
export N8N_ENV_VARS_ALLOWED="APIFY_API_KEY,GOOGLE_SHEET_ID,ALERT_EMAIL"
export $(grep -v '^#' .env | xargs)
echo "APIFY_API_KEY is: $APIFY_API_KEY"
npx n8n execute --id=NAQyd5sEAy9aA1K0
