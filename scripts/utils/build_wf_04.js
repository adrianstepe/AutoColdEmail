const fs = require('fs');
const path = require('path');

const promptPath = path.join(__dirname, 'prompts', 'email_generation.txt');
const promptText = fs.readFileSync(promptPath, 'utf8');

// The JS code for the 'Build Gemini Request' node
// We use string concatenation to avoid template literal escaping issues when serialized to JSON
const buildRequestCode = `
const prompt = ` + JSON.stringify(promptText) + `;

const item = $input.item;
const lead = item.json;

// Extract required fields
const business_name = lead.name || '';
const owner_name = '' || 'Vadītāj'; // Assuming owner name might not be known, leaving logic here if we add it later. Or we can just leave it blank if not in lead sheet.
const city = lead.address || 'Rīga';
const industry = '' || 'uzņēmums'; // Default fallback
const specific_problem = lead.specific_problem || '';
const website_url = lead.website || '';
const sender_name = 'Adrians';
const sender_email = 'adrians.stepe@gmail.com';

// Create the JSON payload string for Gemini to parse
const leadData = {
  business_name: business_name,
  owner_name: owner_name, // Will use 'Labdien,' if empty based on prompt rules
  city: city,
  industry: industry,
  specific_problem: specific_problem,
  website_url: website_url,
  sender_name: sender_name,
  sender_email: sender_email
};

const fullPrompt = prompt + "\\n\\n---\\n\\n**GENERATE THE EMAIL FOR THIS LEAD OUTPUT ONLY VALID JSON:**\\n" + JSON.stringify(leadData);

const body = {
  contents: [
    {
      parts: [
        { text: fullPrompt }
      ]
    }
  ],
  generationConfig: {
    temperature: 0.7,
    maxOutputTokens: 4096,
    response_mime_type: "application/json"
  }
};

return [{
  json: {
    ...lead,
    gemini_body: body
  }
}];
`;

const extractResultCode = `
const item = $input.item;
const response = item.json;

// Keep original lead data (we passed it through the HTTP node or can access prior node)
const prevData = {
  name: $('Build Gemini Request').item.json.name,
  website: $('Build Gemini Request').item.json.website,
  email: $('Build Gemini Request').item.json.email,
  specific_problem: $('Build Gemini Request').item.json.specific_problem
};

let emailJson = null;

try {
  let text = response.candidates[0].content.parts[0].text;
  
  // Clean up markdown formatting if Gemini returned it despite application/json mime type
  if (text.startsWith('\`\`\`json')) {
    text = text.substring(7);
  } else if (text.startsWith('\`\`\`')) {
    text = text.substring(3);
  }
  
  if (text.endsWith('\`\`\`\\n')) {
    text = text.substring(0, text.length - 4);
  } else if (text.endsWith('\`\`\`')) {
    text = text.substring(0, text.length - 3);
  }
  
  emailJson = JSON.parse(text);
} catch (e) {
  console.log('Failed to parse Gemini JSON: ' + e.message);
}

if (!emailJson || !emailJson.subject || !emailJson.body) {
  return [{
    json: {
      ...prevData,
      status: 'generation_failed'
    }
  }];
}

return [{
  json: {
    ...prevData,
    email_subject: emailJson.subject,
    email_body: emailJson.body,
    status: 'email_generated'
  }
}];
`;

const handleErrorCode = `
const prevData = $('Build Gemini Request').item.json;

return [{
  json: {
    ...prevData,
    gemini_error: $input.item.json.message || 'Unknown Gemini error',
    status: 'generation_failed'
  }
}];
`;

const summaryCode = `
const items = $input.all();
let success = 0;
let failed = 0;

for (const item of items) {
  if (item.json.status === 'email_generated') {
    success++;
  } else {
    failed++;
  }
}

return [{
  json: {
    summary: 'Workflow 04 Complete',
    generated_emails: success,
    failed_generations: failed
  }
}];
`;

