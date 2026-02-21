'use server';

export async function fetchRecipeImage(query: string): Promise<string | null> {
    const accessKey = process.env.UNSPLASH_ACCESS_KEY;
    if (!accessKey) {
        console.warn("[Unsplash] UNSPLASH_ACCESS_KEY is missing. Using placeholder.");
        return null;
    }

    try {
        const url = new URL("https://api.unsplash.com/search/photos");
        url.searchParams.append("query", query + " food recipe");
        url.searchParams.append("per_page", "1");
        url.searchParams.append("orientation", "landscape");

        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: {
                "Authorization": `Client-ID ${accessKey}`,
                "Accept-Version": "v1"
            }
        });

        if (!response.ok) {
            console.error(`[Unsplash] Error ${response.status}: ${await response.text()}`);
            return null;
        }

        const data = await response.json();
        if (data.results && data.results.length > 0) {
            // Return regular size image
            return data.results[0].urls.regular;
        }

        return null; // Fallback if no image found

    } catch (e) {
        console.error("[Unsplash] Check failed:", e);
        return null;
    }
}
