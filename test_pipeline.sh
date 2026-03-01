#!/bin/bash
set -e

# Load ENV keys
export $(grep -v '^#' .env | xargs)

# Create a temporary copy of workflows with hardcoded keys
mkdir -p /tmp/n8n-temp
cp n8n-workflows/01_scrape_leads.json /tmp/n8n-temp/01.json
cp n8n-workflows/02_find_emails.json /tmp/n8n-temp/02.json
cp n8n-workflows/03_analyze_website.json /tmp/n8n-temp/03.json
cp n8n-workflows/04_generate_email.json /tmp/n8n-temp/04.json

# Inject keys into JSON
sed -i "s/{{\$env.APIFY_API_KEY}}/$APIFY_API_KEY/g" /tmp/n8n-temp/01.json
sed -i "s/{{\$env.HUNTER_API_KEY}}/$HUNTER_API_KEY/g" /tmp/n8n-temp/02.json
sed -i "s/{{\$env.SCREENSHOTONE_API_KEY}}/$SCREENSHOTONE_API_KEY/g" /tmp/n8n-temp/03.json
sed -i "s/{{\$env.GEMINI_API_KEY}}/$GEMINI_API_KEY/g" /tmp/n8n-temp/03.json
sed -i "s/{{\$env.GEMINI_API_KEY}}/$GEMINI_API_KEY/g" /tmp/n8n-temp/04.json

echo "Running 01..."
npx n8n execute --file=/tmp/n8n-temp/01.json || echo "01 Failed"
echo "Running 02..."
npx n8n execute --file=/tmp/n8n-temp/02.json || echo "02 Failed"
echo "Running 03..."
npx n8n execute --file=/tmp/n8n-temp/03.json || echo "03 Failed"
echo "Running 04..."
npx n8n execute --file=/tmp/n8n-temp/04.json || echo "04 Failed"

echo "Done running pipeline!"
