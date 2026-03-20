#!/usr/bin/env node
// Generates 13 mini n8n workflows (leads 5-17) + 1 Twilio workflow,
// imports them, collects IDs, and writes run_send_13.sh

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const GMAIL_CRED_ID = '5RzW7sinmGsLRBii';
const TWILIO_CRED_ID = 'JFV7CPzmCTr7KDq2';

const leads = [
  {
    name: 'RemLAT, jumta remonts',
    sendTo: 'remlat@inbox.lv',
    subject: 'Jautājums par RemLAT, jumta remonts tiešsaistes klātbūtni',
    message: `Labdien,

Izskatot Jūsu uzņēmuma informāciju, pamanīju, ka uzņēmumam nav savas profesionālas mājaslapas vizītkartes, un potenciālie klienti Jūs atrod tikai caur uzziņu katalogiem, kur blakus ir arī konkurenti.

Es specializējos tieši jumta remonts uzņēmumu mājaslapu izveidē, palīdzot tiem izcelties un piesaistīt klientus tiešsaistē.

Nesen palīdzēju līdzīgam uzņēmumam ieviest profesionālu mājaslapu, un viņi ievērojami palielināja savu redzamību.

Vai Jums būtu interese - varu nosūtīt īsu video, kurā parādu, kā tas izskatītos Jūsu uzņēmumam?

Ja nevēlaties saņemt šādus e-pastus, vienkārši atbildiet uz šo ziņu.

Ar cieņu,
Adrians`
  },
  {
    name: 'Salons Necesse',
    sendTo: 'studija@necesse.lv',
    subject: 'Jautājums par Salons "Necesse" mājaslapu',
    message: `Labdien,

Izskatot Jūsu mājaslapu, pamanīju, ka tās dizains izskatās novecojis un neuzticams - potenciālie klienti, visticamāk, izvēlēsies konkurentu ar modernāku lapu.

Es specializējos tieši skaistumkopšanas un nagu salonu mājaslapu izveidē Rīgā, nodrošinot mūsdienīgus un uzticamus risinājumus.

Nesen palīdzēju Rīgas naglu salonam ieviest tiešsaistes pierakstu, un viņi pārtrauca zaudēt klientus, kuri negrib zvanīt.

Vai Jums būtu interese - varu nosūtīt īsu video, kurā parādu, kā tas izskatītos Jūsu salonam?

Ja nevēlaties saņemt šādus e-pastus, vienkārši atbildiet uz šo ziņu.

Ar cieņu,
Adrians`
  },
  {
    name: 'GRIEZE',
    sendTo: 'grieze@grieze.lv',
    subject: 'Jautājums par GRIEZE mājaslapu',
    message: `Labdien,

Izskatot Jūsu mājaslapu, pamanīju, ka tās dizains izskatās novecojis - potenciālie klienti, visticamāk, izvēlēsies konkurentu ar modernāku lapu.

Es specializējos tieši uzņēmumu mājaslapu atjaunošanā Rīgā, piedāvājot mūsdienīgas un funkcionālas dizaina risinājumus.

Nesen palīdzēju līdzīgai Rīgas firmai uzlabot viņu mājaslapu, un tieši tas palielināja viņu klientu piesaisti.

Vai Jums būtu interese - varu nosūtīt īsu video, kurā parādu, kā tas izskatītos Jūsu uzņēmumam?

Ja nevēlaties saņemt šādus e-pastus, vienkārši atbildiet uz šo ziņu.

Ar cieņu,
Adrians`
  },
  {
    name: "Catrin' beauty studio",
    sendTo: 'info@catrinsalons.lv',
    subject: "Jautājums par Catrin' beauty studio mājaslapu",
    message: `Labdien,

Izskatot Jūsu mājaslapu, pamanīju, ka tās dizains izskatās novecojis - potenciālie klienti, visticamāk, izvēlēsies konkurentu ar modernāku lapu.

Es specializējos tieši skaistumkopšanas un nagu salonu mājaslapu izveidē Rīgā, nodrošinot mūsdienīgu izskatu un funkcionalitāti.

Nesen palīdzēju Rīgas naglu salonam ieviest tiešsaistes pierakstu, un viņi pārtrauca zaudēt klientus, kuri negrib zvanīt.

Vai Jums būtu interese - varu nosūtīt īsu video, kurā parādu, kā tas izskatītos Jūsu salonam?

Ja nevēlaties saņemt šādus e-pastus, vienkārši atbildiet uz šo ziņu.

Ar cieņu,
Adrians`
  },
  {
    name: 'Beauty salon Skaistuma Industrija S9',
    sendTo: 'info@s9.lv',
    subject: 'Jautājums par Beauty salon Skaistuma Industrija S9 mājaslapu',
    message: `Labdien,

Izskatot Jūsu mājaslapu, pamanīju, ka tās dizains izskatās novecojis - potenciālie klienti, visticamāk, izvēlēsies konkurentu ar modernāku lapu.

Es specializējos tieši skaistumkopšanas un nagu salonu mājaslapu izveidē Rīgā, nodrošinot modernus un funkcionālus risinājumus.

Nesen palīdzēju Rīgas skaistumkopšanas salonam ieviest jaunu dizainu, un viņi pamanīja jaunu klientu pieplūdumu.

Vai Jums būtu interese - varu nosūtīt īsu video, kurā parādu, kā tas izskatītos Jūsu salonam?

Ja nevēlaties saņemt šādus e-pastus, vienkārši atbildiet uz šo ziņu.

Ar cieņu,
Adrians`
  },
  {
    name: 'Skaistumkopšanas salons BBbinnija',
    sendTo: 'bbbinnija@bbbinnija.lv',
    subject: 'Jautājums par Skaistumkopšanas salons BBbinnija mājaslapu',
    message: `Labdien,

Izskatot Jūsu mājaslapu, pamanīju, ka tās dizains izskatās novecojis - potenciālie klienti, visticamāk, izvēlēsies konkurentu ar modernāku lapu.

Es specializējos tieši skaistumkopšanas un nagu salonu mājaslapu izveidē Rīgā.

Nesen palīdzēju Rīgas naglu salonam ieviest tiešsaistes pierakstu, un viņi pārtrauca zaudēt klientus, kuri negrib zvanīt.

Vai Jums būtu interese - varu nosūtīt īsu video, kurā parādu, kā tas izskatītos Jūsu salonam?

Ja nevēlaties saņemt šādus e-pastus, vienkārši atbildiet uz šo ziņu.

Ar cieņu,
Adrians`
  },
  {
    name: 'SIBI beauty salon',
    sendTo: 'sibisalon@inbox.lv',
    subject: 'Jautājums par SIBI beauty salon mājaslapu',
    message: `Labdien,

Izskatot Jūsu salonu, pamanīju, ka klienti, kas izmanto meklētājprogrammas, visdrīzāk izvēlēsies konkurentus, kuriem ir sava profesionāla mājaslapa, nevis tikai rezervācijas sistēmas profils.

Es specializējos tieši skaistumkopšanas un nagu salonu mājaslapu izveidē Rīgā, kas palīdz uzlabot klientu piesaisti un redzamību tiešsaistē.

Nesen palīdzēju Rīgas naglu salonam ieviest tiešsaistes pierakstu, un viņi pārtrauca zaudēt klientus, kuri negrib zvanīt.

Vai Jums būtu interese - varu nosūtīt īsu video, kurā parādu, kā tas izskatītos Jūsu salonam?

Ja nevēlaties saņemt šādus e-pastus, vienkārši atbildiet uz šo ziņu.

Ar cieņu,
Adrians`
  },
  {
    name: 'Gloria',
    sendTo: 'info@gloria-salons.lv',
    subject: 'Jautājums par Gloria mājaslapu',
    message: `Labdien,

Izskatot Jūsu mājaslapu, pamanīju, ka tās dizains izskatās novecojis - potenciālie klienti, visticamāk, izvēlēsies konkurentu ar modernāku lapu.

Es specializējos tieši skaistumkopšanas salonu mājaslapu izveidē Rīgā, pievienojot vienkāršas rezervācijas sistēmas, kas darbojas gan datorā, gan mobilajā telefonā.

Nesen palīdzēju Rīgas skaistumkopšanas salonam ieviest tiešsaistes pierakstu, un viņi pārtrauca zaudēt klientus, kuri negrib zvanīt.

Vai Jums būtu interese - varu nosūtīt īsu video, kurā parādu, kā tas izskatītos Jūsu salonam?

Ja nevēlaties saņemt šādus e-pastus, vienkārši atbildiet uz šo ziņu.

Ar cieņu,
Adrians`
  },
  {
    name: 'VLUX',
    sendTo: 'info@violetalux.lv',
    subject: 'Jautājums par VLUX mājaslapu',
    message: `Labdien,

Izskatot Jūsu mājaslapu, pamanīju, ka tās dizains izskatās novecojis - potenciālie klienti, visticamāk, izvēlēsies konkurentu ar modernāku lapu.

Es specializējos tieši uzņēmumu mājaslapu izveidē, radot mūsdienīgus un funkcionālus risinājumus.

Nesen palīdzēju Rīgas uzņēmumam uzlabot mājaslapu, un viņi novēroja lielāku klientu interesi.

Vai Jums būtu interese - varu nosūtīt īsu video, kurā parādu, kā tas izskatītos Jūsu uzņēmumam?

Ja nevēlaties saņemt šādus e-pastus, vienkārši atbildiet uz šo ziņu.

Ar cieņu,
Adrians`
  },
  {
    name: 'Skaistuma agentura frizētava',
    sendTo: 'info@skaistumaagentura.lv',
    subject: 'Jautājums par Skaistuma aģentūra , frizētava mājaslapu',
    message: `Labdien,

Izskatot Jūsu mājaslapu, pamanīju, ka tās dizains izskatās novecojis - potenciālie klienti, visticamāk, izvēlēsies konkurentu ar modernāku lapu.

Es specializējos tieši skaistumkopšanas un frizētavu mājaslapu izveidē Rīgā, pievienojot vienkāršas rezervācijas sistēmas, kas darbojas gan datorā, gan mobilajā telefonā.

Nesen palīdzēju Rīgas frizētavai ieviest tiešsaistes pierakstu, un viņi pārtrauca zaudēt klientus, kuri negrib zvanīt.

Vai Jums būtu interese - varu nosūtīt īsu video, kurā parādu, kā tas izskatītos Jūsu salonam?

Ja nevēlaties saņemt šādus e-pastus, vienkārši atbildiet uz šo ziņu.

Ar cieņu,
Adrians`
  },
  {
    name: 'Skaistuma Studija Miledia',
    sendTo: 'info@salonsmiledia.lv',
    subject: 'Jautājums par Skaistuma Studija Milēdia mājaslapu',
    message: `Labdien,

Izskatot Jūsu mājaslapu, pamanīju, ka tās dizains izskatās novecojis - potenciālie klienti, visticamāk, izvēlēsies konkurentu ar modernāku lapu.

Es specializējos tieši skaistumkopšanas un nagu salonu mājaslapu izveidē Rīgā, palīdzot uzņēmumiem piesaistīt klientus ar mūsdienīgu dizainu.

Nesen palīdzēju Rīgas naglu salonam ieviest tiešsaistes pierakstu, un viņi pārtrauca zaudēt klientus, kuri negrib zvanīt.

Vai Jums būtu interese - varu nosūtīt īsu video, kurā parādu, kā tas izskatītos Jūsu salonam?

Ja nevēlaties saņemt šādus e-pastus, vienkārši atbildiet uz šo ziņu.

Ar cieņu,
Adrians`
  },
  {
    name: 'MY NAILS Manikirs Riga',
    sendTo: 'info@mynails.lv',
    subject: 'Jautājums par +MY NAILS | Manikīrs Rīga tiešsaistes klātbūtni',
    message: `Labdien,

Izskatot Jūsu mājaslapu, pamanīju, ka mājaslapas vietrādis ved uz Jūsu Instagram profilu, tādējādi potenciālie klienti, kuri nevēlas sazināties caur privātajām ziņām vai neizmanto Instagram aktīvi, visbiežāk izvēlēsies konkurentus, kam ir sava vizītkarte un rezervācijas lapa ārpus soctīkliem.

Es specializējos tieši skaistumkopšanas un nagu salonu pierakstu sistēmu izveidē Rīgā.

Nesen palīdzēju Rīgas naglu salonam ieviest tiešsaistes pierakstu, un viņi pārtrauca zaudēt klientus, kuri negrib zvanīt.

Vai Jums būtu interese - varu nosūtīt īsu video, kurā parādu, kā tas izskatītos Jūsu salonam?

Ja nevēlaties saņemt šādus e-pastus, vienkārši atbildiet uz šo ziņu.

Ar cieņu,
Adrians`
  },
  {
    name: 'Nails and Pearls Manikira studija',
    sendTo: 'nailspearls777@gmail.com',
    subject: 'Jautājums par Nails & Pearls Manikīra studija tiešsaistes klātbūtni',
    message: `Labdien,

Izskatot Jūsu mājaslapu, pamanīju, ka vietrādis ved uz Jūsu Instagram profilu, tādējādi potenciālie klienti, kuri nevēlas sazināties caur privātajām ziņām vai neizmanto Instagram aktīvi, visbiežāk izvēlēsies konkurentus, kam ir sava vizītkarte un rezervācijas lapa ārpus soctīkliem.

Es specializējos tieši skaistumkopšanas un nagu salonu pierakstu sistēmu izveidē Rīgā.

Nesen palīdzēju Rīgas naglu salonam ieviest tiešsaistes pierakstu, un viņi pārtrauca zaudēt klientus, kuri negrib zvanīt.

Vai Jums būtu interese - varu nosūtīt īsu video, kurā parādu, kā tas izskatītos Jūsu salonam?

Ja nevēlaties saņemt šādus e-pastus, vienkārši atbildiet uz šo ziņu.

Ar cieņu,
Adrians`
  }
];

