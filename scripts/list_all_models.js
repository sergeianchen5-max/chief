const { HttpsProxyAgent } = require('https-proxy-agent');
require('dotenv').config({ path: '.env.local' });
const fetch = require('node-fetch');

const proxyUrl = "http://wQ96w8:cs7vpD@138.59.205.38:9568";
const apiKey = process.env.GEMINI_API_KEY;

async function listAllModels() {
    const agent = new HttpsProxyAgent(proxyUrl);
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

    try {
        const response = await fetch(url, { agent });
        const data = await response.json();

        if (data.models) {
            console.log("Available Models:");
            data.models.forEach(m => console.log(m.name));
        } else {
            console.log("No models found or error:", JSON.stringify(data));
        }
    } catch (e) {
        console.error('Error:', e.message);
    }
}

listAllModels();
