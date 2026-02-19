const https = require('https');

const url = "https://openrouter.ai/api/v1/models";

https.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            if (json.data) {
                console.log("Бесплатные модели (top 20):");
                const freeModels = json.data.filter(m => {
                    const price = m.pricing;
                    return parseFloat(price.prompt) === 0 && parseFloat(price.completion) === 0;
                });

                // Sort by context length desc as proxy for capability? Or just list them.
                freeModels.forEach(m => {
                    console.log(`- ${m.id} (Context: ${m.context_length})`);
                });
            } else {
                console.log("Ошибка: ", json);
            }
        } catch (e) {
            console.error("Ошибка парсинга:", e);
        }
    });
}).on('error', (e) => {
    console.error(e);
});
