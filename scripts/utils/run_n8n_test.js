require('dotenv').config();
const fs = require('fs');
const { execSync } = require('child_process');

['02_find_emails.json', '03_analyze_website.json', '04_generate_email.json'].forEach(file => {
  const path = `n8n-workflows/${file}`;
  const data = JSON.parse(fs.readFileSync(path));
  console.log(`Running ${file} (ID: ${data.id})...`);
  try {
    const out = execSync(`N8N_BLOCK_ENV_ACCESS_IN_NODE=false N8N_PORT=5678 npx n8n execute --id="${data.id}"`, { env: { ...process.env, N8N_PORT: '5678', N8N_BLOCK_ENV_ACCESS_IN_NODE: 'false' }, stdio: 'pipe' });
    console.log(out.toString());
  } catch (e) {
    console.log("ERROR on " + file);
    if(e.stdout) console.log(e.stdout.toString());
    if(e.stderr) console.log(e.stderr.toString());
  }
});
