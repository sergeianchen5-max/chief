import { GoogleGenerativeAI } from "@google/generative-ai"; // Only for types if needed
import { ChefPlan, FamilyMember, Ingredient, MealCategory } from "@/lib/types";
import { generateChefPlan as generateChefPlanServerAction } from "@/app/actions/generate";

export class GenerationService {

    /**
     * Safe generation method:
     * 1. Uses Server Action exclusively for now (since Client-Side Gemini is blocked).
     */
    static async generateChefPlanSafe(
        inventory: Ingredient[],
        family: FamilyMember[],
        onlyFridge: boolean,
        categories: MealCategory[]
    ): Promise<{ success: boolean; data?: ChefPlan; error?: string; source: 'server' | 'client' }> {

        // 1. Try Server Action
        try {
            console.log("🚀 [GenerationService] Calling Server Action...");
            const serverResult = await generateChefPlanServerAction(inventory, family, onlyFridge, categories);

            if (serverResult.success) {
                console.log("✅ [GenerationService] Success");
                return { success: true, data: serverResult.data, source: 'server' };
            } else {
                console.warn("⚠️ [GenerationService] Server Action failed:", serverResult.error);
                return {
                    success: false,
                    error: serverResult.error || "Не удалось сгенерировать рецепт. Попробуйте позже.",
                    source: 'server'
                };
            }
        } catch (serverError: any) {
            console.error("❌ [GenerationService] Network Error:", serverError);
            return {
                success: false,
                error: "Ошибка сети или таймаут сервера. Проверьте соединение.",
                source: 'server'
            };
        }
    }
}
