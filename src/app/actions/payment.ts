'use server';

import { createClient } from '@/lib/supabase/server';
import { v4 as uuidv4 } from 'uuid';

const YOOKASSA_SHOP_ID = process.env.YOOKASSA_SHOP_ID;
const YOOKASSA_SECRET_KEY = process.env.YOOKASSA_SECRET_KEY;
const API_URL = 'https://api.yookassa.ru/v3/payments';

const BASE_URL = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000';

export async function createSubscriptionPayment() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { success: false, error: 'Unauthorized' };
        }

        if (!YOOKASSA_SHOP_ID || !YOOKASSA_SECRET_KEY) {
            console.error('[YooKassa] Отсутствуют ключи API');
            return { success: false, error: 'Payment gateway configuration error' };
        }

        const idempotenceKey = uuidv4();
        const authString = Buffer.from(`${YOOKASSA_SHOP_ID}:${YOOKASSA_SECRET_KEY}`).toString('base64');

        const payload = {
            amount: {
                value: '199.00',
                currency: 'RUB'
            },
            capture: true,
            confirmation: {
                type: 'redirect',
                return_url: `${BASE_URL}/dashboard?payment=success`
            },
            description: `Подписка PRO Шеф-Холодильник (${user.email})`,
            save_payment_method: true, // Для рекуррентных платежей
            metadata: {
                user_id: user.id
            }
        };

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${authString}`,
                'Idempotence-Key': idempotenceKey
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[YooKassa] Payment Creation Failed:', errorText);
            throw new Error('Failed to create payment');
        }

        const paymentData = await response.json();

        // Save pending payment to our DB
        await supabase.from('payments').insert({
            user_id: user.id,
            amount: 199.00,
            status: 'pending',
            yookassa_payment_id: paymentData.id,
            metadata: paymentData.metadata
        });

        // Return confirmation URL to redirect user
        if (paymentData.confirmation && paymentData.confirmation.confirmation_url) {
            return { success: true, url: paymentData.confirmation.confirmation_url };
        }

        return { success: false, error: 'No confirmation URL received' };

    } catch (e: any) {
        console.error('[Payment error]', e);
        return { success: false, error: e.message };
    }
}
