import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Инициализируем только если есть переменные окружения
const redisAvailable = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN;

let ratelimitInstance: Ratelimit | null = null;

if (redisAvailable) {
    try {
        ratelimitInstance = new Ratelimit({
            redis: Redis.fromEnv(),
            limiter: Ratelimit.slidingWindow(10, '1 m'),
            analytics: true,
        });
    } catch (e) {
        console.error("Failed to initialize Upstash Redis:", e);
    }
}

export async function checkRateLimit(identifier: string) {
    if (!ratelimitInstance) {
        return { success: true }; // Пропускаем, если Redis не настроен
    }
    try {
        return await ratelimitInstance.limit(identifier);
    } catch (e) {
        console.error("Rate limit check failed:", e);
        return { success: true }; // Fallback in case of network error to redis
    }
}
