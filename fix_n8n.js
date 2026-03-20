const fs = require('fs');

const path = 'n8n-workflows/05_send_and_log.json';
let wf = JSON.parse(fs.readFileSync(path, 'utf8'));

// 1. Find Gmail node and add appendAttribution: false
const gmailNode = wf.nodes.find(n => n.name === 'Send via Gmail');
if (gmailNode) {
    gmailNode.options = gmailNode.options || {};
    gmailNode.options.appendAttribution = false;
    gmailNode.position[0] = 800; // Shift it right
}

// 2. Add Loop node and Wait node
wf.nodes.push({
    "parameters": {
        "batchSize": 1,
        "options": {}
    },
    "id": "loop-node-05",
    "name": "Loop",
    "type": "n8n-nodes-base.splitInBatches",
    "typeVersion": 3,
    "position": [600, -100]
});

wf.nodes.push({
    "parameters": {
        "amount": 90,
        "unit": "seconds"
    },
    "id": "wait-node-05",
    "name": "Wait 90s",
    "type": "n8n-nodes-base.wait",
    "typeVersion": 1,
    "position": [1260, -100]
});

// Shift Mark as sent
const markSent = wf.nodes.find(n => n.name === 'Mark as Sent');
if (markSent) markSent.position[0] = 1000;

// 3. Update connections
wf.connections["Approved == yes?"] = {
    "main": [
        [ { "node": "Loop", "type": "main", "index": 0 } ],
        [ { "node": "Mark as Skipped", "type": "main", "index": 0 } ]
    ]
};

wf.connections["Loop"] = {
    "main": [
        [ { "node": "Send via Gmail", "type": "main", "index": 0 } ]
    ]
};

wf.connections["Send via Gmail"] = {
    "main": [
        [ { "node": "Mark as Sent", "type": "main", "index": 0 } ]
    ]
};

wf.connections["Mark as Sent"] = {
    "main": [
        [ { "node": "Wait 90s", "type": "main", "index": 0 } ]
    ]
};

wf.connections["Wait 90s"] = {
    "main": [
        [ { "node": "Loop", "type": "main", "index": 0 } ]
    ]
};

fs.writeFileSync(path, JSON.stringify(wf, null, 4));
console.log("Updated 05_send_and_log.json");