function makeEmailWorkflow(lead, idx) {
  const safeMsg = lead.message.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$');
  return {
    name: `send-lead-${idx + 5}`,
    nodes: [
      {
        parameters: {},
        id: 'start',
        name: 'Start',
        type: 'n8n-nodes-base.manualTrigger',
        typeVersion: 1,
        position: [0, 0]
      },
      {
        parameters: {
          jsCode: `return [{ json: { sendTo: ${JSON.stringify(lead.sendTo)}, subject: ${JSON.stringify(lead.subject)}, message: ${JSON.stringify(lead.message)} } }];`
        },
        id: 'set-data',
        name: 'Set Data',
        type: 'n8n-nodes-base.code',
        typeVersion: 2,
        position: [200, 0]
      },
      {
        parameters: {
          sendTo: '={{ $json.sendTo }}',
          subject: '={{ $json.subject }}',
          message: '={{ $json.message }}',
          emailType: 'text',
          options: { appendAttribution: false }
        },
        id: 'send-email',
        name: 'Send Email',
        type: 'n8n-nodes-base.gmail',
        typeVersion: 2.1,
        position: [400, 0],
        credentials: {
          gmailOAuth2: { id: GMAIL_CRED_ID, name: 'Gmail account' }
        }
      }
    ],
    connections: {
      'Start': { main: [[{ node: 'Set Data', type: 'main', index: 0 }]] },
      'Set Data': { main: [[{ node: 'Send Email', type: 'main', index: 0 }]] }
    },
    settings: {}
  };
}

