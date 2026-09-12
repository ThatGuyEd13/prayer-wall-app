-- Remove leftover test posts and test broadcast notices created while
-- verifying push notifications, so they stop cluttering the real feed.
delete from public.requests where id in (
  'd5050ce1-17c2-4028-901c-d9aec8725253', -- "TEST 2.0"
  '18a51bdb-21f1-4b76-9ec4-9c6b9864fb09', -- "TEST"
  '55a329a4-8076-46c3-a12e-35bab2587280'  -- "TESYwindow.NotificationT"
);
delete from public.notifications where title = 'Notice from Edward' and body in ('TEST', 'diagnostic test send', 'CORS verification test');
