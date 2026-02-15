const https = require('https');

const apiKey = 'AIzaSyAIUblMweUEKNS8aRz20c2snav_xsChCt4';
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

console.log(`Checking models with key: ${apiKey.substring(0, 10)}...`);

https.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            if (json.error) {
                console.error("API Error:", JSON.stringify(json.error, null, 2));
            } else {
                console.log("Available Models:");
                if (json.models) {
                    json.models.forEach(m => console.log(`- ${m.name} (${m.supportedGenerationMethods.join(', ')})`));
                } else {
                    console.log("No models field in response:", data);
                }
            }
        } catch (e) {
            console.error("Failed to parse JSON:", data);
        }
    });
}).on('error', (err) => {
    console.error("Network Error: " + err.message);
});
