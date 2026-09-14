-- Remove the "Cors Test" throwaway account used to verify the CORS fix on
-- broadcast-push, export-to-sheet, and google-oauth-connect.
delete from auth.users where email = 'phone5715559950@phone.prayerwall.local';
