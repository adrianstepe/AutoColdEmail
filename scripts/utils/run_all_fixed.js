const fs = require('fs');
const { execSync } = require('child_process');

['02_find_emails.json', '03_analyze_website.json', '04_generate_email.json'].forEach((file, index) => {
  const path = `n8n-workflows/${file}`;
  const data = JSON.parse(fs.readFileSync(path, 'utf8'));
  
  if (!data.id) {
    data.id = `workflow-id-${index+2}`;
    fs.writeFileSync(path, JSON.stringify(data, null, 2));
    console.log(`Added ID ${data.id} to ${file}`);
  }
  
  console.log(`Importing ${file}...`);
  execSync(`npx n8n import:workflow --input=${path}`);
  
  console.log(`Running ${file}...`);
  try {
    const out = execSync(`N8N_PORT=5678 N8N_BLOCK_ENV_ACCESS_IN_NODE=false npx n8n execute --id="${data.id}"`, { 
        env: { ...process.env, N8N_PORT: '5678', N8N_BLOCK_ENV_ACCESS_IN_NODE: 'false' },
        stdio: 'inherit'
    });
  } catch(e) {
      console.error(`Failed executing ${file}`);
  }
});
