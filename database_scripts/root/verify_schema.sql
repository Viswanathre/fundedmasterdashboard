-- Verification script for challenges table schema
-- Run this in your Supabase SQL Editor to verify the migration

-- 1. Check if 'group' column still exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'challenges' 
  AND table_schema = 'public'
  AND column_name IN ('group', 'mt5_group');

-- 2. If 'group' column still exists, rename it to 'mt5_group'
-- ONLY run this if the above query shows 'group' column exists
-- ALTER TABLE public.challenges RENAME COLUMN "group" TO mt5_group;

-- 3. Verify the final schema
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'challenges' 
  AND table_schema = 'public'
ORDER BY ordinal_position;
