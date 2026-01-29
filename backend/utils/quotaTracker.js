const fs = require('fs');
const path = require('path');

const USAGE_FILE = path.join(__dirname, '../data/ai_usage.json');

// Ensure directory exists synchronously only once at startup
if (!fs.existsSync(path.join(__dirname, '../data'))) {
    try {
        fs.mkdirSync(path.join(__dirname, '../data'));
    } catch (e) {
        // Ignore if already exists race condition
    }
}

// In-memory cache to prevent constant disk reads
let usageCache = null;
let lastSaveTime = 0;
let saveTimeout = null;

const loadUsage = () => {
    try {
        if (fs.existsSync(USAGE_FILE)) {
            const data = JSON.parse(fs.readFileSync(USAGE_FILE, 'utf8'));
            // Check reset logic
            if (data.lastReset !== new Date().toDateString()) {
                return { lastReset: new Date().toDateString(), usage: {}, exhausted: {} };
            }
            return data;
        }
    } catch (e) {
        console.error("Error loading usage file:", e);
    }
    return { lastReset: new Date().toDateString(), usage: {}, exhausted: {} };
};

// Initialize cache
if (!usageCache) {
    usageCache = loadUsage();
}

const persistUsageAsync = () => {
    // Debounce save (wait 2 seconds of inactivity before writing)
    if (saveTimeout) clearTimeout(saveTimeout);

    saveTimeout = setTimeout(() => {
        fs.writeFile(USAGE_FILE, JSON.stringify(usageCache, null, 2), (err) => {
            if (err) console.error("Error saving usage async:", err);
        });
    }, 2000); // 2 second write buffer
};

const getUsage = () => {
    // Check for daily reset needed on read
    if (usageCache.lastReset !== new Date().toDateString()) {
        usageCache = { lastReset: new Date().toDateString(), usage: {}, exhausted: {} };
        persistUsageAsync();
    }
    return usageCache;
};

const recordUsage = (key, model) => {
    const data = getUsage();
    const keyId = key.substring(0, 8);
    if (!data.usage[keyId]) data.usage[keyId] = {};
    if (!data.usage[keyId][model]) data.usage[keyId][model] = 0;
    data.usage[keyId][model]++;

    // Save async
    persistUsageAsync();
};

const markExhausted = (key, model) => {
    const data = getUsage();
    const keyId = key.substring(0, 8);
    if (!data.exhausted) data.exhausted = {};
    if (!data.exhausted[keyId]) data.exhausted[keyId] = {};
    data.exhausted[keyId][model] = Date.now();

    // Save async
    persistUsageAsync();
};

const getSummary = (apiKeys, keyCounts = {}) => {
    // Ensure we have fresh data (reset check handled in getUsage)
    const data = getUsage();
    const summary = {
        google: { used: 0, limit: 0, name: 'Google Gemini (Total)' },
        groq: { used: 0, limit: 0, name: 'Llama 3 (Groq)' },
        openrouter: { used: 0, limit: 0, name: 'Z.AI (OpenRouter)' }
    };

    const gKeys = keyCounts.google || 0;
    summary.google.limit = gKeys * 20 * 2;
    summary.google.limitPerModel = gKeys * 20;

    Object.keys(summary).forEach(p => {
        if (p !== 'google') {
            const baseLimit = p === 'groq' ? 500 : 50;
            const totalKeys = keyCounts[p] || 0;
            summary[p].limit = totalKeys * baseLimit;
            summary[p].limitPerModel = totalKeys * baseLimit;
        }
    });

    const uniqueKeyPrefixes = [...new Set(apiKeys.map(k => k.substring(0, 8)))];

    uniqueKeyPrefixes.forEach(k => {
        const usageModels = data.usage[k] || {};

        Object.keys(usageModels).forEach(model => {
            const count = usageModels[model] || 0;
            const m = model.toLowerCase();
            let providerKey = null;

            if (m.includes('gemini')) {
                providerKey = 'google';
            } else if (m.includes('llama') || m.includes('mixtral')) {
                providerKey = 'groq';
            } else if (m.includes('gpt')) {
                providerKey = 'openai';
            } else if (m.includes('z-ai') || m.includes('glm')) {
                providerKey = 'openrouter';
            }

            if (providerKey && summary[providerKey]) {
                const p = summary[providerKey];
                p.used += count;
                if (!p.modelUsage) p.modelUsage = {};
                if (!p.modelUsage[model]) p.modelUsage[model] = 0;
                p.modelUsage[model] += count;
            }
        });
    });

    return summary;
};

module.exports = { recordUsage, markExhausted, getSummary, getUsage };
