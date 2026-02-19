const https = require('https');

const apiKey = "AIzaSyCIMUZGY2_At4bHkWanoZceSZ5eXCa53bc"; // Hardcoded for test script only
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

https.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            if (json.models) {
                console.log("Доступные модели:");
                json.models.forEach(m => {
                    if (m.name.includes('flash') || m.name.includes('gemini')) {
                        console.log(`- ${m.name}`);
                    }
                });
            } else {
                console.log("Ошибка: ", json);
            }
        } catch (e) {
            console.error("Ошибка парсинга:", e);
            console.log(data);
        }
    });
}).on('error', (e) => {
    console.error(e);
});
