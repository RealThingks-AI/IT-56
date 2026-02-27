export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action_type: string
          created_at: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: unknown
          metadata: Json | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action_type: string
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      backup_restore_logs: {
        Row: {
          backup_id: string | null
          created_at: string | null
          error_message: string | null
          id: string
          records_restored: Json | null
          restored_at: string | null
          restored_by: string | null
          status: string | null
          tables_restored: string[] | null
        }
        Insert: {
          backup_id?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          records_restored?: Json | null
          restored_at?: string | null
          restored_by?: string | null
          status?: string | null
          tables_restored?: string[] | null
        }
        Update: {
          backup_id?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          records_restored?: Json | null
          restored_at?: string | null
          restored_by?: string | null
          status?: string | null
          tables_restored?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "backup_restore_logs_backup_id_fkey"
            columns: ["backup_id"]
            isOneToOne: false
            referencedRelation: "system_backups"
            referencedColumns: ["id"]
          },
        ]
      }
      backup_schedules: {
        Row: {
          backup_profile: Json | null
          backup_time: string | null
          created_at: string | null
          enabled: boolean | null
          frequency_days: number | null
          id: string
          last_backup_at: string | null
          next_backup_at: string | null
          notify_email: string | null
          notify_on_completion: boolean | null
          retention_count: number | null
          updated_at: string | null
        }
        Insert: {
          backup_profile?: Json | null
          backup_time?: string | null
          created_at?: string | null
          enabled?: boolean | null
          frequency_days?: number | null
          id?: string
          last_backup_at?: string | null
          next_backup_at?: string | null
          notify_email?: string | null
          notify_on_completion?: boolean | null
          retention_count?: number | null
          updated_at?: string | null
        }
        Update: {
          backup_profile?: Json | null
          backup_time?: string | null
          created_at?: string | null
          enabled?: boolean | null
          frequency_days?: number | null
          id?: string
          last_backup_at?: string | null
          next_backup_at?: string | null
          notify_email?: string | null
          notify_on_completion?: boolean | null
          retention_count?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      category_tag_formats: {
        Row: {
          category_id: string
          created_at: string | null
          current_number: number | null
          id: string
          prefix: string
          tenant_id: number | null
          updated_at: string | null
          zero_padding: number | null
        }
        Insert: {
          category_id: string
          created_at?: string | null
          current_number?: number | null
          id?: string
          prefix: string
          tenant_id?: number | null
          updated_at?: string | null
          zero_padding?: number | null
        }
        Update: {
          category_id?: string
          created_at?: string | null
          current_number?: number | null
          id?: string
          prefix?: string
          tenant_id?: number | null
          updated_at?: string | null
          zero_padding?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "category_tag_formats_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "itam_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      currencies: {
        Row: {
          code: string
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          name: string
          symbol: string
        }
        Insert: {
          code: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          symbol: string
        }
        Update: {
          code?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          symbol?: string
        }
        Relationships: []
      }
      helpdesk_automation_logs: {
        Row: {
          error_message: string | null
          executed_at: string | null
          id: number
          rule_id: number
          status: string | null
          ticket_id: number | null
          trigger_data: Json | null
        }
        Insert: {
          error_message?: string | null
          executed_at?: string | null
          id?: number
          rule_id: number
          status?: string | null
          ticket_id?: number | null
          trigger_data?: Json | null
        }
        Update: {
          error_message?: string | null
          executed_at?: string | null
          id?: number
          rule_id?: number
          status?: string | null
          ticket_id?: number | null
          trigger_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "helpdesk_automation_logs_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "helpdesk_automation_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "helpdesk_automation_logs_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "helpdesk_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      helpdesk_automation_rules: {
        Row: {
          actions: Json | null
          conditions: Json | null
          created_at: string | null
          created_by: string | null
          description: string | null
          execution_count: number | null
          execution_order: number | null
          id: number
          is_active: boolean | null
          last_executed_at: string | null
          name: string
          tenant_id: number
          trigger_type: string
          updated_at: string | null
        }
        Insert: {
          actions?: Json | null
          conditions?: Json | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          execution_count?: number | null
          execution_order?: number | null
          id?: number
          is_active?: boolean | null
          last_executed_at?: string | null
          name: string
          tenant_id?: number
          trigger_type: string
          updated_at?: string | null
        }
        Update: {
          actions?: Json | null
          conditions?: Json | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          execution_count?: number | null
          execution_order?: number | null
          id?: number
          is_active?: boolean | null
          last_executed_at?: string | null
          name?: string
          tenant_id?: number
          trigger_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "helpdesk_automation_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      helpdesk_canned_responses: {
        Row: {
          category_id: number | null
          content: string
          created_at: string | null
          created_by: string | null
          id: number
          is_public: boolean | null
          shortcut: string | null
          tenant_id: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          category_id?: number | null
          content: string
          created_at?: string | null
          created_by?: string | null
          id?: number
          is_public?: boolean | null
          shortcut?: string | null
          tenant_id?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          category_id?: number | null
          content?: string
          created_at?: string | null
          created_by?: string | null
          id?: number
          is_public?: boolean | null
          shortcut?: string | null
          tenant_id?: number | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "helpdesk_canned_responses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "helpdesk_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "helpdesk_canned_responses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "helpdesk_canned_responses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      helpdesk_categories: {
        Row: {
          created_at: string | null
          description: string | null
          id: number
          is_active: boolean | null
          is_deleted: boolean | null
          name: string
          parent_id: number | null
          tenant_id: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: number
          is_active?: boolean | null
          is_deleted?: boolean | null
          name: string
          parent_id?: number | null
          tenant_id?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: number
          is_active?: boolean | null
          is_deleted?: boolean | null
          name?: string
          parent_id?: number | null
          tenant_id?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "helpdesk_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "helpdesk_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "helpdesk_categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      helpdesk_change_approvals: {
        Row: {
          approved_at: string | null
          approver_id: string
          change_id: number
          comments: string | null
          created_at: string | null
          id: number
          status: string | null
        }
        Insert: {
          approved_at?: string | null
          approver_id: string
          change_id: number
          comments?: string | null
          created_at?: string | null
          id?: number
          status?: string | null
        }
        Update: {
          approved_at?: string | null
          approver_id?: string
          change_id?: number
          comments?: string | null
          created_at?: string | null
          id?: number
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "helpdesk_change_approvals_change_id_fkey"
            columns: ["change_id"]
            isOneToOne: false
            referencedRelation: "helpdesk_changes"
            referencedColumns: ["id"]
          },
        ]
      }
      helpdesk_changes: {
        Row: {
          actual_end: string | null
          actual_start: string | null
          approval_status: string | null
          assigned_to: string | null
          category_id: number | null
          change_number: string
          created_at: string | null
          description: string
          id: number
          impact: string | null
          implementation_plan: string | null
          priority: string | null
          requested_by: string | null
          requires_approval: boolean | null
          risk_level: string | null
          rollback_plan: string | null
          scheduled_end: string | null
          scheduled_start: string | null
          status: string | null
          tenant_id: number
          title: string
          type: string | null
          updated_at: string | null
        }
        Insert: {
          actual_end?: string | null
          actual_start?: string | null
          approval_status?: string | null
          assigned_to?: string | null
          category_id?: number | null
          change_number: string
          created_at?: string | null
          description: string
          id?: number
          impact?: string | null
          implementation_plan?: string | null
          priority?: string | null
          requested_by?: string | null
          requires_approval?: boolean | null
          risk_level?: string | null
          rollback_plan?: string | null
          scheduled_end?: string | null
          scheduled_start?: string | null
          status?: string | null
          tenant_id?: number
          title: string
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          actual_end?: string | null
          actual_start?: string | null
          approval_status?: string | null
          assigned_to?: string | null
          category_id?: number | null
          change_number?: string
          created_at?: string | null
          description?: string
          id?: number
          impact?: string | null
          implementation_plan?: string | null
          priority?: string | null
          requested_by?: string | null
          requires_approval?: boolean | null
          risk_level?: string | null
          rollback_plan?: string | null
          scheduled_end?: string | null
          scheduled_start?: string | null
          status?: string | null
          tenant_id?: number
          title?: string
          type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "helpdesk_changes_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "helpdesk_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "helpdesk_changes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      helpdesk_csat_ratings: {
        Row: {
          created_at: string | null
          feedback: string | null
          id: number
          rating: number | null
          submitted_by: string | null
          ticket_id: number | null
        }
        Insert: {
          created_at?: string | null
          feedback?: string | null
          id?: number
          rating?: number | null
          submitted_by?: string | null
          ticket_id?: number | null
        }
        Update: {
          created_at?: string | null
          feedback?: string | null
          id?: number
          rating?: number | null
          submitted_by?: string | null
          ticket_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "helpdesk_csat_ratings_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "helpdesk_csat_ratings_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: true
            referencedRelation: "helpdesk_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      helpdesk_kb_article_feedback: {
        Row: {
          article_id: number
          comment: string | null
          created_at: string | null
          id: number
          is_helpful: boolean
          user_id: string | null
        }
        Insert: {
          article_id: number
          comment?: string | null
          created_at?: string | null
          id?: number
          is_helpful: boolean
          user_id?: string | null
        }
        Update: {
          article_id?: number
          comment?: string | null
          created_at?: string | null
          id?: number
          is_helpful?: boolean
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "helpdesk_kb_article_feedback_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "helpdesk_kb_articles"
            referencedColumns: ["id"]
          },
        ]
      }
      helpdesk_kb_articles: {
        Row: {
          attachments: Json | null
          author_id: string | null
          category_id: number | null
          content: string
          created_at: string | null
          helpful_count: number | null
          id: number
          not_helpful_count: number | null
          published_at: string | null
          status: string | null
          summary: string | null
          tags: string[] | null
          tenant_id: number
          title: string
          updated_at: string | null
          views_count: number | null
        }
        Insert: {
          attachments?: Json | null
          author_id?: string | null
          category_id?: number | null
          content: string
          created_at?: string | null
          helpful_count?: number | null
          id?: number
          not_helpful_count?: number | null
          published_at?: string | null
          status?: string | null
          summary?: string | null
          tags?: string[] | null
          tenant_id?: number
          title: string
          updated_at?: string | null
          views_count?: number | null
        }
        Update: {
          attachments?: Json | null
          author_id?: string | null
          category_id?: number | null
          content?: string
          created_at?: string | null
          helpful_count?: number | null
          id?: number
          not_helpful_count?: number | null
          published_at?: string | null
          status?: string | null
          summary?: string | null
          tags?: string[] | null
          tenant_id?: number
          title?: string
          updated_at?: string | null
          views_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "helpdesk_kb_articles_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "helpdesk_kb_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "helpdesk_kb_articles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      helpdesk_kb_categories: {
        Row: {
          created_at: string | null
          description: string | null
          display_order: number | null
          icon: string | null
          id: number
          is_active: boolean | null
          name: string
          parent_id: number | null
          tenant_id: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: number
          is_active?: boolean | null
          name: string
          parent_id?: number | null
          tenant_id?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: number
          is_active?: boolean | null
          name?: string
          parent_id?: number | null
          tenant_id?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "helpdesk_kb_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "helpdesk_kb_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "helpdesk_kb_categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      helpdesk_problem_tickets: {
        Row: {
          created_at: string | null
          id: number
          problem_id: number
          ticket_id: number
        }
        Insert: {
          created_at?: string | null
          id?: number
          problem_id: number
          ticket_id: number
        }
        Update: {
          created_at?: string | null
          id?: number
          problem_id?: number
          ticket_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "helpdesk_problem_tickets_problem_id_fkey"
            columns: ["problem_id"]
            isOneToOne: false
            referencedRelation: "helpdesk_problems"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "helpdesk_problem_tickets_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "helpdesk_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      helpdesk_problems: {
        Row: {
          assigned_to: string | null
          category_id: number | null
          closed_at: string | null
          created_at: string | null
          created_by: string | null
          description: string
          id: number
          is_deleted: boolean | null
          linked_ticket_ids: string[] | null
          permanent_fix: string | null
          priority: string | null
          problem_number: string
          problem_title: string | null
          resolved_at: string | null
          root_cause: string | null
          solution: string | null
          status: string | null
          tenant_id: number
          title: string
          updated_at: string | null
          updated_by: string | null
          workaround: string | null
        }
        Insert: {
          assigned_to?: string | null
          category_id?: number | null
          closed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description: string
          id?: number
          is_deleted?: boolean | null
          linked_ticket_ids?: string[] | null
          permanent_fix?: string | null
          priority?: string | null
          problem_number: string
          problem_title?: string | null
          resolved_at?: string | null
          root_cause?: string | null
          solution?: string | null
          status?: string | null
          tenant_id?: number
          title: string
          updated_at?: string | null
          updated_by?: string | null
          workaround?: string | null
        }
        Update: {
          assigned_to?: string | null
          category_id?: number | null
          closed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string
          id?: number
          is_deleted?: boolean | null
          linked_ticket_ids?: string[] | null
          permanent_fix?: string | null
          priority?: string | null
          problem_number?: string
          problem_title?: string | null
          resolved_at?: string | null
          root_cause?: string | null
          solution?: string | null
          status?: string | null
          tenant_id?: number
          title?: string
          updated_at?: string | null
          updated_by?: string | null
          workaround?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "helpdesk_problems_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "helpdesk_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "helpdesk_problems_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      helpdesk_queue_members: {
        Row: {
          agent_id: string
          created_at: string | null
          id: number
          is_active: boolean | null
          max_concurrent_tickets: number | null
          queue_id: number
        }
        Insert: {
          agent_id: string
          created_at?: string | null
          id?: number
          is_active?: boolean | null
          max_concurrent_tickets?: number | null
          queue_id: number
        }
        Update: {
          agent_id?: string
          created_at?: string | null
          id?: number
          is_active?: boolean | null
          max_concurrent_tickets?: number | null
          queue_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "helpdesk_queue_members_queue_id_fkey"
            columns: ["queue_id"]
            isOneToOne: false
            referencedRelation: "helpdesk_queues"
            referencedColumns: ["id"]
          },
        ]
      }
      helpdesk_queues: {
        Row: {
          assignment_method: string | null
          auto_assign: boolean | null
          created_at: string | null
          description: string | null
          email_address: string | null
          id: number
          is_active: boolean | null
          name: string
          sla_policy_id: number | null
          tenant_id: number
          updated_at: string | null
        }
        Insert: {
          assignment_method?: string | null
          auto_assign?: boolean | null
          created_at?: string | null
          description?: string | null
          email_address?: string | null
          id?: number
          is_active?: boolean | null
          name: string
          sla_policy_id?: number | null
          tenant_id?: number
          updated_at?: string | null
        }
        Update: {
          assignment_method?: string | null
          auto_assign?: boolean | null
          created_at?: string | null
          description?: string | null
          email_address?: string | null
          id?: number
          is_active?: boolean | null
          name?: string
          sla_policy_id?: number | null
          tenant_id?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "helpdesk_queues_sla_policy_id_fkey"
            columns: ["sla_policy_id"]
            isOneToOne: false
            referencedRelation: "helpdesk_sla_policies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "helpdesk_queues_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      helpdesk_saved_views: {
        Row: {
          created_at: string | null
          filters: Json | null
          id: number
          is_default: boolean | null
          is_shared: boolean | null
          name: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          filters?: Json | null
          id?: number
          is_default?: boolean | null
          is_shared?: boolean | null
          name: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          filters?: Json | null
          id?: number
          is_default?: boolean | null
          is_shared?: boolean | null
          name?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "helpdesk_saved_views_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      helpdesk_sla_policies: {
        Row: {
          created_at: string | null
          escalation_rule: Json | null
          id: number
          is_active: boolean | null
          name: string
          priority: string
          resolution_time_hours: number
          resolution_time_minutes: number | null
          response_time_hours: number
          response_time_minutes: number | null
          tenant_id: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          escalation_rule?: Json | null
          id?: number
          is_active?: boolean | null
          name: string
          priority: string
          resolution_time_hours: number
          resolution_time_minutes?: number | null
          response_time_hours: number
          response_time_minutes?: number | null
          tenant_id?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          escalation_rule?: Json | null
          id?: number
          is_active?: boolean | null
          name?: string
          priority?: string
          resolution_time_hours?: number
          resolution_time_minutes?: number | null
          response_time_hours?: number
          response_time_minutes?: number | null
          tenant_id?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "helpdesk_sla_policies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      helpdesk_ticket_attachments: {
        Row: {
          created_at: string | null
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: number
          tenant_id: number
          ticket_id: number
          uploaded_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string | null
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: number
          tenant_id?: number
          ticket_id: number
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string | null
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: number
          tenant_id?: number
          ticket_id?: number
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "helpdesk_ticket_attachments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "helpdesk_ticket_attachments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "helpdesk_tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "helpdesk_ticket_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      helpdesk_ticket_comments: {
        Row: {
          attachments: Json | null
          comment: string
          created_at: string | null
          id: number
          is_internal: boolean | null
          tenant_id: number
          ticket_id: number
          updated_at: string | null
          updated_by: string | null
          user_id: string
        }
        Insert: {
          attachments?: Json | null
          comment: string
          created_at?: string | null
          id?: number
          is_internal?: boolean | null
          tenant_id?: number
          ticket_id: number
          updated_at?: string | null
          updated_by?: string | null
          user_id: string
        }
        Update: {
          attachments?: Json | null
          comment?: string
          created_at?: string | null
          id?: number
          is_internal?: boolean | null
          tenant_id?: number
          ticket_id?: number
          updated_at?: string | null
          updated_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "helpdesk_ticket_comments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "helpdesk_ticket_comments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "helpdesk_tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "helpdesk_ticket_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      helpdesk_ticket_history: {
        Row: {
          created_at: string | null
          field_name: string
          id: number
          new_value: string | null
          old_value: string | null
          tenant_id: number
          ticket_id: number
          timestamp: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          field_name: string
          id?: number
          new_value?: string | null
          old_value?: string | null
          tenant_id?: number
          ticket_id: number
          timestamp?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          field_name?: string
          id?: number
          new_value?: string | null
          old_value?: string | null
          tenant_id?: number
          ticket_id?: number
          timestamp?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "helpdesk_ticket_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "helpdesk_ticket_history_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "helpdesk_tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "helpdesk_ticket_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      helpdesk_ticket_templates: {
        Row: {
          category_id: number | null
          created_at: string | null
          created_by: string | null
          description: string | null
          form_fields: Json | null
          id: number
          is_active: boolean | null
          name: string
          priority: string | null
          tenant_id: number | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          category_id?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          form_fields?: Json | null
          id?: number
          is_active?: boolean | null
          name: string
          priority?: string | null
          tenant_id?: number | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          category_id?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          form_fields?: Json | null
          id?: number
          is_active?: boolean | null
          name?: string
          priority?: string | null
          tenant_id?: number | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "helpdesk_ticket_templates_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "helpdesk_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "helpdesk_ticket_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "helpdesk_ticket_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      helpdesk_ticket_watchers: {
        Row: {
          added_at: string | null
          added_by: string | null
          id: number
          ticket_id: number | null
          user_id: string | null
        }
        Insert: {
          added_at?: string | null
          added_by?: string | null
          id?: number
          ticket_id?: number | null
          user_id?: string | null
        }
        Update: {
          added_at?: string | null
          added_by?: string | null
          id?: number
          ticket_id?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "helpdesk_ticket_watchers_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "helpdesk_ticket_watchers_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "helpdesk_tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "helpdesk_ticket_watchers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      helpdesk_tickets: {
        Row: {
          additional_notes: string | null
          assignee_id: string | null
          attachments: Json | null
          catalog_item_id: number | null
          category_id: number | null
          closed_at: string | null
          created_at: string | null
          created_by: string | null
          description: string
          first_response_at: string | null
          form_data: Json | null
          fulfilled_at: string | null
          id: number
          is_deleted: boolean | null
          is_escalated: boolean | null
          merged_into_id: number | null
          priority: string
          queue_id: number | null
          rejected_at: string | null
          rejection_reason: string | null
          request_type: Database["public"]["Enums"]["request_type"] | null
          requester_id: string | null
          resolution_comments: string | null
          resolution_summary: string | null
          resolved_at: string | null
          root_cause: string | null
          sla_breached: boolean | null
          sla_due_date: string | null
          sla_policy_id: number | null
          status: string
          subcategory: string | null
          tags: string[] | null
          team: string | null
          tenant_id: number
          ticket_number: string
          time_spent_minutes: number | null
          title: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          additional_notes?: string | null
          assignee_id?: string | null
          attachments?: Json | null
          catalog_item_id?: number | null
          category_id?: number | null
          closed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description: string
          first_response_at?: string | null
          form_data?: Json | null
          fulfilled_at?: string | null
          id?: number
          is_deleted?: boolean | null
          is_escalated?: boolean | null
          merged_into_id?: number | null
          priority?: string
          queue_id?: number | null
          rejected_at?: string | null
          rejection_reason?: string | null
          request_type?: Database["public"]["Enums"]["request_type"] | null
          requester_id?: string | null
          resolution_comments?: string | null
          resolution_summary?: string | null
          resolved_at?: string | null
          root_cause?: string | null
          sla_breached?: boolean | null
          sla_due_date?: string | null
          sla_policy_id?: number | null
          status?: string
          subcategory?: string | null
          tags?: string[] | null
          team?: string | null
          tenant_id?: number
          ticket_number: string
          time_spent_minutes?: number | null
          title: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          additional_notes?: string | null
          assignee_id?: string | null
          attachments?: Json | null
          catalog_item_id?: number | null
          category_id?: number | null
          closed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string
          first_response_at?: string | null
          form_data?: Json | null
          fulfilled_at?: string | null
          id?: number
          is_deleted?: boolean | null
          is_escalated?: boolean | null
          merged_into_id?: number | null
          priority?: string
          queue_id?: number | null
          rejected_at?: string | null
          rejection_reason?: string | null
          request_type?: Database["public"]["Enums"]["request_type"] | null
          requester_id?: string | null
          resolution_comments?: string | null
          resolution_summary?: string | null
          resolved_at?: string | null
          root_cause?: string | null
          sla_breached?: boolean | null
          sla_due_date?: string | null
          sla_policy_id?: number | null
          status?: string
          subcategory?: string | null
          tags?: string[] | null
          team?: string | null
          tenant_id?: number
          ticket_number?: string
          time_spent_minutes?: number | null
          title?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "helpdesk_tickets_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "helpdesk_tickets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "helpdesk_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "helpdesk_tickets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "helpdesk_tickets_merged_into_id_fkey"
            columns: ["merged_into_id"]
            isOneToOne: false
            referencedRelation: "helpdesk_tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "helpdesk_tickets_queue_id_fkey"
            columns: ["queue_id"]
            isOneToOne: false
            referencedRelation: "helpdesk_queues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "helpdesk_tickets_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "helpdesk_tickets_sla_policy_id_fkey"
            columns: ["sla_policy_id"]
            isOneToOne: false
            referencedRelation: "helpdesk_sla_policies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "helpdesk_tickets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      helpdesk_time_entries: {
        Row: {
          created_at: string | null
          description: string | null
          id: number
          is_billable: boolean | null
          minutes: number
          ticket_id: number | null
          user_id: string | null
          work_date: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: number
          is_billable?: boolean | null
          minutes: number
          ticket_id?: number | null
          user_id?: string | null
          work_date?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: number
          is_billable?: boolean | null
          minutes?: number
          ticket_id?: number | null
          user_id?: string | null
          work_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "helpdesk_time_entries_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "helpdesk_tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "helpdesk_time_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      itam_asset_assignments: {
        Row: {
          asset_id: string
          assigned_at: string | null
          assigned_by: string | null
          assigned_to: string
          created_at: string | null
          id: string
          notes: string | null
          returned_at: string | null
          tenant_id: number | null
        }
        Insert: {
          asset_id: string
          assigned_at?: string | null
          assigned_by?: string | null
          assigned_to: string
          created_at?: string | null
          id?: string
          notes?: string | null
          returned_at?: string | null
          tenant_id?: number | null
        }
        Update: {
          asset_id?: string
          assigned_at?: string | null
          assigned_by?: string | null
          assigned_to?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          returned_at?: string | null
          tenant_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "itam_asset_assignments_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "itam_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itam_asset_assignments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      itam_asset_documents: {
        Row: {
          asset_id: string
          created_at: string | null
          document_type: string | null
          file_path: string
          file_size: number | null
          id: string
          mime_type: string | null
          name: string
          uploaded_by: string | null
        }
        Insert: {
          asset_id: string
          created_at?: string | null
          document_type?: string | null
          file_path: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          name: string
          uploaded_by?: string | null
        }
        Update: {
          asset_id?: string
          created_at?: string | null
          document_type?: string | null
          file_path?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          name?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "itam_asset_documents_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "itam_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      itam_asset_history: {
        Row: {
          action: string
          asset_id: string
          asset_tag: string | null
          created_at: string | null
          details: Json | null
          id: string
          new_value: string | null
          old_value: string | null
          performed_by: string | null
          tenant_id: number | null
        }
        Insert: {
          action: string
          asset_id: string
          asset_tag?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          performed_by?: string | null
          tenant_id?: number | null
        }
        Update: {
          action?: string
          asset_id?: string
          asset_tag?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          performed_by?: string | null
          tenant_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "itam_asset_history_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "itam_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itam_asset_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      itam_asset_links: {
        Row: {
          child_asset_id: string
          created_at: string | null
          created_by: string | null
          id: string
          link_type: string | null
          notes: string | null
          parent_asset_id: string
        }
        Insert: {
          child_asset_id: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          link_type?: string | null
          notes?: string | null
          parent_asset_id: string
        }
        Update: {
          child_asset_id?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          link_type?: string | null
          notes?: string | null
          parent_asset_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "itam_asset_links_child_asset_id_fkey"
            columns: ["child_asset_id"]
            isOneToOne: false
            referencedRelation: "itam_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itam_asset_links_parent_asset_id_fkey"
            columns: ["parent_asset_id"]
            isOneToOne: false
            referencedRelation: "itam_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      itam_asset_reservations: {
        Row: {
          asset_id: string
          created_at: string | null
          end_date: string
          id: string
          notes: string | null
          purpose: string | null
          reserved_by: string | null
          reserved_for: string | null
          reserved_for_name: string | null
          start_date: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          asset_id: string
          created_at?: string | null
          end_date: string
          id?: string
          notes?: string | null
          purpose?: string | null
          reserved_by?: string | null
          reserved_for?: string | null
          reserved_for_name?: string | null
          start_date: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          asset_id?: string
          created_at?: string | null
          end_date?: string
          id?: string
          notes?: string | null
          purpose?: string | null
          reserved_by?: string | null
          reserved_for?: string | null
          reserved_for_name?: string | null
          start_date?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "itam_asset_reservations_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "itam_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itam_asset_reservations_reserved_for_fkey"
            columns: ["reserved_for"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      itam_assets: {
        Row: {
          asset_id: string
          asset_tag: string | null
          assigned_to: string | null
          category_id: string | null
          check_out_notes: string | null
          checked_out_at: string | null
          checked_out_to: string | null
          created_at: string | null
          created_by: string | null
          custom_fields: Json | null
          department_id: string | null
          depreciation_method: string | null
          description: string | null
          expected_return_date: string | null
          id: string
          is_active: boolean | null
          location_id: string | null
          make_id: string | null
          model: string | null
          name: string
          notes: string | null
          purchase_date: string | null
          purchase_price: number | null
          qr_code: string | null
          salvage_value: number | null
          serial_number: string | null
          status: string | null
          tenant_id: number | null
          updated_at: string | null
          updated_by: string | null
          useful_life_years: number | null
          vendor_id: string | null
          warranty_expiry: string | null
        }
        Insert: {
          asset_id: string
          asset_tag?: string | null
          assigned_to?: string | null
          category_id?: string | null
          check_out_notes?: string | null
          checked_out_at?: string | null
          checked_out_to?: string | null
          created_at?: string | null
          created_by?: string | null
          custom_fields?: Json | null
          department_id?: string | null
          depreciation_method?: string | null
          description?: string | null
          expected_return_date?: string | null
          id?: string
          is_active?: boolean | null
          location_id?: string | null
          make_id?: string | null
          model?: string | null
          name: string
          notes?: string | null
          purchase_date?: string | null
          purchase_price?: number | null
          qr_code?: string | null
          salvage_value?: number | null
          serial_number?: string | null
          status?: string | null
          tenant_id?: number | null
          updated_at?: string | null
          updated_by?: string | null
          useful_life_years?: number | null
          vendor_id?: string | null
          warranty_expiry?: string | null
        }
        Update: {
          asset_id?: string
          asset_tag?: string | null
          assigned_to?: string | null
          category_id?: string | null
          check_out_notes?: string | null
          checked_out_at?: string | null
          checked_out_to?: string | null
          created_at?: string | null
          created_by?: string | null
          custom_fields?: Json | null
          department_id?: string | null
          depreciation_method?: string | null
          description?: string | null
          expected_return_date?: string | null
          id?: string
          is_active?: boolean | null
          location_id?: string | null
          make_id?: string | null
          model?: string | null
          name?: string
          notes?: string | null
          purchase_date?: string | null
          purchase_price?: number | null
          qr_code?: string | null
          salvage_value?: number | null
          serial_number?: string | null
          status?: string | null
          tenant_id?: number | null
          updated_at?: string | null
          updated_by?: string | null
          useful_life_years?: number | null
          vendor_id?: string | null
          warranty_expiry?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "itam_assets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "itam_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itam_assets_checked_out_to_fkey"
            columns: ["checked_out_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itam_assets_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "itam_departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itam_assets_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "itam_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itam_assets_make_id_fkey"
            columns: ["make_id"]
            isOneToOne: false
            referencedRelation: "itam_makes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itam_assets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itam_assets_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "itam_vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      itam_categories: {
        Row: {
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          parent_id: string | null
          tenant_id: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          parent_id?: string | null
          tenant_id?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          parent_id?: string | null
          tenant_id?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "itam_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "itam_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itam_categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      itam_company_info: {
        Row: {
          address: string | null
          company_name: string | null
          created_at: string | null
          email: string | null
          id: string
          logo_url: string | null
          phone: string | null
          tenant_id: number | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          company_name?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          phone?: string | null
          tenant_id?: number | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          company_name?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          phone?: string | null
          tenant_id?: number | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "itam_company_info_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      itam_departments: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          manager_id: string | null
          name: string
          tenant_id: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          manager_id?: string | null
          name: string
          tenant_id?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          manager_id?: string | null
          name?: string
          tenant_id?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "itam_departments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      itam_depreciation_profiles: {
        Row: {
          category_id: string | null
          created_at: string
          id: string
          is_active: boolean
          method: string
          name: string
          salvage_value_percent: number
          updated_at: string
          useful_life_years: number
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          method?: string
          name: string
          salvage_value_percent?: number
          updated_at?: string
          useful_life_years?: number
        }
        Update: {
          category_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          method?: string
          name?: string
          salvage_value_percent?: number
          updated_at?: string
          useful_life_years?: number
        }
        Relationships: [
          {
            foreignKeyName: "itam_depreciation_profiles_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "itam_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      itam_email_config: {
        Row: {
          config_key: string
          config_type: string
          config_value: Json
          created_at: string | null
          id: string
          tenant_id: number | null
          updated_at: string | null
        }
        Insert: {
          config_key: string
          config_type: string
          config_value?: Json
          created_at?: string | null
          id?: string
          tenant_id?: number | null
          updated_at?: string | null
        }
        Update: {
          config_key?: string
          config_type?: string
          config_value?: Json
          created_at?: string | null
          id?: string
          tenant_id?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      itam_license_allocations: {
        Row: {
          allocated_at: string | null
          asset_id: string | null
          created_at: string | null
          deallocated_at: string | null
          id: string
          license_id: string
          notes: string | null
          tenant_id: number | null
          user_id: string | null
        }
        Insert: {
          allocated_at?: string | null
          asset_id?: string | null
          created_at?: string | null
          deallocated_at?: string | null
          id?: string
          license_id: string
          notes?: string | null
          tenant_id?: number | null
          user_id?: string | null
        }
        Update: {
          allocated_at?: string | null
          asset_id?: string | null
          created_at?: string | null
          deallocated_at?: string | null
          id?: string
          license_id?: string
          notes?: string | null
          tenant_id?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "itam_license_allocations_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "itam_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itam_license_allocations_license_id_fkey"
            columns: ["license_id"]
            isOneToOne: false
            referencedRelation: "itam_licenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itam_license_allocations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      itam_licenses: {
        Row: {
          cost: number | null
          created_at: string | null
          expiry_date: string | null
          id: string
          is_active: boolean | null
          license_key: string | null
          license_type: string | null
          name: string
          notes: string | null
          purchase_date: string | null
          seats_allocated: number | null
          seats_total: number | null
          tenant_id: number | null
          updated_at: string | null
          vendor_id: string | null
        }
        Insert: {
          cost?: number | null
          created_at?: string | null
          expiry_date?: string | null
          id?: string
          is_active?: boolean | null
          license_key?: string | null
          license_type?: string | null
          name: string
          notes?: string | null
          purchase_date?: string | null
          seats_allocated?: number | null
          seats_total?: number | null
          tenant_id?: number | null
          updated_at?: string | null
          vendor_id?: string | null
        }
        Update: {
          cost?: number | null
          created_at?: string | null
          expiry_date?: string | null
          id?: string
          is_active?: boolean | null
          license_key?: string | null
          license_type?: string | null
          name?: string
          notes?: string | null
          purchase_date?: string | null
          seats_allocated?: number | null
          seats_total?: number | null
          tenant_id?: number | null
          updated_at?: string | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "itam_licenses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itam_licenses_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "itam_vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      itam_locations: {
        Row: {
          created_at: string | null
          floor: string | null
          id: string
          is_active: boolean | null
          name: string
          room: string | null
          site_id: string | null
          tenant_id: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          floor?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          room?: string | null
          site_id?: string | null
          tenant_id?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          floor?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          room?: string | null
          site_id?: string | null
          tenant_id?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "itam_locations_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "itam_sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itam_locations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      itam_maintenance_schedules: {
        Row: {
          asset_id: string
          assigned_to: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          frequency: string | null
          id: string
          is_active: boolean | null
          last_completed_date: string | null
          next_due_date: string | null
          notify_before_days: number | null
          schedule_type: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          asset_id: string
          assigned_to?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          frequency?: string | null
          id?: string
          is_active?: boolean | null
          last_completed_date?: string | null
          next_due_date?: string | null
          notify_before_days?: number | null
          schedule_type?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          asset_id?: string
          assigned_to?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          frequency?: string | null
          id?: string
          is_active?: boolean | null
          last_completed_date?: string | null
          next_due_date?: string | null
          notify_before_days?: number | null
          schedule_type?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "itam_maintenance_schedules_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "itam_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itam_maintenance_schedules_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      itam_makes: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          support_email: string | null
          support_phone: string | null
          tenant_id: number | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          support_email?: string | null
          support_phone?: string | null
          tenant_id?: number | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          support_email?: string | null
          support_phone?: string | null
          tenant_id?: number | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "itam_makes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      itam_purchase_orders: {
        Row: {
          created_at: string | null
          created_by: string | null
          expected_date: string | null
          id: string
          items: Json | null
          notes: string | null
          order_date: string | null
          po_number: string
          received_date: string | null
          status: string | null
          tenant_id: number | null
          total_amount: number | null
          updated_at: string | null
          vendor_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          expected_date?: string | null
          id?: string
          items?: Json | null
          notes?: string | null
          order_date?: string | null
          po_number: string
          received_date?: string | null
          status?: string | null
          tenant_id?: number | null
          total_amount?: number | null
          updated_at?: string | null
          vendor_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          expected_date?: string | null
          id?: string
          items?: Json | null
          notes?: string | null
          order_date?: string | null
          po_number?: string
          received_date?: string | null
          status?: string | null
          tenant_id?: number | null
          total_amount?: number | null
          updated_at?: string | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "itam_purchase_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itam_purchase_orders_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "itam_vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      itam_repairs: {
        Row: {
          asset_id: string | null
          completed_at: string | null
          cost: number | null
          created_at: string | null
          created_by: string | null
          diagnosis: string | null
          id: string
          issue_description: string
          notes: string | null
          repair_number: string | null
          resolution: string | null
          started_at: string | null
          status: string | null
          tenant_id: number | null
          updated_at: string | null
          vendor_id: string | null
        }
        Insert: {
          asset_id?: string | null
          completed_at?: string | null
          cost?: number | null
          created_at?: string | null
          created_by?: string | null
          diagnosis?: string | null
          id?: string
          issue_description: string
          notes?: string | null
          repair_number?: string | null
          resolution?: string | null
          started_at?: string | null
          status?: string | null
          tenant_id?: number | null
          updated_at?: string | null
          vendor_id?: string | null
        }
        Update: {
          asset_id?: string | null
          completed_at?: string | null
          cost?: number | null
          created_at?: string | null
          created_by?: string | null
          diagnosis?: string | null
          id?: string
          issue_description?: string
          notes?: string | null
          repair_number?: string | null
          resolution?: string | null
          started_at?: string | null
          status?: string | null
          tenant_id?: number | null
          updated_at?: string | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "itam_repairs_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "itam_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itam_repairs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itam_repairs_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "itam_vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      itam_settings: {
        Row: {
          created_at: string | null
          id: string
          key: string
          tenant_id: number | null
          updated_at: string | null
          value: Json | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          key: string
          tenant_id?: number | null
          updated_at?: string | null
          value?: Json | null
        }
        Update: {
          created_at?: string | null
          id?: string
          key?: string
          tenant_id?: number | null
          updated_at?: string | null
          value?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "itam_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      itam_sites: {
        Row: {
          address: string | null
          city: string | null
          country: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          tenant_id: number | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          tenant_id?: number | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          tenant_id?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "itam_sites_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      itam_tag_format: {
        Row: {
          auto_increment: boolean | null
          created_at: string | null
          id: string
          next_number: number | null
          padding_length: number | null
          prefix: string
          tenant_id: number | null
          updated_at: string | null
        }
        Insert: {
          auto_increment?: boolean | null
          created_at?: string | null
          id?: string
          next_number?: number | null
          padding_length?: number | null
          prefix?: string
          tenant_id?: number | null
          updated_at?: string | null
        }
        Update: {
          auto_increment?: boolean | null
          created_at?: string | null
          id?: string
          next_number?: number | null
          padding_length?: number | null
          prefix?: string
          tenant_id?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "itam_tag_format_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      itam_tag_series: {
        Row: {
          category_name: string
          created_at: string | null
          current_number: number | null
          id: string
          is_active: boolean | null
          padding_length: number | null
          prefix: string
          tenant_id: number | null
          updated_at: string | null
        }
        Insert: {
          category_name: string
          created_at?: string | null
          current_number?: number | null
          id?: string
          is_active?: boolean | null
          padding_length?: number | null
          prefix: string
          tenant_id?: number | null
          updated_at?: string | null
        }
        Update: {
          category_name?: string
          created_at?: string | null
          current_number?: number | null
          id?: string
          is_active?: boolean | null
          padding_length?: number | null
          prefix?: string
          tenant_id?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "itam_tag_series_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      itam_vendors: {
        Row: {
          address: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          notes: string | null
          tenant_id: number | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          notes?: string | null
          tenant_id?: number | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          notes?: string | null
          tenant_id?: number | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "itam_vendors_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      monitor_data: {
        Row: {
          error_message: string | null
          id: string
          monitor_id: string
          recorded_at: string | null
          response_time_ms: number | null
          status: string
          status_code: number | null
          tenant_id: number | null
        }
        Insert: {
          error_message?: string | null
          id?: string
          monitor_id: string
          recorded_at?: string | null
          response_time_ms?: number | null
          status: string
          status_code?: number | null
          tenant_id?: number | null
        }
        Update: {
          error_message?: string | null
          id?: string
          monitor_id?: string
          recorded_at?: string | null
          response_time_ms?: number | null
          status?: string
          status_code?: number | null
          tenant_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "monitor_data_monitor_id_fkey"
            columns: ["monitor_id"]
            isOneToOne: false
            referencedRelation: "monitors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monitor_data_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      monitoring_alerts: {
        Row: {
          alert_type: string
          created_at: string | null
          id: string
          is_resolved: boolean | null
          message: string | null
          monitor_id: string | null
          resolved_at: string | null
          severity: string | null
          tenant_id: number | null
          title: string
        }
        Insert: {
          alert_type: string
          created_at?: string | null
          id?: string
          is_resolved?: boolean | null
          message?: string | null
          monitor_id?: string | null
          resolved_at?: string | null
          severity?: string | null
          tenant_id?: number | null
          title: string
        }
        Update: {
          alert_type?: string
          created_at?: string | null
          id?: string
          is_resolved?: boolean | null
          message?: string | null
          monitor_id?: string | null
          resolved_at?: string | null
          severity?: string | null
          tenant_id?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "monitoring_alerts_monitor_id_fkey"
            columns: ["monitor_id"]
            isOneToOne: false
            referencedRelation: "monitors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monitoring_alerts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      monitoring_incidents: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          monitor_id: string | null
          resolution: string | null
          resolved_at: string | null
          root_cause: string | null
          severity: string | null
          started_at: string | null
          status: string | null
          tenant_id: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          monitor_id?: string | null
          resolution?: string | null
          resolved_at?: string | null
          root_cause?: string | null
          severity?: string | null
          started_at?: string | null
          status?: string | null
          tenant_id?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          monitor_id?: string | null
          resolution?: string | null
          resolved_at?: string | null
          root_cause?: string | null
          severity?: string | null
          started_at?: string | null
          status?: string | null
          tenant_id?: number | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "monitoring_incidents_monitor_id_fkey"
            columns: ["monitor_id"]
            isOneToOne: false
            referencedRelation: "monitors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monitoring_incidents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      monitors: {
        Row: {
          created_at: string | null
          expected_status_code: number | null
          id: string
          interval_seconds: number | null
          is_active: boolean | null
          keyword: string | null
          last_check: string | null
          last_status: string | null
          name: string
          target: string
          tenant_id: number | null
          timeout_seconds: number | null
          type: string | null
          updated_at: string | null
          uptime_percent: number | null
        }
        Insert: {
          created_at?: string | null
          expected_status_code?: number | null
          id?: string
          interval_seconds?: number | null
          is_active?: boolean | null
          keyword?: string | null
          last_check?: string | null
          last_status?: string | null
          name: string
          target: string
          tenant_id?: number | null
          timeout_seconds?: number | null
          type?: string | null
          updated_at?: string | null
          uptime_percent?: number | null
        }
        Update: {
          created_at?: string | null
          expected_status_code?: number | null
          id?: string
          interval_seconds?: number | null
          is_active?: boolean | null
          keyword?: string | null
          last_check?: string | null
          last_status?: string | null
          name?: string
          target?: string
          tenant_id?: number | null
          timeout_seconds?: number | null
          type?: string | null
          updated_at?: string | null
          uptime_percent?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "monitors_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          metadata: Json | null
          read_at: string | null
          tenant_id: number | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          metadata?: Json | null
          read_at?: string | null
          tenant_id?: number | null
          title: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          metadata?: Json | null
          read_at?: string | null
          tenant_id?: number | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: []
      }
      page_access_control: {
        Row: {
          admin_access: boolean | null
          created_at: string | null
          description: string | null
          id: string
          manager_access: boolean | null
          page_name: string
          route: string
          updated_at: string | null
          user_access: boolean | null
          viewer_access: boolean | null
        }
        Insert: {
          admin_access?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string
          manager_access?: boolean | null
          page_name: string
          route: string
          updated_at?: string | null
          user_access?: boolean | null
          viewer_access?: boolean | null
        }
        Update: {
          admin_access?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string
          manager_access?: boolean | null
          page_name?: string
          route?: string
          updated_at?: string | null
          user_access?: boolean | null
          viewer_access?: boolean | null
        }
        Relationships: []
      }
      permissions: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          key: string
          label: string
          module: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          key: string
          label: string
          module?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          key?: string
          label?: string
          module?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          first_name: string | null
          full_name: string | null
          id: string
          is_active: boolean | null
          last_name: string | null
          selected_tools: string[] | null
          tenant_id: number
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          first_name?: string | null
          full_name?: string | null
          id: string
          is_active?: boolean | null
          last_name?: string | null
          selected_tools?: string[] | null
          tenant_id?: number
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          last_name?: string | null
          selected_tools?: string[] | null
          tenant_id?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      recovery_verification_codes: {
        Row: {
          code: string
          created_at: string | null
          expires_at: string
          id: string
          type: string
          user_id: string
          verified_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          expires_at: string
          id?: string
          type: string
          user_id: string
          verified_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          type?: string
          user_id?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          created_at: string | null
          id: string
          permission_id: string
          role_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          permission_id: string
          role_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          role_name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          role_name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          role_name?: string
        }
        Relationships: []
      }
      subscriptions_licenses: {
        Row: {
          assigned_at: string | null
          assigned_to: string | null
          assigned_to_email: string | null
          assigned_to_name: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          license_key: string | null
          notes: string | null
          status: string | null
          tenant_id: number | null
          tool_id: string
          updated_at: string | null
        }
        Insert: {
          assigned_at?: string | null
          assigned_to?: string | null
          assigned_to_email?: string | null
          assigned_to_name?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          license_key?: string | null
          notes?: string | null
          status?: string | null
          tenant_id?: number | null
          tool_id: string
          updated_at?: string | null
        }
        Update: {
          assigned_at?: string | null
          assigned_to?: string | null
          assigned_to_email?: string | null
          assigned_to_name?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          license_key?: string | null
          notes?: string | null
          status?: string | null
          tenant_id?: number | null
          tool_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_licenses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_licenses_tool_id_fkey"
            columns: ["tool_id"]
            isOneToOne: false
            referencedRelation: "subscriptions_tools"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions_payments: {
        Row: {
          amount: number
          created_at: string | null
          currency: string | null
          id: string
          invoice_number: string | null
          notes: string | null
          payment_date: string
          payment_method: string | null
          status: string | null
          tenant_id: number | null
          tool_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string | null
          id?: string
          invoice_number?: string | null
          notes?: string | null
          payment_date: string
          payment_method?: string | null
          status?: string | null
          tenant_id?: number | null
          tool_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string | null
          id?: string
          invoice_number?: string | null
          notes?: string | null
          payment_date?: string
          payment_method?: string | null
          status?: string | null
          tenant_id?: number | null
          tool_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_payments_tool_id_fkey"
            columns: ["tool_id"]
            isOneToOne: false
            referencedRelation: "subscriptions_tools"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions_reminders: {
        Row: {
          created_at: string | null
          id: string
          is_sent: boolean | null
          message: string | null
          reminder_date: string
          reminder_type: string | null
          sent_at: string | null
          tenant_id: number | null
          tool_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_sent?: boolean | null
          message?: string | null
          reminder_date: string
          reminder_type?: string | null
          sent_at?: string | null
          tenant_id?: number | null
          tool_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_sent?: boolean | null
          message?: string | null
          reminder_date?: string
          reminder_type?: string | null
          sent_at?: string | null
          tenant_id?: number | null
          tool_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_reminders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_reminders_tool_id_fkey"
            columns: ["tool_id"]
            isOneToOne: false
            referencedRelation: "subscriptions_tools"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions_tools: {
        Row: {
          billing_cycle: string | null
          category: string | null
          contract_end_date: string | null
          contract_start_date: string | null
          cost_per_license: number | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          license_count: number | null
          notes: string | null
          renewal_date: string | null
          status: string | null
          tenant_id: number | null
          tool_name: string
          total_cost: number | null
          updated_at: string | null
          vendor_id: string | null
          website_url: string | null
        }
        Insert: {
          billing_cycle?: string | null
          category?: string | null
          contract_end_date?: string | null
          contract_start_date?: string | null
          cost_per_license?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          license_count?: number | null
          notes?: string | null
          renewal_date?: string | null
          status?: string | null
          tenant_id?: number | null
          tool_name: string
          total_cost?: number | null
          updated_at?: string | null
          vendor_id?: string | null
          website_url?: string | null
        }
        Update: {
          billing_cycle?: string | null
          category?: string | null
          contract_end_date?: string | null
          contract_start_date?: string | null
          cost_per_license?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          license_count?: number | null
          notes?: string | null
          renewal_date?: string | null
          status?: string | null
          tenant_id?: number | null
          tool_name?: string
          total_cost?: number | null
          updated_at?: string | null
          vendor_id?: string | null
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_tools_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_tools_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "subscriptions_vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions_vendors: {
        Row: {
          address: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          notes: string | null
          tenant_id: number | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          notes?: string | null
          tenant_id?: number | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          notes?: string | null
          tenant_id?: number | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_vendors_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      system_backups: {
        Row: {
          backup_name: string
          backup_type: string | null
          checksum: string | null
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          duration_seconds: number | null
          error_message: string | null
          file_path: string
          file_size: number | null
          id: string
          progress_percentage: number | null
          record_count: number | null
          retry_count: number | null
          started_at: string | null
          status: string | null
          tables_included: string[] | null
        }
        Insert: {
          backup_name: string
          backup_type?: string | null
          checksum?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          duration_seconds?: number | null
          error_message?: string | null
          file_path: string
          file_size?: number | null
          id?: string
          progress_percentage?: number | null
          record_count?: number | null
          retry_count?: number | null
          started_at?: string | null
          status?: string | null
          tables_included?: string[] | null
        }
        Update: {
          backup_name?: string
          backup_type?: string | null
          checksum?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          duration_seconds?: number | null
          error_message?: string | null
          file_path?: string
          file_size?: number | null
          id?: string
          progress_percentage?: number | null
          record_count?: number | null
          retry_count?: number | null
          started_at?: string | null
          status?: string | null
          tables_included?: string[] | null
        }
        Relationships: []
      }
      system_devices: {
        Row: {
          assigned_to: string | null
          created_at: string | null
          custom_fields: Json | null
          device_type: string | null
          hostname: string
          id: string
          installed_updates_count: number | null
          ip_address: string | null
          is_active: boolean | null
          last_seen: string | null
          last_update_check: string | null
          mac_address: string | null
          notes: string | null
          os_build: string | null
          os_name: string | null
          os_version: string | null
          pending_updates_count: number | null
          status: string | null
          tenant_id: number | null
          update_compliance_status: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string | null
          custom_fields?: Json | null
          device_type?: string | null
          hostname: string
          id?: string
          installed_updates_count?: number | null
          ip_address?: string | null
          is_active?: boolean | null
          last_seen?: string | null
          last_update_check?: string | null
          mac_address?: string | null
          notes?: string | null
          os_build?: string | null
          os_name?: string | null
          os_version?: string | null
          pending_updates_count?: number | null
          status?: string | null
          tenant_id?: number | null
          update_compliance_status?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string | null
          custom_fields?: Json | null
          device_type?: string | null
          hostname?: string
          id?: string
          installed_updates_count?: number | null
          ip_address?: string | null
          is_active?: boolean | null
          last_seen?: string | null
          last_update_check?: string | null
          mac_address?: string | null
          notes?: string | null
          os_build?: string | null
          os_name?: string | null
          os_version?: string | null
          pending_updates_count?: number | null
          status?: string | null
          tenant_id?: number | null
          update_compliance_status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "system_devices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      system_installed_updates: {
        Row: {
          created_at: string | null
          device_id: string
          id: string
          installed_at: string | null
          installed_by: string | null
          kb_number: string | null
          result: string | null
          tenant_id: number | null
          title: string | null
          update_id: string | null
        }
        Insert: {
          created_at?: string | null
          device_id: string
          id?: string
          installed_at?: string | null
          installed_by?: string | null
          kb_number?: string | null
          result?: string | null
          tenant_id?: number | null
          title?: string | null
          update_id?: string | null
        }
        Update: {
          created_at?: string | null
          device_id?: string
          id?: string
          installed_at?: string | null
          installed_by?: string | null
          kb_number?: string | null
          result?: string | null
          tenant_id?: number | null
          title?: string | null
          update_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "system_installed_updates_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "system_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_installed_updates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_installed_updates_update_id_fkey"
            columns: ["update_id"]
            isOneToOne: false
            referencedRelation: "system_updates"
            referencedColumns: ["id"]
          },
        ]
      }
      system_pending_updates: {
        Row: {
          created_at: string | null
          detected_at: string | null
          device_id: string
          id: string
          kb_number: string | null
          severity: string | null
          status: string | null
          tenant_id: number | null
          title: string | null
          update_id: string | null
        }
        Insert: {
          created_at?: string | null
          detected_at?: string | null
          device_id: string
          id?: string
          kb_number?: string | null
          severity?: string | null
          status?: string | null
          tenant_id?: number | null
          title?: string | null
          update_id?: string | null
        }
        Update: {
          created_at?: string | null
          detected_at?: string | null
          device_id?: string
          id?: string
          kb_number?: string | null
          severity?: string | null
          status?: string | null
          tenant_id?: number | null
          title?: string | null
          update_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "system_pending_updates_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "system_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_pending_updates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_pending_updates_update_id_fkey"
            columns: ["update_id"]
            isOneToOne: false
            referencedRelation: "system_updates"
            referencedColumns: ["id"]
          },
        ]
      }
      system_update_alerts: {
        Row: {
          alert_type: string
          created_at: string | null
          device_id: string | null
          id: string
          is_resolved: boolean | null
          message: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string | null
          tenant_id: number | null
          title: string
        }
        Insert: {
          alert_type: string
          created_at?: string | null
          device_id?: string | null
          id?: string
          is_resolved?: boolean | null
          message?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string | null
          tenant_id?: number | null
          title: string
        }
        Update: {
          alert_type?: string
          created_at?: string | null
          device_id?: string | null
          id?: string
          is_resolved?: boolean | null
          message?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string | null
          tenant_id?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "system_update_alerts_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "system_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_update_alerts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      system_update_history: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          device_id: string | null
          id: string
          performed_by: string | null
          tenant_id: number | null
          update_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          device_id?: string | null
          id?: string
          performed_by?: string | null
          tenant_id?: number | null
          update_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          device_id?: string | null
          id?: string
          performed_by?: string | null
          tenant_id?: number | null
          update_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "system_update_history_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "system_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_update_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_update_history_update_id_fkey"
            columns: ["update_id"]
            isOneToOne: false
            referencedRelation: "system_updates"
            referencedColumns: ["id"]
          },
        ]
      }
      system_update_ingest_logs: {
        Row: {
          created_at: string | null
          device_id: string | null
          error_message: string | null
          hostname: string | null
          id: string
          ingested_at: string | null
          installed_count: number | null
          pending_count: number | null
          raw_data: Json | null
          status: string | null
          tenant_id: number | null
        }
        Insert: {
          created_at?: string | null
          device_id?: string | null
          error_message?: string | null
          hostname?: string | null
          id?: string
          ingested_at?: string | null
          installed_count?: number | null
          pending_count?: number | null
          raw_data?: Json | null
          status?: string | null
          tenant_id?: number | null
        }
        Update: {
          created_at?: string | null
          device_id?: string | null
          error_message?: string | null
          hostname?: string | null
          id?: string
          ingested_at?: string | null
          installed_count?: number | null
          pending_count?: number | null
          raw_data?: Json | null
          status?: string | null
          tenant_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "system_update_ingest_logs_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "system_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_update_ingest_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      system_updates: {
        Row: {
          applies_to: Json | null
          category: string | null
          created_at: string | null
          description: string | null
          download_url: string | null
          id: string
          is_superseded: boolean | null
          kb_number: string | null
          release_date: string | null
          severity: string | null
          size_bytes: number | null
          superseded_by: string | null
          tenant_id: number | null
          title: string
        }
        Insert: {
          applies_to?: Json | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          download_url?: string | null
          id?: string
          is_superseded?: boolean | null
          kb_number?: string | null
          release_date?: string | null
          severity?: string | null
          size_bytes?: number | null
          superseded_by?: string | null
          tenant_id?: number | null
          title: string
        }
        Update: {
          applies_to?: Json | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          download_url?: string | null
          id?: string
          is_superseded?: boolean | null
          kb_number?: string | null
          release_date?: string | null
          severity?: string | null
          size_bytes?: number | null
          superseded_by?: string | null
          tenant_id?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "system_updates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string | null
          domain: string | null
          id: number
          name: string
          status: string | null
          subscription_plan: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          domain?: string | null
          id?: never
          name: string
          status?: string | null
          subscription_plan?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          domain?: string | null
          id?: never
          name?: string
          status?: string | null
          subscription_plan?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_mfa_settings: {
        Row: {
          backup_codes: string[] | null
          created_at: string | null
          enabled_at: string | null
          id: string
          is_enabled: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          backup_codes?: string[] | null
          created_at?: string | null
          enabled_at?: string | null
          id?: string
          is_enabled?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          backup_codes?: string[] | null
          created_at?: string | null
          enabled_at?: string | null
          id?: string
          is_enabled?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_permissions: {
        Row: {
          created_at: string | null
          id: string
          permission_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          permission_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          permission_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_permissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          created_at: string | null
          currency: string | null
          date_format: string | null
          email_notifications: boolean | null
          id: string
          in_app_notifications: boolean | null
          last_password_change: string | null
          notification_settings: Json | null
          time_format: string | null
          timezone: string | null
          ui_settings: Json | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          currency?: string | null
          date_format?: string | null
          email_notifications?: boolean | null
          id?: string
          in_app_notifications?: boolean | null
          last_password_change?: string | null
          notification_settings?: Json | null
          time_format?: string | null
          timezone?: string | null
          ui_settings?: Json | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          currency?: string | null
          date_format?: string | null
          email_notifications?: boolean | null
          id?: string
          in_app_notifications?: boolean | null
          last_password_change?: string | null
          notification_settings?: Json | null
          time_format?: string | null
          timezone?: string | null
          ui_settings?: Json | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_recovery_options: {
        Row: {
          created_at: string
          id: string
          recovery_email: string | null
          recovery_email_verified: boolean | null
          recovery_phone: string | null
          recovery_phone_verified: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          recovery_email?: string | null
          recovery_email_verified?: boolean | null
          recovery_phone?: string | null
          recovery_phone_verified?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          recovery_email?: string | null
          recovery_email_verified?: boolean | null
          recovery_phone?: string | null
          recovery_phone_verified?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          auth_user_id: string | null
          avatar_url: string | null
          created_at: string | null
          email: string
          id: string
          is_superadmin: boolean | null
          last_login: string | null
          name: string | null
          phone: string | null
          role: string | null
          status: string | null
          updated_at: string | null
          user_type: Database["public"]["Enums"]["user_type"] | null
        }
        Insert: {
          auth_user_id?: string | null
          avatar_url?: string | null
          created_at?: string | null
          email: string
          id?: string
          is_superadmin?: boolean | null
          last_login?: string | null
          name?: string | null
          phone?: string | null
          role?: string | null
          status?: string | null
          updated_at?: string | null
          user_type?: Database["public"]["Enums"]["user_type"] | null
        }
        Update: {
          auth_user_id?: string | null
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          id?: string
          is_superadmin?: boolean | null
          last_login?: string | null
          name?: string | null
          phone?: string | null
          role?: string | null
          status?: string | null
          updated_at?: string | null
          user_type?: Database["public"]["Enums"]["user_type"] | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      bootstrap_session: { Args: never; Returns: Json }
      bulk_soft_delete_problems: {
        Args: { problem_ids: number[] }
        Returns: undefined
      }
      bulk_soft_delete_tickets: {
        Args: { ticket_ids: number[] }
        Returns: undefined
      }
      calculate_sla_due_date: {
        Args: {
          org_id?: string
          tenant_id_param?: number
          ticket_priority: string
        }
        Returns: string
      }
      can_activate_tool: { Args: { org_id: string }; Returns: boolean }
      can_enable_tool: { Args: { org_id: string }; Returns: boolean }
      check_and_flag_sla_breaches: { Args: never; Returns: undefined }
      check_multiple_routes_access: {
        Args: { _routes: string[] }
        Returns: {
          has_access: boolean
          route: string
        }[]
      }
      check_page_access: { Args: { _route: string }; Returns: boolean }
      check_sla_breach: { Args: never; Returns: undefined }
      check_subscription_limit: {
        Args: { limit_type: string; org_id: string }
        Returns: boolean
      }
      clean_expired_recovery_codes: { Args: never; Returns: undefined }
      cleanup_old_backups: { Args: { _org_id: string }; Returns: undefined }
      create_notification:
        | {
            Args: {
              p_message: string
              p_organisation_id?: string
              p_tenant_id?: number
              p_title: string
              p_type: Database["public"]["Enums"]["notification_type"]
              p_user_id: string
            }
            Returns: string
          }
        | {
            Args: {
              p_message: string
              p_organisation_id?: string
              p_tenant_id?: number
              p_title: string
              p_type?: string
              p_user_id: string
            }
            Returns: string
          }
      generate_asset_tag: {
        Args: { tenant_id_param?: number }
        Returns: string
      }
      generate_change_number: {
        Args: { p_org_id?: string; p_tenant_id?: number }
        Returns: string
      }
      generate_change_request_number: {
        Args: { p_tenant_id?: number }
        Returns: string
      }
      generate_helpdesk_ticket_number: {
        Args: { p_org_id?: string; p_tenant_id?: number }
        Returns: string
      }
      generate_problem_number: {
        Args: { p_org_id?: string; p_tenant_id?: number }
        Returns: string
      }
      generate_srm_request_number: {
        Args: { p_org_id?: string; p_tenant_id?: number }
        Returns: string
      }
      generate_unified_request_number: {
        Args: {
          p_org_id: string
          p_request_type: Database["public"]["Enums"]["request_type"]
          p_tenant_id: number
        }
        Returns: string
      }
      get_appmaster_admin_details: {
        Args: never
        Returns: {
          admin_role: string
          created_at: string
          created_by: string
          email: string
          id: string
          is_active: boolean
          last_login: string
          name: string
          permissions: Json
          status: string
          updated_at: string
          user_id: string
        }[]
      }
      get_appmaster_role: { Args: { _user_id: string }; Returns: string }
      get_itam_stats: { Args: never; Returns: Json }
      get_license_usage: {
        Args: { tool_id_param: string }
        Returns: {
          assigned_licenses: number
          available_licenses: number
          total_licenses: number
          usage_percentage: number
        }[]
      }
      get_next_asset_number: {
        Args: { p_organisation_id: string }
        Returns: number
      }
      get_next_asset_tags: {
        Args: { p_limit?: number; p_organisation_id: string }
        Returns: {
          category_name: string
          suggested_tags: string[]
        }[]
      }
      get_user_account_type: { Args: never; Returns: string }
      get_user_role: { Args: { _user_id: string }; Returns: string }
      get_user_tenant:
        | { Args: never; Returns: number }
        | { Args: { _user_id: string }; Returns: number }
      has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_feature: {
        Args: { feature_key: string; org_id: string }
        Returns: boolean
      }
      has_permission: {
        Args: { permission_key: string; user_id_param: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_super_admin_permission: {
        Args: { _permission: string; _user_id: string }
        Returns: boolean
      }
      is_appmaster_admin: { Args: { _user_id: string }; Returns: boolean }
      retry_failed_backup: {
        Args: { _backup_id: string; _org_id: string }
        Returns: Json
      }
      soft_delete_problem: {
        Args: { problem_id_param: number }
        Returns: undefined
      }
      soft_delete_ticket: {
        Args: { ticket_id_param: number }
        Returns: undefined
      }
      update_user_role: {
        Args: { new_role: string; target_user_id: string }
        Returns: undefined
      }
      update_user_status: {
        Args: { new_status: string; target_user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "manager" | "user" | "viewer"
      broadcast_target_audience:
        | "individual_users"
        | "organization_admins"
        | "organization_users"
        | "all_users"
      notification_type:
        | "profile_update"
        | "role_change"
        | "ticket_created"
        | "ticket_updated"
        | "system_alert"
        | "broadcast"
        | "general"
      request_type: "ticket" | "service_request"
      super_admin_role:
        | "super_admin"
        | "saas_manager"
        | "saas_support_agent"
        | "billing_manager"
        | "read_only_auditor"
      user_type: "individual" | "organization" | "appmaster_admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "manager", "user", "viewer"],
      broadcast_target_audience: [
        "individual_users",
        "organization_admins",
        "organization_users",
        "all_users",
      ],
      notification_type: [
        "profile_update",
        "role_change",
        "ticket_created",
        "ticket_updated",
        "system_alert",
        "broadcast",
        "general",
      ],
      request_type: ["ticket", "service_request"],
      super_admin_role: [
        "super_admin",
        "saas_manager",
        "saas_support_agent",
        "billing_manager",
        "read_only_auditor",
      ],
      user_type: ["individual", "organization", "appmaster_admin"],
    },
  },
} as const
