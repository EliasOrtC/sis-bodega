const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

async function listModels() {
    const keys = process.env.GEMINI_API_KEY.split(',');
    const key = keys[0].trim();
    console.log("Using key starting with:", key.substring(0, 8));

    const genAI = new GoogleGenerativeAI(key);

    console.log("--- v1beta ---");
    try {
        const result = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
        const data = await result.json();
        if (data.models) {
            data.models.forEach(m => console.log(`- ${m.name}`));
        } else {
            console.log(data);
        }
    } catch (e) {
        console.error("Error listing v1beta:", e.message);
    }

    console.log("\n--- v1 ---");
    try {
        const result = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${key}`);
        const data = await result.json();
        if (data.models) {
            data.models.forEach(m => console.log(`- ${m.name}`));
        } else {
            console.log(data);
        }
    } catch (e) {
        console.error("Error listing v1:", e.message);
    }
}

listModels();
