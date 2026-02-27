#!/usr/bin/env node

/**
 * test_single_lead.js — Test the full pipeline on a single restaurant
 *
 * Usage:
 *   node scripts/test_single_lead.js "Restaurant Name" "https://restaurant-website.lv"
 *
 * Pipeline: Screenshot → Gemini Analysis → Email Generation → Console Output
 * Does NOT send any email. Safe to run repeatedly.
 */

require("dotenv").config();
const https = require("https");
const fs = require("fs");
const path = require("path");

// --- Config ---
const SCREENSHOTONE_API_KEY = process.env.SCREENSHOTONE_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// --- Helpers ---

/**
 * Make an HTTPS GET request and return the response body as a Buffer
 */
function httpsGetBuffer(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            if (res.statusCode !== 200) {
                reject(new Error(`HTTP ${res.statusCode} from ${url}`));
                res.resume();
                return;
            }
            const chunks = [];
            res.on("data", (chunk) => chunks.push(chunk));
            res.on("end", () => resolve(Buffer.concat(chunks)));
            res.on("error", reject);
        }).on("error", reject);
    });
}

/**
 * Make an HTTPS POST request with JSON body and return parsed JSON response
 */
function httpsPostJSON(url, body) {
    return new Promise((resolve, reject) => {
        const parsed = new URL(url);
        const data = JSON.stringify(body);
        const options = {
            hostname: parsed.hostname,
            port: 443,
            path: parsed.pathname + parsed.search,
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(data),
            },
        };

        const req = https.request(options, (res) => {
            const chunks = [];
            res.on("data", (chunk) => chunks.push(chunk));
            res.on("end", () => {
                const responseBody = Buffer.concat(chunks).toString();
                if (res.statusCode !== 200) {
                    reject(
                        new Error(
                            `HTTP ${res.statusCode}: ${responseBody.substring(0, 500)}`
                        )
                    );
                    return;
                }
                try {
                    resolve(JSON.parse(responseBody));
                } catch (e) {
                    reject(new Error(`Failed to parse JSON: ${responseBody.substring(0, 500)}`));
                }
            });
            res.on("error", reject);
        });
        req.on("error", reject);
        req.write(data);
        req.end();
    });
}

// --- Pipeline Steps ---

/**
 * Step 1: Take a screenshot of the website using ScreenshotOne API
 * Returns: base64-encoded PNG image
 */
async function takeScreenshot(websiteUrl) {
    console.log("\n📸 Step 1: Taking screenshot...");
    console.log(`   URL: ${websiteUrl}`);

    if (!SCREENSHOTONE_API_KEY) {
        throw new Error("SCREENSHOTONE_API_KEY is not set in .env");
    }

    const screenshotUrl =
        `https://api.screenshotone.com/take?access_key=${SCREENSHOTONE_API_KEY}` +
        `&url=${encodeURIComponent(websiteUrl)}` +
        `&viewport_width=1280` +
        `&viewport_height=900` +
        `&format=png` +
        `&full_page=false` +
        `&block_ads=true`;

    const imageBuffer = await httpsGetBuffer(screenshotUrl);
    const base64Image = imageBuffer.toString("base64");

    console.log(`   ✅ Screenshot captured (${Math.round(imageBuffer.length / 1024)} KB)`);
    return base64Image;
}

/**
 * Step 2: Analyze the screenshot with Gemini Vision
 * Returns: one-sentence description of a specific website problem
 */
async function analyzeWithGemini(base64Image) {
    console.log("\n🔍 Step 2: Analyzing with Gemini...");

    if (!GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY is not set in .env");
    }

    // Load the prompt from file
    const promptPath = path.join(__dirname, "..", "prompts", "website_analysis.txt");
    const prompt = fs.readFileSync(promptPath, "utf-8").trim();

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    const body = {
        contents: [
            {
                parts: [
                    {
                        inline_data: {
                            mime_type: "image/png",
                            data: base64Image,
                        },
                    },
                    {
                        text: prompt,
                    },
                ],
            },
        ],
        generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 150,
        },
    };

    const result = await httpsPostJSON(url, body);

    // Extract the text response
    const analysis =
        result?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";

    if (!analysis) {
        throw new Error("Gemini returned empty analysis. Raw response: " + JSON.stringify(result).substring(0, 500));
    }

    console.log(`   ✅ Problem identified: "${analysis}"`);
    return analysis;
}

/**
 * Step 3: Generate a personalized cold email using Gemini
 * Returns: { subject, body } — the email content
 */
async function generateEmail(restaurantName, websiteProblem) {
    console.log("\n✉️  Step 3: Generating email...");

    // Load the prompt template from file
    const promptPath = path.join(__dirname, "..", "prompts", "email_generation.txt");
    let prompt = fs.readFileSync(promptPath, "utf-8").trim();

    // Fill in the template variables
    prompt = prompt.replace("{{restaurant_name}}", restaurantName);
    prompt = prompt.replace("{{contact_name}}", "Hi there"); // Default — no contact name in test mode
    prompt = prompt.replace("{{website_problem}}", websiteProblem);

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    const body = {
        contents: [
            {
                parts: [
                    {
                        text: prompt,
                    },
                ],
            },
        ],
        generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 500,
        },
    };

    const result = await httpsPostJSON(url, body);

    const emailContent =
        result?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";

    if (!emailContent) {
        throw new Error("Gemini returned empty email. Raw response: " + JSON.stringify(result).substring(0, 500));
    }

    console.log(`   ✅ Email generated`);
    return emailContent;
}

// --- Main ---

async function main() {
    const args = process.argv.slice(2);

    if (args.length < 2) {
        console.error(
            '\n❌ Usage: node scripts/test_single_lead.js "Restaurant Name" "https://website.lv"\n'
        );
        process.exit(1);
    }

    const restaurantName = args[0];
    const websiteUrl = args[1];

    console.log("═══════════════════════════════════════════════════");
    console.log("  Cold Email Pipeline — Single Lead Test");
    console.log("═══════════════════════════════════════════════════");
    console.log(`  Restaurant: ${restaurantName}`);
    console.log(`  Website:    ${websiteUrl}`);
    console.log("═══════════════════════════════════════════════════");

    try {
        // Step 1: Screenshot
        const screenshot = await takeScreenshot(websiteUrl);

        // Step 2: Analyze
        const websiteProblem = await analyzeWithGemini(screenshot);

        // Step 3: Generate email
        const emailContent = await generateEmail(restaurantName, websiteProblem);

        // Output results
        console.log("\n═══════════════════════════════════════════════════");
        console.log("  📧 GENERATED EMAIL (NOT SENT)");
        console.log("═══════════════════════════════════════════════════\n");
        console.log(emailContent);
        console.log("\n═══════════════════════════════════════════════════");
        console.log("  ✅ Pipeline test complete — no email was sent");
        console.log("═══════════════════════════════════════════════════\n");
    } catch (error) {
        console.error("\n❌ Pipeline failed:", error.message);
        console.error("   Full error:", error);
        process.exit(1);
    }
}

main();
