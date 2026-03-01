set -e
export $(grep -v '^#' .env | xargs)
export N8N_PORT=5678
export N8N_BLOCK_ENV_ACCESS_IN_NODE=false

echo "Running 02..."
id_02=$(grep -o '"id": "[^"]*"' n8n-workflows/02_find_emails.json | head -n 1 | cut -d'"' -f4)
npx n8n execute --id=$id_02

echo "Running 03..."
id_03=$(grep -o '"id": "[^"]*"' n8n-workflows/03_analyze_website.json | head -n 1 | cut -d'"' -f4)
npx n8n execute --id=$id_03

echo "Running 04..."
id_04=$(grep -o '"id": "[^"]*"' n8n-workflows/04_generate_email.json | head -n 1 | cut -d'"' -f4)
npx n8n execute --id=$id_04
