import 'server-only';
import { HttpsProxyAgent } from 'https-proxy-agent';

export function getProxyAgent() {
    const proxyUrl = process.env.PROXY_URL;
    if (proxyUrl) {
        // console.log("[AI] 🛡️ Using Proxy:", proxyUrl.replace(/:[^:@]*@/, ':****@')); // Mask password
        return new HttpsProxyAgent(proxyUrl);
    }
    return undefined;
}
