const fs = require('fs');
const path = require('path');

async function main() {
    const PROJECT_DIR = '/home/as/Desktop/Antigravity/AutoColdEmail';
    const IN_CSV = path.join(PROJECT_DIR, '24_verified_leads.csv');
    const IN_MD = path.join(PROJECT_DIR, '24_verified_leads_report.md');
    
    // Output files:
    const OUT_CSV = path.join(PROJECT_DIR, '16_verified_leads.csv');
    const OUT_MD = path.join(PROJECT_DIR, '16_verified_leads_report.md');

    // 1. Read CSV
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

    const { headers, rows } = readCsv(IN_CSV);

    // 2. Filter bad leads
    let filteredRows = rows.filter(row => {
        const email = row[2];
        const isAhsan = email.toLowerCase() === 'ahsanshekh@instagram.com';
        // User requested: Ohhh_studio (#6), Celebrus Beauty (#7), Ladda nails (#9), +MY NAILS (#11), Nails & Pearls (#12), INDIVIDUAL BEAUTY (#17), LUNA STUDIO RIGA (#18), Evitas Lucas skaistuma studija (#22)
        // Check if ANY has this email:
        if (isAhsan) return false;
        return true;
    });

    // 3. Update the specific "problem" for remaining leads that need it
    // #8 ID RIGA (dikidi.net), #19 SIBI (versum.com), #5 RemLAT (infolapa.zl.lv)
    const updates = [];
    filteredRows.forEach((row, idx) => {
        const name = row[1];
        const website = row[4];
        let newProblem = null;
        let requiresRegeneration = false;

        if (website.includes('dikidi.net') || website.includes('versum.com')) {
            newProblem = "klienti, kas izmanto meklētājprogrammas, lai atrastu salonu, visdrīzāk izvēlēsies konkurentus, kuriem ir sava profesionāla mājaslapa, nevis tikai rezervācijas sistēmas profils.";
            requiresRegeneration = true;
        } else if (website.includes('infolapa.zl.lv')) {
            newProblem = "uzņēmumam nav savas profesionālas mājaslapas vizītkartes, un potenciālie klienti Jūs atrod tikai caur uzziņu katalogiem, kur blakus ir arī konkurenti.";
            requiresRegeneration = true;
        }

        if (newProblem) {
            row[9] = newProblem;
            updates.push({ record: row, newProblem });
        }
    });

    console.log(`Removed ${rows.length - filteredRows.length} bad leads. Running OpenAI generation for ${updates.length} leads to fix problems...`);

    // Only regenerating the ones that changed!
    // But since the prompts and generation take API keys, we need to load them.
    require('dotenv').config({ path: path.join(PROJECT_DIR, '.env') });
    const { OpenAI } = require('openai');
    const openai = new OpenAI();
    
    // This is the B2B prompt adapted from the script
    const systemPromptPath = path.join(PROJECT_DIR, 'prompts', 'email_generation.txt');
    const systemPrompt = fs.readFileSync(systemPromptPath, 'utf8');

    for (const update of updates) {
        const row = update.record;
        const businessName = row[1];
        const problem = row[9];
        // Generate new body!
        const prompt = "You are writing a cold email to the following local business in Latvia.\n" +
"Business Name: " + businessName + "\n" +
"Specific Problem / Observation: " + problem + "\n\n" +
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
        
        // We will store this body somewhere.
        // Since CSV doesn't hold the body, let's keep it in memory for the MD formatting.
        row.newBody = response.choices[0].message.content.trim();
        console.log("Generated new email for: " + businessName);
    }

    // Now re-map old index numbers to 1..16
    let reportMdOutput = "# 📧 " + filteredRows.length + " Verified Cold Emails — Riga\n\n";
    reportMdOutput += "**Generated:** " + (new Date().toISOString()) + "\n";
    reportMdOutput += "**Total leads:** " + filteredRows.length + "\n";
    reportMdOutput += "**Ready to send:** " + filteredRows.length + "\n\n";
    reportMdOutput += "---\n\n";
    reportMdOutput += "## ✅ Ready to Send (" + filteredRows.length + ")\n\n";

    // 4. Construct MD using original MD bodies or new ones
    function extractMdBlocks(mdPath) {
        if (!fs.existsSync(mdPath)) return [];
        const content = fs.readFileSync(mdPath, 'utf8');
        const sections = content.split(/^---$/m);
        const blocks = {};
        for (const section of sections) {
            const nameMatch = section.match(/### \d+\. (.*)/);
            if (nameMatch) {
                const bName = nameMatch[1].trim();
                const bodyMatch = section.match(/\*\*Email body:\*\*\n```\n([\s\S]*?)```\n/);
                const body = bodyMatch ? bodyMatch[1].trim() : "";
                blocks[bName] = { raw: section.trim(), body: body };
            }
        }
        return blocks;
    }

    const oldMdBlocks = extractMdBlocks(IN_MD);
    
    let indexCounter = 1;
    for (const row of filteredRows) {
        const originalIndex = row[0];
        const name = row[1];
        const email = row[2];
        const subject = row[3];
        const phone = row[6] || "";
        const problem = row[9];
        const website = row[4];
        
        row[0] = String(indexCounter); // Update index to sequential

        let body = row.newBody;
        if (!body) {
            // Keep original body
            const b = oldMdBlocks[name];
            if (b) body = b.body;
            else body = "NO BODY FOUND";
        }
        
        // Output block for MD
        reportMdOutput += "### " + indexCounter + ". " + name + "\n";
        reportMdOutput += "- **Send to:** `" + email + "`\n";
        reportMdOutput += "- **Subject:** " + subject + "\n";
        reportMdOutput += "- **Website:** " + website + "\n";
        reportMdOutput += "- **Problem:** " + problem + "\n";
        reportMdOutput += "- **Phone:** " + phone + "\n\n";
        reportMdOutput += "**Email body:**\n```\n" + body + "\n```\n\n";
        reportMdOutput += "---\n\n";

        indexCounter++;
    }

    fs.writeFileSync(OUT_MD, reportMdOutput);

    function escapeCsv(s) {
        if (s == null) return '""';
        return '"' + String(s).replace(/"/g, '""') + '"';
    }

    // Write final CSV
    let newCsv = headers.map(escapeCsv).join(',') + '\n';
    for (const row of filteredRows) {
        // don't include row.newBody in CSV string mapping
        const cleanRow = [...row];
        delete cleanRow.newBody; // Just in case, taking only first headers length items
        const rawValues = cleanRow.slice(0, headers.length);
        newCsv += rawValues.map(escapeCsv).join(',') + '\n';
    }
    fs.writeFileSync(OUT_CSV, newCsv);

    console.log("✅ Done! Created " + OUT_CSV + " and " + OUT_MD);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
