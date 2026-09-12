-- Removes the disposable account created to verify the send-sms-code
-- Edge Function's phone-lookup + Twilio call path.
delete from auth.users where id = 'b9ef7f54-da6f-45f5-8518-d673bf2ed073';
