
const { HttpsProxyAgent } = require('https-proxy-agent');
const fetch = require('node-fetch');

async function checkIp(proxyUrl) {
    console.log('--- Checking IP Address ---');

    // Check direct
    try {
        const res = await fetch('https://api.ipify.org?format=json');
        const data = await res.json();
        console.log('Direct IP:', data.ip);
    } catch (e) {
        console.error('Direct check failed:', e.message);
    }

    // Check proxy
    if (!proxyUrl) {
        console.log('No proxy URL provided.');
        return;
    }

    try {
        const agent = new HttpsProxyAgent(proxyUrl);
        const res = await fetch('https://api.ipify.org?format=json', { agent });
        const data = await res.json();
        console.log('Proxy IP :', data.ip);

        if (data.ip === '138.59.205.38') {
            console.log('✅ PROXY WORKING CORRECTLY');
        } else {
            console.log('⚠️ Proxy IP mismatch or transparent proxy');
        }

    } catch (e) {
        console.error('Proxy check failed:', e.message);
    }
}

// Load env specific for this script context if needed, but we'll pass arg manually or rely on loaded env if run via script runner that loads env.
// For simplicity, hardcoding the user verified proxy for this specific test
const proxy = "http://wQ96w8:cs7vpD@138.59.205.38:9568";
checkIp(proxy);
