-- Create a new public bucket for documents
insert into storage.buckets (id, name, public)
values ('documents', 'documents', true)
on conflict (id) do nothing;

-- Note: RLS is already enabled on storage.objects by default in Supabase.
-- Attempting to enable it requires superuser permissions and will fail for normal users.

-- Policy to allow authenticated users to view all documents
drop policy if exists "Allow view access to all users" on storage.objects;
create policy "Allow view access to all users"
on storage.objects for select
to authenticated 
using ( bucket_id = 'documents' );

-- Policy to allow authenticated users to upload documents
drop policy if exists "Allow upload access to authenticated users" on storage.objects;
create policy "Allow upload access to authenticated users"
on storage.objects for insert
to authenticated
with check ( bucket_id = 'documents' );

-- Policy to allow authenticated users to update their documents
drop policy if exists "Allow update access to authenticated users" on storage.objects;
create policy "Allow update access to authenticated users"
on storage.objects for update
to authenticated
using ( bucket_id = 'documents' );

-- Policy to allow authenticated users to delete documents
drop policy if exists "Allow delete access to authenticated users" on storage.objects;
create policy "Allow delete access to authenticated users"
on storage.objects for delete
to authenticated
using ( bucket_id = 'documents' );
