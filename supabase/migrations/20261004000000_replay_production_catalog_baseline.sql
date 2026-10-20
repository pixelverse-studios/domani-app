-- REPLAY ONLY: align the historical empty replay with the schema-only
-- production catalog captured 2026-10-20, before additive rollout migrations.
-- Created with `supabase migration new replay_production_catalog_baseline`
-- as 20261020133232, then positioned at 20261004000000 because this is a
-- replay shim, excluded from the production migration workspace, not a new
-- production migration. No production-applied historical file is modified.
-- All SQL below is catalog DDL; no production customer records are included.
-- The public.users marker exists only in the original empty-database replay.
DO $replay_baseline$
BEGIN
  IF pg_catalog.to_regclass('public.users') IS NULL THEN RETURN; END IF;
  PERFORM pg_catalog.set_config('search_path', 'public, extensions, pg_catalog', true);
  EXECUTE $baseline_ddl$
ALTER TABLE "public"."campaign_recipients" DROP CONSTRAINT "campaign_recipients_campaign_id_email_key";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
ALTER TABLE "public"."campaign_recipients" DROP CONSTRAINT "campaign_recipients_recipient_id_fkey";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
ALTER TABLE "public"."email_campaigns" DROP CONSTRAINT "email_campaigns_created_by_fkey";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
ALTER TABLE "public"."email_campaigns" DROP CONSTRAINT "email_campaigns_template_id_fkey";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
ALTER TABLE "public"."email_templates" DROP CONSTRAINT "email_templates_created_by_fkey";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
ALTER TABLE "public"."email_unsubscribes" DROP CONSTRAINT "email_unsubscribes_campaign_id_fkey";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
ALTER TABLE "public"."email_unsubscribes" DROP CONSTRAINT "email_unsubscribes_email_key";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
ALTER TABLE "public"."tasks" DROP CONSTRAINT "tasks_category_id_fkey";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
ALTER TABLE "public"."tasks" DROP CONSTRAINT "tasks_system_category_id_fkey";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
DROP INDEX IF EXISTS "public"."idx_tasks_category_id";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
DROP INDEX IF EXISTS "public"."idx_tasks_completed";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
ALTER TABLE "public"."campaign_recipients" ALTER COLUMN "bounce_type" TYPE character varying(50);
$baseline_ddl$;
  EXECUTE $baseline_ddl$
ALTER TABLE "public"."campaign_recipients" ALTER COLUMN "email" TYPE character varying(255);
$baseline_ddl$;
  EXECUTE $baseline_ddl$
ALTER TABLE "public"."campaign_recipients" ALTER COLUMN "first_name" TYPE character varying(255);
$baseline_ddl$;
  EXECUTE $baseline_ddl$
ALTER TABLE "public"."campaign_recipients" ALTER COLUMN "last_name" TYPE character varying(255);
$baseline_ddl$;
  EXECUTE $baseline_ddl$
ALTER TABLE "public"."campaign_recipients" ALTER COLUMN "provider_id" TYPE character varying(255);
$baseline_ddl$;
  EXECUTE $baseline_ddl$
ALTER TABLE "public"."campaign_recipients" ALTER COLUMN "status" TYPE character varying(50);
$baseline_ddl$;
  EXECUTE $baseline_ddl$
ALTER TABLE "public"."email_campaigns" ALTER COLUMN "from_email" TYPE character varying(255);
$baseline_ddl$;
  EXECUTE $baseline_ddl$
ALTER TABLE "public"."email_campaigns" ALTER COLUMN "from_name" TYPE character varying(255);
$baseline_ddl$;
  EXECUTE $baseline_ddl$
ALTER TABLE "public"."email_campaigns" ALTER COLUMN "name" TYPE character varying(255);
$baseline_ddl$;
  EXECUTE $baseline_ddl$
ALTER TABLE "public"."email_campaigns" ALTER COLUMN "preview_text" TYPE character varying(255);
$baseline_ddl$;
  EXECUTE $baseline_ddl$
ALTER TABLE "public"."email_campaigns" ALTER COLUMN "reply_to_email" TYPE character varying(255);
$baseline_ddl$;
  EXECUTE $baseline_ddl$
ALTER TABLE "public"."email_campaigns" ALTER COLUMN "status" TYPE character varying(50);
$baseline_ddl$;
  EXECUTE $baseline_ddl$
ALTER TABLE "public"."email_campaigns" ALTER COLUMN "subject" TYPE character varying(500);
$baseline_ddl$;
  EXECUTE $baseline_ddl$
ALTER TABLE "public"."email_campaigns" ALTER COLUMN "type" TYPE character varying(50);
$baseline_ddl$;
  EXECUTE $baseline_ddl$
ALTER TABLE "public"."email_templates" ALTER COLUMN "category" TYPE character varying(100);
$baseline_ddl$;
  EXECUTE $baseline_ddl$
ALTER TABLE "public"."email_templates" ALTER COLUMN "from_email" TYPE character varying(255);
$baseline_ddl$;
  EXECUTE $baseline_ddl$
ALTER TABLE "public"."email_templates" ALTER COLUMN "from_name" TYPE character varying(255);
$baseline_ddl$;
  EXECUTE $baseline_ddl$
ALTER TABLE "public"."email_templates" ALTER COLUMN "name" TYPE character varying(255);
$baseline_ddl$;
  EXECUTE $baseline_ddl$
ALTER TABLE "public"."email_templates" ALTER COLUMN "preview_text" TYPE character varying(255);
$baseline_ddl$;
  EXECUTE $baseline_ddl$
ALTER TABLE "public"."email_templates" ALTER COLUMN "reply_to_email" TYPE character varying(255);
$baseline_ddl$;
  EXECUTE $baseline_ddl$
ALTER TABLE "public"."email_templates" ALTER COLUMN "subject" TYPE character varying(500);
$baseline_ddl$;
  EXECUTE $baseline_ddl$
ALTER TABLE "public"."email_unsubscribes" ALTER COLUMN "email" TYPE character varying(255);
$baseline_ddl$;
  EXECUTE $baseline_ddl$
ALTER TABLE "public"."email_unsubscribes" ALTER COLUMN "reason" TYPE character varying(255);
$baseline_ddl$;
  EXECUTE $baseline_ddl$
ALTER TABLE "public"."profiles" ALTER COLUMN "timezone" DROP DEFAULT;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
ALTER TABLE "public"."profiles" ADD COLUMN "tutorial_completed_at" timestamp with time zone;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
ALTER TABLE "public"."system_categories" DROP COLUMN "updated_at";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
ALTER TABLE "public"."task_time_blocks" DROP COLUMN "duration_minutes";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
ALTER TABLE "public"."task_time_blocks" ADD COLUMN "duration_minutes" integer GENERATED ALWAYS AS ((EXTRACT(epoch FROM (end_time - start_time)) / (60)::numeric)) STORED;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
ALTER TABLE "public"."task_time_blocks" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4();
$baseline_ddl$;
  EXECUTE $baseline_ddl$
ALTER TABLE "public"."tasks" DROP COLUMN "category_id";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
ALTER TABLE "public"."tasks" ALTER COLUMN "created_at" SET NOT NULL;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
ALTER TABLE "public"."tasks" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4();
$baseline_ddl$;
  EXECUTE $baseline_ddl$
