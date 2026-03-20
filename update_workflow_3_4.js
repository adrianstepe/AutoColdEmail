const fs = require('fs');
const path = 'n8n-workflows/06_send_first_2.json';
let wf = JSON.parse(fs.readFileSync(path, 'utf8'));

const jsCodeNode = wf.nodes.find(n => n.name === 'Set 2 Leads');
jsCodeNode.parameters.jsCode = `return [
  {
    json: {
      sendTo: "gridas@gridas.lv",
      subject: "Jautājums par AS Grīdas, SIA mājaslapu",
      message: "Labdien,\\n\\nIzskatot Jūsu mājaslapu, pamanīju, ka tās dizains izskatās novecojis - potenciālie klienti, visticamāk, izvēlēsies konkurentu ar modernāku lapu.\\n\\nEs specializējos tieši uzņēmumu mājaslapu modernizācijā Rīgā, palīdzot uzlabot klientu piesaisti ar mūsdienīgu un funkcionālu dizainu.\\n\\nNesen palīdzēju līdzīgam uzņēmumam ieviest jaunu mājaslapu, kas ievērojami palielināja viņu klientu skaitu.\\n\\nVai Jums būtu interese - varu nosūtīt īsu video, kurā parādu, kā tas izskatītos Jūsu uzņēmumam?\\n\\nJa nevēlaties saņemt šādus e-pastus, vienkārši atbildiet uz šo ziņu.\\n\\nAr cieņu,\\nAdrians"
    }
  },
  {
    json: {
      sendTo: "info@rencenuserviss.lv",
      subject: "Jautājums par Autoserviss Auto centrs Rencēnu mājaslapu",
      message: "Labdien,\\n\\nIzskatot Jūsu mājaslapu, pamanīju, ka tajā nav redzams pakalpojumu saraksts vai cenas - klienti nevar novērtēt piedāvājumu pirms zvanīšanas.\\n\\nEs specializējos tieši auto servisu mājaslapu izveidē, pievienojot skaidrus pakalpojumu sarakstus un cenas, kas palīdz klientiem pieņemt lēmumus.\\n\\nNesen palīdzēju līdzīgām Rīgas auto darbnīcām uzlabot viņu tiešsaistes redzamību un klientu piesaisti.\\n\\nVai Jums būtu interese - varu nosūtīt īsu video, kurā parādu, kā tas izskatītos Jūsu servisa mājaslapā?\\n\\nJa nevēlaties saņemt šādus e-pastus, vienkārši atbildiet uz šo ziņu.\\n\\nAr cieņu,\\nAdrians"
    }
  }
];`;

wf.name = "06 — Send Leads 3 and 4";
fs.writeFileSync(path, JSON.stringify(wf, null, 2));
console.log("Updated workflow for leads 3 and 4.");
