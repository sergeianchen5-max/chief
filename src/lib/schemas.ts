import { z } from 'zod';

export const ingredientSchema = z.object({
    id: z.string(),
    name: z.string().min(1, "Название продукта не может быть пустым"),
    category: z.string().optional()
});

export const familyMemberSchema = z.object({
    id: z.string(),
    name: z.string().min(1),
    age: z.number().min(0),
    gender: z.enum(['Мужской', 'Женский']),
    height: z.number().positive(),
    weight: z.number().positive(),
    activityLevel: z.string(),
    goal: z.string(),
    preferences: z.string().optional(), // Now just a string
    deadline: z.string().optional(),
});

export const generatePlanSchema = z.object({
    inventory: z.array(ingredientSchema).min(1, "Добавьте хотя бы один продукт"),
    family: z.array(familyMemberSchema).min(1, "Добавьте хотя бы одного члена семьи"),
    onlyFridge: z.boolean().default(false)
});
