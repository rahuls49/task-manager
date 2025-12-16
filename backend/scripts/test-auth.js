"use strict";
/**
 * Debug script to test authentication flow
 * Run with: npx ts-node-dev --transpile-only scripts/test-auth.ts
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config"); // Load .env file
const axios_1 = __importDefault(require("axios"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const fs_1 = __importDefault(require("fs"));
const API_BASE = 'http://localhost:4999';
const LOG_FILE = 'auth-debug.log';
function log(message) {
    console.log(message);
    fs_1.default.appendFileSync(LOG_FILE, message + '\n');
}
async function testAuthFlow() {
    // Clear log file
    fs_1.default.writeFileSync(LOG_FILE, '');
    log('============================================================');
    log('AUTH FLOW DEBUG SCRIPT');
    log('============================================================');
    log('JWT_SECRET loaded: ' + (process.env.JWT_SECRET ? 'YES' : 'NO'));
    // Step 1: Login
    log('\n[Step 1] Testing Login...');
    let token;
    try {
        const loginResponse = await axios_1.default.post(`${API_BASE}/auth/login`, {
            emailOrPhone: 'admin',
            password: 'admin123'
        });
        log('  Login successful');
        log('  User ID: ' + loginResponse.data.user?.id);
        log('  User roles: ' + JSON.stringify(loginResponse.data.user?.roles));
        log('  Permissions: ' + JSON.stringify(loginResponse.data.user?.permissions));
        token = loginResponse.data.token;
        log('  TOKEN: ' + token);
    }
    catch (error) {
        log('  Login failed: ' + JSON.stringify(error.response?.data || error.message));
        return;
    }
    // Step 2: Decode token
    log('\n[Step 2] Decoding JWT Token...');
    const decoded = jsonwebtoken_1.default.decode(token);
    log('  Token ID: ' + decoded?.id);
    log('  Token email: ' + decoded?.email);
    // Step 3: Verify token with JWT_SECRET
    log('\n[Step 3] Local token verification with JWT_SECRET...');
    const JWT_SECRET = process.env.JWT_SECRET;
    if (JWT_SECRET) {
        try {
            jsonwebtoken_1.default.verify(token, JWT_SECRET);
            log('  Token verification: SUCCESS');
        }
        catch (error) {
            log('  Token verification: FAILED - ' + error.message);
            log('  THIS IS THE PROBLEM - token cannot be verified');
            return;
        }
    }
    // Step 4: Test /tasks endpoint with a custom header to identify this request
    log('\n[Step 4] Testing /tasks endpoint...');
    log('  Sending request with Authorization: Bearer <token>');
    log('  Also sending X-Debug-Request: test-auth-script');
    try {
        const tasksResponse = await axios_1.default.get(`${API_BASE}/tasks`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'X-Debug-Request': 'test-auth-script'
            }
        });
        log('  /tasks request: SUCCESS');
        log('  Status: ' + tasksResponse.status);
    }
    catch (error) {
        log('  /tasks request: FAILED');
        log('  Status: ' + error.response?.status);
        log('  Error: ' + JSON.stringify(error.response?.data));
        log('');
        log('  CHECK THE BACKEND LOGS FOR: [Auth Middleware] Processing request');
        log('  AND: X-Debug-Request: test-auth-script');
    }
    log('\n============================================================');
    log('DEBUG COMPLETE');
    log('============================================================');
}
testAuthFlow().catch(err => {
    log('FATAL ERROR: ' + err.message);
});
