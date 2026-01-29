import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { supabase } from '../lib/supabase';
import { EmailService } from '../services/email-service';
import crypto from 'crypto';

const router = Router();

/**
 * Generate a 6-digit OTP code
 */
function generateOTP(): string {
    return crypto.randomInt(100000, 999999).toString();
}

/**
 * Generate a verification token (used after OTP is verified)
 */
function generateVerificationToken(userId: string, purpose: string): string {
    const payload = `${userId}:${purpose}:${Date.now()}`;
    return crypto.createHash('sha256').update(payload).digest('hex');
}

/**
 * POST /api/otp/generate - Generate and send OTP
 */
router.post('/generate', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const user = req.user;
        const { purpose } = req.body;

        if (!user) {
            res.status(401).json({ error: 'Not authenticated' });
            return;
        }

        if (!purpose) {
            res.status(400).json({ error: 'Purpose is required' });
            return;
        }

        // Rate limiting: Check for recent OTP requests
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
        const { data: recentOTPs } = await supabase
            .from('otp_codes')
            .select('id')
            .eq('user_id', user.id)
            .eq('purpose', purpose)
            .gte('created_at', tenMinutesAgo.toISOString());

        if (recentOTPs && recentOTPs.length >= 3) {
            res.status(429).json({
                error: 'Too many requests. Please wait 10 minutes before requesting another code.'
            });
            return;
        }

        // Get user profile for name and email
        const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', user.id)
            .single();

        if (!profile) {
            res.status(404).json({ error: 'Profile not found' });
            return;
        }

        // Generate OTP
        const code = generateOTP();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Store OTP in database
        const { error: insertError } = await supabase
            .from('otp_codes')
            .insert({
                user_id: user.id,
                code,
                purpose,
                expires_at: expiresAt.toISOString(),
                verified: false
            });

        if (insertError) {
            console.error('Error inserting OTP:', insertError);
            res.status(500).json({ error: 'Failed to generate OTP' });
            return;
        }

        // Send OTP via email
        try {
            await EmailService.sendOTP(
                profile.email,
                profile.full_name || 'User',
                code,
                purpose
            );
        } catch (emailError) {
            console.error('Error sending OTP email:', emailError);
            // Don't fail the request - OTP is saved, user might have it cached
        }

        res.json({
            message: 'Verification code sent to your email',
            expiresIn: 600 // seconds
        });

    } catch (error: any) {
        console.error('OTP generate error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/otp/verify - Verify OTP and return verification token
 */
router.post('/verify', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const user = req.user;
        const { code, purpose } = req.body;

        if (!user) {
            res.status(401).json({ error: 'Not authenticated' });
            return;
        }

        if (!code || !purpose) {
            res.status(400).json({ error: 'Code and purpose are required' });
            return;
        }

        // Find valid OTP
        const { data: otpRecord, error: otpError } = await supabase
            .from('otp_codes')
            .select('*')
            .eq('user_id', user.id)
            .eq('code', code)
            .eq('purpose', purpose)
            .eq('verified', false)
            .gt('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (otpError || !otpRecord) {
            res.status(401).json({
                error: 'Invalid or expired verification code',
                valid: false
            });
            return;
        }

        // Mark OTP as verified
        await supabase
            .from('otp_codes')
            .update({ verified: true })
            .eq('id', otpRecord.id);

        // Generate verification token (valid for 5 minutes)
        const token = generateVerificationToken(user.id, purpose);

        // Store token temporarily (we'll use it for verification in withdrawal endpoints)
        // For simplicity, we could store it in the OTP record or use a separate cache
        // Here we'll return it directly and verify it by regenerating with same inputs

        res.json({
            valid: true,
            message: 'Verification successful',
            token,
            expiresIn: 300 // 5 minutes in seconds
        });

    } catch (error: any) {
        console.error('OTP verify error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * Verify a raw OTP code and mark it as verified (1-step verification)
 */
export async function verifyAndMarkOTP(userId: string, code: string, purpose: string): Promise<boolean> {
    console.log(`🔍 Verifying OTP for user ${userId}, code: ${code}, purpose: ${purpose}`);

    const { data: otpRecord, error } = await supabase
        .from('otp_codes')
        .select('id, code, purpose, verified, expires_at') // Select more fields for debug
        .eq('user_id', userId)
        .eq('code', code)
        .eq('purpose', purpose)
        .eq('verified', false)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) {
        console.error('❌ Error querying OTP table:', error);
        return false;
    }

    if (!otpRecord) {
        console.warn(`⚠️ No valid OTP found for verification. Params: User=${userId}, Code=${code}, Purpose=${purpose}`);
        return false;
    }

    console.log(`✅ Valid OTP found: ${otpRecord.id}. Marking as verified...`);

    // Mark as verified
    const { error: updateError } = await supabase
        .from('otp_codes')
        .update({ verified: true })
        .eq('id', otpRecord.id);

    if (updateError) {
        console.error('❌ Error updating OTP status:', updateError);
        return false;
    }

    return true;
}

/**
 * Helper function to verify OTP token (called from withdrawal endpoints)
 */
export async function verifyOTPToken(userId: string, token: string, purpose: string): Promise<boolean> {
    // For production, implement proper token verification with expiry
    // For now, we'll check if a recent verified OTP exists
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const { data } = await supabase
        .from('otp_codes')
        .select('id')
        .eq('user_id', userId)
        .eq('purpose', purpose)
        .eq('verified', true)
        .gte('created_at', fiveMinutesAgo.toISOString())
        .limit(1)
        .maybeSingle();

    return !!data;
}

export default router;
