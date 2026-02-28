#!/usr/bin/env node

/**
 * validate_emails.js — Check email list before sending
 *
 * Usage:
 *   node scripts/validate_emails.js <path-to-json-file>
 */

const fs = require('fs');
const path = require('path');

// Basic regex for email validation
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateEmails(filePath) {
    if (!fs.existsSync(filePath)) {
        console.error(`❌ File not found: ${filePath}`);
        process.exit(1);
    }

    let data;
    try {
        data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (err) {
        console.error(`❌ Failed to parse JSON: ${err.message}`);
        process.exit(1);
    }

    if (!Array.isArray(data)) {
        console.error(`❌ Expected a JSON array of leads, got ${typeof data}`);
        process.exit(1);
    }

    let validCount = 0;
    let invalidCount = 0;

    data.forEach((lead, index) => {
        const leadName = lead.name || lead.business_name || `Row ${index + 1}`;
        if (lead.email && emailRegex.test(lead.email)) {
            console.log(`✅ Valid: ${lead.email} (${leadName})`);
            validCount++;
        } else {
            console.log(`❌ Invalid or missing: ${lead.email || 'N/A'} (${leadName})`);
            invalidCount++;
        }
    });

    console.log(`\n📊 Results: ${validCount} valid, ${invalidCount} invalid.`);
}

const targetFile = process.argv[2];
if (!targetFile) {
    console.log("Usage: node scripts/validate_emails.js <path-to-json-file>");
    process.exit(1);
}

validateEmails(path.resolve(process.cwd(), targetFile));
