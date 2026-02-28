const fs = require('fs');
const path = require('path');

const workflowsDir = path.join(__dirname, '..', 'n8n-workflows');
const files = fs.readdirSync(workflowsDir).filter(f => f.endsWith('.json'));

let migratedCount = 0;

for (const file of files) {
    const filePath = path.join(workflowsDir, file);
    let wf = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    let modified = false;

    for (let node of wf.nodes) {
        if (node.type === 'n8n-nodes-base.googleSheets') {
            modified = true;
            node.type = 'n8n-nodes-base.supabase';
            node.typeVersion = 1;

            const op = node.parameters.operation || 'read';
            const newParams = {
                table: 'leads',
                options: {}
            };

            if (op === 'read') {
                newParams.operation = 'getAll';
                newParams.returnAll = true;
            } else if (op === 'append') {
                newParams.operation = 'insert';
                newParams.dataMode = 'defineBelow';
                newParams.valuesUi = {
                    values: node.parameters.fieldsUi ? node.parameters.fieldsUi.fieldValues : []
                };
            } else if (op === 'update') {
                newParams.operation = 'update';
                newParams.matchColumns = node.parameters.columnToMatchOn; // usually 'name'
                newParams.dataMode = 'defineBelow';

                const oldValues = node.parameters.fieldsUi ? node.parameters.fieldsUi.fieldValues : [];
                const values = [...oldValues];

                // Supabase requires the match column to be present in the data for 'update' defineBelow
                const matchCol = node.parameters.columnToMatchOn;
                const matchVal = node.parameters.valueToMatchOn;

                if (!values.find(v => v.column === matchCol)) {
                    values.push({ column: matchCol, value: matchVal });
                }

                newParams.valuesUi = { values };
            }

            node.parameters = newParams;

            node.credentials = {
                supabaseApi: {
                    id: "REPLACE_WITH_SUPABASE_CREDENTIAL_ID",
                    name: "Supabase account"
                }
            };
        }
    }

    if (modified) {
        fs.writeFileSync(filePath, JSON.stringify(wf, null, 2));
        console.log(`✅ Migrated ${file}`);
        migratedCount++;
    }
}

console.log(`\nMigration complete. Replaced Google Sheets nodes in ${migratedCount} workflows.`);
