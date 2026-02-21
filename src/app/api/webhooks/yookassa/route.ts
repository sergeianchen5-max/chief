import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
    try {
        const body = await req.json();

        // 1. Проверка IP адреса ЮKassa (в идеале, добавить проверку подписи или Basic Auth)
        // Для простоты MVP мы доверяем полю object.status == 'succeeded'
        // В продакшене: нужно сверять IP адреса ЮKassa или использовать TLS сертификат.

        if (body.type === 'notification' && body.event === 'payment.succeeded') {
            const paymentObj = body.object;
            const paymentId = paymentObj.id;
            const userId = paymentObj.metadata?.user_id;

            if (!userId) {
                console.error('[YooKassa Webhook] No user_id in metadata', paymentId);
                return NextResponse.json({ success: true, warning: 'No user_id' });
            }

            const supabase = await createClient();

            // Обновляем статус платежа
            await supabase.from('payments').update({
                status: 'succeeded'
            }).eq('yookassa_payment_id', paymentId);

            // Выдаем PRO статус пользователю на месяц вперед
            const endDate = new Date();
            endDate.setMonth(endDate.getMonth() + 1);

            const { error: profileError } = await supabase.from('profiles').update({
                subscription_tier: 'pro',
                subscription_active: true,
                subscription_start_date: new Date().toISOString(),
                subscription_end_date: endDate.toISOString()
            }).eq('id', userId);

            if (profileError) {
                console.error('[YooKassa Webhook] Error updating profile PRO', profileError);
                throw profileError;
            }

            console.log(`[YooKassa Webhook] ✅ PRO выдан пользователю ${userId}`);
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ success: true, message: 'Ignored event type' });

    } catch (error: any) {
        console.error('[YooKassa Webhook] Ошибка:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