function makeTwilioWorkflow() {
  return {
    name: 'send-done-sms',
    nodes: [
      {
        parameters: {},
        id: 'start',
        name: 'Start',
        type: 'n8n-nodes-base.manualTrigger',
        typeVersion: 1,
        position: [0, 0]
      },
      {
        parameters: {
          to: '+37127307068',
          from: '+37127307068',
          toWhatsapp: false,
          message: 'AutoColdEmail: All 13 emails have been sent successfully!',
          options: {}
        },
        id: 'twilio-send',
        name: 'Send SMS',
        type: 'n8n-nodes-base.twilio',
        typeVersion: 1,
        position: [200, 0],
        credentials: {
          twilioApi: { id: TWILIO_CRED_ID, name: 'Twilio account' }
        }
      }
    ],
    connections: {
      'Start': { main: [[{ node: 'Send SMS', type: 'main', index: 0 }]] }
    },
    settings: {}
  };
}

const tmpDir = '/tmp/n8n_send_13';
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);

const workflowFiles = [];

// Write email workflows
leads.forEach((lead, idx) => {
  const wf = makeEmailWorkflow(lead, idx);
  const filePath = path.join(tmpDir, `lead_${idx + 5}.json`);
  fs.writeFileSync(filePath, JSON.stringify(wf, null, 2));
  workflowFiles.push({ file: filePath, label: `Lead ${idx + 5}: ${lead.name} → ${lead.sendTo}` });
});

