
const { HttpsProxyAgent } = require('https-proxy-agent');
require('dotenv').config({ path: '.env.local' });
const fetch = require('node-fetch');

const proxyUrl = "http://wQ96w8:cs7vpD@138.59.205.38:9568";
const apiKey = process.env.GEMINI_API_KEY;

async function checkModel() {
    const agent = new HttpsProxyAgent(proxyUrl);
    // Note: older SDKs might not support new models if hardcoded, but REST API should work.
    // Also check if we need to remove 'models/' prefix or keep it. Rest API usually takes 'models/name' or just 'name'.
    // The list returned 'models/gemini-2.5-flash'.

    // Attempt 1: with prefix
    const url1 = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    try {
        console.log("Testing gemini-2.5-flash...");
        const response = await fetch(url1, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts: [{ text: "Hi" }] }] }),
            agent: agent
        });

        if (response.ok) {
            console.log("✅ success with gemini-2.5-flash");
            const data = await response.json();
            console.log(data.candidates?.[0]?.content?.parts?.[0]?.text);
        } else {
            console.log(`❌ failed gemini-2.5-flash (Status ${response.status})`);
            console.log(await response.text());
        }

    } catch (e) {
        console.error('Error:', e.message);
    }
}

checkModel();
