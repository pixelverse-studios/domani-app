-- Cache auth helper values once per statement instead of once per row.
ALTER POLICY "System can manage sessions" ON "public"."admin_sessions"
  USING ((select auth.role()) = 'service_role'::text);

ALTER POLICY "Users can create their own feedback" ON "public"."beta_feedback"
  WITH CHECK ((select auth.uid()) = user_id);

ALTER POLICY "Users can view their own feedback" ON "public"."beta_feedback"
  USING ((select auth.uid()) = user_id);

ALTER POLICY "Users can insert own profile" ON "public"."profiles"
  WITH CHECK ((select auth.uid()) = id);

ALTER POLICY "Users can read own profile" ON "public"."profiles"
  USING ((select auth.uid()) = id);

ALTER POLICY "Users can update own profile" ON "public"."profiles"
  USING ((select auth.uid()) = id);

ALTER POLICY "Users can view their own purchase refund state" ON "public"."purchase_refund_states"
  USING ((select auth.uid()) = user_id);

ALTER POLICY "Users can create their own support requests" ON "public"."support_requests"
  WITH CHECK ((select auth.uid()) = user_id);

ALTER POLICY "Users can view their own support requests" ON "public"."support_requests"
  USING ((select auth.uid()) = user_id);

ALTER POLICY "Users can create task time blocks" ON "public"."task_time_blocks"
  WITH CHECK (EXISTS ( SELECT 1
   FROM tasks
  WHERE ((tasks.id = task_time_blocks.task_id) AND (tasks.user_id = (select auth.uid())))));

ALTER POLICY "Users can delete task time blocks" ON "public"."task_time_blocks"
  USING (EXISTS ( SELECT 1
   FROM tasks
  WHERE ((tasks.id = task_time_blocks.task_id) AND (tasks.user_id = (select auth.uid())))));

ALTER POLICY "Users can read own task time blocks" ON "public"."task_time_blocks"
  USING (EXISTS ( SELECT 1
   FROM tasks
  WHERE ((tasks.id = task_time_blocks.task_id) AND (tasks.user_id = (select auth.uid())))));

ALTER POLICY "Users can update task time blocks" ON "public"."task_time_blocks"
  USING (EXISTS ( SELECT 1
   FROM tasks
  WHERE ((tasks.id = task_time_blocks.task_id) AND (tasks.user_id = (select auth.uid())))));

ALTER POLICY "Users can delete own tasks" ON "public"."tasks"
  USING (user_id = (select auth.uid()));

ALTER POLICY "Users can insert tasks" ON "public"."tasks"
  WITH CHECK ((user_id = (select auth.uid())) AND (is_beta_phase() OR (get_user_tier((select auth.uid())) = ANY (ARRAY['trialing'::text, 'lifetime'::text]))));

ALTER POLICY "Users can update own tasks" ON "public"."tasks"
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

ALTER POLICY "Users can view own tasks" ON "public"."tasks"
  USING (user_id = (select auth.uid()));

ALTER POLICY "Users can delete own categories" ON "public"."user_categories"
  USING ((select auth.uid()) = user_id);

ALTER POLICY "Users can insert own categories" ON "public"."user_categories"
  WITH CHECK ((select auth.uid()) = user_id);

ALTER POLICY "Users can update own categories" ON "public"."user_categories"
  USING ((select auth.uid()) = user_id);

ALTER POLICY "Users can view own categories" ON "public"."user_categories"
  USING ((select auth.uid()) = user_id);

ALTER POLICY "Users can delete own category preferences" ON "public"."user_category_preferences"
  USING ((select auth.uid()) = user_id);

ALTER POLICY "Users can insert own category preferences" ON "public"."user_category_preferences"
  WITH CHECK ((select auth.uid()) = user_id);

ALTER POLICY "Users can update own category preferences" ON "public"."user_category_preferences"
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

ALTER POLICY "Users can view own category preferences" ON "public"."user_category_preferences"
  USING ((select auth.uid()) = user_id);

-- Add covering indexes for every advisor-reported foreign key.
CREATE INDEX IF NOT EXISTS idx_email_campaigns_created_by_fk
  ON public.email_campaigns (created_by);
CREATE INDEX IF NOT EXISTS idx_email_templates_created_by_fk
  ON public.email_templates (created_by);
CREATE INDEX IF NOT EXISTS idx_email_unsubscribes_campaign_id_fk
  ON public.email_unsubscribes (campaign_id);
CREATE INDEX IF NOT EXISTS idx_release_conversion_runs_superseded_by_fk
  ON public.release_conversion_runs (superseded_by_run_id, prd_id, release_id);
CREATE INDEX IF NOT EXISTS idx_release_prds_latest_conversion_fk
  ON public.release_prds (latest_conversion_run_id, id, release_id);
CREATE INDEX IF NOT EXISTS idx_user_category_preferences_system_category_id_fk
  ON public.user_category_preferences (system_category_id);

