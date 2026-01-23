-- =================================================================
-- MISSING TABLES MIGRATION (FIXED)
-- Creates affiliate_withdrawals and kyc_sessions tables
-- Handles existing tables properly
-- =================================================================

-- =================================================================
-- 1. AFFILIATE WITHDRAWALS TABLE
-- =================================================================

-- Drop and recreate to ensure clean schema
DROP TABLE IF EXISTS public.affiliate_withdrawals CASCADE;

-- Create table
CREATE TABLE public.affiliate_withdrawals (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.profiles(id) NOT NULL,
    amount numeric NOT NULL,
    status text NOT NULL DEFAULT 'pending', -- pending, approved, rejected, processed
    payout_method text NOT NULL, -- crypto, bank_transfer, paypal
    payout_details jsonb,
    created_at timestamptz DEFAULT now(),
    processed_at timestamptz,
    rejection_reason text
);

-- Enable RLS
ALTER TABLE public.affiliate_withdrawals ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own withdrawals"
    ON public.affiliate_withdrawals FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create withdrawals"
    ON public.affiliate_withdrawals FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Add indexes
CREATE INDEX idx_affiliate_withdrawals_user_id ON public.affiliate_withdrawals(user_id);
CREATE INDEX idx_affiliate_withdrawals_status ON public.affiliate_withdrawals(status);

-- =================================================================
-- 2. KYC SESSIONS TABLE  
-- =================================================================

-- Drop and recreate to ensure clean schema
DROP TABLE IF EXISTS public.kyc_sessions CASCADE;

-- Create the kyc_sessions table
CREATE TABLE public.kyc_sessions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.profiles(id) NOT NULL,
    didit_session_id text UNIQUE NOT NULL,
    workflow_id text NOT NULL,
    verification_url text, -- URL for user to complete KYC
    status text NOT NULL DEFAULT 'pending', -- pending, in_progress, completed, failed, expired
    
    -- Verification results
    verification_result text, -- APPROVED, DECLINED, MANUAL_REVIEW
    verification_score numeric,
    
    -- Document data
    document_type text,
    document_number text,
    document_country text,
    document_expiry_date date,
    
    -- Personal information (from original migration)
    first_name text,
    last_name text,
    full_name text,
    date_of_birth date,
    nationality text,
    formatted_address text,
    address_line1 text,
    address_line2 text,
    city text,
    state text,
    postal_code text,
    country text,
    
    -- Verification checks
    id_verification_status text,
    liveness_status text,
    liveness_method text,
    liveness_score numeric,
    face_match_status text,
    face_match_score numeric,
    aml_status text,
    aml_score numeric,
    aml_total_hits integer,
    
    -- Contact verification
    phone_status text,
    phone_number text,
    email_status text,
    email_address text,
    
    -- Additional verifications
    poa_status text,
    nfc_status text,
    database_validation_status text,
    
    -- IP/Geo data
    ip_country text,
    ip_country_code text,
    is_vpn_or_tor boolean,
    
    -- Raw data
    raw_response jsonb DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    completed_at timestamptz,
    expires_at timestamptz,
    webhook_received_at timestamptz,
    
    -- Constraints
    CONSTRAINT valid_status CHECK (status IN ('pending', 'in_progress', 'approved', 'declined', 'expired', 'requires_review', 'completed', 'failed'))
);

-- Indexes
CREATE INDEX idx_kyc_sessions_user ON public.kyc_sessions(user_id);
CREATE INDEX idx_kyc_sessions_status ON public.kyc_sessions(status);
CREATE INDEX idx_kyc_sessions_didit ON public.kyc_sessions(didit_session_id);
CREATE INDEX idx_kyc_sessions_created ON public.kyc_sessions(created_at DESC);

-- Enable RLS
ALTER TABLE public.kyc_sessions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own KYC sessions"
    ON public.kyc_sessions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create KYC sessions"
    ON public.kyc_sessions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own KYC sessions"
    ON public.kyc_sessions FOR UPDATE
    USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_kyc_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_kyc_sessions_updated_at
    BEFORE UPDATE ON public.kyc_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_kyc_sessions_updated_at();

-- Comments
COMMENT ON TABLE public.kyc_sessions IS 'Tracks Didit KYC verification sessions and results';
COMMENT ON COLUMN public.kyc_sessions.didit_session_id IS 'Unique session ID from Didit API';
COMMENT ON COLUMN public.kyc_sessions.workflow_id IS 'Didit workflow ID used for this verification';
COMMENT ON COLUMN public.kyc_sessions.raw_response IS 'Full JSON response from Didit webhook';

-- =================================================================
-- SUCCESS
-- =================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ affiliate_withdrawals table created successfully';
    RAISE NOTICE '✅ kyc_sessions table created successfully';
    RAISE NOTICE '✅ Migration completed!';
END $$;

