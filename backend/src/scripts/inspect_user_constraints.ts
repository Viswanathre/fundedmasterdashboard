import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.SUPABASE_DB_URL;

if (!connectionString) {
    console.error("❌ No database connection string found!");
    process.exit(1);
}

const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
});

async function inspectConstraints() {
    try {
        await client.connect();
        console.log("🔌 Connected to Database.");

        const sql = `
            SELECT
                tc.table_schema, 
                tc.constraint_name, 
                tc.table_name, 
                kcu.column_name, 
                ccu.table_schema AS foreign_table_schema,
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name 
            FROM 
                information_schema.table_constraints AS tc 
                JOIN information_schema.key_column_usage AS kcu
                  ON tc.constraint_name = kcu.constraint_name
                  AND tc.table_schema = kcu.table_schema
                JOIN information_schema.constraint_column_usage AS ccu
                  ON ccu.constraint_name = tc.constraint_name
                  AND ccu.table_schema = tc.table_schema
            WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = 'profiles';
        `;

        const res = await client.query(sql);
        console.log("🔎 Foreign Keys on 'profiles' table:", res.rows);

        // Also check if 'public.users' exists and has the user
        const checkPublicUsers = await client.query(`SELECT to_regclass('public.users')`);
        console.log("🔎 public.users table exists:", checkPublicUsers.rows[0].to_regclass);

    } catch (err) {
        console.error("❌ Inspection Failed:", err);
    } finally {
        await client.end();
    }
}

inspectConstraints();
