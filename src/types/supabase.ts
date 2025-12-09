export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '13.0.5'
  }
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          action: Database['public']['Enums']['audit_action']
          admin_user_id: string | null
          created_at: string | null
          description: string | null
          id: string
          ip_address: unknown
          metadata: Json | null
          new_values: Json | null
          old_values: Json | null
          resource_id: string | null
          resource_type: string
          session_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: Database['public']['Enums']['audit_action']
          admin_user_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          new_values?: Json | null
          old_values?: Json | null
          resource_id?: string | null
          resource_type: string
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: Database['public']['Enums']['audit_action']
          admin_user_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          new_values?: Json | null
          old_values?: Json | null
          resource_id?: string | null
          resource_type?: string
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      admin_sessions: {
        Row: {
          admin_user_id: string
          created_at: string | null
          expires_at: string
          id: string
          invalidated_at: string | null
          ip_address: unknown
          last_activity_at: string | null
          refresh_token_hash: string | null
          token_hash: string
          user_agent: string | null
        }
        Insert: {
          admin_user_id: string
          created_at?: string | null
          expires_at: string
          id: string
          invalidated_at?: string | null
          ip_address?: unknown
          last_activity_at?: string | null
          refresh_token_hash?: string | null
          token_hash: string
          user_agent?: string | null
        }
        Update: {
          admin_user_id?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          invalidated_at?: string | null
          ip_address?: unknown
          last_activity_at?: string | null
          refresh_token_hash?: string | null
          token_hash?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      app_config: {
        Row: {
          key: string
          updated_at: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string | null
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string | null
          value?: Json
        }
        Relationships: []
      }
      campaign_recipients: {
        Row: {
          bounce_reason: string | null
          bounce_type: string | null
          bounced_at: string | null
          campaign_id: string
          click_count: number | null
          clicked_at: string | null
          clicked_links: Json | null
          created_at: string | null
          delivered_at: string | null
          email: string
          first_name: string | null
          id: string
          last_name: string | null
          merge_data: Json | null
          open_count: number | null
          opened_at: string | null
          provider_id: string | null
          provider_response: Json | null
          recipient_id: string | null
          sent_at: string | null
          status: string | null
          unsubscribe_reason: string | null
          unsubscribed_at: string | null
          updated_at: string | null
        }
        Insert: {
          bounce_reason?: string | null
          bounce_type?: string | null
          bounced_at?: string | null
          campaign_id: string
          click_count?: number | null
          clicked_at?: string | null
          clicked_links?: Json | null
          created_at?: string | null
          delivered_at?: string | null
          email: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          merge_data?: Json | null
          open_count?: number | null
          opened_at?: string | null
          provider_id?: string | null
          provider_response?: Json | null
          recipient_id?: string | null
          sent_at?: string | null
          status?: string | null
          unsubscribe_reason?: string | null
          unsubscribed_at?: string | null
          updated_at?: string | null
        }
        Update: {
          bounce_reason?: string | null
          bounce_type?: string | null
          bounced_at?: string | null
          campaign_id?: string
          click_count?: number | null
          clicked_at?: string | null
          clicked_links?: Json | null
          created_at?: string | null
          delivered_at?: string | null
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          merge_data?: Json | null
          open_count?: number | null
          opened_at?: string | null
          provider_id?: string | null
          provider_response?: Json | null
          recipient_id?: string | null
          sent_at?: string | null
          status?: string | null
          unsubscribe_reason?: string | null
          unsubscribed_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'campaign_recipients_campaign_id_fkey'
            columns: ['campaign_id']
            isOneToOne: false
            referencedRelation: 'email_campaigns'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'campaign_recipients_recipient_id_fkey'
            columns: ['recipient_id']
            isOneToOne: false
            referencedRelation: 'waitlist'
            referencedColumns: ['id']
          },
        ]
      }
      email_campaigns: {
        Row: {
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          description: string | null
          from_email: string | null
          from_name: string | null
          html_content: string | null
          id: string
          metrics: Json | null
          name: string
          preview_text: string | null
          recipient_count: number | null
          recipient_filter: Json | null
          reply_to_email: string | null
          scheduled_at: string | null
          sent_at: string | null
          settings: Json | null
          status: string | null
          subject: string
          template_id: string | null
          text_content: string | null
          type: string | null
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          from_email?: string | null
          from_name?: string | null
          html_content?: string | null
          id?: string
          metrics?: Json | null
          name: string
          preview_text?: string | null
          recipient_count?: number | null
          recipient_filter?: Json | null
          reply_to_email?: string | null
          scheduled_at?: string | null
          sent_at?: string | null
          settings?: Json | null
          status?: string | null
          subject: string
          template_id?: string | null
          text_content?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          from_email?: string | null
          from_name?: string | null
          html_content?: string | null
          id?: string
          metrics?: Json | null
          name?: string
          preview_text?: string | null
          recipient_count?: number | null
          recipient_filter?: Json | null
          reply_to_email?: string | null
          scheduled_at?: string | null
          sent_at?: string | null
          settings?: Json | null
          status?: string | null
          subject?: string
          template_id?: string | null
          text_content?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'email_campaigns_template_id_fkey'
            columns: ['template_id']
            isOneToOne: false
            referencedRelation: 'email_templates'
            referencedColumns: ['id']
          },
        ]
      }
      email_templates: {
        Row: {
          category: string | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          description: string | null
          from_email: string | null
          from_name: string | null
          html_content: string
          id: string
          is_active: boolean | null
          is_default: boolean | null
          name: string
          preview_text: string | null
          reply_to_email: string | null
          subject: string
          text_content: string | null
          updated_at: string | null
          variables: Json | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          from_email?: string | null
          from_name?: string | null
          html_content: string
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name: string
          preview_text?: string | null
          reply_to_email?: string | null
          subject: string
          text_content?: string | null
          updated_at?: string | null
          variables?: Json | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          from_email?: string | null
          from_name?: string | null
          html_content?: string
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name?: string
          preview_text?: string | null
          reply_to_email?: string | null
          subject?: string
          text_content?: string | null
          updated_at?: string | null
          variables?: Json | null
        }
        Relationships: []
      }
      email_unsubscribes: {
        Row: {
          campaign_id: string | null
          email: string
          feedback: string | null
          id: string
          ip_address: unknown
          reason: string | null
          resubscribed_at: string | null
          unsubscribe_token: string | null
          unsubscribed_at: string | null
          user_agent: string | null
        }
        Insert: {
          campaign_id?: string | null
          email: string
          feedback?: string | null
          id?: string
          ip_address?: unknown
          reason?: string | null
          resubscribed_at?: string | null
          unsubscribe_token?: string | null
          unsubscribed_at?: string | null
          user_agent?: string | null
        }
        Update: {
          campaign_id?: string | null
          email?: string
          feedback?: string | null
          id?: string
          ip_address?: unknown
          reason?: string | null
          resubscribed_at?: string | null
          unsubscribe_token?: string | null
          unsubscribed_at?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'email_unsubscribes_campaign_id_fkey'
            columns: ['campaign_id']
            isOneToOne: false
            referencedRelation: 'email_campaigns'
            referencedColumns: ['id']
          },
        ]
      }
      plans: {
        Row: {
          completed_at: string | null
          completion_rate: number | null
          created_at: string
          evening_notes: string | null
          id: string
          locked_at: string | null
          morning_notes: string | null
          planned_for: string
          status: Database['public']['Enums']['plan_status']
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          completion_rate?: number | null
          created_at?: string
          evening_notes?: string | null
          id?: string
          locked_at?: string | null
          morning_notes?: string | null
          planned_for: string
          status?: Database['public']['Enums']['plan_status']
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          completion_rate?: number | null
          created_at?: string
          evening_notes?: string | null
          id?: string
          locked_at?: string | null
          morning_notes?: string | null
          planned_for?: string
          status?: Database['public']['Enums']['plan_status']
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'plans_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      profiles: {
        Row: {
          auto_sort_categories: boolean | null
          avatar_url: string | null
          created_at: string
          deleted_at: string | null
          deletion_scheduled_for: string | null
          email: string
          execution_reminder_time: string | null
          full_name: string | null
          id: string
          notification_onboarding_completed: boolean
          planning_reminder_time: string | null
          revenuecat_user_id: string | null
          subscription_expires_at: string | null
          subscription_status: string | null
          tier: Database['public']['Enums']['tier']
          timezone: string | null
          trial_ends_at: string | null
          trial_started_at: string | null
          updated_at: string
        }
        Insert: {
          auto_sort_categories?: boolean | null
          avatar_url?: string | null
          created_at?: string
          deleted_at?: string | null
          deletion_scheduled_for?: string | null
          email: string
          execution_reminder_time?: string | null
          full_name?: string | null
          id: string
          notification_onboarding_completed?: boolean
          planning_reminder_time?: string | null
          revenuecat_user_id?: string | null
          subscription_expires_at?: string | null
          subscription_status?: string | null
          tier?: Database['public']['Enums']['tier']
          timezone?: string | null
          trial_ends_at?: string | null
          trial_started_at?: string | null
          updated_at?: string
        }
        Update: {
          auto_sort_categories?: boolean | null
          avatar_url?: string | null
          created_at?: string
          deleted_at?: string | null
          deletion_scheduled_for?: string | null
          email?: string
          execution_reminder_time?: string | null
          full_name?: string | null
          id?: string
          notification_onboarding_completed?: boolean
          planning_reminder_time?: string | null
          revenuecat_user_id?: string | null
          subscription_expires_at?: string | null
          subscription_status?: string | null
          tier?: Database['public']['Enums']['tier']
          timezone?: string | null
          trial_ends_at?: string | null
          trial_started_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      system_categories: {
        Row: {
          color: string
          created_at: string
          icon: string
          id: string
          is_active: boolean
          name: string
          position: number
        }
        Insert: {
          color: string
          created_at?: string
          icon: string
          id?: string
          is_active?: boolean
          name: string
          position?: number
        }
        Update: {
          color?: string
          created_at?: string
          icon?: string
          id?: string
          is_active?: boolean
          name?: string
          position?: number
        }
        Relationships: []
      }
      task_time_blocks: {
        Row: {
          created_at: string
          duration_minutes: number | null
          end_time: string
          id: string
          start_time: string
          task_id: string
        }
        Insert: {
          created_at?: string
          duration_minutes?: number | null
          end_time: string
          id?: string
          start_time: string
          task_id: string
        }
        Update: {
          created_at?: string
          duration_minutes?: number | null
          end_time?: string
          id?: string
          start_time?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'task_time_blocks_task_id_fkey'
            columns: ['task_id']
            isOneToOne: false
            referencedRelation: 'tasks'
            referencedColumns: ['id']
          },
        ]
      }
      tasks: {
        Row: {
          completed_at: string | null
          completed_duration_minutes: number | null
          created_at: string
          description: string | null
          estimated_duration_minutes: number | null
          id: string
          is_mit: boolean
          plan_id: string
          position: number
          priority: Database['public']['Enums']['task_priority'] | null
          system_category_id: string | null
          title: string
          updated_at: string
          user_category_id: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          completed_duration_minutes?: number | null
          created_at?: string
          description?: string | null
          estimated_duration_minutes?: number | null
          id?: string
          is_mit?: boolean
          plan_id: string
          position?: number
          priority?: Database['public']['Enums']['task_priority'] | null
          system_category_id?: string | null
          title: string
          updated_at?: string
          user_category_id?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          completed_duration_minutes?: number | null
          created_at?: string
          description?: string | null
          estimated_duration_minutes?: number | null
          id?: string
          is_mit?: boolean
          plan_id?: string
          position?: number
          priority?: Database['public']['Enums']['task_priority'] | null
          system_category_id?: string | null
          title?: string
          updated_at?: string
          user_category_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'tasks_plan_id_fkey'
            columns: ['plan_id']
            isOneToOne: false
            referencedRelation: 'plans'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tasks_system_category_id_fkey'
            columns: ['system_category_id']
            isOneToOne: false
            referencedRelation: 'system_categories'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tasks_user_category_id_fkey'
            columns: ['user_category_id']
            isOneToOne: false
            referencedRelation: 'user_categories'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tasks_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      user_categories: {
        Row: {
          color: string
          created_at: string
          icon: string
          id: string
          is_favorite: boolean | null
          name: string
          position: number
          updated_at: string
          usage_count: number | null
          user_id: string
        }
        Insert: {
          color: string
          created_at?: string
          icon: string
          id?: string
          is_favorite?: boolean | null
          name: string
          position?: number
          updated_at?: string
          usage_count?: number | null
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          icon?: string
          id?: string
          is_favorite?: boolean | null
          name?: string
          position?: number
          updated_at?: string
          usage_count?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'user_categories_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      user_category_preferences: {
        Row: {
          created_at: string | null
          id: string
          is_favorite: boolean | null
          position: number | null
          system_category_id: string
          updated_at: string | null
          usage_count: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_favorite?: boolean | null
          position?: number | null
          system_category_id: string
          updated_at?: string | null
          usage_count?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_favorite?: boolean | null
          position?: number | null
          system_category_id?: string
          updated_at?: string | null
          usage_count?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'user_category_preferences_system_category_id_fkey'
            columns: ['system_category_id']
            isOneToOne: false
            referencedRelation: 'system_categories'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'user_category_preferences_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      waitlist: {
        Row: {
          confirmed: boolean | null
          confirmed_at: string | null
          created_at: string | null
          email: string
          id: string
          invited_at: string | null
          metadata: Json | null
          name: string | null
          referral_type: string | null
          status: string | null
        }
        Insert: {
          confirmed?: boolean | null
          confirmed_at?: string | null
          created_at?: string | null
          email: string
          id?: string
          invited_at?: string | null
          metadata?: Json | null
          name?: string | null
          referral_type?: string | null
          status?: string | null
        }
        Update: {
          confirmed?: boolean | null
          confirmed_at?: string | null
          created_at?: string | null
          email?: string
          id?: string
          invited_at?: string | null
          metadata?: Json | null
          name?: string | null
          referral_type?: string | null
          status?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_add_task: { Args: { p_plan_id: string }; Returns: boolean }
      can_add_task_to_plan: {
        Args: { p_plan_id: string; p_user_id: string }
        Returns: boolean
      }
      cancel_account_deletion: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      cleanup_expired_sessions: { Args: never; Returns: undefined }
      delete_expired_accounts: { Args: never; Returns: undefined }
      get_favorite_category_ids: { Args: { p_user_id: string }; Returns: Json }
      get_or_create_plan: { Args: { p_date: string }; Returns: string }
      get_remaining_task_slots: {
        Args: { p_plan_id: string; p_user_id: string }
        Returns: number
      }
      get_task_count_for_plan: { Args: { p_plan_id: string }; Returns: number }
      get_user_role_level: { Args: { p_user_id: string }; Returns: number }
      get_user_tier: { Args: { p_user_id: string }; Returns: string }
      has_permission: {
        Args: {
          p_action: Database['public']['Enums']['admin_action']
          p_resource: string
          p_user_id: string
        }
        Returns: boolean
      }
      has_premium_access: { Args: { p_user_id: string }; Returns: boolean }
      increment_category_usage: {
        Args: {
          p_system_category_id?: string
          p_user_category_id?: string
          p_user_id: string
        }
        Returns: undefined
      }
      is_email_subscribed: { Args: { p_email: string }; Returns: boolean }
      log_audit_event: {
        Args: {
          p_action: Database['public']['Enums']['audit_action']
          p_description?: string
          p_metadata?: Json
          p_new_values?: Json
          p_old_values?: Json
          p_resource_id?: string
          p_resource_type: string
          p_user_id: string
        }
        Returns: string
      }
      schedule_account_deletion: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      sync_auth_user_to_profile: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      update_campaign_metrics: {
        Args: { p_campaign_id: string }
        Returns: undefined
      }
      update_category_positions: {
        Args: { p_category_positions: Json; p_user_id: string }
        Returns: undefined
      }
      update_favorite_categories: {
        Args: { p_favorite_category_ids: Json; p_user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      admin_action: 'create' | 'read' | 'update' | 'delete' | 'export' | 'import' | 'execute'
      admin_role: 'super_admin' | 'admin' | 'editor' | 'viewer'
      app_phase: 'closed_beta' | 'open_beta' | 'production'
      audit_action:
        | 'create'
        | 'update'
        | 'delete'
        | 'login'
        | 'logout'
        | 'export'
        | 'import'
        | 'permission_change'
        | 'role_change'
        | 'settings_change'
        | 'login_attempt'
        | 'login_error'
        | 'read'
      plan_status: 'draft' | 'locked' | 'active' | 'completed'
      subscription_status_enum: 'none' | 'trialing' | 'active' | 'past_due' | 'canceled' | 'expired'
      task_priority: 'high' | 'medium' | 'low'
      tier: 'free' | 'premium' | 'lifetime'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      admin_action: ['create', 'read', 'update', 'delete', 'export', 'import', 'execute'],
      admin_role: ['super_admin', 'admin', 'editor', 'viewer'],
      app_phase: ['closed_beta', 'open_beta', 'production'],
      audit_action: [
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
        'read',
      ],
      plan_status: ['draft', 'locked', 'active', 'completed'],
      subscription_status_enum: ['none', 'trialing', 'active', 'past_due', 'canceled', 'expired'],
      task_priority: ['high', 'medium', 'low'],
      tier: ['free', 'premium', 'lifetime'],
    },
  },
} as const
