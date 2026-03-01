require("dotenv").config();
const https = require("https");
const fs = require("fs");
const path = require("path");

const SCREENSHOTONE_API_KEY = process.env.SCREENSHOTONE_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const HUNTER_API_KEY = process.env.HUNTER_API_KEY;

const ARTIFACT_DIR = "/home/as/.gemini/antigravity/brain/be604afd-912f-4c32-8539-8513560ef23e";

const leads = [
    { name: "KOLONNA Skaistumkopšanas salons", website: "https://kolonna.com" },
    { name: "Prior skaistumkopšanas salons", website: "https://prior.lv" },
    { name: "Salons Maija", website: "https://maija.lv" },
    { name: "Pam Pam skaistumkopšana", website: "https://pampam.lv" },
    { name: "Mella matu pieaudzēšana", website: "https://mella.lv" }
];

function httpsGetBuffer(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            const chunks = [];
            res.on("data", (chunk) => chunks.push(chunk));
            res.on("end", () => resolve(Buffer.concat(chunks)));
            res.on("error", reject);
        }).on("error", reject);
    });
}

function httpsGetJSON(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on("data", (chunk) => data += chunk);
            res.on("end", () => {
                try { resolve(JSON.parse(data)); }
                catch (e) { resolve({ data: { emails: [] } }); }
            });
            res.on("error", reject);
        }).on("error", reject);
    });
}

function httpsPostJSON(url, body) {
    return new Promise((resolve, reject) => {
        const parsed = new URL(url);
        const data = JSON.stringify(body);
        const options = {
            hostname: parsed.hostname,
            path: parsed.pathname + parsed.search,
            method: "POST",
            headers: { "Content-Type": "application/json" },
        };
        const req = https.request(options, (res) => {
            let responseBody = '';
            res.on("data", (chunk) => responseBody += chunk);
            res.on("end", () => {
                try { resolve(JSON.parse(responseBody)); }
                catch (e) { resolve({}); }
            });
        });
        req.on("error", reject);
        req.write(data);
        req.end();
    });
}

async function findEmail(websiteUrl) {
    const domain = new URL(websiteUrl).hostname.replace(/^www\\./, '');
    const url = `https://api.hunter.io/v2/domain-search?domain=${domain}&api_key=${HUNTER_API_KEY}`;
    const res = await httpsGetJSON(url);
    const emails = res?.data?.emails || [];
    if (emails.length === 0) return { email: "Not found", type: "N/A", confidence: 0 };

    emails.sort((a, b) => {
        if (a.type === 'personal' && b.type !== 'personal') return -1;
        if (a.type !== 'personal' && b.type === 'personal') return 1;
        return (b.confidence || 0) - (a.confidence || 0);
    });

    return { email: emails[0].value, type: emails[0].type, confidence: emails[0].confidence };
}

async function takeScreenshot(websiteUrl, index) {
    const url = `https://api.screenshotone.com/take?access_key=${SCREENSHOTONE_API_KEY}&url=${encodeURIComponent(websiteUrl)}&viewport_width=1280&viewport_height=900&format=png&block_ads=true`;
    const buffer = await httpsGetBuffer(url);
    const savePath = path.join(ARTIFACT_DIR, `screenshot_${index}.png`);
    fs.writeFileSync(savePath, buffer);
    return { base64: buffer.toString("base64"), localPath: savePath };
}

async function analyzeWithGemini(base64Image) {
    const promptPath = path.join(__dirname, "..", "prompts", "website_analysis.txt");
    const prompt = fs.readFileSync(promptPath, "utf-8").trim();
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

    const body = {
        contents: [{ parts: [{ inline_data: { mime_type: "image/png", data: base64Image } }, { text: prompt }] }],
        generationConfig: { temperature: 0.4, maxOutputTokens: 2048 }
    };
    const result = await httpsPostJSON(url, body);
    return result?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "No problem found";
}

async function generateEmail(lead, problem) {
    const promptPath = path.join(__dirname, "..", "prompts", "email_generation.txt");
    const basePrompt = fs.readFileSync(promptPath, "utf-8").trim();

    const leadData = {
        business_name: lead.name, owner_name: "", city: "Rīga", industry: "skaistumkopšanas salons",
        specific_problem: problem, website_url: lead.website, sender_name: "Adrians", sender_email: "adrians@auto-cold-email.lv"
    };

    const prompt = basePrompt + "\
\
---\
\
**GENERATE THE EMAIL FOR THIS LEAD OUTPUT ONLY VALID JSON:**\
" + JSON.stringify(leadData);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
    const body = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 4096 }
    };

    const result = await httpsPostJSON(url, body);
    let text = result?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
    if (text.startsWith('```json')) text = text.substring(7);
    else if (text.startsWith('```')) text = text.substring(3);
    if (text.endsWith('```\
')) text = text.substring(0, text.length - 4);
    else if (text.endsWith('```')) text = text.substring(0, text.length - 3);

    try { return JSON.parse(text); }
    catch (e) { return { subject: "Error", body: text }; }
}

async function main() {
    let md = "# 🚀 5-Lead End-to-End Pipeline Test\n\n";
    md += "This report simulates the full n8n pipeline for 5 local beauty salons in Riga.\n\n";

    for (let i = 0; i < 4; i++) {
        const lead = leads[i];
        console.log(`Processing ${lead.name}...`);

        const hunter = await findEmail(lead.website);
        console.log(`  - Found email: ${hunter.email}`);

        const shot = await takeScreenshot(lead.website, i);
        console.log(`  - Screenshot taken.`);

        const problem = await analyzeWithGemini(shot.base64);
        console.log(`  - Problem: ${problem}`);

        const email = await generateEmail(lead, problem);
        console.log(`  - Email generated.`);

        md += `## ${lead.name}\n`;
        md += `**Website:** [${lead.website}](${lead.website})\n`;
        md += `**Found Email (Hunter.io):** \`${hunter.email}\` (Type: ${hunter.type}, Confidence: ${hunter.confidence}%)\n\n`;
        md += `### 📸 Website Analysis (ScreenshotOne + Gemini Vision)\n`;
        md += `![Screenshot](${shot.localPath})\n\n`;
        md += `> **Identified Problem:** *${problem}*\n\n`;
        md += `### ✉️ Generated Cold Email\n`;
        md += `**Subject:** ${email.subject}\n\n`;
        md += `**To:** ${hunter.email !== "Not found" ? hunter.email : "NO_VALID_EMAIL"}\n\n`;
        md += `\`\`\`text\n${email.body}\n\`\`\`\n\n`;
        md += `---\n\n`;
    }

    const reportPath = path.join(ARTIFACT_DIR, "pipeline_test_results.md");
    fs.writeFileSync(reportPath, md);
    console.log(`Done! Report saved to ${reportPath}`);
}

main();
