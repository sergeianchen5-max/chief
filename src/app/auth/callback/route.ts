import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    const next = searchParams.get('next') ?? '/'
    const type = searchParams.get('type')

    if (code) {
        const supabase = await createClient()
        const { error } = await supabase.auth.exchangeCodeForSession(code)

        if (!error) {
            // Если это первый вход (magic link) — перенаправляем на установку пароля
            const redirectUrl = next.startsWith('/auth')
                ? `${origin}${next}`
                : `${origin}${next}`
            return NextResponse.redirect(redirectUrl)
        }
    }

    // Если что-то пошло не так — редирект на страницу входа с ошибкой
    return NextResponse.redirect(`${origin}/auth?error=callback_failed`)
}
