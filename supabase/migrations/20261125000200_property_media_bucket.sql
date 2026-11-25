-- Photos and the video walkthrough of a property, in a public bucket.
--
-- Public: files are served by URL with no policy check, so a live listing's
-- gallery loads fast. Paths are <client_id>/<property_id>/<random uuid>.<ext>,
-- so a draft property's files can't be guessed. Drawings and reports go in a
-- separate private bucket (console step 7), never here.
--
-- 50 MB is the most a free Supabase project allows per file; photos are
-- kept far smaller by the console before upload.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'property-media',
  'property-media',
  true,
  52428800,
  array['image/jpeg', 'image/webp', 'image/png', 'video/mp4']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Only LuxuryBoma staff with a two-factor session write, replace, list or
-- remove files in this bucket. Everyone else reads through public URLs only.
create policy property_media_select on storage.objects for select to authenticated
  using (bucket_id = 'property-media' and (select private.is_lb_staff()));
create policy property_media_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'property-media' and (select private.is_lb_staff()));
create policy property_media_update on storage.objects for update to authenticated
  using (bucket_id = 'property-media' and (select private.is_lb_staff()))
  with check (bucket_id = 'property-media' and (select private.is_lb_staff()));
create policy property_media_delete on storage.objects for delete to authenticated
  using (bucket_id = 'property-media' and (select private.is_lb_staff()));
