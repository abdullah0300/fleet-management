-- ============================================
-- PROOF OF DELIVERY - RUN THIS IN SUPABASE SQL EDITOR
-- ============================================

-- 1. Create proof_of_delivery table
CREATE TABLE IF NOT EXISTS proof_of_delivery (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE NOT NULL,
    recipient_name TEXT NOT NULL,
    signature_url TEXT,
    delivery_notes TEXT,
    completed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create proof_of_delivery_photos table for multiple photos
CREATE TABLE IF NOT EXISTS proof_of_delivery_photos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    pod_id UUID REFERENCES proof_of_delivery(id) ON DELETE CASCADE NOT NULL,
    photo_url TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enable RLS
ALTER TABLE proof_of_delivery ENABLE ROW LEVEL SECURITY;
ALTER TABLE proof_of_delivery_photos ENABLE ROW LEVEL SECURITY;

-- 4. Create policies (allow all for now - adjust based on your auth needs)
CREATE POLICY "Allow all operations on proof_of_delivery" 
    ON proof_of_delivery FOR ALL USING (true);

CREATE POLICY "Allow all operations on proof_of_delivery_photos" 
    ON proof_of_delivery_photos FOR ALL USING (true);

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_pod_job_id ON proof_of_delivery(job_id);
CREATE INDEX IF NOT EXISTS idx_pod_photos_pod_id ON proof_of_delivery_photos(pod_id);

-- ============================================
-- STORAGE BUCKET - RUN THIS IN SUPABASE STORAGE
-- ============================================
-- Go to Supabase Dashboard > Storage > Create new bucket:
-- Bucket name: delivery-proofs
-- Public bucket: YES (for easy access to images)
-- File size limit: 10MB
-- Allowed MIME types: image/png, image/jpeg, image/webp

-- Or run this SQL:
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'delivery-proofs',
    'delivery-proofs',
    true,
    10485760, -- 10MB
    ARRAY['image/png', 'image/jpeg', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Storage policy to allow uploads
CREATE POLICY "Allow public uploads to delivery-proofs"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'delivery-proofs');

CREATE POLICY "Allow public read from delivery-proofs"
ON storage.objects FOR SELECT
USING (bucket_id = 'delivery-proofs');
