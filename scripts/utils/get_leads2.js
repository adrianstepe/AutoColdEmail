const fs = require('fs');
const { execSync } = require('child_process');
const data = JSON.parse(fs.readFileSync('/tmp/get_sheets.json'));
data.id = 'export-sheets-456';
data.nodes[1].parameters.sheetName.mode = 'name';
fs.writeFileSync('/tmp/get_sheets.json', JSON.stringify(data));
execSync('npx n8n import:workflow --input=/tmp/get_sheets.json');
execSync('N8N_PORT=5678 N8N_BLOCK_ENV_ACCESS_IN_NODE=false npx n8n execute --id=export-sheets-456', { env: {...process.env, N8N_PORT:'5678', N8N_BLOCK_ENV_ACCESS_IN_NODE:'false'}, stdio:'inherit' });
