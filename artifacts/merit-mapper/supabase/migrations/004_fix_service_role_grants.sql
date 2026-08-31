-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql
--
-- Fixes: 42501 "permission denied for table <name>" from the serverless
-- functions, seen on analytics_events and scholarship_feedback.
--
-- Why it happens: service_role bypasses RLS but NOT table-level GRANTs. It is
-- an ordinary Postgres role with BYPASSRLS, not a superuser. Supabase normally
-- grants new tables in `public` to anon/authenticated/service_role through
-- default privileges, but those only fire for objects created by the role that
-- owns the defaults -- so tables created by hand in the SQL editor can land
-- with no grants at all. RLS looks correctly configured and every server-side
-- call still 403s.
--
-- The serverless functions read these seven tables with the service role key:
--   analytics_events, contact_submissions, profiles, reported_links,
--   saved_scholarships, scholarships, scholarship_feedback
--
-- Nothing here touches anon or authenticated, so client-side access and every
-- RLS policy behave exactly as before. In particular the REVOKE on
-- analytics_events in migration 003 still stands -- it targets other roles.

GRANT USAGE ON SCHEMA public TO service_role;

GRANT ALL ON ALL TABLES    IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- The durable half. Without this, the next table created in the SQL editor
-- lands ungranted and the same 403 comes back.
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES    TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;

-- Verify: every row should list privileges, none should read (NONE).
--
--   select t.tablename,
--          coalesce(string_agg(g.privilege_type, ', ' order by g.privilege_type), '(NONE)')
--   from pg_tables t
--   left join information_schema.role_table_grants g
--          on g.table_name = t.tablename
--         and g.table_schema = t.schemaname
--         and g.grantee = 'service_role'
--   where t.schemaname = 'public'
--   group by t.tablename order by t.tablename;
