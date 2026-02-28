#!/bin/bash
export $(grep -v '^#' .env | xargs)
curl -X POST "https://api.apify.com/v2/acts/compass~crawler-google-places/runs?token=$APIFY_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"searchStringsArray":["beauty salon Riga Latvia"],"maxCrawledPlacesPerSearch":10,"language":"en"}'
