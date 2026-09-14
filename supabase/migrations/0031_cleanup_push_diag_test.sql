-- Remove the "Push Diag Test" throwaway account and manual test rows used
-- to isolate the client_diagnostics RLS/RETURNING issue.
delete from auth.users where id = '0a8ea3b8-4ee2-458e-be28-3daa17b72437';
delete from public.push_subscriptions where endpoint = 'test-endpoint-diag';
delete from public.client_diagnostics where context like 'manual_test%' or context like 'sql_test%' or context = 'owner_test';
