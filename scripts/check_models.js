const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');
const path = require('path');

// Load env explicitly to avoid dotenv dependency usage if not present
const envPath = path.resolve(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const match = envContent.match(/GEMINI_API_KEY=(.*)/);
const apiKey = match ? match[1].trim() : null;

if (!apiKey) {
    console.error("No API Key found in .env.local");
    process.exit(1);
}

console.log(`API Key found (starts with: ${apiKey.substring(0, 5)}...)`);

const genAI = new GoogleGenerativeAI(apiKey);

async function testModel(modelName) {
    try {
        console.log(`Testing model: ${modelName}...`);
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent("Hello, are you working?");
        const response = await result.response;
        console.log(`✅ Success with ${modelName}:`, response.text().substring(0, 50));
        return true;
    } catch (e) {
        console.error(`❌ Failed ${modelName}:`, e.message);
        return false;
    }
}

async function run() {
    const models = [
        "gemini-1.5-flash",
        "gemini-1.5-flash-latest",
        "gemini-1.5-flash-001",
        "gemini-pro",
        "gemini-1.0-pro"
    ];

    for (const m of models) {
        await testModel(m);
    }
}

run();
