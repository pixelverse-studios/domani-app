-- Capture the schema that originally existed only in the Supabase dashboard.
--
-- Historical migrations 004 and later assume these objects already exist. On
-- established environments, profiles is present and this migration is a safe
-- no-op. On an empty database, it reconstructs the pre-migration baseline so
-- the complete version-controlled migration chain is replayable.

DO $$
BEGIN
  IF to_regclass('public.profiles') IS NOT NULL THEN
    RETURN;
  END IF;

  CREATE TYPE public.tier AS ENUM ('free', 'premium', 'lifetime');
  CREATE TYPE public.plan_status AS ENUM ('draft', 'locked', 'active', 'completed');
  CREATE TYPE public.subscription_status_enum AS ENUM (
    'none',
    'trialing',
    'active',
    'past_due',
    'canceled',
    'expired'
  );
  CREATE TYPE public.admin_action AS ENUM (
    'create',
    'read',
    'update',
    'delete',
    'export',
    'import',
    'execute'
  );
  CREATE TYPE public.admin_role AS ENUM ('super_admin', 'admin', 'editor', 'viewer');
  CREATE TYPE public.audit_action AS ENUM (
    'create',
    'update',
    'delete',
    'login',
    'logout',
    'export',
    'import',
    'permission_change',
    'role_change',
    'settings_change',
    'login_attempt',
    'login_error',
    'read'
  );

  CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    tier public.tier NOT NULL DEFAULT 'free',
    revenuecat_user_id TEXT UNIQUE,
    subscription_status public.subscription_status_enum,
    subscription_expires_at TIMESTAMPTZ,
    timezone TEXT DEFAULT 'UTC',
    planning_reminder_time TIME,
    execution_reminder_time TIME,
    trial_started_at TIMESTAMPTZ,
    trial_ends_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  CREATE INDEX idx_profiles_tier ON public.profiles (tier);
  CREATE INDEX idx_profiles_subscription_status ON public.profiles (subscription_status);
  CREATE INDEX idx_profiles_trial_ends_at ON public.profiles (trial_ends_at);
  CREATE INDEX idx_profiles_revenuecat ON public.profiles (revenuecat_user_id);

  ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Users can read own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);
  CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

  CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

  ALTER TABLE public.plans DROP CONSTRAINT plans_user_id_fkey;
  ALTER TABLE public.plans
    ADD CONSTRAINT plans_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
    ADD COLUMN status public.plan_status NOT NULL DEFAULT 'draft',
    ADD COLUMN completed_at TIMESTAMPTZ,
    ADD COLUMN completion_rate NUMERIC,
    ADD COLUMN evening_notes TEXT,
    ADD COLUMN morning_notes TEXT;

  CREATE INDEX idx_plans_status ON public.plans (status);

  CREATE TABLE public.system_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    color TEXT NOT NULL,
    icon TEXT NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  INSERT INTO public.system_categories (name, color, icon, position)
  VALUES
    ('Work', '#3B82F6', '💼', 0),
    ('Personal', '#10B981', '🏠', 1),
    ('Health', '#EF4444', '❤️', 2),
    ('Other', '#6B7280', '📌', 3);

  ALTER TABLE public.system_categories ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Anyone can view system categories"
    ON public.system_categories FOR SELECT
    USING (true);

  CREATE TABLE public.user_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT NOT NULL,
    icon TEXT NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, name)
  );

  ALTER TABLE public.user_categories ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Users can view own categories"
    ON public.user_categories FOR SELECT
    USING (auth.uid() = user_id);
  CREATE POLICY "Users can insert own categories"
    ON public.user_categories FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  CREATE POLICY "Users can update own categories"
    ON public.user_categories FOR UPDATE
    USING (auth.uid() = user_id);
  CREATE POLICY "Users can delete own categories"
    ON public.user_categories FOR DELETE
    USING (auth.uid() = user_id);

  CREATE TRIGGER update_user_categories_updated_at
    BEFORE UPDATE ON public.user_categories
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

  ALTER TABLE public.tasks
    ADD COLUMN user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    ADD COLUMN completed_duration_minutes INTEGER,
    ADD COLUMN system_category_id UUID REFERENCES public.system_categories(id) ON DELETE SET NULL,
    ADD COLUMN user_category_id UUID REFERENCES public.user_categories(id) ON DELETE CASCADE;

  ALTER TABLE public.tasks ALTER COLUMN user_id SET NOT NULL;

  CREATE INDEX idx_tasks_user ON public.tasks (user_id);
  CREATE INDEX idx_tasks_system_category_id ON public.tasks (system_category_id);
  CREATE INDEX idx_tasks_user_category_id ON public.tasks (user_category_id);

  CREATE TABLE public.task_time_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    duration_minutes INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  CREATE INDEX idx_time_blocks_task ON public.task_time_blocks (task_id);
  ALTER TABLE public.task_time_blocks ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Users can read own task time blocks"
    ON public.task_time_blocks FOR SELECT
    USING (EXISTS (
      SELECT 1 FROM public.tasks
      WHERE tasks.id = task_time_blocks.task_id AND tasks.user_id = auth.uid()
    ));
  CREATE POLICY "Users can create task time blocks"
    ON public.task_time_blocks FOR INSERT
    WITH CHECK (EXISTS (
      SELECT 1 FROM public.tasks
      WHERE tasks.id = task_time_blocks.task_id AND tasks.user_id = auth.uid()
    ));
  CREATE POLICY "Users can update task time blocks"
    ON public.task_time_blocks FOR UPDATE
    USING (EXISTS (
      SELECT 1 FROM public.tasks
      WHERE tasks.id = task_time_blocks.task_id AND tasks.user_id = auth.uid()
    ));
  CREATE POLICY "Users can delete task time blocks"
    ON public.task_time_blocks FOR DELETE
    USING (EXISTS (
      SELECT 1 FROM public.tasks
      WHERE tasks.id = task_time_blocks.task_id AND tasks.user_id = auth.uid()
    ));

  CREATE TABLE public.waitlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR NOT NULL UNIQUE,
    name VARCHAR,
    referral_type VARCHAR DEFAULT 'website',
    confirmed BOOLEAN DEFAULT false,
    confirmed_at TIMESTAMPTZ,
    status VARCHAR DEFAULT 'confirmed',
    invited_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
  );

  CREATE TABLE public.email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR NOT NULL,
    description TEXT,
    category VARCHAR,
    subject VARCHAR NOT NULL,
    preview_text VARCHAR,
    html_content TEXT NOT NULL,
    text_content TEXT,
    variables JSONB DEFAULT '[]'::jsonb,
    from_name VARCHAR,
    from_email VARCHAR,
    reply_to_email VARCHAR,
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ
  );

  CREATE TABLE public.email_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR NOT NULL,
    description TEXT,
    type VARCHAR DEFAULT 'manual',
    template_id UUID REFERENCES public.email_templates(id) ON DELETE SET NULL,
    subject VARCHAR NOT NULL,
    preview_text VARCHAR,
    html_content TEXT,
    text_content TEXT,
    from_name VARCHAR,
    from_email VARCHAR,
    reply_to_email VARCHAR,
    recipient_filter JSONB DEFAULT '{}'::jsonb,
    recipient_count INTEGER DEFAULT 0,
    status VARCHAR DEFAULT 'draft',
    scheduled_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    metrics JSONB DEFAULT '{"opened":0,"bounced":0,"clicked":0,"delivered":0,"total_sent":0,"unsubscribed":0}'::jsonb,
    settings JSONB DEFAULT '{"track_opens":true,"track_clicks":true,"include_unsubscribe":true}'::jsonb,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ
  );

  CREATE TABLE public.campaign_recipients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES public.email_campaigns(id) ON DELETE CASCADE,
    recipient_id UUID REFERENCES public.waitlist(id) ON DELETE SET NULL,
    email VARCHAR NOT NULL,
    first_name VARCHAR,
    last_name VARCHAR,
    merge_data JSONB DEFAULT '{}'::jsonb,
    status VARCHAR DEFAULT 'pending',
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    bounced_at TIMESTAMPTZ,
    bounce_type VARCHAR,
    bounce_reason TEXT,
    opened_at TIMESTAMPTZ,
    open_count INTEGER DEFAULT 0,
    clicked_at TIMESTAMPTZ,
    click_count INTEGER DEFAULT 0,
    clicked_links JSONB DEFAULT '[]'::jsonb,
    unsubscribed_at TIMESTAMPTZ,
    unsubscribe_reason TEXT,
    provider_id VARCHAR,
    provider_response JSONB,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (campaign_id, email)
  );

  CREATE TABLE public.email_unsubscribes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR NOT NULL UNIQUE,
    reason VARCHAR,
    feedback TEXT,
    campaign_id UUID REFERENCES public.email_campaigns(id) ON DELETE SET NULL,
    unsubscribe_token UUID DEFAULT gen_random_uuid(),
    unsubscribed_at TIMESTAMPTZ DEFAULT now(),
    ip_address INET,
    user_agent TEXT,
    resubscribed_at TIMESTAMPTZ
  );

  CREATE TABLE public.admin_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    admin_user_id UUID,
    action public.audit_action NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT,
    description TEXT,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    session_id UUID,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
  );

  CREATE TABLE public.admin_sessions (
    id TEXT PRIMARY KEY,
    admin_user_id UUID NOT NULL,
    token_hash TEXT NOT NULL,
    refresh_token_hash TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    invalidated_at TIMESTAMPTZ,
    last_activity_at TIMESTAMPTZ DEFAULT now(),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
  );

  ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.campaign_recipients ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.email_unsubscribes ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.admin_sessions ENABLE ROW LEVEL SECURITY;

  CREATE POLICY "System can manage sessions"
    ON public.admin_sessions FOR ALL
    USING (auth.role() = 'service_role');
