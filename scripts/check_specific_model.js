
const { HttpsProxyAgent } = require('https-proxy-agent');
require('dotenv').config({ path: '.env.local' });
const fetch = require('node-fetch');

const proxyUrl = "http://wQ96w8:cs7vpD@138.59.205.38:9568";
const apiKey = process.env.GEMINI_API_KEY;

async function checkModel() {
    const agent = new HttpsProxyAgent(proxyUrl);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash?key=${apiKey}`;

    try {
        const response = await fetch(url, { agent });
        if (response.ok) {
            console.log("✅ gemini-1.5-flash EXISTS");
        } else {
            console.log(`❌ gemini-1.5-flash NOT FOUND (Status ${response.status})`);
            const text = await response.text();
            console.log(text);
        }
    } catch (e) {
        console.error('Error:', e.message);
    }
}

checkModel();
