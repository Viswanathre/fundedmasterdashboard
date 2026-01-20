
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load admin .env
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
    console.log("Loading .env from:", envPath);
    dotenv.config({ path: envPath });
} else {
    console.log("❌ admin/.env file not found!");
}

const requiredKeys = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'ADMIN_API_KEY'
];

console.log("--- Checking Admin Environment Variables ---");
requiredKeys.forEach(key => {
    if (process.env[key]) {
        console.log(`✅ ${key}: Present (Length: ${process.env[key].length}) | Prefix: ${process.env[key].substring(0, 5)}...`);
    } else {
        console.log(`❌ ${key}: MISSING`);
    }
});