ALTER TABLE "public"."tasks" ALTER COLUMN "is_mit" SET NOT NULL;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
ALTER TABLE "public"."tasks" ALTER COLUMN "position" SET NOT NULL;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
ALTER TABLE "public"."tasks" ALTER COLUMN "title" TYPE text;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
ALTER TABLE "public"."tasks" ALTER COLUMN "updated_at" SET NOT NULL;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
ALTER TABLE "public"."waitlist" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
ALTER TABLE "public"."waitlist" ALTER COLUMN "email" TYPE character varying(255);
$baseline_ddl$;
  EXECUTE $baseline_ddl$
ALTER TABLE "public"."waitlist" ALTER COLUMN "name" TYPE character varying(100);
$baseline_ddl$;
  EXECUTE $baseline_ddl$
ALTER TABLE "public"."waitlist" ALTER COLUMN "referral_type" TYPE character varying(50);
$baseline_ddl$;
  EXECUTE $baseline_ddl$
ALTER TABLE "public"."waitlist" ALTER COLUMN "status" TYPE character varying(20);
$baseline_ddl$;
  EXECUTE $baseline_ddl$
DROP TABLE "public"."categories" CASCADE;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
DROP TABLE "public"."users" CASCADE;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    DELETE FROM admin_sessions
    WHERE expires_at < NOW()
    OR invalidated_at IS NOT NULL AND invalidated_at < NOW() - INTERVAL '7 days';
END;
$function$
;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
CREATE OR REPLACE FUNCTION public.delete_expired_accounts()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  expired_user_ids UUID[];
BEGIN
  SELECT ARRAY_AGG(id) INTO expired_user_ids
  FROM profiles
  WHERE deletion_scheduled_for IS NOT NULL
    AND deletion_scheduled_for < NOW();

  IF expired_user_ids IS NOT NULL THEN
    DELETE FROM auth.users
    WHERE id = ANY(expired_user_ids);
  END IF;
