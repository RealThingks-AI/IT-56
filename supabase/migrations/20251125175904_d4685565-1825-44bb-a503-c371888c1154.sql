-- Ensure asset-photos bucket exists and is public
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('asset-photos', 'asset-photos', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
ON CONFLICT (id) 
DO UPDATE SET 
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users to view asset photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload asset photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to update asset photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete asset photos" ON storage.objects;

-- RLS Policies for asset-photos bucket

-- Allow authenticated users to view all asset photos
CREATE POLICY "Allow authenticated users to view asset photos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'asset-photos');

-- Allow authenticated users to upload asset photos
CREATE POLICY "Allow authenticated users to upload asset photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'asset-photos');

-- Allow users to update their organization's asset photos
CREATE POLICY "Allow users to update asset photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'asset-photos');

-- Allow users to delete their organization's asset photos
CREATE POLICY "Allow users to delete asset photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'asset-photos');