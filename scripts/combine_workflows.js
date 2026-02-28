const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '../n8n-workflows');
const files = [
    '01_scrape_leads.json',
    '02_find_emails.json',
    '03_analyze_website.json',
    '04_generate_email.json',
    '05_send_and_log.json'
];

let masterNodes = [];
let masterConnections = {};

let currentYOffset = 0;
const Y_SPACING = 800; // Vertical distance between workflows

for (const file of files) {
    const filePath = path.join(dir, file);
    if (!fs.existsSync(filePath)) {
        console.log(`Skipping ${file}, not found.`);
        continue;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    let data = null;
    try {
        data = JSON.parse(content);
    } catch (e) {
        console.log(`Failed to parse ${file}, skipping.`);
        continue;
    }

    if (!data.nodes || data.nodes.length === 0) {
        console.log(`${file} is empty or has no nodes.`);
        continue;
    }

    const prefix = `[${file.substring(0, 2)}]`; // e.g., "[01]"

    // 1. Get original names
    const originalNames = data.nodes.map(n => n.name);

    // 2. Rename nodes and adjust position
    let minX = Math.min(...data.nodes.map(n => n.position[0]));
    let minY = Math.min(...data.nodes.map(n => n.position[1]));

    const newNodes = [];
    for (const node of data.nodes) {
        const newName = `${prefix} ${node.name}`;

        // deeply walk parameters and replace expressions
        function walkReplace(obj) {
            if (typeof obj === 'string') {
                let str = obj;
                for (const oldName of originalNames) {
                    // Replace n8n expressions
                    // Escaping old name for regex:
                    const escaped = oldName.replace(/[.*+?^${}()|[\]\\\\]/g, '\\\\$&');
                    str = str.replace(new RegExp(`\\\\$\\\\(\\\\'${escaped}\\\\'\\\\)`, 'g'), `$('${prefix} ${oldName}')`);
                    str = str.replace(new RegExp(`\\\\$\\\\\\("${escaped}"\\\\\\)`, 'g'), `$("${prefix} ${oldName}")`);
                }
                return str;
            }
            if (Array.isArray(obj)) {
                return obj.map(walkReplace);
            }
            if (obj !== null && typeof obj === 'object') {
                const result = {};
                for (const key of Object.keys(obj)) {
                    result[key] = walkReplace(obj[key]);
                }
                return result;
            }
            return obj;
        }

        node.name = newName;
        node.parameters = walkReplace(node.parameters);

        // Shift position
        // Center it horizontally relative to minX, shift vertically by currentYOffset
        node.position[0] = node.position[0] - minX + 200;
        node.position[1] = node.position[1] - minY + currentYOffset;

        // Generate new unique UUIDs (optional, but good practice. We can just append a suffix)
        node.id = `${node.id}-${prefix.replace(/[\\[\\]]/g, '')}`;

        newNodes.push(node);
    }

    // Create sticky note for this workflow
    const noteName = `${file.replace('.json', '').replace(/_/g, ' ').toUpperCase()}`;
    let maxYInWorkflow = Math.max(...newNodes.map(n => n.position[1]));

    const stickyNote = {
        parameters: {
            content: `## ${noteName}\nOriginal file: ${file}`,
            height: (maxYInWorkflow - currentYOffset) + 400,
            width: Math.max(...newNodes.map(n => n.position[0])) + 400,
            color: 6
        },
        id: `sticky-${prefix.replace(/[\\[\\]]/g, '')}`,
        name: `Sticky Note ${prefix}`,
        type: "n8n-nodes-base.stickyNote",
        typeVersion: 1,
        position: [
            0,
            currentYOffset - 100
        ]
    };

    newNodes.unshift(stickyNote);
    masterNodes.push(...newNodes);

    // 3. Update connections mapped to new names
    if (data.connections) {
        for (const [sourceName, sourceConns] of Object.entries(data.connections)) {
            const newSourceName = `${prefix} ${sourceName}`;
            masterConnections[newSourceName] = {};

            for (const [connType, targets] of Object.entries(sourceConns)) {
                masterConnections[newSourceName][connType] = targets.map(targetArray => {
                    return targetArray.map(target => {
                        return {
                            ...target,
                            node: `${prefix} ${target.node}`
                        };
                    });
                });
            }
        }
    }

    currentYOffset += (maxYInWorkflow - currentYOffset) + Y_SPACING;
}

const masterWorkflow = {
    name: "Master Cold Email Pipeline",
    nodes: masterNodes,
    connections: masterConnections,
    active: false,
    settings: {
        executionOrder: "v1"
    },
    versionId: "master-combine-v1"
};

fs.writeFileSync(path.join(dir, 'master_workflow.json'), JSON.stringify(masterWorkflow, null, 2));
console.log('Successfully generated master_workflow.json');
