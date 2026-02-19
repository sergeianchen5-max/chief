const https = require('https');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const match = envContent.match(/GEMINI_API_KEY=(.*)/);
const apiKey = match ? match[1].trim() : null;

if (!apiKey) {
    console.error("No API Key");
    process.exit(1);
}

const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

console.log(`Requesting models from: ${url.replace(apiKey, 'HIDDEN_KEY')}`);

https.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        console.log("Status:", res.statusCode);
        try {
            const json = JSON.parse(data);
            if (json.models) {
                console.log("Available Models:");
                json.models.forEach(m => console.log(`- ${m.name} (${m.supportedGenerationMethods})`));
            } else {
                console.log("No models found or error structure:", data.substring(0, 500));
            }
        } catch (e) {
            console.log("Raw Body:", data.substring(0, 500));
        }
    });
}).on('error', (e) => {
    console.error("Request Error:", e);
});
