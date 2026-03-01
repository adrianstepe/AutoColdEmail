const fs = require('fs');

function update03() {
    const file = 'n8n-workflows/03_analyze_website.json';
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));

    data.name = data.name.replace('Gemini', 'OpenAI');

    data.nodes.forEach(node => {
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
                { type: "image_url", image_url: { url: "data:image/png;base64," + base64Image } }
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
            node.parameters.url = 'https://api.openai.com/v1/chat/completions';
            node.parameters.sendHeaders = true;
            node.parameters.headerParameters = {
                parameters: [
                    {
                        name: "Authorization",
                        value: "=Bearer {{$env.OPENAI_API_KEY}}"
                    }
                ]
            };
        }

        if (node.name === 'Gemini Success?') {
            node.name = 'OpenAI Success?';
        }

        if (node.name === 'Handle Gemini Error') {
            node.name = 'Handle OpenAI Error';
            node.parameters.jsCode = node.parameters.jsCode.replace('Gemini', 'OpenAI');
        }

        if (node.name === 'Extract Result') {
            node.parameters.jsCode = node.parameters.jsCode.replace('result.candidates[0].content.parts[0].text', 'result.choices[0].message.content');
        }
    });

    let connStr = JSON.stringify(data.connections);
    connStr = connStr.replace(/Gemini/g, 'OpenAI');
    data.connections = JSON.parse(connStr);

    fs.writeFileSync(file, JSON.stringify(data, null, 2));
    console.log('Updated workflow 03');
}

function update04() {
    const file = 'n8n-workflows/04_generate_email.json';
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));

    data.nodes.forEach(node => {
        if (node.name === 'Build Gemini Request') {
            node.name = 'Build OpenAI Request';
            node.parameters.jsCode = node.parameters.jsCode
                .replace(/gemini_body/g, 'openai_body')
                .replace(/const body = {[\s\S]*?};\n\nreturn/, `const body = {
  model: "gpt-4o-mini",
  messages: [{ role: "user", content: fullPrompt }],
  response_format: { type: "json_object" },
  temperature: 0.7,
  max_tokens: 4096
};

return`);
        }

        if (node.name === 'Gemini Email Generator') {
            node.name = 'OpenAI Email Generator';
            node.parameters.url = 'https://api.openai.com/v1/chat/completions';
            if (node.parameters.rawBody) {
                node.parameters.rawBody = node.parameters.rawBody.replace('gemini_body', 'openai_body');
            }
            node.parameters.sendHeaders = true;
            node.parameters.headerParameters = {
                parameters: [
                    {
                        name: "Authorization",
                        value: "=Bearer {{$env.OPENAI_API_KEY}}"
                    }
                ]
            };
        }

        if (node.name === 'Extract Email JSON') {
            node.parameters.jsCode = node.parameters.jsCode
                .replace("response.candidates[0].content.parts[0].text", "response.choices[0].message.content")
                .replace(/Build Gemini Request/g, "Build OpenAI Request")
                .replace(/Gemini/g, "OpenAI");
        }

        if (node.name === 'Handle Gemini Error') {
            node.name = 'Handle OpenAI Error';
            node.parameters.jsCode = node.parameters.jsCode
                .replace(/Build Gemini Request/g, "Build OpenAI Request")
                .replace(/gemini_error/g, "openai_error")
                .replace(/Gemini/g, "OpenAI");
        }
    });

    let connStr = JSON.stringify(data.connections);
    connStr = connStr.replace(/Gemini/g, 'OpenAI');
    data.connections = JSON.parse(connStr);

    fs.writeFileSync(file, JSON.stringify(data, null, 2));
    console.log('Updated workflow 04');
}

update03();
update04();
