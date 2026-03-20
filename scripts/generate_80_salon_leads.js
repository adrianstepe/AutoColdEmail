#!/usr/bin/env node

/**
 * generate_80_salon_leads.js — Batch pipeline for 80 nail salon leads in Riga
 *
 * Pipeline:
 *   1. Scrape 100+ nail salons from Google Maps Riga via Apify
 *   2. Find emails via Hunter.io + page scraping fallback
 *   3. Screenshot websites (skip if no website)
 *   4. Analyze websites with OpenAI Vision (only if email found)
 *   5. Generate personalized cold emails in Latvian (only if email found)
 *   6. Output: markdown report + CSV (NO emails are sent)
 *
 * Usage:
 *   node scripts/generate_80_salon_leads.js
 */

require("dotenv").config();
const https = require("https");
const http = require("http");
const fs = require("fs");
const path = require("path");

// --- Config ---
const APIFY_API_KEY = process.env.APIFY_API_KEY;
const SCREENSHOTONE_API_KEY = process.env.SCREENSHOTONE_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const HUNTER_API_KEY = process.env.HUNTER_API_KEY;

const PROJECT_DIR = path.join(__dirname, "..");
const SCREENSHOT_DIR = path.join(PROJECT_DIR, "screenshots", "salons_batch");

const TARGET_COUNT = 80;

// Salon-specific search queries for Riga
const SEARCH_QUERIES = [
    "nagu salons Rīga",
    "manikīrs Rīga",
    "pedikīrs Rīga",
    "skaistumkopšanas salons Rīga",
    "nagu studija Rīga",
    "manikīra meistars Rīga",
    "skaistuma studija Rīga"
];

// --- HTTP Helpers ---

function httpsGetBuffer(url) {
    return new Promise((resolve, reject) => {
        const mod = url.startsWith("https") ? https : http;
        mod.get(url, { timeout: 30000 }, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                return httpsGetBuffer(res.headers.location).then(resolve).catch(reject);
            }
            const chunks = [];
            res.on("data", (chunk) => chunks.push(chunk));
            res.on("end", () => {
                const buffer = Buffer.concat(chunks);
                if (res.statusCode !== 200) {
                    reject(new Error(`HTTP ${res.statusCode} from ${url}\nBody: ${buffer.toString().substring(0, 300)}`));
                    return;
                }
                resolve(buffer);
            });
            res.on("error", reject);
        }).on("error", reject);
    });
}

function httpsGetJSON(url) {
    return new Promise((resolve, reject) => {
        https.get(url, { timeout: 15000 }, (res) => {
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
            port: parsed.port || 443,
            path: parsed.pathname + parsed.search,
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(data),
                ...additionalHeaders
            },
            timeout: 60000,
        };

        const mod = parsed.protocol === "https:" ? https : http;
        const req = mod.request(options, (res) => {
            let responseBody = '';
            res.on("data", (chunk) => responseBody += chunk);
            res.on("end", () => {
                try { resolve(JSON.parse(responseBody)); }
                catch (e) { resolve({ raw: responseBody }); }
            });
        });
        req.on("error", reject);
        req.on("timeout", () => { req.destroy(); reject(new Error("Request timeout")); });
        req.write(data);
        req.end();
    });
}

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

// --- Step 1: Scrape leads from Google Maps via Apify ---

