"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = eventHandler;
const axios_1 = __importDefault(require("axios"));
async function eventHandler(params, fileName) {
    const create_task_event = require(`../json/${fileName}.json`);
    // Process events without blocking
    create_task_event.forEach(async (event) => {
        try {
            await sendEventWithRetry(event, params);
        }
        catch (error) {
            console.error(`Failed to send event to ${event.endpoint} after retries:`, error);
        }
    });
}
async function sendEventWithRetry(event, params, maxRetries = 3) {
    let lastError;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const config = {
                method: event['http-method'],
                url: event.endpoint,
                headers: {
                    'api-key': event['api-key']
                },
                data: { ...event.parameters, ...params },
                timeout: 10000 // 10 second timeout
            };
            const response = await (0, axios_1.default)(config);
            console.log(`Event sent successfully to ${event.endpoint} on attempt ${attempt}`);
            return response.data;
        }
        catch (error) {
            lastError = error;
            console.warn(`Attempt ${attempt} failed for ${event.endpoint}:`, error);
            if (attempt < maxRetries) {
                // Exponential backoff: wait 1s, 2s, 4s...
                const delay = Math.pow(2, attempt - 1) * 1000;
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    throw lastError;
}
//# sourceMappingURL=index.js.map