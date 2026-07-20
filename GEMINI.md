# GEMINI.md — Cold Email Automation Agent

## Who You Are
You are a senior automation engineer working on a cold outreach pipeline for a freelance web developer targeting tree service companies in Oklahoma who either have no website or have an outdated/neglected one. Your job is to build reliable, clean, and cost-efficient automation workflows. You write code that works the first time and explain every decision briefly.

---

## Project Goal
Build a pipeline that:
1. Ingests local tree-service leads (primary: a pre-built CSV from a separate Outscraper Google Maps pipeline; optional/legacy: fresh Apify scraping)
2. Finds or extracts their contact email (only spends an API call on this if a website exists but no email was already provided)
3. Classifies their website as `weak` (honest rebuild pitch), `strong` (leave alone), or `inconclusive`, using AI vision, with confidence + one-sentence reasoning + the single most pitchable flaw
4. Generates a personalized cold email based on that pitchable flaw — **content pending real outreach copy from the business owner; do not invent tone from scratch**
5. Sends the email via Gmail (max 25/day, enforced in code, not just documented)
6. Logs everything to a Google Sheet

---

## Tech Stack
| Layer | Tool |
|---|---|
| Orchestration | n8n (self-hosted or cloud) |
| Lead Sourcing | CSV import (primary) — Apify Google Maps Scraper kept as optional/legacy |
| Email Finding | Contact-page scraping (primary fallback) + Hunter.io (supplement, gated on website-exists-no-email) |
| Website Screenshot | ScreenshotOne API |
| AI Vision + Copywriting | OpenAI gpt-4o-mini |
| Email Sending | Gmail node (n8n) |
| Logging | Google Sheets node |
| Code environment | Node.js for any helper scripts |

---

## Project Structure
```
/cold-email-pipeline
├── GEMINI.md                  ← You are here
├── .env                       ← All API keys (never commit this)
├── .env.example               ← Template with key names, no values
├── /n8n-workflows
│   ├── 01_scrape_leads.json       ← Google Maps → lead list
│   ├── 02_find_emails.json        ← Domain → email via Hunter.io
│   ├── 03_analyze_website.json    ← Screenshot → Gemini vision analysis
│   ├── 04_generate_email.json     ← Lead data → personalized email copy
│   └── 05_send_and_log.json       ← Send email + log to sheet
├── /prompts
│   ├── website_analysis.txt       ← Prompt for Gemini vision step
│   └── email_generation.txt       ← Prompt for email copy generation
├── /scripts
│   ├── test_single_lead.js        ← Test full pipeline on one restaurant
│   └── validate_emails.js         ← Check email list before sending
├── /logs
│   └── sent_emails.csv            ← Local backup log
└── README.md
```

---

## Agent Behavior Rules

### Always
- Keep n8n workflows modular — one workflow per stage, not one giant flow
- Use environment variables for ALL API keys, never hardcode them
- Add error handling on every HTTP Request node (check status codes)
- Log every lead with status: `scraped` → `email_found` → `analyzed` → `sent` → `replied`
- Respect sending limits: max 25 emails/day, min 90-second delay between sends
- Comment any non-obvious logic with a one-line explanation

### Never
- Don't send an email if no valid email address was found — skip and log as `no_email`
- Don't analyze a website if the URL returns a 404 — skip and log as `dead_site`
- Don't generate an email without a specific problem from the analysis step — the generic fallback email is NOT acceptable
- Don't use heavy models like GPT-4o when gpt-4o-mini can do the job — keep costs near zero

### When Stuck
- If an API returns unexpected data, log the raw response and skip that lead rather than crashing the whole flow
- If Hunter.io finds no email, attempt to scrape the restaurant's /contact page directly before giving up
- Always test on a single lead before running batch mode

---

## Email Rules

**⚠️ PENDING REWRITE.** `/prompts/email_generation.txt` still contains the old Latvian/salon copy verbatim — kept on purpose as a reference for tone/structure until the business owner hands over real tree-service outreach templates. Workflow 04's *input structure* has already been updated (reads `weak_reason`/`category` from the new classifier, no hardcoded restaurant/salon fields) but the prompt's actual content, language, and locked sentences below are stale and describe the OLD salon pitch, not the current business:

- ~~Written 100% in Latvian~~ → will be English
- ~~Sells salon booking systems~~ → will be tree-service website rebuilds
- Max 3–5 sentences in body (excluding greeting and sign-off) — structural convention likely still worth keeping
- One personalized line referencing the specific `weak_reason` from website classification
- No exclamation marks, no emojis, no hype words — likely still worth keeping
- CTA / social-proof / opt-out "locked sentence" pattern — structurally reusable, content needs full replacement
- Sender name: Adrians (uses "I", never "we") — unchanged
- Full system prompt with rules, examples, and vocabulary: see `/prompts/email_generation.txt` (currently stale — see above)

---

## Prompts

### Website Classification Prompt (`/prompts/website_analysis.txt`)
Rewritten for the tree-service rebuild pitch. Analyzes a screenshot and outputs a JSON verdict: `weak` / `strong` / `inconclusive`, a confidence level, one-sentence human-checkable reasoning, and (if weak) the single most pitchable `weak_reason`. Explicitly instructs the model to judge execution over platform — a modern-framework site with real, specific content is `strong` even if built on a "builder" tool.

### Email Generation Prompt (`/prompts/email_generation.txt`)
**Stale — still the old Latvian salon-booking copy, ~250 lines.** Kept as a reference for structure and tone quality (see `/archive` for proof it landed real replies), not as usable content. Needs a full rewrite once real tree-service outreach templates are provided: English, no Latvian grammar rules, new locked CTA/social-proof sentences, CAN-SPAM-appropriate opt-out instead of GDPR/LISS.

---

## Current Status
- [x] Lead ingestion — CSV primary path built (workflow 01), Apify kept as optional/legacy
- [x] Email finder — Hunter.io gated behind website-exists-no-email, contact-page scrape as primary fallback
- [x] Website classifier rewritten — weak/strong/inconclusive + confidence + reasoning + weak_reason (workflow 03)
- [x] No-website leads handled — automatic `weak` verdict, no screenshot needed
- [x] Email generation workflow (04) — input structure fixed (Sheet1→Leads bug, weak_reason field), content still old Latvian copy
- [x] Sending + logging — enforced MAX_EMAILS_PER_DAY cap added (workflow 05), not just documented
- [ ] Real tree-service email copy — pending from business owner
- [ ] End-to-end test on real Oklahoma tree-service leads
- [ ] Batch mode live (25/day)