import { MetadataRoute } from 'next';
import { createClient } from '@/lib/supabase/server';

export const revalidate = 86400; // Раз в сутки

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : 'https://schef-xi.vercel.app'; // Замените на ваш рабочий домен

    const supabase = await createClient();

    // Получаем публичные одобренные рецепты
    const { data: recipes } = await supabase
        .from('recipes')
        .select('slug, updated_at')
        .eq('is_public', true)
        // .eq('moderation_status', 'approved') // Вернуть после MVP или настройки модерации
        .limit(1000)
        .order('created_at', { ascending: false });

    const recipeUrls: MetadataRoute.Sitemap = (recipes || []).map((recipe) => ({
        url: `${baseUrl}/recipe/${recipe.slug}`,
        lastModified: new Date(recipe.updated_at || new Date()).toISOString(),
        changeFrequency: 'monthly',
        priority: 0.8,
    }));

    return [
        {
            url: baseUrl,
            lastModified: new Date().toISOString(),
            changeFrequency: 'daily',
            priority: 1,
        },
        ...recipeUrls,
    ];
}