const workflow = {
    "name": "04_generate_email",
    "nodes": [
        {
            "parameters": {},
            "id": "1",
            "name": "Start",
            "type": "n8n-nodes-base.manualTrigger",
            "typeVersion": 1,
            "position": [0, 0]
        },
        {
            "parameters": {
                "operation": "read",
                "documentId": {
                    "__rl": true,
                    "value": "={{$env.GOOGLE_SHEET_ID}}",
                    "mode": "id"
                },
                "sheetName": {
                    "__rl": true,
                    "value": "Sheet1",
                    "mode": "list",
                    "cachedResultName": "Sheet1"
                },
                "options": {}
            },
            "id": "2",
            "name": "Read Analyzed Leads",
            "type": "n8n-nodes-base.googleSheets",
            "typeVersion": 4.1,
            "position": [200, 0],
            "credentials": {
                "googleSheetsOAuth2Api": {
                    "id": "REPLACE_WITH_CREDENTIAL_ID",
                    "name": "Google Sheets account"
                }
            }
        },
        {
            "parameters": {
                "conditions": {
                    "string": [
                        {
                            "value1": "={{ $json.status }}",
                            "value2": "analyzed"
                        }
                    ]
                }
            },
            "id": "3",
            "name": "Filter Analyzed",
            "type": "n8n-nodes-base.if",
            "typeVersion": 1,
            "position": [400, 0]
        },
        {
            "parameters": {
                "jsCode": buildRequestCode
            },
            "id": "4",
            "name": "Build Gemini Request",
            "type": "n8n-nodes-base.code",
            "typeVersion": 2,
            "position": [620, -100]
        },
        {
            "parameters": {
                "method": "POST",
                "url": "=https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={{$env.GEMINI_API_KEY}}",
                "sendBody": true,
                "contentType": "raw",
                "rawBody": "={{ JSON.stringify($json.gemini_body) }}",
                "options": {
                    "response": {
                        "response": {
                            "fullResponse": true
                        }
                    }
                }
            },
            "id": "5",
            "name": "Gemini Email Generator",
            "type": "n8n-nodes-base.httpRequest",
            "typeVersion": 4.1,
            "position": [840, -100],
            "onError": "continueErrorOutput"
        },
        {
            "parameters": {
                "jsCode": extractResultCode
            },
            "id": "6",
            "name": "Extract Email JSON",
            "type": "n8n-nodes-base.code",
            "typeVersion": 2,
            "position": [1080, -200]
        },
        {
            "parameters": {
                "jsCode": handleErrorCode
            },
            "id": "7",
            "name": "Handle Gemini Error",
            "type": "n8n-nodes-base.code",
            "typeVersion": 2,
            "position": [1080, 0]
        },
        {
            "parameters": {
                "operation": "update",
                "documentId": {
                    "__rl": true,
                    "value": "={{$env.GOOGLE_SHEET_ID}}",
                    "mode": "id"
                },
                "sheetName": {
                    "__rl": true,
                    "value": "Sheet1",
                    "mode": "list",
                    "cachedResultName": "Sheet1"
                },
                "columnToMatchOn": "name",
                "valueToMatchOn": "={{ $json.name }}",
                "fieldsUi": {
                    "fieldValues": [
                        { "column": "email_subject", "value": "={{ $json.email_subject }}" },
                        { "column": "email_body", "value": "={{ $json.email_body }}" },
                        { "column": "status", "value": "={{ $json.status }}" }
                    ]
                },
                "options": {}
            },
            "id": "8",
            "name": "Update Google Sheet",
            "type": "n8n-nodes-base.googleSheets",
            "typeVersion": 4.1,
            "position": [1340, -100],
            "credentials": {
                "googleSheetsOAuth2Api": {
                    "id": "REPLACE_WITH_CREDENTIAL_ID",
                    "name": "Google Sheets account"
                }
            }
        },
        {
            "parameters": {
                "jsCode": summaryCode
            },
            "id": "9",
            "name": "Summary",
            "type": "n8n-nodes-base.code",
            "typeVersion": 2,
            "position": [1560, -100]
        }
    ],
    "connections": {
        "Start": {
            "main": [
                [
                    {
                        "node": "Read Analyzed Leads",
                        "type": "main",
                        "index": 0
                    }
                ]
            ]
        },
        "Read Analyzed Leads": {
            "main": [
                [
                    {
                        "node": "Filter Analyzed",
                        "type": "main",
                        "index": 0
                    }
                ]
            ]
        },
        "Filter Analyzed": {
            "main": [
                [
                    {
                        "node": "Build Gemini Request",
                        "type": "main",
                        "index": 0
                    }
                ]
            ]
        },
        "Build Gemini Request": {
            "main": [
                [
                    {
                        "node": "Gemini Email Generator",
                        "type": "main",
                        "index": 0
                    }
                ]
            ]
        },
        "Gemini Email Generator": {
            "main": [
                [
                    {
                        "node": "Extract Email JSON",
                        "type": "main",
                        "index": 0
                    }
                ],
                [
                    {
                        "node": "Handle Gemini Error",
                        "type": "main",
                        "index": 0
                    }
                ]
            ]
        },
        "Extract Email JSON": {
            "main": [
                [
                    {
                        "node": "Update Google Sheet",
                        "type": "main",
                        "index": 0
                    }
                ]
            ]
        },
        "Handle Gemini Error": {
            "main": [
                [
                    {
                        "node": "Update Google Sheet",
                        "type": "main",
                        "index": 0
                    }
                ]
            ]
        },
        "Update Google Sheet": {
            "main": [
                [
                    {
                        "node": "Summary",
                        "type": "main",
                        "index": 0
                    }
                ]
            ]
        }
    },
    "active": false,
    "settings": {
        "executionOrder": "v1"
    },
    "versionId": "fec20dc1-1234-5678-abcd-ef0123456789",
    "id": "e44c2115-4ba9-43a9-b6bb-d08bcf159a68",
    "meta": {
        "templateCredsSetupCompleted": true
    },
    "tags": []
};

fs.writeFileSync(path.join(__dirname, 'n8n-workflows', '04_generate_email.json'), JSON.stringify(workflow, null, 2));
console.log('Successfully generated 04_generate_email.json');
