-- Ensure phone and nationality columns exist in profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS nationality TEXT;

-- Update the handle_new_user function to include phone and nationality
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  referrer_id uuid;
BEGIN
  -- Try to find referrer if code is provided
  IF new.raw_user_meta_data->>'referral_code' IS NOT NULL THEN
    SELECT id INTO referrer_id FROM public.profiles 
    WHERE referral_code = new.raw_user_meta_data->>'referral_code';
  END IF;

  INSERT INTO public.profiles (id, full_name, email, referral_code, referred_by, phone, nationality)
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'full_name', 
    new.email,
    substring(md5(random()::text) from 0 for 8), -- Generate a random 7-char code
    referrer_id, -- Save the referrer's ID
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'nationality'
  );
  
  -- Increment referral count for the referrer
  IF referrer_id IS NOT NULL THEN
    UPDATE public.profiles 
    SET total_referrals = total_referrals + 1 
    WHERE id = referrer_id;
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
