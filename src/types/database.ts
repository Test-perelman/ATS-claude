/**
 * Database type definitions for Supabase
 * Auto-generated types based on database schema
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      teams: {
        Row: {
          team_id: string
          team_name: string
          company_name: string | null
          description: string | null
          subscription_tier: string
          max_users: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          team_id?: string
          team_name: string
          company_name?: string | null
          description?: string | null
          subscription_tier?: string
          max_users?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          team_id?: string
          team_name?: string
          company_name?: string | null
          description?: string | null
          subscription_tier?: string
          max_users?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      users: {
        Row: {
          user_id: string
          username: string
          password_hash: string | null
          email: string
          phone: string | null
          role_id: string | null
          team_id: string | null
          status: string
          last_login: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id?: string
          username: string
          password_hash?: string | null
          email: string
          phone?: string | null
          role_id?: string | null
          team_id?: string | null
          status?: string
          last_login?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          username?: string
          password_hash?: string | null
          email?: string
          phone?: string | null
          role_id?: string | null
          team_id?: string | null
          status?: string
          last_login?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      roles: {
        Row: {
          role_id: string
          role_name: string
          role_description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          role_id?: string
          role_name: string
          role_description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          role_id?: string
          role_name?: string
          role_description?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      permissions: {
        Row: {
          permission_id: string
          permission_key: string
          permission_description: string | null
          module_name: string | null
          created_at: string
        }
        Insert: {
          permission_id?: string
          permission_key: string
          permission_description?: string | null
          module_name?: string | null
          created_at?: string
        }
        Update: {
          permission_id?: string
          permission_key?: string
          permission_description?: string | null
          module_name?: string | null
          created_at?: string
        }
      }
      role_permissions: {
        Row: {
          role_permission_id: string
          role_id: string
          permission_id: string
          allowed: boolean
          created_at: string
        }
        Insert: {
          role_permission_id?: string
          role_id: string
          permission_id: string
          allowed?: boolean
          created_at?: string
        }
        Update: {
          role_permission_id?: string
          role_id?: string
          permission_id?: string
          allowed?: boolean
          created_at?: string
        }
      }
      candidates: {
        Row: {
          candidate_id: string
          first_name: string
          last_name: string
          phone_number: string | null
          email_address: string | null
          linkedin_url: string | null
          ssn_last4: string | null
          date_of_birth: string | null
          passport_number: string | null
          current_location: string | null
          relocation_preference: string | null
          visa_status_id: string | null
          visa_expiry_date: string | null
          work_authorization_notes: string | null
          total_experience_years: number | null
          skills_primary: string | null
          skills_secondary: string | null
          preferred_roles: string | null
          hourly_pay_rate: number | null
          salary_annual: number | null
          terms_percentage: number | null
          bench_status: string
          bench_added_date: string | null
          sales_manager_id: string | null
          sales_executive_id: string | null
          recruiter_manager_id: string | null
          recruiter_executive_id: string | null
          notes_internal: string | null
          resume_master_file_id: string | null
          attachments_group_id: string | null
          team_id: string | null
          created_at: string
          updated_at: string
          created_by: string | null
          updated_by: string | null
        }
        Insert: {
          candidate_id?: string
          first_name: string
          last_name: string
          phone_number?: string | null
          email_address?: string | null
          linkedin_url?: string | null
          ssn_last4?: string | null
          date_of_birth?: string | null
          passport_number?: string | null
          current_location?: string | null
          relocation_preference?: string | null
          visa_status_id?: string | null
          visa_expiry_date?: string | null
          work_authorization_notes?: string | null
          total_experience_years?: number | null
          skills_primary?: string | null
          skills_secondary?: string | null
          preferred_roles?: string | null
          hourly_pay_rate?: number | null
          salary_annual?: number | null
          terms_percentage?: number | null
          bench_status?: string
          bench_added_date?: string | null
          sales_manager_id?: string | null
          sales_executive_id?: string | null
          recruiter_manager_id?: string | null
          recruiter_executive_id?: string | null
          notes_internal?: string | null
          resume_master_file_id?: string | null
          attachments_group_id?: string | null
          team_id?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
        Update: {
          candidate_id?: string
          first_name?: string
          last_name?: string
          phone_number?: string | null
          email_address?: string | null
          linkedin_url?: string | null
          ssn_last4?: string | null
          date_of_birth?: string | null
          passport_number?: string | null
          current_location?: string | null
          relocation_preference?: string | null
          visa_status_id?: string | null
          visa_expiry_date?: string | null
          work_authorization_notes?: string | null
          total_experience_years?: number | null
          skills_primary?: string | null
          skills_secondary?: string | null
          preferred_roles?: string | null
          hourly_pay_rate?: number | null
          salary_annual?: number | null
          terms_percentage?: number | null
          bench_status?: string
          bench_added_date?: string | null
          sales_manager_id?: string | null
          sales_executive_id?: string | null
          recruiter_manager_id?: string | null
          recruiter_executive_id?: string | null
          notes_internal?: string | null
          resume_master_file_id?: string | null
          attachments_group_id?: string | null
          team_id?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
      }
      visa_status: {
        Row: {
          visa_status_id: string
          visa_name: string
          description: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          visa_status_id?: string
          visa_name: string
          description?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          visa_status_id?: string
          visa_name?: string
          description?: string | null
          is_active?: boolean
          created_at?: string
        }
      }
      vendors: {
        Row: {
          vendor_id: string
          vendor_name: string
          tier_level: string | null
          contact_name: string | null
          contact_email: string | null
          contact_phone: string | null
          preferred_communication_mode: string | null
          payment_terms: string | null
          payment_terms_days: number | null
          client_associated_id: string | null
          website: string | null
          address: string | null
          is_active: boolean
          created_at: string
          updated_at: string
          created_by: string | null
          updated_by: string | null
        }
        Insert: {
          vendor_id?: string
          vendor_name: string
          tier_level?: string | null
          contact_name?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          preferred_communication_mode?: string | null
          payment_terms?: string | null
          payment_terms_days?: number | null
          client_associated_id?: string | null
          website?: string | null
          address?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
        Update: {
          vendor_id?: string
          vendor_name?: string
          tier_level?: string | null
          contact_name?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          preferred_communication_mode?: string | null
          payment_terms?: string | null
          payment_terms_days?: number | null
          client_associated_id?: string | null
          website?: string | null
          address?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
      }
      clients: {
        Row: {
          client_id: string
          client_name: string
          industry: string | null
          address: string | null
          city: string | null
          state: string | null
          zip_code: string | null
          primary_contact_name: string | null
          primary_contact_email: string | null
          primary_contact_phone: string | null
          msp_portal_name: string | null
          msp_portal_link: string | null
          payment_terms: string | null
          payment_terms_days: number | null
          website: string | null
          is_active: boolean
          created_at: string
          updated_at: string
          created_by: string | null
          updated_by: string | null
        }
        Insert: {
          client_id?: string
          client_name: string
          industry?: string | null
          address?: string | null
          city?: string | null
          state?: string | null
          zip_code?: string | null
          primary_contact_name?: string | null
          primary_contact_email?: string | null
          primary_contact_phone?: string | null
          msp_portal_name?: string | null
          msp_portal_link?: string | null
          payment_terms?: string | null
          payment_terms_days?: number | null
          website?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
        Update: {
          client_id?: string
          client_name?: string
          industry?: string | null
          address?: string | null
          city?: string | null
          state?: string | null
          zip_code?: string | null
          primary_contact_name?: string | null
          primary_contact_email?: string | null
          primary_contact_phone?: string | null
          msp_portal_name?: string | null
          msp_portal_link?: string | null
          payment_terms?: string | null
          payment_terms_days?: number | null
          website?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
      }
      job_requirements: {
        Row: {
          job_id: string
          job_title: string
          job_description: string | null
          skills_required: string | null
          vendor_id: string | null
          client_id: string | null
          location: string | null
          work_mode: string | null
          bill_rate_range_min: number | null
          bill_rate_range_max: number | null
          employment_type: string | null
          duration: string | null
          priority: string | null
          received_date: string
          expiry_date: string | null
          status: string
          notes: string | null
          created_at: string
          updated_at: string
          created_by: string | null
          updated_by: string | null
        }
        Insert: {
          job_id?: string
          job_title: string
          job_description?: string | null
          skills_required?: string | null
          vendor_id?: string | null
          client_id?: string | null
          location?: string | null
          work_mode?: string | null
          bill_rate_range_min?: number | null
          bill_rate_range_max?: number | null
          employment_type?: string | null
          duration?: string | null
          priority?: string | null
          received_date?: string
          expiry_date?: string | null
          status?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
        Update: {
          job_id?: string
          job_title?: string
          job_description?: string | null
          skills_required?: string | null
          vendor_id?: string | null
          client_id?: string | null
          location?: string | null
          work_mode?: string | null
          bill_rate_range_min?: number | null
          bill_rate_range_max?: number | null
          employment_type?: string | null
          duration?: string | null
          priority?: string | null
          received_date?: string
          expiry_date?: string | null
          status?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
      }
      submissions: {
        Row: {
          submission_id: string
          candidate_id: string
          job_id: string
          resume_file_id: string | null
          submitted_by_user_id: string | null
          vendor_contact_id: string | null
          submitted_at: string
          submission_status: string
          bill_rate_offered: number | null
          pay_rate_offered: number | null
          margin: number | null
          notes: string | null
          rejection_reason: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          submission_id?: string
          candidate_id: string
          job_id: string
          resume_file_id?: string | null
          submitted_by_user_id?: string | null
          vendor_contact_id?: string | null
          submitted_at?: string
          submission_status?: string
          bill_rate_offered?: number | null
          pay_rate_offered?: number | null
          margin?: number | null
          notes?: string | null
          rejection_reason?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          submission_id?: string
          candidate_id?: string
          job_id?: string
          resume_file_id?: string | null
          submitted_by_user_id?: string | null
          vendor_contact_id?: string | null
          submitted_at?: string
          submission_status?: string
          bill_rate_offered?: number | null
          pay_rate_offered?: number | null
          margin?: number | null
          notes?: string | null
          rejection_reason?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      interviews: {
        Row: {
          interview_id: string
          submission_id: string
          interview_round: string | null
          scheduled_time: string | null
          interviewer_name: string | null
          interviewer_email: string | null
          interview_mode: string | null
          meeting_link: string | null
          result: string | null
          feedback_notes: string | null
          rating: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          interview_id?: string
          submission_id: string
          interview_round?: string | null
          scheduled_time?: string | null
          interviewer_name?: string | null
          interviewer_email?: string | null
          interview_mode?: string | null
          meeting_link?: string | null
          result?: string | null
          feedback_notes?: string | null
          rating?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          interview_id?: string
          submission_id?: string
          interview_round?: string | null
          scheduled_time?: string | null
          interviewer_name?: string | null
          interviewer_email?: string | null
          interview_mode?: string | null
          meeting_link?: string | null
          result?: string | null
          feedback_notes?: string | null
          rating?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      projects: {
        Row: {
          project_id: string
          candidate_id: string
          client_id: string
          vendor_id: string | null
          job_id: string | null
          submission_id: string | null
          project_name: string | null
          start_date: string
          end_date: string | null
          bill_rate_final: number | null
          pay_rate_final: number | null
          margin: number | null
          po_number: string | null
          sow_document_file_id: string | null
          client_manager_name: string | null
          client_manager_email: string | null
          timesheet_portal: string | null
          timesheet_cycle: string | null
          status: string
          termination_reason: string | null
          notes: string | null
          created_at: string
          updated_at: string
          created_by: string | null
          updated_by: string | null
        }
        Insert: {
          project_id?: string
          candidate_id: string
          client_id: string
          vendor_id?: string | null
          job_id?: string | null
          submission_id?: string | null
          project_name?: string | null
          start_date: string
          end_date?: string | null
          bill_rate_final?: number | null
          pay_rate_final?: number | null
          margin?: number | null
          po_number?: string | null
          sow_document_file_id?: string | null
          client_manager_name?: string | null
          client_manager_email?: string | null
          timesheet_portal?: string | null
          timesheet_cycle?: string | null
          status?: string
          termination_reason?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
        Update: {
          project_id?: string
          candidate_id?: string
          client_id?: string
          vendor_id?: string | null
          job_id?: string | null
          submission_id?: string | null
          project_name?: string | null
          start_date?: string
          end_date?: string | null
          bill_rate_final?: number | null
          pay_rate_final?: number | null
          margin?: number | null
          po_number?: string | null
          sow_document_file_id?: string | null
          client_manager_name?: string | null
          client_manager_email?: string | null
          timesheet_portal?: string | null
          timesheet_cycle?: string | null
          status?: string
          termination_reason?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
      }
      timesheets: {
        Row: {
          timesheet_id: string
          project_id: string
          candidate_id: string
          week_start: string
          week_end: string
          hours_worked: number
          regular_hours: number
          overtime_hours: number
          approved_by_client: boolean
          approval_date: string | null
          submitted_date: string | null
          invoice_generated: boolean
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          timesheet_id?: string
          project_id: string
          candidate_id: string
          week_start: string
          week_end: string
          hours_worked?: number
          regular_hours?: number
          overtime_hours?: number
          approved_by_client?: boolean
          approval_date?: string | null
          submitted_date?: string | null
          invoice_generated?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          timesheet_id?: string
          project_id?: string
          candidate_id?: string
          week_start?: string
          week_end?: string
          hours_worked?: number
          regular_hours?: number
          overtime_hours?: number
          approved_by_client?: boolean
          approval_date?: string | null
          submitted_date?: string | null
          invoice_generated?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      invoices: {
        Row: {
          invoice_id: string
          project_id: string
          timesheet_id: string | null
          client_id: string
          invoice_number: string
          invoice_amount: number
          invoice_date: string
          payment_due_date: string | null
          payment_received_date: string | null
          payment_amount: number | null
          status: string
          notes: string | null
          created_at: string
          updated_at: string
          created_by: string | null
        }
        Insert: {
          invoice_id?: string
          project_id: string
          timesheet_id?: string | null
          client_id: string
          invoice_number: string
          invoice_amount: number
          invoice_date: string
          payment_due_date?: string | null
          payment_received_date?: string | null
          payment_amount?: number | null
          status?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
        Update: {
          invoice_id?: string
          project_id?: string
          timesheet_id?: string | null
          client_id?: string
          invoice_number?: string
          invoice_amount?: number
          invoice_date?: string
          payment_due_date?: string | null
          payment_received_date?: string | null
          payment_amount?: number | null
          status?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
      }
      immigration: {
        Row: {
          immigration_id: string
          candidate_id: string
          visa_type: string | null
          visa_expiry_date: string | null
          i94_expiry_date: string | null
          i797_copy_file_id: string | null
          passport_copy_file_id: string | null
          lca_number: string | null
          petition_number: string | null
          worksite_address: string | null
          immigration_notes: string | null
          alert_before_days: number
          created_at: string
          updated_at: string
        }
        Insert: {
          immigration_id?: string
          candidate_id: string
          visa_type?: string | null
          visa_expiry_date?: string | null
          i94_expiry_date?: string | null
          i797_copy_file_id?: string | null
          passport_copy_file_id?: string | null
          lca_number?: string | null
          petition_number?: string | null
          worksite_address?: string | null
          immigration_notes?: string | null
          alert_before_days?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          immigration_id?: string
          candidate_id?: string
          visa_type?: string | null
          visa_expiry_date?: string | null
          i94_expiry_date?: string | null
          i797_copy_file_id?: string | null
          passport_copy_file_id?: string | null
          lca_number?: string | null
          petition_number?: string | null
          worksite_address?: string | null
          immigration_notes?: string | null
          alert_before_days?: number
          created_at?: string
          updated_at?: string
        }
      }
      attachments: {
        Row: {
          attachment_id: string
          entity_type: string
          entity_id: string
          file_name: string
          file_type: string | null
          file_size: number | null
          file_url: string
          storage_path: string | null
          version_number: number
          is_current: boolean
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          attachment_id?: string
          entity_type: string
          entity_id: string
          file_name: string
          file_type?: string | null
          file_size?: number | null
          file_url: string
          storage_path?: string | null
          version_number?: number
          is_current?: boolean
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          attachment_id?: string
          entity_type?: string
          entity_id?: string
          file_name?: string
          file_type?: string | null
          file_size?: number | null
          file_url?: string
          storage_path?: string | null
          version_number?: number
          is_current?: boolean
          uploaded_at?: string
          uploaded_by?: string | null
        }
      }
      bench_history: {
        Row: {
          bench_id: string
          candidate_id: string
          bench_added_date: string
          bench_removed_date: string | null
          reason_bench_out: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          bench_id?: string
          candidate_id: string
          bench_added_date: string
          bench_removed_date?: string | null
          reason_bench_out?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          bench_id?: string
          candidate_id?: string
          bench_added_date?: string
          bench_removed_date?: string | null
          reason_bench_out?: string | null
          notes?: string | null
          created_at?: string
        }
      }
      audit_log: {
        Row: {
          audit_id: string
          entity_name: string
          entity_id: string
          action: string
          old_value_json: Json | null
          new_value_json: Json | null
          changed_fields: string[] | null
          performed_by_user_id: string | null
          ip_address: string | null
          user_agent: string | null
          performed_at: string
        }
        Insert: {
          audit_id?: string
          entity_name: string
          entity_id: string
          action: string
          old_value_json?: Json | null
          new_value_json?: Json | null
          changed_fields?: string[] | null
          performed_by_user_id?: string | null
          ip_address?: string | null
          user_agent?: string | null
          performed_at?: string
        }
        Update: {
          audit_id?: string
          entity_name?: string
          entity_id?: string
          action?: string
          old_value_json?: Json | null
          new_value_json?: Json | null
          changed_fields?: string[] | null
          performed_by_user_id?: string | null
          ip_address?: string | null
          user_agent?: string | null
          performed_at?: string
        }
      }
      notes: {
        Row: {
          note_id: string
          entity_type: string
          entity_id: string
          note_text: string
          note_type: string
          is_pinned: boolean
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          note_id?: string
          entity_type: string
          entity_id: string
          note_text: string
          note_type?: string
          is_pinned?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          note_id?: string
          entity_type?: string
          entity_id?: string
          note_text?: string
          note_type?: string
          is_pinned?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      config_dropdowns: {
        Row: {
          config_id: string
          category: string
          value: string
          display_order: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          config_id?: string
          category: string
          value: string
          display_order?: number
          is_active?: boolean
          created_at?: string
        }
        Update: {
          config_id?: string
          category?: string
          value?: string
          display_order?: number
          is_active?: boolean
          created_at?: string
        }
      }
      activities: {
        Row: {
          activity_id: string
          entity_type: string
          entity_id: string
          activity_type: string
          activity_title: string
          activity_description: string | null
          metadata: Json | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          activity_id?: string
          entity_type: string
          entity_id: string
          activity_type: string
          activity_title: string
          activity_description?: string | null
          metadata?: Json | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          activity_id?: string
          entity_type?: string
          entity_id?: string
          activity_type?: string
          activity_title?: string
          activity_description?: string | null
          metadata?: Json | null
          created_by?: string | null
          created_at?: string
        }
      }
      notifications: {
        Row: {
          notification_id: string
          user_id: string
          title: string
          message: string
          notification_type: string | null
          entity_type: string | null
          entity_id: string | null
          is_read: boolean
          read_at: string | null
          created_at: string
        }
        Insert: {
          notification_id?: string
          user_id: string
          title: string
          message: string
          notification_type?: string | null
          entity_type?: string | null
          entity_id?: string | null
          is_read?: boolean
          read_at?: string | null
          created_at?: string
        }
        Update: {
          notification_id?: string
          user_id?: string
          title?: string
          message?: string
          notification_type?: string | null
          entity_type?: string | null
          entity_id?: string | null
          is_read?: boolean
          read_at?: string | null
          created_at?: string
        }
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
