'use server';

// maxDuration configuration should be in page.tsx

import { Ingredient } from "@/lib/types";
import { getProxyAgent } from "./proxy";

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

export async function recognizeIngredients(base64Image: string): Promise<Ingredient[]> {
    if (!base64Image) return [];
    try {
        const apiKey = process.env.GEMINI_API_KEY;
        const agent = getProxyAgent();

        if (apiKey) {
            // Using REST API for Vision to support Proxy
            // endpoint: models/gemini-2.5-flash:generateContent
            const url = `${GEMINI_API_URL}?key=${apiKey}`;

            const response = await fetch(url, {
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
                // @ts-ignore
                agent: agent
            });

            if (!response.ok) throw new Error("Vision API failed");

            const data = await response.json();
            const txt = data.candidates?.[0]?.content?.parts?.[0]?.text;

            if (txt) {
                const json = JSON.parse(txt.replace(/```json/g, '').replace(/```/g, ''));
                return json.map((i: any) => ({ id: Math.random().toString(), name: i.name, category: i.category || 'other' }));
            }
        }
    } catch (e) { console.warn("Vision failed", e); }
    return [];
}
