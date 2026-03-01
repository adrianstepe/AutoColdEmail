const fs = require('fs');

// ==== Modify workflow 03 ====
let wf3 = JSON.parse(fs.readFileSync('n8n-workflows/03_analyze_website.json', 'utf8'));

wf3.nodes.forEach(node => {
  if (node.name === 'Build Gemini Request') {
    node.name = 'Build OpenAI Request';
    node.parameters.jsCode = `const fs = require('fs');
const path = require('path');

// 1. Get Base64 image
const base64Image = typeof $input.item.json === 'string' ? $input.item.json : ($input.item.json.data || $input.item.json.body || $input.item.json.base64);

// 2. Load prompt
const workspaceDir = process.cwd();
const promptPath = path.join(workspaceDir, 'prompts', 'website_analysis.txt');
const prompt = fs.readFileSync(promptPath, 'utf8');

// 3. Build body
const body = {
    model: "gpt-4o-mini",
    messages: [
        {
            role: "user",
            content: [
                { type: "text", text: prompt },
                { type: "image_url", image_url: { url: \`data:image/png;base64,\${base64Image}\` } }
            ]
        }
    ],
    temperature: 0.4,
    max_tokens: 2048
};

return [{ json: body }];`;
  }
  
  if (node.name === 'Gemini Vision') {
    node.name = 'OpenAI Vision';
    node.parameters = {
      "method": "POST",
      "url": "https://api.openai.com/v1/chat/completions",
      "sendBody": true,
      "specifyBody": "json",
      "jsonBody": "={{ JSON.stringify($json) }}",
      "sendHeaders": true,
      "headerParameters": {
        "parameters": [
          {
            "name": "Authorization",
            "value": "=Bearer {{$env.OPENAI_API_KEY}}"
          }
        ]
      },
      "options": {
        "timeout": 60000
      }
    };
  }

  if (node.name === 'Gemini Success?') {
    node.name = 'OpenAI Success?';
  }

  if (node.name === 'Handle Gemini Error') {
    node.name = 'Handle OpenAI Error';
    node.parameters.jsCode = `const lead = $('Read Leads (email_found)').item.json;
console.error("OpenAI Vision error for " + lead.website, $input.item.json);
return [{
  json: {
    ...lead,
    status: 'analysis_failed',
    specific_problem: ''
  }
}];`;
  }

  if (node.name === 'Extract Result') {
    node.parameters.jsCode = `const lead = $('Read Leads (email_found)').item.json;
const result = $input.item.json;
let analysis = '';

try {
  analysis = result.choices[0].message.content.trim();
} catch (e) {
  return [{
    json: {
      ...lead,
      status: 'analysis_failed',
      specific_problem: ''
    }
  }];
}

if (!analysis || analysis.toLowerCase().includes('no problem')) {
  analysis = 'mājaslapā nav tiešsaistes pieraksta pogas — klienti nevar rezervēt vizīti bez zvana';
}

return [{
  json: {
    ...lead,
    status: 'analyzed',
    specific_problem: analysis
  }
}];`;
  }
});

// Rename connections
const connections3 = JSON.stringify(wf3.connections)
  .replace(/"Gemini Vision"/g, '"OpenAI Vision"')
  .replace(/"Build Gemini Request"/g, '"Build OpenAI Request"')
  .replace(/"Gemini Success\?"/g, '"OpenAI Success?"')
  .replace(/"Handle Gemini Error"/g, '"Handle OpenAI Error"');
wf3.connections = JSON.parse(connections3);
wf3.name = "03 — Analyze Website (OpenAI Vision)";

fs.writeFileSync('n8n-workflows/03_analyze_website.json', JSON.stringify(wf3, null, 2));


// ==== Modify workflow 04 ====
let wf4 = JSON.parse(fs.readFileSync('n8n-workflows/04_generate_email.json', 'utf8'));

wf4.nodes.forEach(node => {
  if (node.name === 'Build Gemini Request') {
    node.name = 'Build OpenAI Request';
    node.parameters.jsCode = `
const prompt = $('Filter Analyzed').item.json; // placeholder to trigger eval if needed
const basePrompt = \`# SYSTEM PROMPT — Latvian B2B Cold Email Generator
### For use in n8n AI node (Gemini / GPT)
... existing long prompt omitted, wait, we don't have to rewrite the literal long prompt if we can just string replace in JS!
\`;
// Actually, I should string replace node.parameters.jsCode for wf4
    `;
  }
});
