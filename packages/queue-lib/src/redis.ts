import Redis from "ioredis";
import 'dotenv/config';

const connection = new Redis({
    port: parseInt(process.env.REDIS_PORT as string || "6379"),
    host: process.env.REDIS_HOST as string || "172.27.60.2",
    username: process.env.REDIS_USERNAME as string || "default",
    password: process.env.REDIS_PASSWORD as string || "LqI1r4jXse4GFuxxLltRsdw0BsvHMUTeXakAO9oohcWyTRFFovHTaulFzcQypvXX",
    maxRetriesPerRequest: null,
    connectTimeout: 30000, // 30 seconds connection timeout
    keepAlive: 30000, // Keep connection alive
    retryStrategy(times: number) {
        const delay = Math.min(times * 50, 2000);
        console.log(`Redis retry attempt ${times}, waiting ${delay}ms...`);
        return delay;
    },
    reconnectOnError(err: Error) {
        const targetError = 'READONLY';
        if (err.message.includes(targetError)) {
            return true;
        }
        return false;
    },
});

// Connection event listeners for debugging
connection.on('connect', () => {
    console.log('✅ Redis: Connection established');
});

connection.on('ready', () => {
    console.log('✅ Redis: Connection ready to accept commands');
});

connection.on('error', (err) => {
    console.error('❌ Redis: Connection error:', err.message);
});

connection.on('close', () => {
    console.log('⚠️ Redis: Connection closed');
});

connection.on('reconnecting', () => {
    console.log('🔄 Redis: Reconnecting...');
});

export default connection;