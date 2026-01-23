-- =====================================================
-- OTP Codes Table for Two-Factor Authentication
-- =====================================================

CREATE TABLE IF NOT EXISTS public.otp_codes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    code text NOT NULL,
    purpose text NOT NULL, -- 'withdrawal', 'login', '2fa_setup', etc.
    expires_at timestamptz NOT NULL,
    verified boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_otp_user_purpose ON public.otp_codes(user_id, purpose, verified);
CREATE INDEX IF NOT EXISTS idx_otp_expires ON public.otp_codes(expires_at);

-- Enable RLS
ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;

-- Users can view their own OTP codes
CREATE POLICY "Users can view own OTP codes"
    ON public.otp_codes FOR SELECT
    USING (auth.uid() = user_id);

-- Service role can insert OTP codes
CREATE POLICY "Service can insert OTP codes"
    ON public.otp_codes FOR INSERT
    WITH CHECK (true);

-- Service role can update OTP codes
CREATE POLICY "Service can update OTP codes"
    ON public.otp_codes FOR UPDATE
    USING (true);

-- Cleanup function to delete expired OTP codes
CREATE OR REPLACE FUNCTION cleanup_expired_otps()
RETURNS void AS $$
BEGIN
    DELETE FROM public.otp_codes
    WHERE expires_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments
COMMENT ON TABLE public.otp_codes IS 'Stores one-time passwords for two-factor authentication';
COMMENT ON COLUMN public.otp_codes.purpose IS 'Purpose of OTP: withdrawal, login, 2fa_setup, etc.';
COMMENT ON COLUMN public.otp_codes.verified IS 'Whether the OTP has been successfully verified';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ otp_codes table created successfully';
END $$;
