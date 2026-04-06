-- ============================================================
-- VEMO AUTOMATIONSZENTRALE — RLS Security Fix
-- ============================================================
-- PREREQUISITE: VEMA-15 (Supabase project creation) must be
-- completed before running this migration.
--
-- Purpose: Enforce Row-Level Security on all tables.
-- The Automationszentrale is a single-admin app — all tables
-- are restricted to service_role only.
-- Anon-key gets NO access to any table.
--
-- Run this in the Supabase SQL Editor after the project is set up.
-- ============================================================


-- ============================================================
-- connectors: encrypted API credentials storage
-- ============================================================
ALTER TABLE public.connectors ENABLE ROW LEVEL SECURITY;

-- Drop any overly-permissive policies first
DO $$ DECLARE pol RECORD; BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'connectors' AND schemaname = 'public' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.connectors', pol.policyname);
  END LOOP;
END $$;

-- Only service_role may read/write connector credentials
CREATE POLICY "Service role manages connectors" ON public.connectors
  FOR ALL TO service_role USING (true) WITH CHECK (true);


-- ============================================================
-- emails: fetched email messages
-- ============================================================
ALTER TABLE public.emails ENABLE ROW LEVEL SECURITY;

DO $$ DECLARE pol RECORD; BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'emails' AND schemaname = 'public' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.emails', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "Service role manages emails" ON public.emails
  FOR ALL TO service_role USING (true) WITH CHECK (true);


-- ============================================================
-- email_drafts: AI-generated email drafts
-- ============================================================
ALTER TABLE public.email_drafts ENABLE ROW LEVEL SECURITY;

DO $$ DECLARE pol RECORD; BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'email_drafts' AND schemaname = 'public' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.email_drafts', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "Service role manages email drafts" ON public.email_drafts
  FOR ALL TO service_role USING (true) WITH CHECK (true);


-- ============================================================
-- email_accounts: IMAP/SMTP account credentials
-- ============================================================
ALTER TABLE public.email_accounts ENABLE ROW LEVEL SECURITY;

DO $$ DECLARE pol RECORD; BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'email_accounts' AND schemaname = 'public' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.email_accounts', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "Service role manages email accounts" ON public.email_accounts
  FOR ALL TO service_role USING (true) WITH CHECK (true);


-- ============================================================
-- app_settings: application key-value config
-- ============================================================
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DO $$ DECLARE pol RECORD; BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'app_settings' AND schemaname = 'public' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.app_settings', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "Service role manages app settings" ON public.app_settings
  FOR ALL TO service_role USING (true) WITH CHECK (true);


-- ============================================================
-- instagram_posts: scheduled and published Instagram content
-- ============================================================
ALTER TABLE public.instagram_posts ENABLE ROW LEVEL SECURITY;

DO $$ DECLARE pol RECORD; BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'instagram_posts' AND schemaname = 'public' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.instagram_posts', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "Service role manages instagram posts" ON public.instagram_posts
  FOR ALL TO service_role USING (true) WITH CHECK (true);


-- ============================================================
-- VERIFICATION (uncomment to check)
-- ============================================================
-- SELECT schemaname, tablename, rowsecurity
-- FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;

-- SELECT schemaname, tablename, policyname, cmd, roles
-- FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename;
