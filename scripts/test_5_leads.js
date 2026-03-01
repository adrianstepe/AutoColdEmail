require("dotenv").config();
const https = require("https");
const http = require("http");
const fs = require("fs");
const path = require("path");

const SCREENSHOTONE_API_KEY = process.env.SCREENSHOTONE_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const HUNTER_API_KEY = process.env.HUNTER_API_KEY;

const PROJECT_DIR = path.join(__dirname, "..");
const SCREENSHOT_DIR = path.join(PROJECT_DIR, "screenshots");

const leads = [
    { name: "Kolibri Skaistumkopšana", website: "https://kolibri.lv" },
    { name: "KOLONNA Skaistumkopšanas salons", website: "https://kolonna.com" },
    { name: "Prior skaistumkopšanas salons", website: "https://prior.lv" }
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

function httpsPostJSON(url, body, additionalHeaders = {}) {
    return new Promise((resolve, reject) => {
        const parsed = new URL(url);
        const data = JSON.stringify(body);
        const options = {
            hostname: parsed.hostname,
            path: parsed.pathname + parsed.search,
            method: "POST",
            headers: { "Content-Type": "application/json", ...additionalHeaders },
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
    const domain = new URL(websiteUrl).hostname.replace(/^www\./, '');
    const url = `https://api.hunter.io/v2/domain-search?domain=${domain}&api_key=${HUNTER_API_KEY}`;
    const res = await httpsGetJSON(url);
    const emails = res?.data?.emails || [];

    if (emails.length > 0) {
        emails.sort((a, b) => {
            if (a.type === 'personal' && b.type !== 'personal') return -1;
            if (a.type !== 'personal' && b.type === 'personal') return 1;
            return (b.confidence || 0) - (a.confidence || 0);
        });
        return { email: emails[0].value, type: emails[0].type, confidence: emails[0].confidence, source: "hunter" };
    }

    // Hunter found nothing — try multi-path scraper fallback
    console.log(`  - Hunter.io found nothing, trying page scraper fallback...`);
    return await scrapeEmailFromPages(websiteUrl, domain);
}

/**
 * Multi-path fallback: tries homepage + common Latvian contact pages to find email.
 * Prefers emails matching the site's own domain over partner/vendor emails.
 */
async function scrapeEmailFromPages(websiteUrl, domain) {
    const baseUrl = websiteUrl.replace(/\/$/, '');
    const paths = ['', '/kontakti', '/lv/kontakti', '/kontakts', '/contact', '/contacts', '/par-mums'];
    const emailRegex = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;

    function fetchPage(url) {
        return new Promise((resolve) => {
            const mod = url.startsWith("https") ? https : http;
            const req = mod.get(url, { timeout: 8000, headers: { "User-Agent": "Mozilla/5.0" }, rejectUnauthorized: false }, (res) => {
                if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                    const redir = res.headers.location.startsWith("http") ? res.headers.location : baseUrl + res.headers.location;
                    res.resume();
                    return fetchPage(redir).then(resolve);
                }
                let data = "";
                res.on("data", (c) => data += c);
                res.on("end", () => resolve(res.statusCode === 200 ? data : ""));
            });
            req.on("error", () => resolve(""));
            req.on("timeout", () => { req.destroy(); resolve(""); });
        });
    }

    for (const p of paths) {
        const url = baseUrl + p;
        const html = await fetchPage(url);
        if (!html) continue;

        const matches = html.match(emailRegex) || [];
        const filtered = [...new Set(matches)].filter(e =>
            !e.includes("example.com") && !e.includes("sentry.io") &&
            !e.includes("wixpress") && !e.includes("schema.org") &&
            !e.includes(".png") && !e.includes(".jpg") && !e.includes(".svg") &&
            !e.includes("@2x") && !e.includes("webpack")
        );
        if (filtered.length === 0) continue;

        const domainEmails = filtered.filter(e => e.endsWith("@" + domain) || e.includes(domain.split(".")[0]));
        const best = domainEmails.length > 0 ? domainEmails[0] : filtered[0];
        const src = (p || "homepage").replace("/", "");
        const conf = domainEmails.length > 0 ? 60 : 40;
        console.log(`  - Fallback found email on ${src}: ${best}`);
        return { email: best, type: "scraped", confidence: conf, source: "scrape_" + src };
    }

    return { email: "Not found", type: "N/A", confidence: 0, source: "none" };
}


async function takeScreenshot(websiteUrl, index) {
    const url = `https://api.screenshotone.com/take?access_key=${SCREENSHOTONE_API_KEY}&url=${encodeURIComponent(websiteUrl)}&viewport_width=1280&viewport_height=900&format=png&block_ads=true`;
    const buffer = await httpsGetBuffer(url);
    if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    const savePath = path.join(SCREENSHOT_DIR, `screenshot_${index}.png`);
    fs.writeFileSync(savePath, buffer);
    return { base64: buffer.toString("base64"), localPath: savePath };
}

async function analyzeWithOpenAI(base64Image) {
    const promptPath = path.join(__dirname, "..", "prompts", "website_analysis.txt");
    const prompt = fs.readFileSync(promptPath, "utf-8").trim();
    const url = `https://api.openai.com/v1/chat/completions`;

    const body = {
        model: "gpt-4o-mini",
        messages: [{
            role: "user",
            content: [
                { type: "text", text: prompt },
                { type: "image_url", image_url: { url: `data:image/png;base64,${base64Image}` } }
            ]
        }],
        temperature: 0.4,
        max_tokens: 2048
    };
    const headers = { "Authorization": `Bearer ${OPENAI_API_KEY}` };
    const result = await httpsPostJSON(url, body, headers);
    let analysis = result?.choices?.[0]?.message?.content?.trim() || "";

    // Fallback if no problem identified
    if (!analysis || analysis.toLowerCase().includes('no problem')) {
        analysis = 'mājaslapā nav tiešsaistes pieraksta pogas — klienti nevar rezervēt vizīti bez zvana';
    }
    return analysis;
}

async function generateEmail(lead, problem) {
    const promptPath = path.join(__dirname, "..", "prompts", "email_generation.txt");
    const basePrompt = fs.readFileSync(promptPath, "utf-8").trim();

    const leadData = {
        business_name: lead.name, owner_name: "", city: "Rīga", industry: "skaistumkopšanas salons",
        specific_problem: problem, website_url: lead.website, sender_name: "Adrians", sender_email: "adrians.stepe@gmail.com"
    };

    const prompt = basePrompt + "\n---\n**GENERATE THE EMAIL FOR THIS LEAD OUTPUT ONLY VALID JSON:**\n" + JSON.stringify(leadData);
    const url = `https://api.openai.com/v1/chat/completions`;
    const body = {
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 4096
    };

    const headers = { "Authorization": `Bearer ${OPENAI_API_KEY}` };
    const result = await httpsPostJSON(url, body, headers);
    let text = result?.choices?.[0]?.message?.content?.trim() || "";

    if (text.startsWith('```json')) text = text.substring(7);
    else if (text.startsWith('```')) text = text.substring(3);
    if (text.endsWith('```\n')) text = text.substring(0, text.length - 4);
    else if (text.endsWith('```')) text = text.substring(0, text.length - 3);

    try { return JSON.parse(text); }
    catch (e) { return { subject: "Error", body: text }; }
}

async function main() {
    let md = "# 🚀 3-Lead End-to-End Pipeline Test (OpenAI gpt-4o-mini)\n\n";
    md += `**Date:** ${new Date().toISOString()}\n\n`;
    md += "This report simulates the full n8n pipeline for 3 local beauty salons in Riga.\n\n";

    for (let i = 0; i < leads.length; i++) {
        const lead = leads[i];
        console.log(`Processing ${lead.name}...`);

        const hunter = await findEmail(lead.website);
        console.log(`  - Found email: ${hunter.email}`);

        const shot = await takeScreenshot(lead.website, i);
        console.log(`  - Screenshot taken.`);

        const problem = await analyzeWithOpenAI(shot.base64);
        console.log(`  - Problem: ${problem}`);

        const email = await generateEmail(lead, problem);
        console.log(`  - Email generated.`);

        md += `## ${lead.name}\n`;
        md += `**Website:** [${lead.website}](${lead.website})\n`;
        md += `**Found Email:** \`${hunter.email}\` (Source: ${hunter.source || 'N/A'}, Type: ${hunter.type}, Confidence: ${hunter.confidence}%)\n\n`;
        md += `### 📸 Website Analysis (ScreenshotOne + OpenAI Vision)\n`;
        md += `![Screenshot](${shot.localPath})\n\n`;
        md += `> **Identified Problem:** *${problem}*\n\n`;
        md += `### ✉️ Generated Cold Email\n`;
        md += `**Subject:** ${email.subject}\n\n`;
        md += `**To:** ${hunter.email !== "Not found" ? hunter.email : "NO_VALID_EMAIL"}\n\n`;
        md += `\`\`\`text\n${email.body}\n\`\`\`\n\n`;
        md += `---\n\n`;
    }

    const reportPath = path.join(PROJECT_DIR, "pipeline_test_results.md");
    fs.writeFileSync(reportPath, md);
    console.log(`Done! Report saved to ${reportPath}`);
}

main();
