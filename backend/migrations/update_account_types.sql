-- Update existing account types with correct MT5 groups
-- "Swapping" the data as requested

UPDATE public.account_types SET mt5_group_name = 'demo\1-FM' WHERE name ILIKE '%Evaluation Phase 1%';
UPDATE public.account_types SET mt5_group_name = 'demo\2-FM' WHERE name ILIKE '%Evaluation Phase 2%';
UPDATE public.account_types SET mt5_group_name = 'demo\0-FM' WHERE name ILIKE '%Instant%';
UPDATE public.account_types SET mt5_group_name = 'demo\4-FM' WHERE name ILIKE '%Prime Phase 2%';
UPDATE public.account_types SET mt5_group_name = 'demo\5-FM' WHERE name ILIKE '%Prime Instant%';
UPDATE public.account_types SET mt5_group_name = 'demo\6-FM' WHERE name ILIKE '%Master%';
UPDATE public.account_types SET mt5_group_name = 'demo\SF\0-Demo\comp' WHERE name ILIKE '%Competition%';

-- Optional: Insert if missing (UPSERT-like behavior can be complex in plain SQL without constraints, so simple Updates are safer if data exists)
