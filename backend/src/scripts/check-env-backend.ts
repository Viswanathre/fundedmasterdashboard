
import dotenv from 'dotenv';
import path from 'path';

// Load root .env
const envPath = path.resolve(__dirname, '../../.env');
console.log("Loading root .env from:", envPath);
dotenv.config({ path: envPath });

const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (key) {
    console.log(`✅ Root Service Role Key: Present (Length: ${key.length}) | Prefix: ${key.substring(0, 5)}...`);
} else {
    console.log("❌ Root Service Role Key: MISSING");
}
