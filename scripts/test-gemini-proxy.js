const { HttpsProxyAgent } = require('https-proxy-agent');
require('dotenv').config({ path: '.env.local' });
const fetch = require('node-fetch');

const proxyUrl = "http://wQ96w8:cs7vpD@138.59.205.38:9568";
const apiKey = process.env.GEMINI_API_KEY;

async function listModels() {
    console.log('--- Listing Gemini Models via Proxy ---');

    const agent = new HttpsProxyAgent(proxyUrl);
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

    try {
        const response = await fetch(url, { agent });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Status ${response.status}: ${errText}`);
        }

        const data = await response.json();
        console.log('Models:', JSON.stringify(data, null, 2));

        // Check if 1.5 flash exists
        const flash = data.models?.find(m => m.name.includes('flash'));
        if (flash) console.log('✅ Found Flash model:', flash.name);
        else console.log('⚠️ Flash model NOT found in list');

    } catch (e) {
        console.error('❌ List models failed:', e.message);
    }
}

listModels();
