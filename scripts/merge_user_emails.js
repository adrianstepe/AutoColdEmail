const fs = require('fs');
const path = require('path');

async function main() {
    const PROJECT_DIR = '/home/as/Desktop/Antigravity/AutoColdEmail';
    // The current good 16 leads
    const IN_CSV = path.join(PROJECT_DIR, '16_verified_leads.csv');
    // The backup 24 leads that has the two missing ones (+MY NAILS & Nails & Pearls)
    const BACKUP_CSV = path.join(PROJECT_DIR, '24_verified_leads.csv.backup');
    
    const OUT_CSV = path.join(PROJECT_DIR, '18_verified_leads.csv');
    const OUT_MD = path.join(PROJECT_DIR, '18_verified_leads_report.md');

    function parseCsvRow(rowStr) {
        const values = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < rowStr.length; i++) {
            const c = rowStr[i];
            if (c === '"') {
                if (inQuotes && i + 1 < rowStr.length && rowStr[i+1] === '"') {
                    current += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (c === ',' && !inQuotes) {
                values.push(current);
                current = '';
            } else {
                current += c;
            }
        }
        values.push(current);
        return values;
    }

    function readCsv(file) {
        if (!fs.existsSync(file)) return { headers: [], rows: [] };
        const content = fs.readFileSync(file, 'utf8');
        const lines = content.split('\n').filter(l => l.trim() !== '');
        if (lines.length === 0) return { headers: [], rows: [] };
        const headers = parseCsvRow(lines[0]);
        const rows = lines.slice(1).map(parseCsvRow);
        return { headers, rows };
    }

    const currentData = readCsv(IN_CSV);
    const backupData = readCsv(BACKUP_CSV);
    
    let currentRows = currentData.rows;

    const updates = {
        "AS Grīdas, SIA": "gridas@gridas.lv", // Note: The user said AS Grīdas. We have AS Grīdas, SIA.
        "AS Grīdas": "gridas@gridas.lv",
        "+MY NAILS | Manikīrs Rīga": "info@mynails.lv",
        "Nails & Pearls Manikīra studija": "nailspearls777@gmail.com",
        "Catrin' beauty studio": "info@catrinsalons.lv",
        "Skaistumkopšanas salons BBbinnija": "bbbinnija@bbbinnija.lv",
        "SIBI beauty salon in center of Riga city": "sibisalon@inbox.lv" // This is already the email we have
    };

    // 1. Update existing records in the 16
    const existingNames = new Set(currentRows.map(r => r[1]));

    for (let row of currentRows) {
        let name = row[1];
        if (updates[name]) {
            row[2] = updates[name]; // Update email
            row[10] = "manual"; // Email Source
        }
        // AS Grīdas logic check
        if (name.includes("AS Grīdas")) {
             row[2] = updates["AS Grīdas"];
             row[10] = "manual";
        }
    }

    // 2. Find missing ones in the 24 backup and add them
    const missingNames = Object.keys(updates).filter(name => !existingNames.has(name) && name !== "AS Grīdas");
    const newRowsToRegenerate = [];

    for (const missing of missingNames) {
        // Find it in backup
        const rowInBackup = backupData.rows.find(r => r[1] === missing);
        if (rowInBackup) {
            rowInBackup[2] = updates[missing]; // apply correct email
            rowInBackup[10] = "manual";
            
            // These missing leads were originally Instagram platforms.
            // +MY NAILS = https://www.instagram.com/mynails_riga/
            // Nails & Pearls = http://www.instagram.com/nails_and_pearls
            // Let's set their custom "no website" problem for Instagram:
            const customProblem = "mājaslapas vietrādis ved uz Jūsu Instagram profilu, tādējādi potenciālie klienti, kuri nevēlas sazināties caur privātajām ziņām vai neizmanto Instagram aktīvi, visbiežāk izvēlēsies konkurentus, kam ir sava vizītkarte un rezervācijas lapa ārpus soctīkliem.";
            rowInBackup[9] = customProblem;
            
            newRowsToRegenerate.push(rowInBackup);
            currentRows.push(rowInBackup);
        } else {
            console.log("Warning: Could not find " + missing + " in backup CSV.");
        }
    }

    // Regenerate emails for the newRows
    if (newRowsToRegenerate.length > 0) {
        console.log("Regenerating emails for " + newRowsToRegenerate.length + " missing leads...");
        require('dotenv').config({ path: path.join(PROJECT_DIR, '.env') });
        const { OpenAI } = require('openai');
        const openai = new OpenAI();
        
        const systemPromptPath = path.join(PROJECT_DIR, 'prompts', 'email_generation.txt');
        const systemPrompt = fs.readFileSync(systemPromptPath, 'utf8');

        for (const row of newRowsToRegenerate) {
            const businessName = row[1];
            const problem = row[9];
            const prompt = "You are writing a cold email to the following local business in Latvia.\\n" +
                           "Business Name: " + businessName + "\\n" +
                           "Specific Problem / Observation: " + problem + "\\n\\n" +
                           "Generate the email strictly following the system prompts provided.";

            const response = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: prompt }
                ],
                temperature: 0.7,
                max_tokens: 300
            });
            row.newBody = response.choices[0].message.content.trim();
        }
    }

    // Rewrite CSV and MD report
    // First, let's load all old email bodies so we can keep the 16 we didn't touch
    const IN_MD = path.join(PROJECT_DIR, '16_verified_leads_report.md');
    function extractMdBlocks(mdPath) {
        if (!fs.existsSync(mdPath)) return {};
        const content = fs.readFileSync(mdPath, 'utf8');
        const sections = content.split(/^\\-\\-\\-$/m);
        const blocks = {};
        for (const section of sections) {
            const nameMatch = section.match(/### \\d+\\. (.*)/);
            if (nameMatch) {
                const bName = nameMatch[1].trim();
                const bodyMatch = section.match(/\\*\\*Email body:\\*\\*\\n\`\`\`\\n([\\s\\S]*?)\`\`\`\\n/);
                const body = bodyMatch ? bodyMatch[1].trim() : "";
                blocks[bName] = { raw: section.trim(), body: body };
            }
        }
        return blocks;
    }
    const oldMdBlocks = extractMdBlocks(IN_MD);

    let reportMdOutput = "# 📧 " + currentRows.length + " Verified Cold Emails — Riga\\n\\n";
    reportMdOutput += "**Generated:** " + (new Date().toISOString()) + "\\n";
    reportMdOutput += "**Total leads:** " + currentRows.length + "\\n";
    reportMdOutput += "**Ready to send:** " + currentRows.length + "\\n\\n";
    reportMdOutput += "---\\n\\n";
    reportMdOutput += "## ✅ Ready to Send (" + currentRows.length + ")\\n\\n";

    let indexCounter = 1;
    for (const row of currentRows) {
        const name = row[1];
        const email = row[2];
        const subject = row[3];
        const website = row[4];
        const phone = row[6] || "";
        const problem = row[9];
        
        row[0] = String(indexCounter);

        let body = row.newBody;
        if (!body) {
            // Check if we changed their name in the CSV matching? "AS Grīdas, SIA"
            const b = oldMdBlocks[name];
            if (b) body = b.body;
            else body = "NO BODY FOUND FOR " + name;
        }

        reportMdOutput += "### " + indexCounter + ". " + name + "\\n";
        reportMdOutput += "- **Send to:** `" + email + "`\\n";
        reportMdOutput += "- **Subject:** " + subject + "\\n";
        reportMdOutput += "- **Website:** " + website + "\\n";
        reportMdOutput += "- **Problem:** " + problem + "\\n";
        reportMdOutput += "- **Phone:** " + phone + "\\n\\n";
        reportMdOutput += "**Email body:**\\n```\\n" + body + "\\n```\\n\\n";
        reportMdOutput += "---\\n\\n";

        indexCounter++;
    }

    fs.writeFileSync(OUT_MD, reportMdOutput);

    function escapeCsv(s) {
        if (s == null) return '""';
        return '"' + String(s).replace(/"/g, '""') + '"';
    }

    let newCsv = currentData.headers.map(escapeCsv).join(',') + '\\n';
    for (const row of currentRows) {
        const cleanRow = [...row];
        delete cleanRow.newBody;
        const rawValues = cleanRow.slice(0, currentData.headers.length);
        newCsv += rawValues.map(escapeCsv).join(',') + '\\n';
    }
    fs.writeFileSync(OUT_CSV, newCsv);

    console.log("✅ Done! Created " + OUT_CSV + " and " + OUT_MD);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
