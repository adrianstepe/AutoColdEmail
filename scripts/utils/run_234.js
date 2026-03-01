const { execSync } = require('child_process');
const ids = ['workflow-id-2', 'workflow-id-3', 'e44c2115-4ba9-43a9-b6bb-d08bcf159a68'];
for(let id of ids) {
    console.log(`\n\n=== Running ${id} ===`);
    try {
        const out = execSync(`N8N_PORT=5678 N8N_BLOCK_ENV_ACCESS_IN_NODE=false npx n8n execute --id=${id}`, {
            env: { ...process.env, N8N_PORT: '5678', N8N_BLOCK_ENV_ACCESS_IN_NODE: 'false' },
            stdio: 'pipe'
        });
        console.log(out.toString());
    } catch(err) {
        console.error("Error running " + id);
        if(err.stdout) console.log(err.stdout.toString());
        if(err.stderr) console.error(err.stderr.toString());
    }
}