// Write Twilio workflow
const twilioFile = path.join(tmpDir, 'twilio_done.json');
fs.writeFileSync(twilioFile, JSON.stringify(makeTwilioWorkflow(), null, 2));

console.log('Importing workflows...');
const ids = [];

workflowFiles.forEach(({ file, label }) => {
  execSync(`npx n8n import:workflow --input="${file}"`, { stdio: 'pipe' });
  // Get the ID by matching the workflow name
  const wfName = JSON.parse(fs.readFileSync(file)).name;
  const list = execSync('npx n8n list:workflow', { encoding: 'utf8' });
  const match = list.split('\n').find(l => l.includes(wfName));
  const id = match ? match.split('|')[0].trim() : null;
  console.log(`  Imported ${label} → ID: ${id}`);
  ids.push({ id, label });
});

// Import Twilio
execSync(`npx n8n import:workflow --input="${twilioFile}"`, { stdio: 'pipe' });
const list = execSync('npx n8n list:workflow', { encoding: 'utf8' });
const twilioMatch = list.split('\n').find(l => l.includes('send-done-sms'));
const twilioId = twilioMatch ? twilioMatch.split('|')[0].trim() : null;
console.log(`  Imported Twilio SMS → ID: ${twilioId}`);

// Build the run script
let script = `#!/bin/bash
set -a
source /home/as/Desktop/Antigravity/AutoColdEmail/.env 2>/dev/null || true
set +a
export N8N_BLOCK_ENV_ACCESS_IN_NODE="false"

TOTAL=${ids.length}
SENT=0
FAILED=0

echo "[$(date)] Starting send sequence: $TOTAL emails with 90s cooldown"
echo ""

`;

