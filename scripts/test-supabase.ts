// Тест подключения к Supabase
// Запуск: npx tsx scripts/test-supabase.ts

import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !key) {
    console.error('❌ Не заданы переменные NEXT_PUBLIC_SUPABASE_URL или SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
}

const supabase = createClient(url, key)

async function test() {
    console.log('🔌 Подключение к Supabase:', url)
    console.log('')

    const tables = ['profiles', 'recipes', 'saved_recipes', 'payments', 'shopping_lists']

    for (const table of tables) {
        const { data, error } = await supabase.from(table).select('*').limit(0)
        if (error) {
            console.log(`❌ ${table}: ${error.message}`)
        } else {
            console.log(`✅ ${table}: таблица существует`)
        }
    }

    console.log('')
    console.log('🎉 Проверка завершена!')
}

test()
