-- Temporary: repurpose the throwaway test account to worship_minister for
-- manual verification. Deleted right after testing.
update public.profiles set role = 'worship_minister' where phone = '2065550142';
