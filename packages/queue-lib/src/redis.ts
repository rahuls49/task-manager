import Redis from "ioredis";
import 'dotenv/config';

const connection = new Redis({
    port: parseInt(process.env.REDIS_PORT as string || "6379"),
    host: process.env.REDIS_HOST as string || "172.27.60.2",
    username: process.env.REDIS_USERNAME as string || "default", 
    password: process.env.REDIS_PASSWORD as string || "LqI1r4jXse4GFuxxLltRsdw0BsvHMUTeXakAO9oohcWyTRFFovHTaulFzcQypvXX",
    maxRetriesPerRequest: null,
});


export default connection;