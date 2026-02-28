## Cold Email Pipeline — Status

- [x] Workflow 01 — Scrape Leads (Google Maps → Google Sheet)
- [x] Workflow 02 — Find Emails (Hunter.io + contact page fallback)
- [x] Prompts updated to Latvian B2B system prompt (email_generation.txt + website_analysis.txt)
- [ ] Workflow 03 — Analyze Website (Screenshot + Gemini vision → Latvian specific_problem)
- [ ] Workflow 04 — Generate Email (Lead data + specific_problem → Latvian cold email JSON)
- [ ] Workflow 05 — Send & Log (manual review gate, max 25/day, GDPR footer)
- [ ] End-to-end test on 3 leads

⚠️ Before running workflow 02, add these columns to your Google Sheet "Leads" tab: email, email_source, email_confidence

⚠️ No auto-sending — all emails require manual review before sending (enforced in workflow 05).

**Next up:** Workflow 03 — Analyze Website (Screenshot + Gemini)
