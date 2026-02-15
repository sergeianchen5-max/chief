const https = require('https');

console.log("Checking public IP...");

https.get('https://ipapi.co/json/', (res) => {
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            console.log("---------------------------------------------------");
            console.log(`IP: ${json.ip}`);
            console.log(`Country: ${json.country_name} (${json.country_code})`);
            console.log(`City: ${json.city}`);
            console.log(`Org: ${json.org}`);
            console.log("---------------------------------------------------");

            if (json.country_code === 'RU' || json.country_code === 'BY') {
                console.error("⚠️ WARNING: Your location is likely BLOCKED by Google Gemini API.");
                console.error("Please enable VPN specifically for your terminal/system.");
            } else {
                console.log("✅ Location looks good for Gemini API.");
            }
        } catch (e) {
            console.error("Failed to parse response:", data);
        }
    });
}).on('error', (err) => {
    console.error("Network Error: " + err.message);
});