async function scrapeLeads() {
    console.log("\n🔍 Step 1: Scraping trade businesses from Google Maps Riga...");
    console.log(`   Queries: ${SEARCH_QUERIES.length}`);

    if (!APIFY_API_KEY) throw new Error("APIFY_API_KEY is not set in .env");

    // Start the Apify actor run
    const startUrl = `https://api.apify.com/v2/acts/compass~crawler-google-places/runs?token=${APIFY_API_KEY}&waitForFinish=300`;
    const startBody = {
        searchStringsArray: SEARCH_QUERIES,
        maxCrawledPlacesPerSearch: 20,
        language: "lv",
        includeWebResults: false,
    };

    console.log("   Starting Apify scraper (this may take 2-5 minutes)...");
    const runResult = await httpsPostJSON(startUrl, startBody);

    if (!runResult || !runResult.data) {
        throw new Error("Apify run failed. Response: " + JSON.stringify(runResult).substring(0, 500));
    }

    const datasetId = runResult.data.defaultDatasetId;
    const runId = runResult.data.id;
    const status = runResult.data.status;

    console.log(`   Run ID: ${runId}, Status: ${status}`);

    // If not finished yet, poll until done
    if (status !== "SUCCEEDED") {
        console.log("   Waiting for scraper to finish...");
        let attempts = 0;
        while (attempts < 60) {
            await sleep(5000);
            const checkUrl = `https://api.apify.com/v2/acts/compass~crawler-google-places/runs/${runId}?token=${APIFY_API_KEY}`;
            const checkResult = await httpsGetJSON(checkUrl);
            const currentStatus = checkResult?.data?.status;
            if (currentStatus === "SUCCEEDED") {
                console.log("   ✅ Scraper finished!");
                break;
            } else if (currentStatus === "FAILED" || currentStatus === "ABORTED") {
                throw new Error(`Apify run ${currentStatus}`);
            }
            attempts++;
            if (attempts % 6 === 0) console.log(`   Still waiting... (${attempts * 5}s)`);
        }
    }

    // Fetch results
    const fetchUrl = `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_API_KEY}&limit=200`;
    const items = await httpsGetJSON(fetchUrl);

    if (!Array.isArray(items) || items.length === 0) {
        throw new Error("No results from Apify. Dataset may be empty.");
    }

    console.log(`   Raw results: ${items.length} businesses found`);

    // Clean and deduplicate
    const seen = new Set();
    const leads = [];

    for (const item of items) {
        const name = item.title || item.name || "";
        if (!name || seen.has(name.toLowerCase())) continue;
        seen.add(name.toLowerCase());

        leads.push({
            name: name,
            website: item.website || "",
            address: item.address || item.street || "",
            phone: item.phone || item.phoneUnformatted || "",
            rating: item.totalScore || item.rating || "",
            category: item.categoryName || item.categories?.[0] || "",
            hasWebsite: !!(item.website),
        });
    }

    console.log(`   ✅ Cleaned: ${leads.length} unique businesses (${leads.filter(l => l.hasWebsite).length} with website, ${leads.filter(l => !l.hasWebsite).length} without)`);
    return leads;
}

// --- Step 2: Find email for a business ---

async function findEmail(lead) {
    if (lead.website) {
        // Try Hunter.io first
        try {
            const domain = new URL(lead.website).hostname.replace(/^www\./, '');
            const url = `https://api.hunter.io/v2/domain-search?domain=${domain}&api_key=${HUNTER_API_KEY}`;
            const res = await httpsGetJSON(url);
            const emails = res?.data?.emails || [];

            if (emails.length > 0) {
                emails.sort((a, b) => {
                    if (a.type === 'personal' && b.type !== 'personal') return -1;
                    if (a.type !== 'personal' && b.type === 'personal') return 1;
                    return (b.confidence || 0) - (a.confidence || 0);
                });
                return { email: emails[0].value, source: "hunter", confidence: emails[0].confidence };
            }
        } catch (e) {
            // Hunter failed, try scraping
        }

        // Fallback: scrape contact pages
        try {
            const result = await scrapeEmailFromPages(lead.website);
            if (result.email !== "Not found") return result;
        } catch (e) {
            // Scraping failed
        }
    }

    // No website or no email found — try Google Maps phone-based lookup or return not found
    return { email: "Not found", source: "none", confidence: 0 };
}

