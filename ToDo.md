## Cold Email Pipeline — Status

- [x] Workflow 01 — Scrape Leads (Apify Google Maps → Google Sheet)
- [x] Workflow 02 — Find Emails (Hunter.io + contact page fallback)
- [x] Workflow 03 — Analyze Website (ScreenshotOne + OpenAI gpt-4o-mini vision → Latvian specific_problem)
- [x] Workflow 04 — Generate Email (prompt loaded from file + lead data → Latvian cold email JSON)
- [x] Workflow 05 — Send & Log (manual review gate, max 25/day, opt-out footer)
- [x] Prompts finalized (website_analysis.txt + email_generation.txt)
- [x] Migrated all API calls from Gemini to OpenAI gpt-4o-mini
- [x] Workflow 04 loads prompt from prompts/email_generation.txt at runtime (not hardcoded)
- [x] Website analysis prompt rewritten to always return one specific Latvian sentence
- [ ] End-to-end test on 3+ real leads passed
- [ ] Batch mode live (25/day)

⚠️ Before running workflow 02, add these columns to your Google Sheet "Leads" tab: email, email_source, email_confidence

⚠️ No auto-sending — all emails require manual review before sending (enforced in workflow 05).

**Next up:** End-to-end test on 3 real salon leads, then batch mode.
