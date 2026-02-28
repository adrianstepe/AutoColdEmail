import json

workflow = {
    "name": "03 — Analyze Website (Gemini Vision)",
    "nodes": [
        {
            "parameters": {},
            "id": "c1c2c3d4-0003-4000-8000-000000000001",
            "name": "Start",
            "type": "n8n-nodes-base.manualTrigger",
            "typeVersion": 1,
            "position": [100, 300]
        },
        {
            "parameters": {
                "operation": "read",
                "documentId": {
                    "__rl": true,
                    "mode": "id",
                    "value": "={{$env.GOOGLE_SHEET_ID}}"
                },
                "sheetName": {
                    "__rl": true,
                    "mode": "name",
                    "value": "Leads"
                },
                "filters": {
                    "conditions": [
                        {
                            "lookupColumn": "status",
                            "lookupValue": "email_found"
                        }
                    ]
                },
                "options": {}
            },
            "id": "c1c2c3d4-0003-4000-8000-000000000002",
            "name": "Read Leads (email_found)",
            "type": "n8n-nodes-base.googleSheets",
            "typeVersion": 4.5,
            "position": [300, 300],
            "credentials": {
                "googleSheetsOAuth2Api": {
                    "id": "REPLACE_WITH_CREDENTIAL_ID",
                    "name": "Google Sheets OAuth2"
                }
            }
        },
        {
            "parameters": {
                "method": "GET",
                "url": "={{ $json.website }}",
                "options": {
                    "timeout": 15000,
                    "allowUnauthorizedCerts": true,
                    "redirect": {
                        "redirect": {
                            "followRedirects": true,
                            "maxRedirects": 3
                        }
                    }
                }
            },
            "id": "c1c2c3d4-0003-4000-8000-000000000003",
            "name": "Check Website Alive",
            "type": "n8n-nodes-base.httpRequest",
            "typeVersion": 4.2,
            "position": [500, 300],
            "onError": "continueErrorOutput"
        },
        {
            "parameters": {
                "conditions": {
                    "options": {
                        "caseSensitive": true,
                        "leftValue": "",
                        "typeValidation": "strict"
                    },
                    "conditions": [
                        {
                            "id": "condition-alive",
                            "leftValue": "={{ $json.error }}",
                            "rightValue": "",
                            "operator": {
                                "type": "string",
                                "operation": "isEmpty"
                            }
                        }
                    ],
                    "combinator": "and"
                }
            },
            "id": "c1c2c3d4-0003-4000-8000-000000000004",
            "name": "Alive?",
            "type": "n8n-nodes-base.if",
            "typeVersion": 2,
            "position": [700, 300]
        },
        {
            "parameters": {
                "jsCode": """
const lead = $('Read Leads (email_found)').item.json;
return [{
  json: {
    ...lead,
    status: 'dead_site',
    specific_problem: ''
  }
}];
"""
            },
            "id": "c1c2c3d4-0003-4000-8000-000000000005",
            "name": "Handle Dead Site",
            "type": "n8n-nodes-base.code",
            "typeVersion": 2,
            "position": [960, 500]
        },
        {
            "parameters": {
                "method": "GET",
                "url": "=https://api.screenshotone.com/take?access_key={{$env.SCREENSHOTONE_API_KEY}}&url={{encodeURIComponent($('Read Leads (email_found)').item.json.website)}}&viewport_width=1280&viewport_height=900&format=png&full_page=false&block_ads=true&response_type=base64",
                "options": {
                    "timeout": 45000
                }
            },
            "id": "c1c2c3d4-0003-4000-8000-000000000006",
            "name": "Take Screenshot",
            "type": "n8n-nodes-base.httpRequest",
            "typeVersion": 4.2,
            "position": [960, 260],
            "onError": "continueErrorOutput"
        },
        {
            "parameters": {
                "conditions": {
                    "options": {
                        "caseSensitive": true,
                        "leftValue": "",
                        "typeValidation": "strict"
                    },
                    "conditions": [
                        {
                            "id": "condition-screenshot-error",
                            "leftValue": "={{ $json.error }}",
                            "rightValue": "",
                            "operator": {
                                "type": "string",
                                "operation": "isEmpty"
                            }
                        }
                    ],
                    "combinator": "and"
                }
            },
            "id": "c1c2c3d4-0003-4000-8000-000000000007",
            "name": "Screenshot Success?",
            "type": "n8n-nodes-base.if",
            "typeVersion": 2,
            "position": [1160, 260]
        },
        {
            "parameters": {
                "jsCode": """
const lead = $('Read Leads (email_found)').item.json;
console.error("Screenshot error for " + lead.website, $input.item.json);
return [{
  json: {
    ...lead,
    status: 'screenshot_failed',
    specific_problem: ''
  }
}];
"""
            },
            "id": "c1c2c3d4-0003-4000-8000-000000000008",
            "name": "Handle Screenshot Error",
            "type": "n8n-nodes-base.code",
            "typeVersion": 2,
            "position": [1400, 460]
        },
        {
            "parameters": {
                "jsCode": """
const fs = require('fs');
const path = require('path');

// 1. Get Base64 image
// HTTP node outputs either the raw string in data, or as entire response.
const base64Image = typeof $input.item.json === 'string' ? $input.item.json : ($input.item.json.data || $input.item.json.body || $input.item.json.base64);

// 2. Load prompt
const workspaceDir = process.cwd();
const promptPath = path.join(workspaceDir, 'prompts', 'website_analysis.txt');
const prompt = fs.readFileSync(promptPath, 'utf8');

// 3. Build body
const body = {
    contents: [
        {
            parts: [
                { inline_data: { mime_type: "image/png", data: base64Image } },
                { text: prompt }
            ]
        }
    ],
    generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 2048
    }
};

return [{ json: body }];
"""
            },
            "id": "c1c2c3d4-0003-4000-8000-000000000009",
            "name": "Build Gemini Request",
            "type": "n8n-nodes-base.code",
            "typeVersion": 2,
            "position": [1400, 180]
        },
        {
            "parameters": {
                "method": "POST",
                "url": "=https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={{$env.GEMINI_API_KEY}}",
                "sendBody": true,
                "bodyParameters": {
                    "parameters": []
                },
                "options": {
                    "timeout": 60000
                }
            },
            "id": "c1c2c3d4-0003-4000-8000-000000000010",
            "name": "Gemini Vision",
            "type": "n8n-nodes-base.httpRequest",
            "typeVersion": 4.2,
            "position": [1640, 180],
            "onError": "continueErrorOutput"
        },
        {
            "parameters": {
                "conditions": {
                    "options": {
                        "caseSensitive": true,
                        "leftValue": "",
                        "typeValidation": "strict"
                    },
                    "conditions": [
                        {
                            "id": "condition-gemini-error",
                            "leftValue": "={{ $json.error }}",
                            "rightValue": "",
                            "operator": {
                                "type": "string",
                                "operation": "isEmpty"
                            }
                        }
                    ],
                    "combinator": "and"
                }
            },
            "id": "c1c2c3d4-0003-4000-8000-000000000011",
            "name": "Gemini Success?",
            "type": "n8n-nodes-base.if",
            "typeVersion": 2,
            "position": [1860, 180]
        },
        {
            "parameters": {
                "jsCode": """
const lead = $('Read Leads (email_found)').item.json;
console.error("Gemini Vision error for " + lead.website, $input.item.json);
return [{
  json: {
    ...lead,
    status: 'analysis_failed',
    specific_problem: ''
  }
}];
"""
            },
            "id": "c1c2c3d4-0003-4000-8000-000000000012",
            "name": "Handle Gemini Error",
            "type": "n8n-nodes-base.code",
            "typeVersion": 2,
            "position": [2080, 360]
        },
        {
            "parameters": {
                "jsCode": """
const lead = $('Read Leads (email_found)').item.json;
const result = $input.item.json;
let analysis = '';

try {
  analysis = result.candidates[0].content.parts[0].text.trim();
} catch (e) {
  return [{
    json: {
      ...lead,
      status: 'analysis_failed',
      specific_problem: ''
    }
  }];
}

if (!analysis) {
  return [{
    json: {
      ...lead,
      status: 'analysis_failed',
      specific_problem: ''
    }
  }];
}

return [{
  json: {
    ...lead,
    status: 'analyzed',
    specific_problem: analysis
  }
}];
"""
            },
            "id": "c1c2c3d4-0003-4000-8000-000000000013",
            "name": "Extract Result",
            "type": "n8n-nodes-base.code",
            "typeVersion": 2,
            "position": [2080, 100]
        },
        {
            "parameters": {
                "operation": "update",
                "documentId": {
                    "__rl": true,
                    "mode": "id",
                    "value": "={{$env.GOOGLE_SHEET_ID}}"
                },
                "sheetName": {
                    "__rl": true,
                    "mode": "name",
                    "value": "Leads"
                },
                "columns": {
                    "mappingMode": "defineBelow",
                    "value": {
                        "status": "={{ $json.status }}",
                        "specific_problem": "={{ $json.specific_problem }}"
                    },
                    "matchingColumns": [
                        "name"
                    ],
                    "schema": [
                        { "id": "name", "displayName": "name", "required": true, "defaultMatch": true },
                        { "id": "status", "displayName": "status", "required": false, "defaultMatch": false },
                        { "id": "specific_problem", "displayName": "specific_problem", "required": false, "defaultMatch": false }
                    ]
                },
                "options": {}
            },
            "id": "c1c2c3d4-0003-4000-8000-000000000014",
            "name": "Update Google Sheet",
            "type": "n8n-nodes-base.googleSheets",
            "typeVersion": 4.5,
            "position": [2400, 240],
            "credentials": {
                "googleSheetsOAuth2Api": {
                    "id": "REPLACE_WITH_CREDENTIAL_ID",
                    "name": "Google Sheets OAuth2"
                }
            }
        },
        {
            "parameters": {
                "jsCode": """
const items = $input.all();
let analyzed = 0, dead = 0, screenshot_fail = 0, analysis_fail = 0;

for (const item of items) {
  const status = item.json.status;
  if (status === 'analyzed') analyzed++;
  else if (status === 'dead_site') dead++;
  else if (status === 'screenshot_failed') screenshot_fail++;
  else if (status === 'analysis_failed') analysis_fail++;
}

return [{
  json: {
    message: `✅ Website Analysis complete.`,
    analyzed,
    dead_sites: dead,
    screenshot_failures: screenshot_fail,
    analysis_failures: analysis_fail,
    total: items.length
  }
}];
"""
            },
            "id": "c1c2c3d4-0003-4000-8000-000000000015",
            "name": "Summary",
            "type": "n8n-nodes-base.code",
            "typeVersion": 2,
            "position": [2640, 240]
        }
    ],
    "connections": {
        "Start": {
            "main": [
                [ {"node": "Read Leads (email_found)", "type": "main", "index": 0} ]
            ]
        },
        "Read Leads (email_found)": {
            "main": [
                [ {"node": "Check Website Alive", "type": "main", "index": 0} ]
            ]
        },
        "Check Website Alive": {
            "main": [
                [ {"node": "Alive?", "type": "main", "index": 0} ]
            ]
        },
        "Alive?": {
            "main": [
                [ {"node": "Take Screenshot", "type": "main", "index": 0} ],
                [ {"node": "Handle Dead Site", "type": "main", "index": 0} ]
            ]
        },
        "Handle Dead Site": {
            "main": [
                [ {"node": "Update Google Sheet", "type": "main", "index": 0} ]
            ]
        },
        "Take Screenshot": {
            "main": [
                [ {"node": "Screenshot Success?", "type": "main", "index": 0} ]
            ]
        },
        "Screenshot Success?": {
            "main": [
                [ {"node": "Build Gemini Request", "type": "main", "index": 0} ],
                [ {"node": "Handle Screenshot Error", "type": "main", "index": 0} ]
            ]
        },
        "Handle Screenshot Error": {
            "main": [
                [ {"node": "Update Google Sheet", "type": "main", "index": 0} ]
            ]
        },
        "Build Gemini Request": {
            "main": [
                [ { "node": "Gemini Vision", "type": "main", "index": 0} ]
            ]
        },
        "Gemini Vision": {
            "main": [
                [ { "node": "Gemini Success?", "type": "main", "index": 0} ]
            ]
        },
        "Gemini Success?": {
            "main": [
                [ { "node": "Extract Result", "type": "main", "index": 0} ],
                [ { "node": "Handle Gemini Error", "type": "main", "index": 0} ]
            ]
        },
        "Handle Gemini Error": {
            "main": [
                [ { "node": "Update Google Sheet", "type": "main", "index": 0} ]
            ]
        },
        "Extract Result": {
            "main": [
                [ { "node": "Update Google Sheet", "type": "main", "index": 0} ]
            ]
        },
        "Update Google Sheet": {
            "main": [
                [ { "node": "Summary", "type": "main", "index": 0} ]
            ]
        }
    },
    "settings": {
        "executionOrder": "v1"
    },
    "staticData": None,
    "tags": [
        {
            "name": "cold-email-pipeline",
            "id": "tag-cold-email"
        }
    ],
    "versionId": "c616fc01-2e65-42f5-b69a-abcd12345678"
}

import urllib.parse
# one fix for nodes relying on code body
workflow['nodes'][9]['parameters']['bodyParameters']['parameters'] = []
# Make sure body is parsed properly
workflow['nodes'][9]['parameters']['options']['bodyContentType'] = "json"

# In n8n node 10 (Gemini Vision) we are using sendBody: true and passing body via $json returned by the previous code node.
# But actually, n8nhttpRequest needs `bodyParameters` set or it sends form-data.
# The best way to send full JSON body built in prior node is to do this:
workflow['nodes'][9]['parameters']['sendBody'] = True
workflow['nodes'][9]['parameters']['specifyBody'] = "json"
workflow['nodes'][9]['parameters']['jsonBody'] = "={{ JSON.stringify($json) }}"

with open('n8n-workflows/03_analyze_website.json', 'w') as f:
    json.dump(workflow, f, indent=4)

print("Created 03_analyze_website.json")
