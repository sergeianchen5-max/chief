import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function proxy(request: NextRequest) {
    return await updateSession(request)
}

export const config = {
    matcher: [
        /*
         * Применять middleware ко всем маршрутам, кроме:
         * - _next/static (статические файлы)
         * - _next/image (оптимизация изображений)
         * - favicon.ico, sitemap.xml, robots.txt
         * - Файлы изображений/SVG/иконки
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
