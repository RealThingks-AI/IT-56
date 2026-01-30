-- Create storage bucket for asset documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('asset-documents', 'asset-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for asset-documents bucket

-- Allow authenticated users to upload documents to their asset folders
CREATE POLICY "Users can upload asset documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'asset-documents');

-- Allow authenticated users to view asset documents
CREATE POLICY "Users can view asset documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'asset-documents');

-- Allow authenticated users to delete asset documents
CREATE POLICY "Users can delete asset documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'asset-documents');

-- Allow authenticated users to update asset documents
CREATE POLICY "Users can update asset documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'asset-documents');