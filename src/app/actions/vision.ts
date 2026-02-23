'use server';

import { Ingredient } from "@/lib/types";
import { fetchWithProxy } from "./proxy";

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

export async function recognizeIngredients(base64Image: string): Promise<Ingredient[]> {
    if (!base64Image) return [];
    try {
        const apiKey = process.env.GEMINI_API_KEY;

        if (apiKey) {
            const url = `${GEMINI_API_URL}?key=${apiKey}`;

            const response = await fetchWithProxy(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            { text: "List visible ingredients JSON: [{name, category}]" },
                            { inlineData: { data: base64Image.replace(/^data:image\/\w+;base64,/, ""), mimeType: "image/jpeg" } }
                        ]
                    }]
                }),
            });

            if (!response.ok) throw new Error("Vision API failed");

            const data = await response.json();
            const txt = data.candidates?.[0]?.content?.parts?.[0]?.text;

            if (txt) {
                const json = JSON.parse(txt.replace(/```json/g, '').replace(/```/g, ''));
                return json.map((i: any) => ({ id: crypto.randomUUID(), name: i.name, category: i.category || 'other' }));
            }
        }
    } catch (e) { console.warn("Vision failed", e); }
    return [];
}
