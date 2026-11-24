-- When a file is deleted from Storage (bucket "files"), clear the matching document's attachment link.
create or replace function app.unlink_deleted_file() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if old.bucket_id = 'files' then
    update public.docs set file_path = null, file_name = null where file_path = old.name;
  end if;
  return old;
end $$;
revoke all on function app.unlink_deleted_file() from public, anon, authenticated;
drop trigger if exists retask_unlink_deleted_file on storage.objects;
create trigger retask_unlink_deleted_file after delete on storage.objects
  for each row execute function app.unlink_deleted_file();
