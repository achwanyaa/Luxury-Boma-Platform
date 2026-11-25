-- Drawings, reports and certificates behind a property's facts, in a PRIVATE
-- bucket. Nobody reads these files by URL: LuxuryBoma staff open them through
-- short-lived signed links made on the server after checking the session.
-- (Showing public or signed-in documents to buyers comes later, through the
-- same signed links, after checking the documents row's visibility.)
--
-- Paths are <client_id>/<property_id>/<random uuid>.<ext>. 50 MB is the most
-- a free Supabase project allows per file.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'property-documents',
  'property-documents',
  false,
  52428800,
  array['application/pdf', 'image/jpeg', 'image/png']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Only LuxuryBoma staff with a two-factor session read, write or remove these
-- files. Reading is needed for signed links; there is no rule for anyone else.
create policy property_documents_select on storage.objects for select to authenticated
  using (bucket_id = 'property-documents' and (select private.is_lb_staff()));
create policy property_documents_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'property-documents' and (select private.is_lb_staff()));
create policy property_documents_update on storage.objects for update to authenticated
  using (bucket_id = 'property-documents' and (select private.is_lb_staff()))
  with check (bucket_id = 'property-documents' and (select private.is_lb_staff()));
create policy property_documents_delete on storage.objects for delete to authenticated
  using (bucket_id = 'property-documents' and (select private.is_lb_staff()));
