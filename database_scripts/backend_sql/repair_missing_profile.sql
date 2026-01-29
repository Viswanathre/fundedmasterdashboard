-- FIX: Link existing profile to the new Auth ID (afcabbe5...)
-- This handles the case where the user re-signed up or the Auth ID changed, 
-- but the profile row was left behind with the old ID.

DO $$
DECLARE
    v_new_auth_id UUID := 'afcabbe5-d0ea-42aa-8ec6-b62f334dac11'; -- The ID causing the error
    v_email TEXT;
BEGIN
    -- 1. Get the email for the current "Zombie" Auth User
    SELECT email INTO v_email FROM auth.users WHERE id = v_new_auth_id;

    RAISE NOTICE 'Found Auth User Email: %', v_email;

    IF v_email IS NOT NULL THEN
        -- 2. Check if a profile exists with this email but a DIFFERENT ID (Orphaned Profile)
        IF EXISTS (SELECT 1 FROM public.profiles WHERE email = v_email AND id != v_new_auth_id) THEN
            RAISE NOTICE 'Found Orphaned Profile. Updating ID to match Auth User...';
            
            -- Update the ID of the existing profile to match the new Auth ID
            -- (We temporarily disable FK checks if possible, or just update given CASCADE might not be set everywhere, 
            -- but for profiles PK, we usually can update if no other tables reference it restrictively yet.
            -- Wallet addresses table we just created references it, but it's empty for this user.)
            UPDATE public.profiles 
            SET id = v_new_auth_id 
            WHERE email = v_email;
            
        ELSE
            -- 3. If no profile exists at all, insert a new one
            RAISE NOTICE 'No profile found. Creating new one...';
            INSERT INTO public.profiles (id, full_name, email, display_name)
            VALUES (
                v_new_auth_id, 
                'Trader', 
                v_email, 
                'Trader'
            )
            ON CONFLICT (id) DO NOTHING;
        END IF;
    ELSE
        RAISE NOTICE 'Auth User not found! Cannot fix.';
    END IF;
END $$;
