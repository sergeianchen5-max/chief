import { NextResponse } from 'next/server';
import { generateChefPlan } from '@/app/actions/generate';

const INGREDIENTS_SETS = [
    ['Куриное филе', 'Рис', 'Брокколи', 'Соевый соус'],
    ['Говядина', 'Картофель', 'Морковь', 'Лук', 'Томатная паста'],
    ['Творог', 'Яйца', 'Мука', 'Сахар', 'Сметана'],
    ['Семга', 'Шпинат', 'Сливки', 'Паста'],
    ['Гречка', 'Грибы', 'Лук', 'Сметана'],
    ['Фарш мясной', 'Макароны', 'Сыр', 'Томаты'],
    ['Кабачок', 'Яйца', 'Чеснок', 'Укроп'],
    ['Филе индейки', 'Болгарский перец', 'Лапша удон', 'Терияки']
];

export async function GET(request: Request) {
    try {
        const authHeader = request.headers.get('authorization');

        // В продакшене Vercel Cron присылает заголовок Authorization с CRON_SECRET
        if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            // Разрешаем запускать локально для тестов без секрета
            if (process.env.NODE_ENV === 'production') {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }
        }

        // Выбираем 2 случайных набора ингредиентов
        const shuffled = [...INGREDIENTS_SETS].sort(() => 0.5 - Math.random());
        const selectedSets = shuffled.slice(0, 2);

        const results = [];

        for (const set of selectedSets) {
            const inventory = set.map((name, i) => ({ id: `i${i}`, name, category: 'other' as const }));

            console.log(`[Cron] Generating for: ${set.join(', ')}`);
            const res = await generateChefPlan(
                inventory,
                [], // default family
                false // onlyFridge
            );

            results.push({
                ingredients: set,
                success: res.success,
                error: res.success ? null : res.error
            });
        }

        return NextResponse.json({
            message: 'Auto-generation completed',
            results
        });

    } catch (error: any) {
        console.error('[Cron] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
