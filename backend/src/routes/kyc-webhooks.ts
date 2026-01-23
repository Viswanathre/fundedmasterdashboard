import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

// Security: Verify webhook signature or secret
const verifyDiditWebhook = (req: Request): boolean => {
    const secret = process.env.DIDIT_WEBHOOK_SECRET;

    // If no secret configured in development, allow all (but log warning)
    if (!secret || secret.includes('your_')) {
        console.warn('⚠️ DIDIT_WEBHOOK_SECRET not configured. Skipping verification (Dev Mode).');
        return true;
    }

    // Check for DiDit signature in headers
    const signature = req.headers['x-didit-signature'] ||
        req.headers['x-webhook-signature'] ||
        req.headers['x-api-signature'];

    if (signature === secret) {
        return true;
    }

    // Check query param as fallback
    const querySecret = req.query.secret as string;
    if (querySecret === secret) {
        return true;
    }

    return false;
};

/**
 * POST /api/kyc-webhooks/didit
 * Webhook endpoint for DiDit KYC verification callbacks
 * 
 * DiDit sends verification results to this endpoint when a user completes KYC
 * This endpoint updates the kyc_sessions table with the verification data
 */
router.post('/didit', async (req: Request, res: Response) => {
    try {
        console.log('📨 [DiDit Webhook] Received callback');
        console.log('Headers:', req.headers);
        console.log('Body:', JSON.stringify(req.body, null, 2));

        // Verify webhook authenticity
        if (!verifyDiditWebhook(req)) {
            console.warn(`🛑 Blocked unauthorized DiDit webhook from ${req.ip}`);
            res.status(403).json({ error: 'Unauthorized: Invalid webhook signature' });
            return;
        }

        const kycData = req.body;

        // Extract session ID from various possible formats
        let didit_session_id = kycData.session_id ||
            kycData.sessionId ||
            kycData.didit_session_id ||
            kycData.verificationSessionId;

        // Handle nested payload structure
        if (!didit_session_id && kycData.payload) {
            didit_session_id = kycData.payload.session_id;
        }

        if (!didit_session_id) {
            console.error('❌ DiDit Webhook missing Session ID:', kycData);
            res.status(400).json({ error: 'Session ID is required' });
            return;
        }

        console.log(`✅ Processing webhook for session: ${didit_session_id}`);

        // Extract and normalize status
        let status = kycData.status || kycData.decision || kycData.verification_status;
        if (kycData.payload?.status) {
            status = kycData.payload.status;
        }

        if (status) {
            status = status.toLowerCase();
        }

        // Prepare comprehensive update data
        const updateData: any = {
            updated_at: new Date().toISOString(),
            raw_response: kycData, // Store complete webhook payload

            // Extract identity data (handle nested structures)
            first_name: kycData.id_document?.extracted_data?.first_name ||
                kycData.first_name ||
                kycData.firstName ||
                kycData.payload?.first_name,

            last_name: kycData.id_document?.extracted_data?.last_name ||
                kycData.last_name ||
                kycData.lastName ||
                kycData.payload?.last_name,

            date_of_birth: kycData.id_document?.extracted_data?.date_of_birth ||
                kycData.date_of_birth ||
                kycData.dateOfBirth ||
                kycData.payload?.date_of_birth,

            nationality: kycData.id_document?.extracted_data?.nationality ||
                kycData.nationality ||
                kycData.payload?.nationality,

            // Document data
            document_type: kycData.id_document?.extracted_data?.document_type ||
                kycData.document_type ||
                kycData.documentType ||
                kycData.payload?.document_type,

            document_number: kycData.id_document?.extracted_data?.document_number ||
                kycData.document_number ||
                kycData.documentNumber ||
                kycData.payload?.document_number,

            document_country: kycData.id_document?.extracted_data?.issuing_country ||
                kycData.document_country ||
                kycData.documentCountry ||
                kycData.payload?.document_country,

            // Address data (prefer POA - Proof of Address)
            address_line1: kycData.poa?.extracted_data?.address_line_1 ||
                kycData.address_line1 ||
                kycData.addressLine1 ||
                kycData.address ||
                kycData.payload?.address_line1,

            address_line2: kycData.poa?.extracted_data?.address_line_2 ||
                kycData.address_line2 ||
                kycData.addressLine2 ||
                kycData.payload?.address_line2,

            city: kycData.poa?.extracted_data?.city ||
                kycData.city ||
                kycData.payload?.city,

            state: kycData.poa?.extracted_data?.state ||
                kycData.state ||
                kycData.province ||
                kycData.payload?.state,

            postal_code: kycData.poa?.extracted_data?.zip_code ||
                kycData.postal_code ||
                kycData.postalCode ||
                kycData.payload?.postal_code,

            country: kycData.id_document?.extracted_data?.issuing_country ||
                kycData.country ||
                kycData.payload?.country,

            // Risk & Verification scores
            aml_status: kycData.aml_status ||
                kycData.amlStatus ||
                kycData.payload?.aml_status,

            face_match_score: kycData.face_match?.score ||
                kycData.face_match_score ||
                kycData.faceMatchScore ||
                kycData.payload?.face_match_score,

            liveness_score: kycData.liveness_score ||
                kycData.livenessScore ||
                kycData.payload?.liveness_score,
        };

        // Normalize and set status
        if (status) {
            if (status === 'approved' || status === 'verified' || status === 'accepted' || status === 'passed') {
                updateData.status = 'approved';
                updateData.completed_at = new Date().toISOString();
            } else if (status === 'declined' || status === 'rejected' || status === 'failed') {
                updateData.status = 'declined';
            } else if (status === 'review' || status === 'requires_review' || status === 'manual_review') {
                updateData.status = 'requires_review';
            } else if (status === 'pending' || status === 'in_progress' || status === 'processing') {
                updateData.status = status;
            } else {
                // Unknown status, store as-is
                updateData.status = status;
            }
        }

        // Update the KYC session in database
        const { data: updatedSession, error: updateError } = await supabase
            .from('kyc_sessions')
            .update(updateData)
            .eq('didit_session_id', didit_session_id)
            .select()
            .single();

        if (updateError) {
            console.error('❌ Error updating KYC session:', updateError);
            res.status(500).json({
                error: 'Failed to update KYC session',
                details: updateError.message
            });
            return;
        }

        if (!updatedSession) {
            console.error('❌ KYC session not found:', didit_session_id);
            res.status(404).json({ error: 'KYC session not found' });
            return;
        }

        console.log(`✅ Successfully updated KYC session ${didit_session_id} with status: ${updateData.status}`);

        // Acknowledge webhook receipt
        res.json({
            success: true,
            message: 'Webhook processed successfully',
            session_id: didit_session_id,
            status: updateData.status
        });

    } catch (error: any) {
        console.error('❌ DiDit webhook error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
});

/**
 * GET /api/kyc-webhooks/didit
 * Sometimes DiDit sends GET requests for verification
 * Redirect to appropriate page or return status
 */
router.get('/didit', async (req: Request, res: Response) => {
    const sessionId = req.query.session_id as string;
    const status = req.query.status as string;

    console.log('📨 [DiDit Webhook] GET request received', { sessionId, status });

    // Use consistent frontend URL
    const frontendUrl = process.env.FRONTEND_URL ||
        process.env.NEXT_PUBLIC_APP_URL ||
        'http://localhost:3000';

    if (sessionId && status) {
        // Redirect user to KYC status page
        return res.redirect(`${frontendUrl}/kyc/status?session=${sessionId}&status=${status}`);
    }

    // Generic acknowledgment
    res.json({
        message: 'DiDit webhook endpoint',
        method: 'GET',
        timestamp: new Date().toISOString()
    });
});

export default router;
