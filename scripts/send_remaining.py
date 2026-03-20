#!/usr/bin/env python3
"""Send remaining 10 emails via n8n CLI, 90s apart.
Already sent: leads 1-6 (Necesse just sent manually), lead 7 GRIEZE (sent 3x - skip).
Remaining: leads 8-17 = 10 total.
"""

import subprocess, time, os, sys
from datetime import datetime

def log(msg):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}", flush=True)

# Verified workflow IDs — one unique workflow per lead
LEADS = [
    ("8",  "Catrin' beauty studio",               "info@catrinsalons.lv",        "GeE3GP5fKNMPXL34"),
    ("9",  "Beauty salon S9",                     "info@s9.lv",                  "s4EHiV8E9pQ1uSlm"),
    ("10", "BBbinnija",                           "bbbinnija@bbbinnija.lv",      "wEzL4NDdOz7BWvRo"),
    ("11", "SIBI beauty salon",                   "sibisalon@inbox.lv",          "78LMcg9kBYV6NYqp"),
    ("12", "Gloria",                              "info@gloria-salons.lv",       "sCLaOA2kJoEgLPp3"),
    ("13", "VLUX",                                "info@violetalux.lv",          "S7PP0uSQCRRFtnMA"),
    ("14", "Skaistuma agentura",                  "info@skaistumaagentura.lv",   "190yMzSOoPepVxHz"),
    ("15", "Skaistuma Studija Miledia",           "info@salonsmiledia.lv",       "3L8WB4ixPsOD0bkz"),
    ("16", "MY NAILS Manikirs Riga",              "info@mynails.lv",             "aBDXAjEnfFAhxQyF"),
    ("17", "Nails and Pearls",                    "nailspearls777@gmail.com",    "ZL1sX5ZawadpjFyW"),
]

TWILIO_WF_ID = "2yT0AoxafC4v8bJd"

env = {**os.environ, "N8N_BLOCK_ENV_ACCESS_IN_NODE": "false"}

# Load .env
env_file = os.path.join(os.path.dirname(__file__), '..', '.env')
if os.path.exists(env_file):
    with open(env_file) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                k, v = line.split('=', 1)
                env[k.strip()] = v.strip()

total = len(LEADS)
sent = 0
failed = []

log(f"Starting: {total} emails with 90s cooldown (~{total * 90 // 60} min)")
log("")

for i, (num, name, email, wf_id) in enumerate(LEADS):
    log(f"Sending {i+1}/{total}: Lead {num} - {name} -> {email}")

    result = subprocess.run(
        ["npx", "n8n", "execute", f"--id={wf_id}"],
        capture_output=True,
        text=True,
        env=env,
        cwd=os.path.join(os.path.dirname(__file__), '..')
    )

    if result.returncode == 0 and '"status": "success"' in result.stdout:
        sent += 1
        log(f"  SUCCESS: {name}")
    else:
        failed.append(f"Lead {num} {name}")
        log(f"  FAILED: {name}")
        for line in (result.stderr or result.stdout or "")[-300:].strip().split('\n')[-3:]:
            log(f"    {line}")

    if i < total - 1:
        log(f"  Waiting 90s...")
        time.sleep(90)

log("")
log(f"=== Done. Sent: {sent}/{total}" + (f", Failed: {failed}" if failed else " - all sent!") + " ===")

log("Sending completion SMS via Twilio...")
result = subprocess.run(
    ["npx", "n8n", "execute", f"--id={TWILIO_WF_ID}"],
    capture_output=True, text=True, env=env,
    cwd=os.path.join(os.path.dirname(__file__), '..')
)
if result.returncode == 0 and '"status": "success"' in result.stdout:
    log("SMS sent!")
else:
    log(f"SMS via n8n failed. Check Twilio 'from' number in workflow {TWILIO_WF_ID}")
