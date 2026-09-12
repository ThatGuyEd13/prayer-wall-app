-- Remove the "Notif Fix Test" throwaway account used to verify the
-- window.Notification shadowing fix, plus the diagnostic rows it produced.
delete from auth.users where id = '6adf5585-7a8f-47c2-bf48-b0460737f354';
delete from public.client_diagnostics where context in ('push_unsupported', 'push_upsert_error', 'push_exception');