async function scrapeEmailFromPages(websiteUrl) {
    const baseUrl = websiteUrl.replace(/\/$/, '');
    let domain;
    try { domain = new URL(websiteUrl).hostname.replace(/^www\./, ''); }
    catch { return { email: "Not found", source: "none", confidence: 0 }; }

    const paths = ['', '/kontakti', '/lv/kontakti', '/kontakts', '/contact', '/contacts', '/par-mums', '/about'];
    const emailRegex = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;

    function fetchPage(url, depth = 0) {
        if (depth > 3) return Promise.resolve("");
        return new Promise((resolve) => {
            const mod = url.startsWith("https") ? https : http;
            const req = mod.get(url, { timeout: 8000, headers: { "User-Agent": "Mozilla/5.0" }, rejectUnauthorized: false }, (res) => {
                if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                    const redir = res.headers.location.startsWith("http") ? res.headers.location : baseUrl + res.headers.location;
                    res.resume();
                    return fetchPage(redir, depth + 1).then(resolve);
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
        try {
            const url = baseUrl + p;
            const html = await fetchPage(url);
            if (!html) continue;

            const matches = html.match(emailRegex) || [];
            const filtered = [...new Set(matches)].filter(e =>
                !e.includes("example.com") && !e.includes("sentry.io") &&
                !e.includes("wixpress") && !e.includes("schema.org") &&
                !e.includes(".png") && !e.includes(".jpg") && !e.includes(".svg") &&
                !e.includes("@2x") && !e.includes("webpack") && !e.includes("cloudflare")
            );
            if (filtered.length === 0) continue;

            const domainEmails = filtered.filter(e => e.endsWith("@" + domain) || e.includes(domain.split(".")[0]));
            const best = domainEmails.length > 0 ? domainEmails[0] : filtered[0];
            return { email: best, source: "scrape", confidence: domainEmails.length > 0 ? 60 : 40 };
        } catch (e) {
            continue;
        }
    }

    return { email: "Not found", source: "none", confidence: 0 };
}

// --- Step 3: Screenshot a website ---

async function takeScreenshot(websiteUrl, index) {
    if (!SCREENSHOTONE_API_KEY) throw new Error("SCREENSHOTONE_API_KEY not set");

    const url = `https://api.screenshotone.com/take?access_key=${SCREENSHOTONE_API_KEY}&url=${encodeURIComponent(websiteUrl)}&viewport_width=1280&viewport_height=900&format=png&block_ads=true&timeout=15`;

    try {
        const buffer = await httpsGetBuffer(url);
        if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
        const safeName = websiteUrl.replace(/https?:\/\//, '').replace(/[^a-zA-Z0-9.-]/g, '_');
        const savePath = path.join(SCREENSHOT_DIR, `trade_${index}_${safeName}.png`);
        fs.writeFileSync(savePath, buffer);
        return { base64: buffer.toString("base64"), localPath: savePath };
    } catch (e) {
        console.log(`   ⚠️ Screenshot failed for ${websiteUrl}: ${e.message}`);
        return null;
    }
}

// --- Step 4: Analyze website with OpenAI Vision ---

const TRADE_ANALYSIS_PROMPT = `You are analyzing a screenshot of a local nail salon / beauty salon website in Latvia.

Find exactly ONE specific problem and describe it in ONE Latvian sentence.

Look for problems in this priority order. Pick the FIRST one you find:

1. Design looks outdated — old fonts, misaligned elements, no modern styling, looks like it was built 10+ years ago
2. Page layout is broken or unresponsive — would look bad on mobile
3. No online booking system (online pieraksts) visible — clients have to call to book an appointment
4. No clear price list (cenrādis) visible on the page
5. No high-quality photos of previous work (portfolio)
6. No business hours or availability shown
7. No customer reviews or testimonials visible
8. No address or map information visible

Rules:
- Output exactly ONE sentence in Latvian, starting with a lowercase letter
- Describe the specific problem you found and its consequence for potential clients
- NEVER output "No problem found", "Nav problēmu", or anything similar
- NEVER output explanations, reasoning, or multiple sentences
- Do NOT wrap in quotes

Example outputs:
- mājaslapas dizains izskatās novecojis un neuzticams — potenciālie klienti, visticamāk, izvēlēsies konkurentu ar modernāku lapu
- mājaslapā nav redzama tiešsaistes pieraksta sistēma — klienti, kas negrib zvanīt, vienkārši aiziet pie konkurentiem
- mājaslapā nav norādīts skaidrs cenrādis — klienti nevar novērtēt piedāvājumu pirms zvanīšanas
- mājaslapā nav kvalitatīvu darbu fotogrāfiju — klienti nevar redzēt iepriekšējo nagu dizainu kvalitāti

One Latvian sentence only. No explanation.`;

async function analyzeWebsite(base64Image) {
    const url = `https://api.openai.com/v1/chat/completions`;
    const body = {
        model: "gpt-4o-mini",
        messages: [{
            role: "user",
            content: [
                { type: "text", text: TRADE_ANALYSIS_PROMPT },
                { type: "image_url", image_url: { url: `data:image/png;base64,${base64Image}` } }
            ]
        }],
        temperature: 0.4,
        max_tokens: 300
    };
    const headers = { "Authorization": `Bearer ${OPENAI_API_KEY}` };

    try {
        const result = await httpsPostJSON(url, body, headers);
        let analysis = result?.choices?.[0]?.message?.content?.trim() || "";
        if (!analysis || analysis.toLowerCase().includes('no problem') || analysis === 'SKIP') {
            analysis = 'mājaslapas dizains izskatās novecojis — potenciālie klienti, visticamāk, izvēlēsies konkurentu ar modernāku lapu';
        }
        return analysis;
    } catch (e) {
        return 'mājaslapas dizains izskatās novecojis — potenciālie klienti, visticamāk, izvēlēsies konkurentu ar modernāku lapu';
    }
}

// --- Step 5: Generate personalized email ---

const TRADE_EMAIL_PROMPT = `# SYSTEM PROMPT — Latvian B2B Cold Email Generator (Beauty & Nail Salons)

## ROLE

You are a native Latvian B2B copywriter specializing in cold email outreach for local beauty and nail salons (nagu saloni, manikīra meistari). You write short, formal, grammatically flawless Latvian business emails that are deeply personalized, culturally appropriate, and legally compliant.

You are NOT a marketing AI. You do not use hype, enthusiasm, or sales language. You write like a pragmatic local consultant — austere, direct, respectful.

## INPUT YOU WILL RECEIVE

A JSON object with fields: business_name, owner_name, city, industry, specific_problem, website_url (may be empty if business has no website), has_website (boolean), sender_name, sender_email.

## OUTPUT FORMAT

Return a JSON object:
{
  "subject": "...",
  "body": "..."
}

The body field must use \\n for line breaks. No HTML. Plain text only.

## STRICT WRITING RULES

### Language
- Write 100% in Latvian. Zero English words, zero code-switching.
- Grammar must be native-level perfect. Wrong case endings, wrong verb forms, or machine-translated phrasing will destroy credibility immediately.

### Pronouns — CRITICAL
- Always use "Jūs" (capitalized) when referring to the recipient. Never "tu" or lowercase "jūs".
- Apply correct grammatical declension: Nominative: Jūs, Genitive: Jūsu, Dative: Jums, Accusative: Jūs
- Using "tu" or lowercase "jūs" is a severe cultural offense.

### Tone
- Formal, but not stiff or bureaucratic
- Calm, measured, pragmatic
- No enthusiasm. No exclamation marks (!)
- No emojis
- No filler phrases like "I hope this finds you well"
- Write as a peer-level consultant, not a vendor pitching

### Length
- 3–5 sentences maximum in the body (excluding greeting and sign-off)

### Structure (follow this exact sequence)

1. Greeting — "Labdien," (no name since we don't know it for salons)
2. Specific Observation — One sentence referencing the exact problem found. If has_website is false, reference that they have no website while competitors do. If has_website is true, reference the specific website problem. This must feel hand-researched.
3. Who you are + what you do — One sentence. "Es specializējos tieši mazo skaistumkopšanas salonu mājaslapu izveidē Rīgā." Frame as specialist, never say "we".
4. Social proof — COPY-PASTE VERBATIM: "Nesen palīdzēju Rīgas kosmētiskajam salonam izveidot jaunu mājaslapu, un viņi sāka saņemt papildus tiešsaistes pierakstus jau pirmajā nedēļā."
5. CTA — COPY-PASTE VERBATIM: "Vai Jums būtu interese — varu nosūtīt īsu video, kurā parādu, kā moderna mājaslapa varētu izskatīties Jūsu salonam?"
6. Opt-Out — COPY-PASTE VERBATIM: "Ja nevēlaties saņemt šādus e-pastus, vienkārši atbildiet uz šo ziņu."
7. Sign-off — "Ar cieņu,\\n[Sender Name]\\n[Email]"

## SUBJECT LINE RULES

- If business HAS a website: "Jautājums par [Business Name] mājaslapu"
- If business has NO website: "Jautājums par [Business Name]"
- Factual, neutral, zero hype. No question marks. No emojis.

## PERSONALIZATION RULES

The specific_problem field is your anchor. Every email must be built around it.

When referencing a website, strip https://, http://, and www. — use only clean domain name.

### For businesses WITHOUT a website (has_website = false):
Reference that they currently don't have a website, and that potenciālie klienti searching online for their services in Riga are finding competitors instead. Tie this to concrete lost bookings — klienti meklē skaistumkopšanas pakalpojumus tiešsaistē, un nav atrodama informācija par Jūsu salonu.

### For businesses WITH a website (has_website = true):
Reference the specific problem found from the website analysis. Make it concrete — not "your website is old" but the exact issue and its consequence (e.g. no online booking).

## CRITICAL RULES
- Every email MUST be unique — vary sentence structure, word choice, and the way you frame the observation
- Do NOT produce identical emails for different businesses
- The social proof sentence, CTA sentence, and opt-out sentence are LOCKED — copy them verbatim
- But the observation sentence (point 2) and positioning sentence (point 3) should be VARIED for each business while keeping the same meaning
- Vary how you open the observation: sometimes start with "Meklējot...", "Apskatot...", "Pārbaudot...", "Ievēroju, ka..." — make each email feel individually written

## BLACKLIST
| Avoid | Use instead |
|---|---|
| "Ceru, ka šis e-pasts Jūs sasniedz labā veselībā" | Jump straight to the observation |
| "Mēs esam vadošā aģentūra..." | "Es specializējos..." |
| "Garantējam rezultātus!" | Describe concrete feature |
| "Sveiki!" | "Labdien," |
| "tu/tava" | "Jūs/Jūsu" |
| Multiple exclamation marks | None |
| Emojis | None |
| "Bezmaksas konsultācija" in subject | Keep subject factual |

## FINAL CHECKLIST
- Written 100% in Latvian, zero English
- "Jūs" capitalized throughout, correct case
- Body is 3–5 sentences (excluding greeting and sign-off)
- Specific problem referenced explicitly
- No exclamation marks, no emojis
- Sender uses "Es" not "Mēs"
- Social proof is verbatim locked sentence
- CTA is verbatim locked sentence
- Opt-out is verbatim locked sentence
- Subject line is factual, no hype
- Sign-off is "Ar cieņu,"
- Output is valid JSON`;

async function generateEmail(lead, problem) {
    const leadData = {
        business_name: lead.name,
        owner_name: "",
        city: "Rīga",
        industry: lead.category || "pakalpojumu uzņēmums",
        specific_problem: problem,
        website_url: lead.website || "",
        has_website: lead.hasWebsite,
        sender_name: "Adrians",
        sender_email: "adrians.stepe@gmail.com"
    };

    const prompt = TRADE_EMAIL_PROMPT + "\n\n---\n\n**GENERATE THE EMAIL FOR THIS LEAD. OUTPUT ONLY VALID JSON:**\n" + JSON.stringify(leadData);
    const url = `https://api.openai.com/v1/chat/completions`;
    const body = {
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.8,  // slightly higher for more variation between emails
        max_tokens: 1024
    };

    const headers = { "Authorization": `Bearer ${OPENAI_API_KEY}` };

    try {
        const result = await httpsPostJSON(url, body, headers);
        let text = result?.choices?.[0]?.message?.content?.trim() || "";
        if (text.startsWith('```json')) text = text.substring(7);
        else if (text.startsWith('```')) text = text.substring(3);
        if (text.endsWith('```\n')) text = text.substring(0, text.length - 4);
        else if (text.endsWith('```')) text = text.substring(0, text.length - 3);

        try { return JSON.parse(text); }
        catch (e) { return { subject: "Parse Error", body: text }; }
    } catch (e) {
        return { subject: "Error", body: `Failed to generate: ${e.message}` };
    }
}

// --- Main Pipeline ---

async function main() {
    console.log("═══════════════════════════════════════════════════════════");
    console.log("  Cold Email Pipeline — 80 Nail Salons in Riga");
    console.log("  Date: " + new Date().toISOString());
    console.log("═══════════════════════════════════════════════════════════\n");

    // Step 1: Scrape leads
    const allLeads = await scrapeLeads();

    if (allLeads.length === 0) {
        console.error("❌ No leads found. Aborting.");
        process.exit(1);
    }

    // Take first TARGET_COUNT leads
    const leads = allLeads.slice(0, TARGET_COUNT);
    console.log(`\n📋 Processing ${leads.length} leads...\n`);

    // Process leads one by one
    const results = [];
    let successCount = 0;
    let skipCount = 0;

    for (let i = 0; i < leads.length; i++) {
        const lead = leads[i];
        const num = `[${i + 1}/${leads.length}]`;

        console.log(`\n${num} ${lead.name}`);
        console.log(`    Website: ${lead.website || "NO WEBSITE"}`);
        console.log(`    Category: ${lead.category || "N/A"}`);

        try {
            // Find email
            console.log(`    Finding email...`);
            const emailResult = await findEmail(lead);
            console.log(`    Email: ${emailResult.email} (${emailResult.source})`);

            let email = { subject: "", body: "" };
            let problem = "";
            let screenshotPath = "";

            if (emailResult.email === "Not found") {
                console.log(`    Skipping analysis and generation since no email was found.`);
            } else {
                // Determine the problem
                if (lead.hasWebsite) {
                    // Screenshot + analyze
                    console.log(`    Taking screenshot...`);
                    const shot = await takeScreenshot(lead.website, i);

                    if (shot) {
                        screenshotPath = shot.localPath;
                        console.log(`    Analyzing website...`);
                        problem = await analyzeWebsite(shot.base64);
                    } else {
                        problem = "mājaslapas dizains izskatās novecojis — potenciālie klienti, visticamāk, izvēlēsies konkurentu ar modernāku lapu";
                    }
                } else {
                    // No website — use a specific problem about not having a website
                    problem = `uzņēmumam nav mājaslapas — klienti tiešsaistē skaistumkopšanas pakalpojumus Rīgā neatrod Jūs, nosliecoties par labu konkurentiem`;
                }

                console.log(`    Problem: ${problem}`);

                // Generate email
                console.log(`    Generating email...`);
                email = await generateEmail(lead, problem);
                console.log(`    ✅ Done`);
            }

            results.push({
                index: i + 1,
                name: lead.name,
                website: lead.website || "Nav mājaslapas",
                hasWebsite: lead.hasWebsite,
                email: emailResult.email,
                emailSource: emailResult.source,
                emailConfidence: emailResult.confidence,
                phone: lead.phone,
                address: lead.address,
                category: lead.category,
                problem: problem,
                emailSubject: email.subject || "",
                emailBody: email.body || "",
                screenshotPath: screenshotPath,
                status: emailResult.email !== "Not found" ? "ready_to_send" : "no_email",
            });

            successCount++;

            // Small delay between leads to not overwhelm APIs
            if (i < leads.length - 1) {
                await sleep(1500);
            }

        } catch (e) {
            console.log(`    ❌ Error: ${e.message}`);
            results.push({
                index: i + 1,
                name: lead.name,
                website: lead.website || "Nav mājaslapas",
                hasWebsite: lead.hasWebsite,
                email: "Error",
                emailSource: "error",
                emailConfidence: 0,
                phone: lead.phone,
                address: lead.address,
                category: lead.category,
                problem: "",
                emailSubject: "",
                emailBody: "",
                screenshotPath: "",
                status: "error",
            });
            skipCount++;
        }
    }

    // --- Output Reports ---
    console.log("\n\n═══════════════════════════════════════════════════════════");
    console.log("  📝 Generating reports...");
    console.log("═══════════════════════════════════════════════════════════\n");

    // Markdown report
    let md = `# 📧 80 Nail Salon Cold Emails — Riga\n\n`;
    md += `**Generated:** ${new Date().toISOString()}\n`;
    md += `**Total leads:** ${results.length}\n`;
    md += `**Ready to send:** ${results.filter(r => r.status === "ready_to_send").length}\n`;
    md += `**No email found:** ${results.filter(r => r.status === "no_email").length}\n`;
    md += `**Errors:** ${results.filter(r => r.status === "error").length}\n\n`;
    md += `---\n\n`;

    // Ready to send emails first
    const readyToSend = results.filter(r => r.status === "ready_to_send");
    const noEmail = results.filter(r => r.status === "no_email");
    const errors = results.filter(r => r.status === "error");

    md += `## ✅ Ready to Send (${readyToSend.length})\n\n`;

    for (const r of readyToSend) {
        md += `### ${r.index}. ${r.name}\n`;
        md += `- **Send to:** \`${r.email}\`\n`;
        md += `- **Subject:** ${r.emailSubject}\n`;
        md += `- **Website:** ${r.website}\n`;
        md += `- **Problem:** ${r.problem}\n`;
        md += `- **Phone:** ${r.phone || "N/A"}\n\n`;
        md += `**Email body:**\n\`\`\`\n${r.emailBody}\n\`\`\`\n\n`;
        md += `---\n\n`;
    }

    if (noEmail.length > 0) {
        md += `## ⚠️ No Email Found (${noEmail.length})\n\n`;
        md += `These businesses didn't have a discoverable email. Consider calling them or finding their email on social media.\n\n`;
        for (const r of noEmail) {
            md += `- **${r.name}** — ${r.website} — Phone: ${r.phone || "N/A"}\n`;
            md += `  - Subject: ${r.emailSubject}\n`;
            md += `  - Problem: ${r.problem}\n\n`;
        }
        md += `---\n\n`;
    }

    if (errors.length > 0) {
        md += `## ❌ Errors (${errors.length})\n\n`;
        for (const r of errors) {
            md += `- **${r.name}** — ${r.website}\n`;
        }
    }

    const reportPath = path.join(PROJECT_DIR, "80_salon_leads_report.md");
    fs.writeFileSync(reportPath, md);
    console.log(`   📄 Markdown report: ${reportPath}`);

    // CSV output
    let csv = "Index,Business Name,Email,Subject,Website,Has Website,Phone,Address,Category,Problem,Email Source,Confidence,Status\n";
    for (const r of results) {
        const escapeCsv = (s) => `"${(s || '').replace(/"/g, '""')}"`;
        csv += [
            r.index,
            escapeCsv(r.name),
            escapeCsv(r.email),
            escapeCsv(r.emailSubject),
            escapeCsv(r.website),
            r.hasWebsite ? "Yes" : "No",
            escapeCsv(r.phone),
            escapeCsv(r.address),
            escapeCsv(r.category),
            escapeCsv(r.problem),
            r.emailSource,
            r.emailConfidence,
            r.status
        ].join(",") + "\n";
    }

    const csvPath = path.join(PROJECT_DIR, "80_salon_leads.csv");
    fs.writeFileSync(csvPath, csv);
    console.log(`   📊 CSV file: ${csvPath}`);

    // Summary
    console.log("\n═══════════════════════════════════════════════════════════");
    console.log("  ✅ PIPELINE COMPLETE");
    console.log(`  Total: ${results.length} leads processed`);
    console.log(`  Ready to send: ${readyToSend.length}`);
    console.log(`  No email: ${noEmail.length}`);
    console.log(`  Errors: ${errors.length}`);
    console.log("  ⚠️  NO EMAILS WERE SENT — review the report and send manually");
    console.log("═══════════════════════════════════════════════════════════\n");
}

main().catch(e => {
    console.error("\n❌ Fatal error:", e.message);
    console.error(e);
    process.exit(1);
});
