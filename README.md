# Cold Email Pipeline — Automated Restaurant Outreach (Riga, Latvia)

A fully automated cold email pipeline that scrapes restaurant leads from Google Maps in Riga, finds their contact emails, takes a screenshot of their website, uses Google Gemini AI to identify one specific website problem, generates a short personalized cold email, and sends it via Gmail — all orchestrated through modular n8n workflows with full logging to Google Sheets.

---

## Setup — Required Accounts

Create accounts on each of these services and add your API keys to `.env` (copy `.env.example` first):

| Service | What It Does | Sign Up |
|---|---|---|
| **Apify** | Scrapes Google Maps for restaurant leads | [apify.com/sign-up](https://console.apify.com/sign-up) |
| **Hunter.io** | Finds email addresses from website domains | [hunter.io/users/sign_up](https://hunter.io/users/sign_up) |
| **ScreenshotOne** | Takes website screenshots for AI analysis | [screenshotone.com/sign-up](https://app.screenshotone.com/sign-up) |
| **Google Gemini** | AI vision analysis + email copywriting | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) |
| **Gmail OAuth** | Sends emails from your Gmail account | [console.cloud.google.com](https://console.cloud.google.com/) — create a project, enable Gmail API, create OAuth 2.0 credentials |
| **Google Sheets** | Logs all leads and their status | Uses the same Google Cloud project as Gmail |
| **n8n** | Orchestrates all 5 pipeline stages | [n8n.io](https://n8n.io/) (self-hosted) or [app.n8n.cloud](https://app.n8n.cloud/register) (cloud) |

---

## How to Run

The pipeline is split into 5 modular n8n workflows. Import each JSON file into n8n and run them in this order:

1. **`01_scrape_leads.json`** — Scrapes restaurants from Google Maps (Riga, Latvia) and saves leads to Google Sheets with status `scraped`
2. **`02_find_emails.json`** — Takes scraped leads, finds contact emails via Hunter.io, updates status to `email_found` or `no_email`
3. **`03_analyze_website.json`** — Takes a screenshot of each lead's website, sends it to Gemini for analysis, updates status to `analyzed` or `dead_site`
4. **`04_generate_email.json`** — Generates a personalized cold email based on the identified website problem
5. **`05_send_and_log.json`** — Sends the email via Gmail and logs the result, updates status to `sent`

### Testing First

Before running the full pipeline, test on a single lead:

```bash
node scripts/test_single_lead.js "Restaurant Name" "https://example-restaurant.lv"
```

This runs the full pipeline (screenshot → analysis → email generation) and prints the result to console without sending anything.

---

## Daily Limits

> ⚠️ **Deliverability safety rules — do not change these**

- **Maximum 25 emails per day** — exceeding this risks Gmail flagging your account
- **Minimum 90 seconds delay** between each email send
- Sender name: **Adrians** (personal, not a company name)
- No attachments, no links (except optionally a portfolio link)