END;
$$;

DO $baseline_functions$
BEGIN
  -- The legacy users table exists only during a fresh replay. Established
  -- environments already have these functions and must remain untouched.
  IF to_regclass('public.users') IS NULL THEN
    RETURN;
  END IF;

  IF to_regprocedure('public.update_updated_at()') IS NULL THEN
    EXECUTE $function$
      CREATE FUNCTION public.update_updated_at()
      RETURNS TRIGGER
      LANGUAGE plpgsql
      AS $body$
      BEGIN
        NEW.updated_at = now();
        RETURN NEW;
      END;
      $body$
    $function$;
  END IF;

  IF to_regprocedure('public.cleanup_expired_sessions()') IS NULL THEN
    EXECUTE $function$
      CREATE FUNCTION public.cleanup_expired_sessions()
      RETURNS void
      LANGUAGE sql
      SECURITY DEFINER
      AS $body$
        DELETE FROM public.admin_sessions
        WHERE expires_at < now() OR invalidated_at IS NOT NULL;
      $body$
    $function$;
  END IF;

  IF to_regprocedure('public.delete_user_by_email(text)') IS NULL THEN
    EXECUTE $function$
      CREATE FUNCTION public.delete_user_by_email(target_email TEXT)
      RETURNS TEXT
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $body$
      DECLARE
        target_user_id UUID;
        user_name TEXT;
      BEGIN
        SELECT id INTO target_user_id
        FROM auth.users
        WHERE email = target_email;

        IF target_user_id IS NULL THEN
          RETURN 'User not found: ' || target_email;
        END IF;

        SELECT full_name INTO user_name
        FROM public.profiles
        WHERE id = target_user_id;

        DELETE FROM public.profiles WHERE id = target_user_id;
        DELETE FROM auth.users WHERE id = target_user_id;

        RETURN 'Deleted user: ' || target_email || ' (' || COALESCE(user_name, 'no name') || ')';
      END;
      $body$
    $function$;
  END IF;

  IF to_regprocedure('public.is_email_subscribed(character varying)') IS NULL THEN
    EXECUTE $function$
      CREATE FUNCTION public.is_email_subscribed(p_email VARCHAR)
      RETURNS boolean
      LANGUAGE sql
      STABLE
      SECURITY DEFINER
      AS $body$
        SELECT NOT EXISTS (
          SELECT 1 FROM public.email_unsubscribes
          WHERE lower(email) = lower(p_email) AND resubscribed_at IS NULL
        );
      $body$
    $function$;
  END IF;

  IF to_regprocedure('public.update_campaign_metrics(uuid)') IS NULL THEN
    EXECUTE $function$
      CREATE FUNCTION public.update_campaign_metrics(p_campaign_id UUID)
      RETURNS void
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $body$
      BEGIN
        UPDATE public.email_campaigns
        SET metrics = jsonb_build_object(
          'total_sent', (SELECT count(*) FROM public.campaign_recipients WHERE campaign_id = p_campaign_id AND sent_at IS NOT NULL),
          'delivered', (SELECT count(*) FROM public.campaign_recipients WHERE campaign_id = p_campaign_id AND delivered_at IS NOT NULL),
          'opened', (SELECT count(*) FROM public.campaign_recipients WHERE campaign_id = p_campaign_id AND opened_at IS NOT NULL),
          'clicked', (SELECT count(*) FROM public.campaign_recipients WHERE campaign_id = p_campaign_id AND clicked_at IS NOT NULL),
          'bounced', (SELECT count(*) FROM public.campaign_recipients WHERE campaign_id = p_campaign_id AND bounced_at IS NOT NULL),
          'unsubscribed', (SELECT count(*) FROM public.campaign_recipients WHERE campaign_id = p_campaign_id AND unsubscribed_at IS NOT NULL)
        ), updated_at = now()
        WHERE id = p_campaign_id;
      END;
      $body$
    $function$;
  END IF;

  IF to_regprocedure('public.get_user_role_level(uuid)') IS NULL THEN
    EXECUTE $function$
      CREATE FUNCTION public.get_user_role_level(p_user_id UUID)
      RETURNS integer
      LANGUAGE sql
      STABLE
      SECURITY DEFINER
      AS $body$
        SELECT 0;
      $body$
    $function$;
  END IF;

  IF to_regprocedure('public.has_permission(uuid,text,public.admin_action)') IS NULL THEN
    EXECUTE $function$
      CREATE FUNCTION public.has_permission(
        p_user_id UUID,
        p_resource TEXT,
        p_action public.admin_action
      )
      RETURNS boolean
      LANGUAGE sql
      STABLE
      SECURITY DEFINER
      AS $body$
        SELECT false;
      $body$
    $function$;
  END IF;

  IF to_regprocedure('public.log_audit_event(uuid,public.audit_action,text,text,text,jsonb,jsonb,jsonb)') IS NULL THEN
    EXECUTE $function$
      CREATE FUNCTION public.log_audit_event(
        p_user_id UUID,
        p_action public.audit_action,
        p_resource_type TEXT,
        p_resource_id TEXT DEFAULT NULL,
        p_description TEXT DEFAULT NULL,
        p_old_values JSONB DEFAULT NULL,
        p_new_values JSONB DEFAULT NULL,
        p_metadata JSONB DEFAULT '{}'::jsonb
      )
      RETURNS UUID
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $body$
      DECLARE
        v_audit_id UUID;
      BEGIN
        INSERT INTO public.admin_audit_log (
          user_id,
          action,
          resource_type,
          resource_id,
          description,
          old_values,
          new_values,
          metadata
        ) VALUES (
          p_user_id,
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
      $body$
    $function$;
  END IF;
END;
$baseline_functions$;
