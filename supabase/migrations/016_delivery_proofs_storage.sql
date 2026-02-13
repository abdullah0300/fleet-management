-- Create delivery-proofs storage bucket and policies
-- This migration sets up the storage infrastructure for POD photos and signatures

-- 1. Create the storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'delivery-proofs',
    'delivery-proofs',
    true,
    20971520, -- 20MB
    ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
) ON CONFLICT (id) DO UPDATE SET
    public = true,  
    file_size_limit = 20971520,
    allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

-- 2. Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Allow public uploads to delivery-proofs" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read from delivery-proofs" ON storage.objects;
DROP POLICY IF EXISTS "Allow public delete from delivery-proofs" ON storage.objects;

-- 3. Create storage policies for public access
CREATE POLICY "Allow public uploads to delivery-proofs"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'delivery-proofs');

CREATE POLICY "Allow public read from delivery-proofs"
ON storage.objects FOR SELECT
USING (bucket_id = 'delivery-proofs');

CREATE POLICY "Allow public delete from delivery-proofs"
ON storage.objects FOR DELETE
USING (bucket_id = 'delivery-proofs');

-- 4. Create policy for updates (in case files need to be replaced)
CREATE POLICY "Allow public update to delivery-proofs"
ON storage.objects FOR UPDATE
USING (bucket_id = 'delivery-proofs')
WITH CHECK (bucket_id = 'delivery-proofs');
