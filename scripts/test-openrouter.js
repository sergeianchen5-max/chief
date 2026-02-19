const { HttpsProxyAgent } = require('https-proxy-agent');
require('dotenv').config({ path: '.env.local' });
const fetch = require('node-fetch');

const proxyUrl = process.env.PROXY_URL || "http://wQ96w8:cs7vpD@138.59.205.38:9568";
const apiKey = process.env.OPENROUTER_API_KEY;

const OPENROUTER_MODELS = [
    "google/gemini-2.0-flash-exp:free",
    "meta-llama/llama-3.3-70b-instruct:free",
    "google/gemma-3-27b-it:free",
    "nousresearch/hermes-3-llama-3.1-405b:free",
    "mistralai/mistral-small-24b-instruct-2501:free",
];

async function checkOpenRouter() {
    console.log("Testing OpenRouter via Proxy...");
    console.log(`Proxy: ${proxyUrl.replace(/:[^:@]*@/, ':****@')}`);

    if (!apiKey) {
        console.error("❌ OPENROUTER_API_KEY missing");
        return;
    }

    const agent = new HttpsProxyAgent(proxyUrl);

    for (const model of OPENROUTER_MODELS) {
        console.log(`\nTesting model: ${model}`);
        try {
            const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://schef-xi.vercel.app", // Use production URL
                    "X-Title": "Schef Fridge Test Script",
                },
                body: JSON.stringify({
                    model: model,
                    messages: [{ role: "user", content: "Say 'Hello' in JSON format: {message: 'Hello'}" }],
                    response_format: { type: "json_object" },
                }),
                agent: agent
            });

            if (response.ok) {
                const data = await response.json();
                console.log(`✅ Success! Response: ${JSON.stringify(data.choices[0].message.content)}`);
                // If one works, we are good primarily, but let's see why others fail if any
                break;
            } else {
                console.log(`❌ Failed: Status ${response.status}`);
                const text = await response.text();
                console.log(`Error body: ${text}`);
            }
        } catch (e) {
            console.error(`❌ Exception: ${e.message}`);
        }
    }
}

checkOpenRouter();
