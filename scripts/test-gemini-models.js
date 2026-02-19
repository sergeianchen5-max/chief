
const { HttpsProxyAgent } = require('https-proxy-agent');
const fetch = require('node-fetch');

const proxyUrl = "http://wQ96w8:cs7vpD@138.59.205.38:9568";
const apiKey = process.env.GEMINI_API_KEY;

const candidates = [
    "gemini-1.5-flash",
    "gemini-1.5-flash-001",
    "gemini-1.5-flash-002",
    "gemini-1.5-flash-latest",
    "gemini-2.0-flash-exp"
];

async function testModel(modelName) {
    const agent = new HttpsProxyAgent(proxyUrl);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    try {
        console.log(`Testing ${modelName}...`);
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: "Hi" }] }]
            }),
            agent: agent
        });

        if (response.ok) {
            console.log(`✅ SUCCESS: ${modelName}`);
            return true;
        } else {
            console.log(`❌ FAILED: ${modelName} - Status ${response.status}`);
            return false;
        }
    } catch (e) {
        console.error(`❌ Error with ${modelName}:`, e.message);
        return false;
    }
}

async function runTests() {
    for (const model of candidates) {
        await testModel(model);
    }
}

runTests();
