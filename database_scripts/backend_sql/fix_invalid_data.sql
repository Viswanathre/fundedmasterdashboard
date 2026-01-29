
-- Fix Invalid Challenges (Null Login)
-- Option 1: Delete them if they are broken/incomplete
DELETE FROM public.challenges 
WHERE login IS NULL OR login = 0;

-- OR Option 2: Update with a dummy login if you need to keep the record (uncomment if preferred)
-- UPDATE public.challenges 
-- SET login = (floor(random() * 900000000 + 100000000)::bigint)
-- WHERE login IS NULL;
