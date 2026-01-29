const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

async function listAllModels() {
    const keys = (process.env.GEMINI_API_KEY || "").split(',').filter(Boolean);
    if (keys.length === 0) {
        console.log("No API keys found in .env");
        return;
    }

    const key = keys[0].trim();
    console.log(`Usando llave: ${key.substring(0, 10)}...`);
    const genAI = new GoogleGenerativeAI(key);

    try {
        // We use a basic fetch because the SDK might not have a direct listModels yet in all versions
        // or we can try the direct REST API
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
        const data = await response.json();

        if (data.models) {
            console.log("\nMODELOS DISPONIBLES EN TU CUENTA:");
            data.models.forEach(m => {
                console.log(`- ${m.name.replace('models/', '')} (Max tokens: ${m.outputTokenLimit})`);
            });
        } else {
            console.log("No se pudieron listar los modelos:", data);
        }
    } catch (e) {
        console.error("Error listando modelos:", e.message);
    }
}

listAllModels();
