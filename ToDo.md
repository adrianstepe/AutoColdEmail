## Cold Email Pipeline — Status (Oklahoma Tree Service Rebuild Pitch)

- [x] Workflow 01 — Ingest Leads (CSV primary path from Outscraper export; Apify kept optional/legacy behind its own trigger)
- [x] Workflow 02 — Find Emails (Hunter.io gated to website-exists-no-email only; contact-page scrape fallback; no-website leads skip straight to no_email)
- [x] Workflow 03 — Classify Website (ScreenshotOne + OpenAI gpt-4o-mini vision → weak/strong/inconclusive + confidence + reasoning + weak_reason; no-website leads auto-weak)
- [x] Workflow 04 — Generate Email (input structure fixed: Sheet1→Leads bug, weak_reason/category fields; prompt CONTENT still pending)
- [x] Workflow 05 — Send & Log (manual review gate, enforced MAX_EMAILS_PER_DAY cap via n8n static data — not just the 90s wait, opt-out footer)
- [x] Repo cleanup: removed dead debug artifacts, one-off historical send scripts, stale dev-scratch tooling, unused deps; archived the 17/24-verified-leads campaign reports to /archive
- [ ] `/prompts/email_generation.txt` rewritten for English tree-service copy (pending real templates from business owner)
- [ ] Google Sheet "Leads" tab columns updated: category, business_status, reviews, verdict, confidence, reasoning, weak_reason (in addition to existing columns)
- [ ] End-to-end test on 3+ real Oklahoma tree-service leads passed
- [ ] Batch mode live (25/day)

⚠️ Before running workflow 01, add a `leads.csv` at the path set in `LEADS_CSV_PATH` (or update the env var), and make sure the Google Sheet "Leads" tab has the new columns listed above.

⚠️ No auto-sending — all emails require manual review before sending (enforced in workflow 05).

**Next up:** hand over real outreach copy/templates so workflow 04's prompt can be rewritten, then end-to-end test on real leads.
