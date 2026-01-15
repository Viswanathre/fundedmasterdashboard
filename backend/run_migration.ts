
import { Client } from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || process.env.POSTGRES_URL;

if (!connectionString) {
    console.error("Missing Database Connection String (DATABASE_URL)");
    console.log("Please ensure .env has DATABASE_URL or similar.");
    // Fallback: Construct it if components exist? No, risk of error.
    process.exit(1);
}

async function runMigration() {
    const client = new Client({
        connectionString: connectionString,
        ssl: { rejectUnauthorized: false } // Required for Supabase usually
    });

    try {
        await client.connect();
        console.log("Connected to Database.");

        const sqlPath = path.join(__dirname, 'migrations', 'add_profit_target_column.sql');
        const sql = fs.readFileSync(sqlPath, 'utf-8');

        console.log("Running migration SQL...");
        await client.query(sql);
        console.log("✅ Migration successful: profit_target_percent column added.");

    } catch (err) {
        console.error("❌ Migration failed:", err);
    } finally {
        await client.end();
    }
}

runMigration();
