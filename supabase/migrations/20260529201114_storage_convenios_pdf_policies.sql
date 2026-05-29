-- RLS policies for storage.objects on bucket 'convenios-pdf'.
-- Files are organized as: convenios-pdf/<auth.uid()>/<filename>.pdf
-- Each authenticated user can only access their own folder.

create policy "convenios-pdf: users read own folder"
on storage.objects for select to authenticated
using (
  bucket_id = 'convenios-pdf'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "convenios-pdf: users insert own folder"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'convenios-pdf'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "convenios-pdf: users update own folder"
on storage.objects for update to authenticated
using (
  bucket_id = 'convenios-pdf'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "convenios-pdf: users delete own folder"
on storage.objects for delete to authenticated
using (
  bucket_id = 'convenios-pdf'
  and (storage.foldername(name))[1] = auth.uid()::text
);
