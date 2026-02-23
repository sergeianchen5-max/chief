import 'server-only';

/**
 * Обёртка над fetch() с поддержкой прокси через переменную окружения.
 * Node.js 18+ (undici) НЕ поддерживает опцию `agent` в нативном fetch().
 * Вместо этого используем переменные окружения HTTPS_PROXY / HTTP_PROXY,
 * которые автоматически подхватываются undici и node-fetch.
 */
export async function fetchWithProxy(url: string | URL, init?: RequestInit): Promise<Response> {
    // Устанавливаем переменные окружения для прокси, если PROXY_URL задан
    const proxyUrl = process.env.PROXY_URL;
    if (proxyUrl && !process.env.HTTPS_PROXY) {
        process.env.HTTPS_PROXY = proxyUrl;
        process.env.HTTP_PROXY = proxyUrl;
    }

    return fetch(url, init);
}
