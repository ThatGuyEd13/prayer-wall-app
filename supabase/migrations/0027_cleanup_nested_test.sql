-- Remove the "Nested Test" throwaway account used to verify the member
-- reaction bug and the pastors-only visibility change. Cascades to its
-- profile, prayer_log rows, and push_subscriptions.
delete from auth.users where id = '602f7e6f-a4fb-4951-95c4-97e476aab3d4';