END;
$function$
;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
CREATE OR REPLACE FUNCTION public.delete_user_by_email(target_email text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  target_user_id UUID;
  user_name TEXT;
BEGIN
  -- Get the user ID
  SELECT id INTO target_user_id FROM auth.users WHERE email = target_email;

  IF target_user_id IS NULL THEN
    RETURN 'User not found: ' || target_email;
  END IF;

  -- Get name for confirmation message
  SELECT full_name INTO user_name FROM public.profiles WHERE id = target_user_id;

  -- Delete from profiles (cascades to plans, tasks, categories, feedback, etc.)
  DELETE FROM public.profiles WHERE id = target_user_id;
  
  -- Delete from auth.users
  DELETE FROM auth.users WHERE id = target_user_id;

  RETURN 'Deleted user: ' || target_email || ' (' || COALESCE(user_name, 'no name') || ')';
END;
$function$
;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
CREATE OR REPLACE FUNCTION public.get_user_role_level(p_user_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_role admin_role;
  v_level INTEGER;
BEGIN
  -- Get user's role
  SELECT role INTO v_role
  FROM admin_users
  WHERE user_id = p_user_id AND is_active = true;

  -- Get role level
  SELECT level INTO v_level
  FROM admin_roles
  WHERE name = v_role::TEXT;

  RETURN COALESCE(v_level, 0);
END;
$function$
;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
CREATE OR REPLACE FUNCTION public.has_permission(p_user_id uuid, p_resource text, p_action admin_action)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_role admin_role;
  v_has_permission BOOLEAN;
BEGIN
  -- Get user's role
  SELECT role INTO v_role
  FROM admin_users
  WHERE user_id = p_user_id AND is_active = true;

  -- Check if user has permission
  SELECT EXISTS (
    SELECT 1
    FROM admin_permissions
    WHERE role = v_role
      AND (resource = p_resource OR resource = '*')
      AND action = p_action
  ) INTO v_has_permission;

  RETURN COALESCE(v_has_permission, false);
END;
$function$
;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
CREATE OR REPLACE FUNCTION public.is_beta_phase()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
      SELECT EXISTS (
          SELECT 1 FROM public.app_config
          WHERE key = 'phase'
          AND (value->>'current') IN ('closed_beta', 'open_beta')
      );
  $function$
;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
CREATE OR REPLACE FUNCTION public.is_email_subscribed(p_email character varying)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM email_unsubscribes
    WHERE email = p_email
    AND resubscribed_at IS NULL
  );
END;
$function$
;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
CREATE OR REPLACE FUNCTION public.log_audit_event(p_user_id uuid, p_action audit_action, p_resource_type text, p_resource_id text DEFAULT NULL::text, p_description text DEFAULT NULL::text, p_old_values jsonb DEFAULT NULL::jsonb, p_new_values jsonb DEFAULT NULL::jsonb, p_metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_admin_user_id UUID;
  v_audit_id UUID;
BEGIN
  -- Get admin user id
  SELECT id INTO v_admin_user_id
  FROM admin_users
  WHERE user_id = p_user_id;

  -- Insert audit log entry
  INSERT INTO admin_audit_log (
    user_id,
    admin_user_id,
    action,
    resource_type,
    resource_id,
    description,
    old_values,
    new_values,
    metadata
  ) VALUES (
    p_user_id,
    v_admin_user_id,
    p_action,
    p_resource_type,
    p_resource_id,
    p_description,
    p_old_values,
    p_new_values,
    p_metadata
  ) RETURNING id INTO v_audit_id;

  RETURN v_audit_id;
END;
$function$
;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
CREATE OR REPLACE FUNCTION public.sync_auth_user_to_profile(p_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  DECLARE
      v_auth_user RECORD;
  BEGIN
      SELECT * INTO v_auth_user FROM auth.users WHERE id = p_user_id;

      IF NOT FOUND THEN
          RAISE WARNING 'Auth user % not found', p_user_id;
          RETURN FALSE;
      END IF;

      IF EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id) THEN
          RAISE NOTICE 'Profile already exists for user %', p_user_id;
          RETURN TRUE;
      END IF;

      DECLARE
          v_full_name TEXT;
          v_given_name TEXT;
          v_family_name TEXT;
      BEGIN
          v_full_name := v_auth_user.raw_user_meta_data->>'full_name';

          IF v_full_name IS NULL OR v_full_name = '' THEN
              v_full_name := v_auth_user.raw_user_meta_data->>'name';
          END IF;

          IF v_full_name IS NULL OR v_full_name = '' THEN
              v_given_name := v_auth_user.raw_user_meta_data->'full_name'->>'givenName';
              v_family_name := v_auth_user.raw_user_meta_data->'full_name'->>'familyName';

              IF v_given_name IS NOT NULL OR v_family_name IS NOT NULL THEN
                  v_full_name := TRIM(COALESCE(v_given_name, '') || ' ' || COALESCE(v_family_name, ''));
              END IF;
          END IF;

          IF v_full_name IS NULL OR v_full_name = '' THEN
              v_full_name := SPLIT_PART(v_auth_user.email, '@', 1);
          END IF;

          INSERT INTO public.profiles (id, email, full_name)
          VALUES (p_user_id, v_auth_user.email, v_full_name);

          -- No longer creating categories per user - they use system_categories

          RETURN TRUE;
      END;
  END;
  $function$
;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
CREATE OR REPLACE FUNCTION public.update_campaign_metrics(p_campaign_id uuid)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
  UPDATE email_campaigns
  SET
    metrics = jsonb_build_object(
      'total_sent', (SELECT COUNT(*) FROM campaign_recipients WHERE campaign_id = p_campaign_id AND status != 'pending'),
      'delivered', (SELECT COUNT(*) FROM campaign_recipients WHERE campaign_id = p_campaign_id AND status = 'delivered'),
      'opened', (SELECT COUNT(*) FROM campaign_recipients WHERE campaign_id = p_campaign_id AND opened_at IS NOT NULL),
      'clicked', (SELECT COUNT(*) FROM campaign_recipients WHERE campaign_id = p_campaign_id AND clicked_at IS NOT NULL),
      'bounced', (SELECT COUNT(*) FROM campaign_recipients WHERE campaign_id = p_campaign_id AND status = 'bounced'),
      'unsubscribed', (SELECT COUNT(*) FROM campaign_recipients WHERE campaign_id = p_campaign_id AND unsubscribed_at IS NOT NULL)
    ),
    updated_at = NOW()
  WHERE id = p_campaign_id;
END;
$function$
;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
CREATE OR REPLACE FUNCTION public.update_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$
;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
ALTER TABLE "public"."admin_audit_log" ADD CONSTRAINT "admin_audit_log_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
ALTER TABLE "public"."campaign_recipients" ADD CONSTRAINT "campaign_recipients_recipient_id_fkey" FOREIGN KEY (recipient_id) REFERENCES waitlist(id);
$baseline_ddl$;
  EXECUTE $baseline_ddl$
ALTER TABLE "public"."campaign_recipients" ADD CONSTRAINT "valid_bounce_type" CHECK (bounce_type::text = ANY (ARRAY['hard'::character varying, 'soft'::character varying, 'blocked'::character varying, 'complaint'::character varying, 'other'::character varying]::text[]));
$baseline_ddl$;
  EXECUTE $baseline_ddl$
ALTER TABLE "public"."campaign_recipients" ADD CONSTRAINT "valid_recipient_status" CHECK (status::text = ANY (ARRAY['pending'::character varying, 'queued'::character varying, 'sent'::character varying, 'delivered'::character varying, 'opened'::character varying, 'clicked'::character varying, 'bounced'::character varying, 'failed'::character varying, 'unsubscribed'::character varying]::text[]));
$baseline_ddl$;
  EXECUTE $baseline_ddl$
ALTER TABLE "public"."email_campaigns" ADD CONSTRAINT "email_campaigns_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id);
$baseline_ddl$;
  EXECUTE $baseline_ddl$
ALTER TABLE "public"."email_campaigns" ADD CONSTRAINT "email_campaigns_template_id_fkey" FOREIGN KEY (template_id) REFERENCES email_templates(id);
$baseline_ddl$;
  EXECUTE $baseline_ddl$
ALTER TABLE "public"."email_campaigns" ADD CONSTRAINT "valid_status" CHECK (status::text = ANY (ARRAY['draft'::character varying, 'scheduled'::character varying, 'sending'::character varying, 'sent'::character varying, 'cancelled'::character varying, 'failed'::character varying]::text[]));
$baseline_ddl$;
  EXECUTE $baseline_ddl$
ALTER TABLE "public"."email_campaigns" ADD CONSTRAINT "valid_type" CHECK (type::text = ANY (ARRAY['manual'::character varying, 'automated'::character varying, 'triggered'::character varying, 'test'::character varying]::text[]));
$baseline_ddl$;
  EXECUTE $baseline_ddl$
ALTER TABLE "public"."email_templates" ADD CONSTRAINT "email_templates_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id);
$baseline_ddl$;
  EXECUTE $baseline_ddl$
ALTER TABLE "public"."email_templates" ADD CONSTRAINT "valid_category" CHECK (category::text = ANY (ARRAY['welcome'::character varying, 'newsletter'::character varying, 'promotion'::character varying, 'transactional'::character varying, 'notification'::character varying, 'other'::character varying]::text[]));
$baseline_ddl$;
  EXECUTE $baseline_ddl$
ALTER TABLE "public"."email_unsubscribes" ADD CONSTRAINT "email_unsubscribes_campaign_id_fkey" FOREIGN KEY (campaign_id) REFERENCES email_campaigns(id);
$baseline_ddl$;
  EXECUTE $baseline_ddl$
ALTER TABLE "public"."email_unsubscribes" ADD CONSTRAINT "unique_email_unsubscribe" UNIQUE (email);
$baseline_ddl$;
  EXECUTE $baseline_ddl$
ALTER TABLE "public"."profiles" ADD CONSTRAINT "valid_email" CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'::text);
$baseline_ddl$;
  EXECUTE $baseline_ddl$
ALTER TABLE "public"."task_time_blocks" ADD CONSTRAINT "valid_time_range" CHECK (end_time > start_time);
$baseline_ddl$;
  EXECUTE $baseline_ddl$
ALTER TABLE "public"."tasks" ADD CONSTRAINT "tasks_one_category_check" CHECK (system_category_id IS NOT NULL AND user_category_id IS NULL OR system_category_id IS NULL AND user_category_id IS NOT NULL OR system_category_id IS NULL AND user_category_id IS NULL);
$baseline_ddl$;
  EXECUTE $baseline_ddl$
ALTER TABLE "public"."tasks" ADD CONSTRAINT "tasks_system_category_id_fkey" FOREIGN KEY (system_category_id) REFERENCES system_categories(id);
$baseline_ddl$;
  EXECUTE $baseline_ddl$
ALTER TABLE "public"."tasks" ADD CONSTRAINT "title_not_empty" CHECK (length(TRIM(BOTH FROM title)) > 0);
$baseline_ddl$;
  EXECUTE $baseline_ddl$
ALTER TABLE "public"."waitlist" ADD CONSTRAINT "waitlist_referral_type_check" CHECK (referral_type::text = ANY (ARRAY['website'::character varying, 'early_adopter'::character varying, 'friends_family'::character varying, 'beta_tester'::character varying, 'vip'::character varying, 'partner'::character varying, 'influencer'::character varying, 'employee'::character varying, 'investor'::character varying, 'press'::character varying, 'other'::character varying]::text[]));
$baseline_ddl$;
  EXECUTE $baseline_ddl$
ALTER TABLE "public"."waitlist" ADD CONSTRAINT "waitlist_status_check" CHECK (status::text = ANY (ARRAY['pending'::character varying, 'invited'::character varying, 'confirmed'::character varying, 'registered'::character varying, 'unsubscribed'::character varying]::text[]));
$baseline_ddl$;
  EXECUTE $baseline_ddl$
CREATE INDEX idx_admin_audit_log_action ON public.admin_audit_log USING btree (action);
$baseline_ddl$;
  EXECUTE $baseline_ddl$
CREATE INDEX idx_admin_audit_log_admin_user_id ON public.admin_audit_log USING btree (admin_user_id);
$baseline_ddl$;
  EXECUTE $baseline_ddl$
CREATE INDEX idx_admin_audit_log_created_at ON public.admin_audit_log USING btree (created_at DESC);
$baseline_ddl$;
  EXECUTE $baseline_ddl$
CREATE INDEX idx_admin_audit_log_resource_type ON public.admin_audit_log USING btree (resource_type);
$baseline_ddl$;
  EXECUTE $baseline_ddl$
CREATE INDEX idx_admin_audit_log_session_id ON public.admin_audit_log USING btree (session_id);
$baseline_ddl$;
  EXECUTE $baseline_ddl$
CREATE INDEX idx_admin_audit_log_user_id ON public.admin_audit_log USING btree (user_id);
$baseline_ddl$;
  EXECUTE $baseline_ddl$
CREATE INDEX idx_audit_log_user_created ON public.admin_audit_log USING btree (user_id, created_at DESC);
$baseline_ddl$;
  EXECUTE $baseline_ddl$
CREATE INDEX idx_admin_sessions_admin_user_id ON public.admin_sessions USING btree (admin_user_id);
$baseline_ddl$;
  EXECUTE $baseline_ddl$
CREATE INDEX idx_admin_sessions_expires_at ON public.admin_sessions USING btree (expires_at);
$baseline_ddl$;
  EXECUTE $baseline_ddl$
CREATE INDEX idx_admin_sessions_invalidated_at ON public.admin_sessions USING btree (invalidated_at);
$baseline_ddl$;
  EXECUTE $baseline_ddl$
CREATE INDEX idx_admin_sessions_token_hash ON public.admin_sessions USING btree (token_hash);
$baseline_ddl$;
  EXECUTE $baseline_ddl$
CREATE INDEX idx_campaign_recipients_campaign ON public.campaign_recipients USING btree (campaign_id);
$baseline_ddl$;
  EXECUTE $baseline_ddl$
CREATE INDEX idx_campaign_recipients_email ON public.campaign_recipients USING btree (email);
$baseline_ddl$;
  EXECUTE $baseline_ddl$
CREATE INDEX idx_campaign_recipients_recipient ON public.campaign_recipients USING btree (recipient_id);
$baseline_ddl$;
  EXECUTE $baseline_ddl$
CREATE INDEX idx_campaign_recipients_sent_at ON public.campaign_recipients USING btree (sent_at DESC);
$baseline_ddl$;
  EXECUTE $baseline_ddl$
CREATE INDEX idx_campaign_recipients_status ON public.campaign_recipients USING btree (status);
$baseline_ddl$;
  EXECUTE $baseline_ddl$
CREATE UNIQUE INDEX idx_campaign_recipients_unique ON public.campaign_recipients USING btree (campaign_id, email);
$baseline_ddl$;
  EXECUTE $baseline_ddl$
CREATE INDEX idx_email_campaigns_created_at ON public.email_campaigns USING btree (created_at DESC);
$baseline_ddl$;
  EXECUTE $baseline_ddl$
CREATE INDEX idx_email_campaigns_scheduled ON public.email_campaigns USING btree (scheduled_at) WHERE (((status)::text = 'scheduled'::text) AND (deleted_at IS NULL));
$baseline_ddl$;
  EXECUTE $baseline_ddl$
CREATE INDEX idx_email_campaigns_status ON public.email_campaigns USING btree (status) WHERE (deleted_at IS NULL);
$baseline_ddl$;
  EXECUTE $baseline_ddl$
CREATE INDEX idx_email_campaigns_template ON public.email_campaigns USING btree (template_id);
$baseline_ddl$;
  EXECUTE $baseline_ddl$
CREATE INDEX idx_email_templates_active ON public.email_templates USING btree (is_active) WHERE (deleted_at IS NULL);
$baseline_ddl$;
  EXECUTE $baseline_ddl$
CREATE INDEX idx_email_templates_category ON public.email_templates USING btree (category) WHERE (deleted_at IS NULL);
$baseline_ddl$;
  EXECUTE $baseline_ddl$
CREATE INDEX idx_email_templates_created_at ON public.email_templates USING btree (created_at DESC);
$baseline_ddl$;
  EXECUTE $baseline_ddl$
CREATE INDEX idx_email_unsubscribes_email ON public.email_unsubscribes USING btree (email) WHERE (resubscribed_at IS NULL);
$baseline_ddl$;
  EXECUTE $baseline_ddl$
CREATE INDEX idx_user_categories_user_id ON public.user_categories USING btree (user_id);
$baseline_ddl$;
  EXECUTE $baseline_ddl$
CREATE INDEX idx_waitlist_created_at ON public.waitlist USING btree (created_at DESC);
$baseline_ddl$;
  EXECUTE $baseline_ddl$
CREATE INDEX idx_waitlist_email ON public.waitlist USING btree (email);
$baseline_ddl$;
  EXECUTE $baseline_ddl$
CREATE INDEX idx_waitlist_invited_at ON public.waitlist USING btree (invited_at) WHERE (invited_at IS NOT NULL);
$baseline_ddl$;
  EXECUTE $baseline_ddl$
CREATE INDEX idx_waitlist_referral_type ON public.waitlist USING btree (referral_type);
$baseline_ddl$;
  EXECUTE $baseline_ddl$
CREATE INDEX idx_waitlist_status ON public.waitlist USING btree (status);
$baseline_ddl$;
  EXECUTE $baseline_ddl$
CREATE TRIGGER update_campaign_recipients_updated_at BEFORE UPDATE ON campaign_recipients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
$baseline_ddl$;
  EXECUTE $baseline_ddl$
CREATE TRIGGER update_email_campaigns_updated_at BEFORE UPDATE ON email_campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
$baseline_ddl$;
  EXECUTE $baseline_ddl$
CREATE TRIGGER update_email_templates_updated_at BEFORE UPDATE ON email_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
$baseline_ddl$;
  EXECUTE $baseline_ddl$
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
$baseline_ddl$;
  EXECUTE $baseline_ddl$
CREATE POLICY "System can insert audit logs" ON "public"."admin_audit_log" AS PERMISSIVE FOR INSERT TO PUBLIC WITH CHECK (true);
$baseline_ddl$;
  EXECUTE $baseline_ddl$
CREATE POLICY "Public can unsubscribe" ON "public"."email_unsubscribes" AS PERMISSIVE FOR INSERT TO "anon", "authenticated" WITH CHECK (true);
$baseline_ddl$;
  EXECUTE $baseline_ddl$
CREATE POLICY "Enable insert for all users" ON "public"."waitlist" AS PERMISSIVE FOR INSERT TO PUBLIC WITH CHECK (true);
$baseline_ddl$;
  EXECUTE $baseline_ddl$
CREATE POLICY "Enable read access for authenticated users" ON "public"."waitlist" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);
$baseline_ddl$;
  EXECUTE $baseline_ddl$
REVOKE ALL ON TABLE "public"."admin_audit_log" FROM PUBLIC, anon, authenticated, service_role;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE "public"."admin_audit_log" TO "anon";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE "public"."admin_audit_log" TO "authenticated";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE "public"."admin_audit_log" TO "service_role";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
REVOKE ALL ON TABLE "public"."admin_sessions" FROM PUBLIC, anon, authenticated, service_role;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE "public"."admin_sessions" TO "anon";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE "public"."admin_sessions" TO "authenticated";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE "public"."admin_sessions" TO "service_role";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
REVOKE ALL ON TABLE "public"."app_config" FROM PUBLIC, anon, authenticated, service_role;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE "public"."app_config" TO "anon";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE "public"."app_config" TO "authenticated";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE "public"."app_config" TO "service_role";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
REVOKE ALL ON TABLE "public"."beta_feedback" FROM PUBLIC, anon, authenticated, service_role;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE "public"."beta_feedback" TO "anon";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE "public"."beta_feedback" TO "authenticated";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE "public"."beta_feedback" TO "service_role";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
REVOKE ALL ON TABLE "public"."campaign_recipients" FROM PUBLIC, anon, authenticated, service_role;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE "public"."campaign_recipients" TO "anon";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE "public"."campaign_recipients" TO "authenticated";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE "public"."campaign_recipients" TO "service_role";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
REVOKE ALL ON TABLE "public"."dashboard_domani_feedback" FROM PUBLIC, anon, authenticated, service_role;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE "public"."dashboard_domani_feedback" TO "service_role";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
REVOKE ALL ON TABLE "public"."dashboard_domani_user_devices" FROM PUBLIC, anon, authenticated, service_role;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE "public"."dashboard_domani_user_devices" TO "service_role";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
REVOKE ALL ON TABLE "public"."dashboard_domani_user_insights" FROM PUBLIC, anon, authenticated, service_role;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE "public"."dashboard_domani_user_insights" TO "service_role";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
REVOKE ALL ON TABLE "public"."domani_feedback_conversations" FROM PUBLIC, anon, authenticated, service_role;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE "public"."domani_feedback_conversations" TO "service_role";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
REVOKE ALL ON TABLE "public"."domani_feedback_delivery_events" FROM PUBLIC, anon, authenticated, service_role;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE "public"."domani_feedback_delivery_events" TO "service_role";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
REVOKE ALL ON TABLE "public"."domani_feedback_inbound_receipts" FROM PUBLIC, anon, authenticated, service_role;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE "public"."domani_feedback_inbound_receipts" TO "service_role";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
REVOKE ALL ON TABLE "public"."domani_feedback_message_audit" FROM PUBLIC, anon, authenticated, service_role;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE "public"."domani_feedback_message_audit" TO "service_role";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
REVOKE ALL ON TABLE "public"."domani_feedback_messages" FROM PUBLIC, anon, authenticated, service_role;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE "public"."domani_feedback_messages" TO "service_role";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
REVOKE ALL ON TABLE "public"."domani_feedback_outbox" FROM PUBLIC, anon, authenticated, service_role;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE "public"."domani_feedback_outbox" TO "service_role";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
REVOKE ALL ON TABLE "public"."domani_feedback_read_cursors" FROM PUBLIC, anon, authenticated, service_role;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE "public"."domani_feedback_read_cursors" TO "service_role";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
REVOKE ALL ON TABLE "public"."domani_feedback_reply_routes" FROM PUBLIC, anon, authenticated, service_role;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE "public"."domani_feedback_reply_routes" TO "service_role";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
REVOKE ALL ON TABLE "public"."domani_feedback_status_audit" FROM PUBLIC, anon, authenticated, service_role;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE "public"."domani_feedback_status_audit" TO "service_role";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
REVOKE ALL ON TABLE "public"."email_campaigns" FROM PUBLIC, anon, authenticated, service_role;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE "public"."email_campaigns" TO "anon";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE "public"."email_campaigns" TO "authenticated";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE "public"."email_campaigns" TO "service_role";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
REVOKE ALL ON TABLE "public"."email_templates" FROM PUBLIC, anon, authenticated, service_role;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE "public"."email_templates" TO "anon";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE "public"."email_templates" TO "authenticated";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE "public"."email_templates" TO "service_role";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
REVOKE ALL ON TABLE "public"."email_unsubscribes" FROM PUBLIC, anon, authenticated, service_role;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE "public"."email_unsubscribes" TO "anon";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE "public"."email_unsubscribes" TO "authenticated";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE "public"."email_unsubscribes" TO "service_role";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
REVOKE ALL ON TABLE "public"."meta_app_event_claims" FROM PUBLIC, anon, authenticated, service_role;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE "public"."meta_app_event_claims" TO "service_role";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
REVOKE ALL ON TABLE "public"."posthog_trial_event_deliveries" FROM PUBLIC, anon, authenticated, service_role;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE "public"."posthog_trial_event_deliveries" TO "service_role";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
REVOKE ALL ON TABLE "public"."profiles" FROM PUBLIC, anon, authenticated, service_role;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE "public"."profiles" TO "anon";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE "public"."profiles" TO "authenticated";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE "public"."profiles" TO "service_role";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
REVOKE ALL ON TABLE "public"."profiles_dashboard" FROM PUBLIC, anon, authenticated, service_role;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE "public"."profiles_dashboard" TO "service_role";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
REVOKE ALL ON TABLE "public"."purchase_refund_states" FROM PUBLIC, anon, authenticated, service_role;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE "public"."purchase_refund_states" TO "anon";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE "public"."purchase_refund_states" TO "authenticated";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE "public"."purchase_refund_states" TO "service_role";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
REVOKE ALL ON TABLE "public"."release_audit_events" FROM PUBLIC, anon, authenticated, service_role;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE "public"."release_audit_events" TO "service_role";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
REVOKE ALL ON TABLE "public"."release_cache_invalidation_jobs" FROM PUBLIC, anon, authenticated, service_role;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE "public"."release_cache_invalidation_jobs" TO "service_role";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
REVOKE ALL ON TABLE "public"."release_conversion_runs" FROM PUBLIC, anon, authenticated, service_role;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE "public"."release_conversion_runs" TO "service_role";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
REVOKE ALL ON TABLE "public"."release_notes" FROM PUBLIC, anon, authenticated, service_role;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE "public"."release_notes" TO "service_role";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
REVOKE ALL ON TABLE "public"."release_prds" FROM PUBLIC, anon, authenticated, service_role;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE "public"."release_prds" TO "service_role";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
REVOKE ALL ON TABLE "public"."releases" FROM PUBLIC, anon, authenticated, service_role;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE "public"."releases" TO "service_role";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
REVOKE ALL ON TABLE "public"."revenuecat_webhook_events" FROM PUBLIC, anon, authenticated, service_role;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE "public"."revenuecat_webhook_events" TO "anon";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE "public"."revenuecat_webhook_events" TO "authenticated";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE "public"."revenuecat_webhook_events" TO "service_role";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
REVOKE ALL ON TABLE "public"."support_requests" FROM PUBLIC, anon, authenticated, service_role;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE "public"."support_requests" TO "anon";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE "public"."support_requests" TO "authenticated";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE "public"."support_requests" TO "service_role";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
REVOKE ALL ON TABLE "public"."system_categories" FROM PUBLIC, anon, authenticated, service_role;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE "public"."system_categories" TO "anon";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE "public"."system_categories" TO "authenticated";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE "public"."system_categories" TO "service_role";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
REVOKE ALL ON TABLE "public"."task_time_blocks" FROM PUBLIC, anon, authenticated, service_role;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE "public"."task_time_blocks" TO "anon";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE "public"."task_time_blocks" TO "authenticated";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE "public"."task_time_blocks" TO "service_role";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
REVOKE ALL ON TABLE "public"."tasks" FROM PUBLIC, anon, authenticated, service_role;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE "public"."tasks" TO "anon";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE "public"."tasks" TO "authenticated";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE "public"."tasks" TO "service_role";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
REVOKE ALL ON TABLE "public"."user_categories" FROM PUBLIC, anon, authenticated, service_role;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE "public"."user_categories" TO "anon";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE "public"."user_categories" TO "authenticated";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE "public"."user_categories" TO "service_role";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
REVOKE ALL ON TABLE "public"."user_category_preferences" FROM PUBLIC, anon, authenticated, service_role;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE "public"."user_category_preferences" TO "anon";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE "public"."user_category_preferences" TO "authenticated";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE "public"."user_category_preferences" TO "service_role";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
REVOKE ALL ON TABLE "public"."waitlist" FROM PUBLIC, anon, authenticated, service_role;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE "public"."waitlist" TO "anon";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE "public"."waitlist" TO "authenticated";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE "public"."waitlist" TO "service_role";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
REVOKE ALL ON FUNCTION "public"."authorize_meta_app_event_dispatch"(p_user_id uuid, p_event_key text, p_claim_token uuid) FROM PUBLIC, anon, authenticated, service_role;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."authorize_meta_app_event_dispatch"(p_user_id uuid, p_event_key text, p_claim_token uuid) TO "authenticated";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."authorize_meta_app_event_dispatch"(p_user_id uuid, p_event_key text, p_claim_token uuid) TO "service_role";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
REVOKE ALL ON FUNCTION "public"."cancel_account_deletion"(p_user_id uuid) FROM PUBLIC, anon, authenticated, service_role;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."cancel_account_deletion"(p_user_id uuid) TO PUBLIC;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."cancel_account_deletion"(p_user_id uuid) TO "anon";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."cancel_account_deletion"(p_user_id uuid) TO "authenticated";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."cancel_account_deletion"(p_user_id uuid) TO "service_role";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
REVOKE ALL ON FUNCTION "public"."claim_meta_app_event"(p_user_id uuid, p_event_key text, p_event_payload jsonb) FROM PUBLIC, anon, authenticated, service_role;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."claim_meta_app_event"(p_user_id uuid, p_event_key text, p_event_payload jsonb) TO "authenticated";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."claim_meta_app_event"(p_user_id uuid, p_event_key text, p_event_payload jsonb) TO "service_role";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
REVOKE ALL ON FUNCTION "public"."claim_pending_meta_app_events"(p_user_id uuid) FROM PUBLIC, anon, authenticated, service_role;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."claim_pending_meta_app_events"(p_user_id uuid) TO "authenticated";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."claim_pending_meta_app_events"(p_user_id uuid) TO "service_role";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
REVOKE ALL ON FUNCTION "public"."claim_posthog_trial_started"(p_user_id uuid, p_client_properties jsonb) FROM PUBLIC, anon, authenticated, service_role;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."claim_posthog_trial_started"(p_user_id uuid, p_client_properties jsonb) TO "authenticated";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."claim_posthog_trial_started"(p_user_id uuid, p_client_properties jsonb) TO "service_role";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
REVOKE ALL ON FUNCTION "public"."cleanup_expired_sessions"() FROM PUBLIC, anon, authenticated, service_role;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."cleanup_expired_sessions"() TO PUBLIC;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."cleanup_expired_sessions"() TO "anon";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."cleanup_expired_sessions"() TO "authenticated";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."cleanup_expired_sessions"() TO "service_role";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
REVOKE ALL ON FUNCTION "public"."clear_current_user_refund_request_state"() FROM PUBLIC, anon, authenticated, service_role;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."clear_current_user_refund_request_state"() TO PUBLIC;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."clear_current_user_refund_request_state"() TO "anon";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."clear_current_user_refund_request_state"() TO "authenticated";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."clear_current_user_refund_request_state"() TO "service_role";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
REVOKE ALL ON FUNCTION "public"."complete_posthog_trial_started"(p_user_id uuid, p_claim_token uuid) FROM PUBLIC, anon, authenticated, service_role;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."complete_posthog_trial_started"(p_user_id uuid, p_claim_token uuid) TO "authenticated";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."complete_posthog_trial_started"(p_user_id uuid, p_claim_token uuid) TO "service_role";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
REVOKE ALL ON FUNCTION "public"."confirm_current_user_promo_redemption"(p_redemption_attempt_id uuid, p_code_id uuid, p_campaign_id uuid, p_revenuecat_app_user_id text, p_store_product_id text, p_store_transaction_id text) FROM PUBLIC, anon, authenticated, service_role;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."confirm_current_user_promo_redemption"(p_redemption_attempt_id uuid, p_code_id uuid, p_campaign_id uuid, p_revenuecat_app_user_id text, p_store_product_id text, p_store_transaction_id text) TO "anon";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."confirm_current_user_promo_redemption"(p_redemption_attempt_id uuid, p_code_id uuid, p_campaign_id uuid, p_revenuecat_app_user_id text, p_store_product_id text, p_store_transaction_id text) TO "authenticated";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."confirm_current_user_promo_redemption"(p_redemption_attempt_id uuid, p_code_id uuid, p_campaign_id uuid, p_revenuecat_app_user_id text, p_store_product_id text, p_store_transaction_id text) TO "service_role";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
REVOKE ALL ON FUNCTION "public"."confirm_promo_redemption_for_user"(p_user_id uuid, p_redemption_attempt_id uuid, p_code_id uuid, p_campaign_id uuid, p_revenuecat_app_user_id text, p_store_product_id text, p_store_transaction_id text) FROM PUBLIC, anon, authenticated, service_role;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."confirm_promo_redemption_for_user"(p_user_id uuid, p_redemption_attempt_id uuid, p_code_id uuid, p_campaign_id uuid, p_revenuecat_app_user_id text, p_store_product_id text, p_store_transaction_id text) TO "anon";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."confirm_promo_redemption_for_user"(p_user_id uuid, p_redemption_attempt_id uuid, p_code_id uuid, p_campaign_id uuid, p_revenuecat_app_user_id text, p_store_product_id text, p_store_transaction_id text) TO "authenticated";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."confirm_promo_redemption_for_user"(p_user_id uuid, p_redemption_attempt_id uuid, p_code_id uuid, p_campaign_id uuid, p_revenuecat_app_user_id text, p_store_product_id text, p_store_transaction_id text) TO "service_role";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
REVOKE ALL ON FUNCTION "public"."delete_expired_accounts"() FROM PUBLIC, anon, authenticated, service_role;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."delete_expired_accounts"() TO PUBLIC;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."delete_expired_accounts"() TO "anon";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."delete_expired_accounts"() TO "authenticated";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."delete_expired_accounts"() TO "service_role";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
REVOKE ALL ON FUNCTION "public"."delete_user_by_email"(target_email text) FROM PUBLIC, anon, authenticated, service_role;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."delete_user_by_email"(target_email text) TO PUBLIC;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."delete_user_by_email"(target_email text) TO "anon";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."delete_user_by_email"(target_email text) TO "authenticated";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."delete_user_by_email"(target_email text) TO "service_role";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
REVOKE ALL ON FUNCTION "public"."enforce_single_top_priority_and_sync_mit"() FROM PUBLIC, anon, authenticated, service_role;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."enforce_single_top_priority_and_sync_mit"() TO PUBLIC;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."enforce_single_top_priority_and_sync_mit"() TO "anon";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."enforce_single_top_priority_and_sync_mit"() TO "authenticated";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."enforce_single_top_priority_and_sync_mit"() TO "service_role";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
REVOKE ALL ON FUNCTION "public"."enqueue_posthog_trial_started_on_profile_insert"() FROM PUBLIC, anon, authenticated, service_role;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."enqueue_posthog_trial_started_on_profile_insert"() TO "service_role";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
REVOKE ALL ON FUNCTION "public"."ensure_current_user_profile"() FROM PUBLIC, anon, authenticated, service_role;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."ensure_current_user_profile"() TO PUBLIC;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."ensure_current_user_profile"() TO "anon";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."ensure_current_user_profile"() TO "authenticated";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."ensure_current_user_profile"() TO "service_role";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
REVOKE ALL ON FUNCTION "public"."ensure_profile_exists_for_auth_user"(p_user_id uuid) FROM PUBLIC, anon, authenticated, service_role;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."ensure_profile_exists_for_auth_user"(p_user_id uuid) TO PUBLIC;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."ensure_profile_exists_for_auth_user"(p_user_id uuid) TO "anon";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."ensure_profile_exists_for_auth_user"(p_user_id uuid) TO "authenticated";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."ensure_profile_exists_for_auth_user"(p_user_id uuid) TO "service_role";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
REVOKE ALL ON FUNCTION "public"."get_favorite_category_ids"(p_user_id uuid) FROM PUBLIC, anon, authenticated, service_role;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."get_favorite_category_ids"(p_user_id uuid) TO PUBLIC;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."get_favorite_category_ids"(p_user_id uuid) TO "anon";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."get_favorite_category_ids"(p_user_id uuid) TO "authenticated";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."get_favorite_category_ids"(p_user_id uuid) TO "service_role";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
REVOKE ALL ON FUNCTION "public"."get_meta_app_event_claim_status"(p_user_id uuid, p_event_key text) FROM PUBLIC, anon, authenticated, service_role;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."get_meta_app_event_claim_status"(p_user_id uuid, p_event_key text) TO "authenticated";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."get_meta_app_event_claim_status"(p_user_id uuid, p_event_key text) TO "service_role";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
REVOKE ALL ON FUNCTION "public"."get_user_cohort"(p_user_id uuid) FROM PUBLIC, anon, authenticated, service_role;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."get_user_cohort"(p_user_id uuid) TO PUBLIC;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."get_user_cohort"(p_user_id uuid) TO "anon";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."get_user_cohort"(p_user_id uuid) TO "authenticated";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."get_user_cohort"(p_user_id uuid) TO "service_role";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
REVOKE ALL ON FUNCTION "public"."get_user_role_level"(p_user_id uuid) FROM PUBLIC, anon, authenticated, service_role;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."get_user_role_level"(p_user_id uuid) TO PUBLIC;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."get_user_role_level"(p_user_id uuid) TO "anon";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."get_user_role_level"(p_user_id uuid) TO "authenticated";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."get_user_role_level"(p_user_id uuid) TO "service_role";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
REVOKE ALL ON FUNCTION "public"."get_user_tier"(p_user_id uuid) FROM PUBLIC, anon, authenticated, service_role;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."get_user_tier"(p_user_id uuid) TO PUBLIC;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."get_user_tier"(p_user_id uuid) TO "anon";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."get_user_tier"(p_user_id uuid) TO "authenticated";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."get_user_tier"(p_user_id uuid) TO "service_role";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
REVOKE ALL ON FUNCTION "public"."handle_new_user"() FROM PUBLIC, anon, authenticated, service_role;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."handle_new_user"() TO PUBLIC;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."handle_new_user"() TO "anon";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."handle_new_user"() TO "authenticated";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."handle_new_user"() TO "service_role";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
REVOKE ALL ON FUNCTION "public"."has_permission"(p_user_id uuid, p_resource text, p_action admin_action) FROM PUBLIC, anon, authenticated, service_role;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."has_permission"(p_user_id uuid, p_resource text, p_action admin_action) TO PUBLIC;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."has_permission"(p_user_id uuid, p_resource text, p_action admin_action) TO "anon";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."has_permission"(p_user_id uuid, p_resource text, p_action admin_action) TO "authenticated";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."has_permission"(p_user_id uuid, p_resource text, p_action admin_action) TO "service_role";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
REVOKE ALL ON FUNCTION "public"."hash_promo_code"(p_code text) FROM PUBLIC, anon, authenticated, service_role;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."hash_promo_code"(p_code text) TO "anon";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."hash_promo_code"(p_code text) TO "authenticated";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."hash_promo_code"(p_code text) TO "service_role";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
REVOKE ALL ON FUNCTION "public"."increment_category_usage"(p_user_id uuid, p_system_category_id uuid, p_user_category_id uuid) FROM PUBLIC, anon, authenticated, service_role;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."increment_category_usage"(p_user_id uuid, p_system_category_id uuid, p_user_category_id uuid) TO PUBLIC;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."increment_category_usage"(p_user_id uuid, p_system_category_id uuid, p_user_category_id uuid) TO "anon";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."increment_category_usage"(p_user_id uuid, p_system_category_id uuid, p_user_category_id uuid) TO "authenticated";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."increment_category_usage"(p_user_id uuid, p_system_category_id uuid, p_user_category_id uuid) TO "service_role";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
REVOKE ALL ON FUNCTION "public"."is_beta_phase"() FROM PUBLIC, anon, authenticated, service_role;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."is_beta_phase"() TO PUBLIC;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."is_beta_phase"() TO "anon";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."is_beta_phase"() TO "authenticated";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."is_beta_phase"() TO "service_role";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
REVOKE ALL ON FUNCTION "public"."is_email_subscribed"(p_email character varying) FROM PUBLIC, anon, authenticated, service_role;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."is_email_subscribed"(p_email character varying) TO PUBLIC;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."is_email_subscribed"(p_email character varying) TO "anon";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."is_email_subscribed"(p_email character varying) TO "authenticated";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."is_email_subscribed"(p_email character varying) TO "service_role";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
REVOKE ALL ON FUNCTION "public"."log_audit_event"(p_user_id uuid, p_action audit_action, p_resource_type text, p_resource_id text, p_description text, p_old_values jsonb, p_new_values jsonb, p_metadata jsonb) FROM PUBLIC, anon, authenticated, service_role;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."log_audit_event"(p_user_id uuid, p_action audit_action, p_resource_type text, p_resource_id text, p_description text, p_old_values jsonb, p_new_values jsonb, p_metadata jsonb) TO PUBLIC;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."log_audit_event"(p_user_id uuid, p_action audit_action, p_resource_type text, p_resource_id text, p_description text, p_old_values jsonb, p_new_values jsonb, p_metadata jsonb) TO "anon";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."log_audit_event"(p_user_id uuid, p_action audit_action, p_resource_type text, p_resource_id text, p_description text, p_old_values jsonb, p_new_values jsonb, p_metadata jsonb) TO "authenticated";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."log_audit_event"(p_user_id uuid, p_action audit_action, p_resource_type text, p_resource_id text, p_description text, p_old_values jsonb, p_new_values jsonb, p_metadata jsonb) TO "service_role";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
REVOKE ALL ON FUNCTION "public"."mark_current_user_refund_request_pending"(p_platform text, p_source text, p_error text) FROM PUBLIC, anon, authenticated, service_role;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."mark_current_user_refund_request_pending"(p_platform text, p_source text, p_error text) TO PUBLIC;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."mark_current_user_refund_request_pending"(p_platform text, p_source text, p_error text) TO "anon";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."mark_current_user_refund_request_pending"(p_platform text, p_source text, p_error text) TO "authenticated";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."mark_current_user_refund_request_pending"(p_platform text, p_source text, p_error text) TO "service_role";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
REVOKE ALL ON FUNCTION "public"."normalize_promo_code"(p_code text) FROM PUBLIC, anon, authenticated, service_role;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."normalize_promo_code"(p_code text) TO "anon";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."normalize_promo_code"(p_code text) TO "authenticated";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."normalize_promo_code"(p_code text) TO "service_role";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
REVOKE ALL ON FUNCTION "public"."prepare_domani_release_fields"() FROM PUBLIC, anon, authenticated, service_role;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."prepare_domani_release_fields"() TO PUBLIC;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."prepare_domani_release_fields"() TO "anon";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."prepare_domani_release_fields"() TO "authenticated";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."prepare_domani_release_fields"() TO "service_role";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
REVOKE ALL ON FUNCTION "public"."prevent_profile_is_admin_client_update"() FROM PUBLIC, anon, authenticated, service_role;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."prevent_profile_is_admin_client_update"() TO "anon";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."prevent_profile_is_admin_client_update"() TO "authenticated";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."prevent_profile_is_admin_client_update"() TO "service_role";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
REVOKE ALL ON FUNCTION "public"."record_current_user_duplicate_refund_request_hint"(p_platform text, p_source text, p_error text) FROM PUBLIC, anon, authenticated, service_role;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."record_current_user_duplicate_refund_request_hint"(p_platform text, p_source text, p_error text) TO PUBLIC;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."record_current_user_duplicate_refund_request_hint"(p_platform text, p_source text, p_error text) TO "anon";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."record_current_user_duplicate_refund_request_hint"(p_platform text, p_source text, p_error text) TO "authenticated";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."record_current_user_duplicate_refund_request_hint"(p_platform text, p_source text, p_error text) TO "service_role";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
REVOKE ALL ON FUNCTION "public"."release_overview_is_valid"(p_document jsonb) FROM PUBLIC, anon, authenticated, service_role;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."release_overview_is_valid"(p_document jsonb) TO "service_role";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
REVOKE ALL ON FUNCTION "public"."release_overview_node_valid"(p_node jsonb, p_parent_type text, p_depth integer) FROM PUBLIC, anon, authenticated, service_role;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."release_overview_node_valid"(p_node jsonb, p_parent_type text, p_depth integer) TO "service_role";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
REVOKE ALL ON FUNCTION "public"."release_overview_text"(p_document jsonb) FROM PUBLIC, anon, authenticated, service_role;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."release_overview_text"(p_document jsonb) TO "service_role";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
REVOKE ALL ON FUNCTION "public"."release_overview_text_node"(p_node jsonb) FROM PUBLIC, anon, authenticated, service_role;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."release_overview_text_node"(p_node jsonb) TO "service_role";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
REVOKE ALL ON FUNCTION "public"."retry_failed_meta_app_event_dispatch"(p_user_id uuid, p_event_key text, p_claim_token uuid) FROM PUBLIC, anon, authenticated, service_role;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."retry_failed_meta_app_event_dispatch"(p_user_id uuid, p_event_key text, p_claim_token uuid) TO "authenticated";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."retry_failed_meta_app_event_dispatch"(p_user_id uuid, p_event_key text, p_claim_token uuid) TO "service_role";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
REVOKE ALL ON FUNCTION "public"."schedule_account_deletion"(p_user_id uuid) FROM PUBLIC, anon, authenticated, service_role;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."schedule_account_deletion"(p_user_id uuid) TO PUBLIC;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."schedule_account_deletion"(p_user_id uuid) TO "anon";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."schedule_account_deletion"(p_user_id uuid) TO "authenticated";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."schedule_account_deletion"(p_user_id uuid) TO "service_role";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
REVOKE ALL ON FUNCTION "public"."set_updated_at"() FROM PUBLIC, anon, authenticated, service_role;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."set_updated_at"() TO PUBLIC;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."set_updated_at"() TO "anon";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."set_updated_at"() TO "authenticated";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."set_updated_at"() TO "service_role";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
REVOKE ALL ON FUNCTION "public"."start_trial_with_posthog_outbox"() FROM PUBLIC, anon, authenticated, service_role;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."start_trial_with_posthog_outbox"() TO "authenticated";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."start_trial_with_posthog_outbox"() TO "service_role";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
REVOKE ALL ON FUNCTION "public"."sync_auth_user_to_profile"(p_user_id uuid) FROM PUBLIC, anon, authenticated, service_role;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."sync_auth_user_to_profile"(p_user_id uuid) TO PUBLIC;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."sync_auth_user_to_profile"(p_user_id uuid) TO "anon";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."sync_auth_user_to_profile"(p_user_id uuid) TO "authenticated";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."sync_auth_user_to_profile"(p_user_id uuid) TO "service_role";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
REVOKE ALL ON FUNCTION "public"."sync_release_slug_from_identity"() FROM PUBLIC, anon, authenticated, service_role;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."sync_release_slug_from_identity"() TO "service_role";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
REVOKE ALL ON FUNCTION "public"."update_app_config_updated_at"() FROM PUBLIC, anon, authenticated, service_role;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."update_app_config_updated_at"() TO PUBLIC;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."update_app_config_updated_at"() TO "anon";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."update_app_config_updated_at"() TO "authenticated";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."update_app_config_updated_at"() TO "service_role";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
REVOKE ALL ON FUNCTION "public"."update_campaign_metrics"(p_campaign_id uuid) FROM PUBLIC, anon, authenticated, service_role;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."update_campaign_metrics"(p_campaign_id uuid) TO PUBLIC;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."update_campaign_metrics"(p_campaign_id uuid) TO "anon";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."update_campaign_metrics"(p_campaign_id uuid) TO "authenticated";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."update_campaign_metrics"(p_campaign_id uuid) TO "service_role";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
REVOKE ALL ON FUNCTION "public"."update_category_positions"(p_user_id uuid, p_category_positions jsonb) FROM PUBLIC, anon, authenticated, service_role;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."update_category_positions"(p_user_id uuid, p_category_positions jsonb) TO PUBLIC;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."update_category_positions"(p_user_id uuid, p_category_positions jsonb) TO "anon";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."update_category_positions"(p_user_id uuid, p_category_positions jsonb) TO "authenticated";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."update_category_positions"(p_user_id uuid, p_category_positions jsonb) TO "service_role";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
REVOKE ALL ON FUNCTION "public"."update_current_user_promo_redemption_attempt"(p_redemption_attempt_id uuid, p_event text, p_status promo_redemption_status, p_error_code text, p_error_message text, p_metadata jsonb) FROM PUBLIC, anon, authenticated, service_role;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."update_current_user_promo_redemption_attempt"(p_redemption_attempt_id uuid, p_event text, p_status promo_redemption_status, p_error_code text, p_error_message text, p_metadata jsonb) TO "anon";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."update_current_user_promo_redemption_attempt"(p_redemption_attempt_id uuid, p_event text, p_status promo_redemption_status, p_error_code text, p_error_message text, p_metadata jsonb) TO "authenticated";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."update_current_user_promo_redemption_attempt"(p_redemption_attempt_id uuid, p_event text, p_status promo_redemption_status, p_error_code text, p_error_message text, p_metadata jsonb) TO "service_role";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
REVOKE ALL ON FUNCTION "public"."update_favorite_categories"(p_user_id uuid, p_favorite_category_ids jsonb) FROM PUBLIC, anon, authenticated, service_role;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."update_favorite_categories"(p_user_id uuid, p_favorite_category_ids jsonb) TO PUBLIC;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."update_favorite_categories"(p_user_id uuid, p_favorite_category_ids jsonb) TO "anon";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."update_favorite_categories"(p_user_id uuid, p_favorite_category_ids jsonb) TO "authenticated";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."update_favorite_categories"(p_user_id uuid, p_favorite_category_ids jsonb) TO "service_role";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
REVOKE ALL ON FUNCTION "public"."update_updated_at"() FROM PUBLIC, anon, authenticated, service_role;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."update_updated_at"() TO PUBLIC;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."update_updated_at"() TO "anon";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."update_updated_at"() TO "authenticated";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."update_updated_at"() TO "service_role";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
REVOKE ALL ON FUNCTION "public"."update_updated_at_column"() FROM PUBLIC, anon, authenticated, service_role;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."update_updated_at_column"() TO PUBLIC;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."update_updated_at_column"() TO "anon";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."update_updated_at_column"() TO "service_role";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
REVOKE ALL ON FUNCTION "public"."validate_promo_code"(p_code text, p_platform text, p_app_version text) FROM PUBLIC, anon, authenticated, service_role;
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."validate_promo_code"(p_code text, p_platform text, p_app_version text) TO "anon";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."validate_promo_code"(p_code text, p_platform text, p_app_version text) TO "authenticated";
$baseline_ddl$;
  EXECUTE $baseline_ddl$
GRANT EXECUTE ON FUNCTION "public"."validate_promo_code"(p_code text, p_platform text, p_app_version text) TO "service_role";
$baseline_ddl$;
END;
$replay_baseline$;
