-- Remove the throwaway "Comment Test" account used to verify the comments
-- feature end-to-end. Cascades to its profile and the test comment it left
-- on a real member's post.
delete from auth.users where id = '7a77bd30-ff34-4a1b-844f-0a991b396a2e';
