import { NextResponse } from 'next/server';
import { generateChefPlan } from "@/app/actions/generate";
import { Ingredient, FamilyMember, Gender, ActivityLevel, GoalType } from '@/lib/types';

export const maxDuration = 60;

export async function GET() {
    try {
        const mockInventory: Ingredient[] = [
            { id: '1', name: 'Курица', category: 'meat' },
            { id: '2', name: 'Картофель', category: 'produce' },
            { id: '3', name: 'Морковь', category: 'produce' }
        ];

        const mockFamily: FamilyMember[] = [{
            id: '1',
            name: 'TestUser',
            age: 30,
            gender: Gender.MALE,
            height: 180,
            weight: 80,
            activityLevel: ActivityLevel.MODERATE,
            goal: GoalType.MAINTENANCE,
            preferences: 'None'
        }];

        const result = await generateChefPlan(mockInventory, mockFamily, true, ['main']);

        return NextResponse.json(result);
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
