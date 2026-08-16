alter table public.profiles
add column if not exists planning_activated_at timestamptz;

comment on column public.profiles.planning_activated_at is
  'Timestamp claimed by the first non-tutorial task creation used for activation analytics.';