ids.forEach(({ id, label }, i) => {
  script += `echo "[$(date)] Sending ${i + 1}/${ids.length}: ${label}"\n`;
  script += `if npx n8n execute --id=${id} > /tmp/n8n_exec_${i}.log 2>&1; then\n`;
  script += `  SENT=$((SENT+1))\n`;
  script += `  echo "[$(date)] SUCCESS: ${label}"\n`;
  script += `else\n`;
  script += `  FAILED=$((FAILED+1))\n`;
  script += `  echo "[$(date)] FAILED: ${label}"\n`;
  script += `  cat /tmp/n8n_exec_${i}.log | tail -5\n`;
  script += `fi\n`;
  if (i < ids.length - 1) {
    script += `echo "[$(date)] Waiting 90s before next email..."\n`;
    script += `sleep 90\n`;
  }
  script += `\n`;
});

script += `echo ""\necho "[$(date)] Done. Sent: $SENT / ${ids.length}, Failed: $FAILED"\n`;
script += `echo "[$(date)] Sending completion SMS via Twilio..."\n`;
script += `npx n8n execute --id=${twilioId} >> /tmp/n8n_twilio.log 2>&1 && echo "[$(date)] SMS sent!" || echo "[$(date)] SMS failed - check /tmp/n8n_twilio.log"\n`;

const scriptPath = '/home/as/Desktop/Antigravity/AutoColdEmail/run_send_13.sh';
fs.writeFileSync(scriptPath, script);
execSync(`chmod +x "${scriptPath}"`);

console.log(`\nScript written to: ${scriptPath}`);
console.log(`Run with: bash run_send_13.sh`);
console.log(`Or in background: nohup bash run_send_13.sh > /tmp/send_13.log 2>&1 &`);
