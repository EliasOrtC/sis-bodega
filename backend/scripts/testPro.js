const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

async function check() {
    try {
        const keys = (process.env.GEMINI_API_KEY || "").split(',').filter(Boolean);
        console.log(`Verificando ${keys.length} llaves...`);

        for (let i = 0; i < keys.length; i++) {
            const key = keys[i].trim();
            console.log(`\nProbando llave ${i + 1}: ${key.substring(0, 10)}...`);
            const genAI = new GoogleGenerativeAI(key);

            const models = ["gemini-1.5-pro", "gemini-pro", "gemini-1.0-pro"];

            for (const modelName of models) {
                try {
                    const model = genAI.getGenerativeModel({ model: modelName });
                    // Intentamos una generación de 1 palabra para ir rápido
                    const result = await model.generateContent({ contents: [{ role: 'user', parts: [{ text: "hi" }] }] });
                    console.log(`  [OK] ${modelName}`);
                } catch (e) {
                    console.log(`  [FAIL] ${modelName}: ${e.message.substring(0, 50)}...`);
                }
            }
        }
    } catch (globalErr) {
        console.error("FATAL:", globalErr);
    }
}

check();
