-- Removes the test broadcast notification sent to every real user during
-- worship_minister permission verification, and the throwaway test account.
delete from public.notifications where body = 'Test broadcast from worship minister role verification.';
delete from auth.users where id = '5436d777-6883-44dc-a234-09f2852ec249';
