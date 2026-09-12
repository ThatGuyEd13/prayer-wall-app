-- Removes the two accounts created during development/testing ("Test
-- Owner" and "Beverly Sample"), now that ownership has been transferred to
-- the real first user. Deleting from auth.users cascades to profiles,
-- requests, prayer_log, and notifications via foreign keys.
delete from auth.users where id in (
  '75b2b777-335d-43c4-bede-403827d38e45', -- Test Owner
  '298a199c-8783-42fb-893a-757428104e9c'  -- Beverly Sample
);
