#!/usr/bin/env node

/**
 * Script to set up the admin_users table in the database
 * Run this with: node setup-admin-db.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables from backend/.env
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials in backend/.env');
    console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function setupAdminDB() {
    try {
        console.log('🔧 Setting up admin_users table...');

        // Read the SQL file
        const sqlPath = path.join(__dirname, 'admin_db_setup.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        // Split by statements (simple split on $$; or semicolon)
        const statements = sql
            .split(/;\s*$/gm)
            .map(s => s.trim())
            .filter(s => s && !s.startsWith('--'));

        // Execute SQL using Supabase's RPC or raw SQL
        // Since Supabase client doesn't support raw SQL execution directly,
        // we'll use the REST API
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
            },
            body: JSON.stringify({ sql })
        });

        console.log('✅ Admin database schema created successfully!');
        console.log('📧 Default admin account:');
        console.log('   Email: admin@sharkfunded.com');
        console.log('   Password: admin123');
        console.log('   Role: super_admin');

    } catch (error) {
        console.error('❌ Error setting up database:', error);
        process.exit(1);
    }
}

setupAdminDB();
