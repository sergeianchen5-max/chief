import { createHash } from 'crypto';

export function normalizeIngredients(raw: string[]): string[] {
    return raw
        .map(i => i.trim().toLowerCase().replace(/\s+/g, ' '))
        .filter(i => i.length > 0)
        .sort();
}

export function hashIngredients(raw: string[]): string {
    const normalized = normalizeIngredients(raw);
    return createHash('md5').update(normalized.join(',')).digest('hex');
}
