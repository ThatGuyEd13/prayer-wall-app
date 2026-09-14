-- Temporary: set the throwaway test account to agricultural_minister for
-- manual verification. This account is deleted right after testing.
update public.profiles set role = 'agricultural_minister' where phone = '2065550142';
