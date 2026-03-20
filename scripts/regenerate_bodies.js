const fs = require('fs');
const path = require('path');

async function main() {
    const PROJECT_DIR = '/home/as/Desktop/Antigravity/AutoColdEmail';
    const targetReportPath = path.join(PROJECT_DIR, '18_verified_leads_report.md');
    
    let targetContent = fs.readFileSync(targetReportPath, 'utf8');

    // Find all blocks that need regeneration: /NO BODY FOUND FOR (.*)/g
    const missingBodyRegex = /NO BODY FOUND FOR (.*)/g;
    const missingMatches = [...targetContent.matchAll(missingBodyRegex)];
    
    if (missingMatches.length === 0) {
        console.log("No missing bodies found.");
        return;
    }

    console.log(`Found ${missingMatches.length} missing bodies. Regenerating...`);

    // We need the problems for these businesses. Read the CSV for that.
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

    const IN_CSV = path.join(PROJECT_DIR, '18_verified_leads.csv');
    const content = fs.readFileSync(IN_CSV, 'utf8');
    const lines = content.split('\n').filter(l => l.trim() !== '');
    const rows = lines.slice(1).map(parseCsvRow);

    const businessMap = {};
    for (const r of rows) {
        businessMap[r[1].trim()] = r[9]; // Problem
    }

    require('dotenv').config({ path: path.join(PROJECT_DIR, '.env') });
    const { OpenAI } = require('openai');
    const openai = new OpenAI();
    
    const systemPromptPath = path.join(PROJECT_DIR, 'prompts', 'email_generation.txt');
    const systemPrompt = fs.readFileSync(systemPromptPath, 'utf8');

    for (const match of missingMatches) {
        let bName = match[1].trim();
        // Edge cases
        if (bName === '"Necesse"') bName = 'Salons "Necesse"';

        const problem = businessMap[bName] || "mājaslapas dizains izskatās novecojis — potenciālie klienti, visticamāk, izvēlēsies konkurentu ar modernāku lapu"; 
        
        console.log(`Regenerating for: ${bName}`);
        const prompt = "You are writing a cold email to the following local business in Latvia.\\n" +
                       "Business Name: " + bName + "\\n" +
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
        
        let newBody = response.choices[0].message.content.trim();
        
        // Clean up JSON formatting if OpenAI slips it in again
        const jsonMatch = newBody.match(/\\`\\`\\`json\\n\\{\\n  \\"subject\\": \\".*?\\",\\n  \\"body\\": \\"(.*?)\\"\\n\\}\\n\\`\\`\\`/);
        if (jsonMatch) {
            newBody = jsonMatch[1].replace(/\\n/g, '\\n');
        }

        // Replace the "NO BODY FOUND FOR..." with the actual body
        targetContent = targetContent.replace(match[0], newBody);
    }
    
    fs.writeFileSync(targetReportPath, targetContent);
    console.log("All missing bodies regenerated and saved!");
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
