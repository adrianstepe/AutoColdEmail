require("dotenv").config();
const https = require("https");
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
function httpsGetJSON(url) {
    return new Promise((resolve, reject) => {
        https.get(url, res => {
            let body = ''; res.on('data', c => body += c);
            res.on('end', () => resolve(JSON.parse(body)));
        }).on('error', reject);
    });
}
async function test() {
    const data = await httpsGetJSON(`https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`);
    if (data.models) {
        console.log(data.models.map(m => m.name).filter(n => n.includes('flash')));
    } else {
        console.log(data);
    }
}
test();
