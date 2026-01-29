
-- Create the 'proofs' bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('proofs', 'proofs', true)
ON CONFLICT (id) DO NOTHING;

-- Policy to allow public read access
DROP POLICY IF EXISTS "Proofs Public Access" ON storage.objects;
CREATE POLICY "Proofs Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'proofs' );

-- Policy to allow authenticated uploads (Admin/User)
DROP POLICY IF EXISTS "Proofs Public Upload" ON storage.objects;
CREATE POLICY "Proofs Public Upload"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'proofs' );

-- Policy to allow update
DROP POLICY IF EXISTS "Proofs Public Update" ON storage.objects;
CREATE POLICY "Proofs Public Update"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'proofs' );
