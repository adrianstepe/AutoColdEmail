# Cold Email Pipeline — Website Rebuild Outreach (Tree Services, Oklahoma)

A cold email pipeline that ingests local business leads (from a pre-built CSV, or optionally scraped fresh via Apify), classifies each lead's website as `weak` (worth an honest rebuild pitch), `strong` (leave alone), or `inconclusive`, generates a short personalized cold email for the weak/no-website leads, and sends it via Gmail — all orchestrated through modular n8n workflows with full logging to Google Sheets.

---

## Setup — Required Accounts

Create accounts on each of these services and add your API keys to `.env` (copy `env.md` as a starting template):

| Service | What It Does | Sign Up |
|---|---|---|
| **Apify** | Optional/legacy — scrapes Google Maps for leads when you don't already have a CSV | [apify.com/sign-up](https://console.apify.com/sign-up) |
| **Hunter.io** | Supplemental email finder — only called when a lead has a website but no email | [hunter.io/users/sign_up](https://hunter.io/users/sign_up) |
| **ScreenshotOne** | Takes website screenshots for AI analysis | [screenshotone.com/sign-up](https://app.screenshotone.com/sign-up) |
| **OpenAI** | gpt-4o-mini vision analysis + email copywriting | [platform.openai.com](https://platform.openai.com/) |
| **Gmail OAuth** | Sends emails from your Gmail account | [console.cloud.google.com](https://console.cloud.google.com/) — create a project, enable Gmail API, create OAuth 2.0 credentials |
| **Google Sheets** | Logs all leads and their status | Uses the same Google Cloud project as Gmail |
| **n8n** | Orchestrates all 5 pipeline stages | [n8n.io](https://n8n.io/) (self-hosted) or [app.n8n.cloud](https://app.n8n.cloud/register) (cloud) |

---

## How to Run

The pipeline is split into 5 modular n8n workflows. Import each JSON file into n8n and run them in this order:

1. **`01_scrape_leads.json`** — Primary path: reads leads from the CSV at `LEADS_CSV_PATH` (e.g. an Outscraper Google Maps export) and saves them to Google Sheets. Apify scraping is available as an optional/legacy path (separate trigger in the same workflow) for discovering a fresh city.
2. **`02_find_emails.json`** — For leads missing an email: tries Hunter.io (only if a website exists — it's a supplement, not primary), then falls back to scraping contact pages. Leads with no website skip straight to `no_email` without wasting an API call.
3. **`03_analyze_website.json`** — Screenshots each lead's website and asks OpenAI vision to classify it `weak` / `strong` / `inconclusive` with a confidence level, one-sentence reasoning, and (if weak) the single most pitchable flaw. Leads with no website are automatically `weak`, no screenshot needed.
4. **`04_generate_email.json`** — Generates a personalized cold email for `weak` leads, using the classifier's `weak_reason` as the anchor.
5. **`05_send_and_log.json`** — Sends the email via Gmail with an approval gate, a 90-second wait between sends, and an enforced `MAX_EMAILS_PER_DAY` cap (default 25), then logs the result.

### Testing First

Before running the full pipeline, test on a single lead:

```bash
node scripts/test_single_lead.js "Business Name" "https://example-business.com"
```

This runs the full pipeline (screenshot → analysis → email generation) and prints the result to console without sending anything.

---

## Daily Limits

> ⚠️ **Deliverability safety rules — do not change these**

- **Maximum 25 emails per day** — exceeding this risks Gmail flagging your account
- **Minimum 90 seconds delay** between each email send
- Sender name: **Adrians** (personal, not a company name)
- No attachments, no links (except optionally a portfolio link)
