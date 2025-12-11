/**
 * Database type definitions for Supabase V2
 * Multi-tenant architecture with advanced permission system
 * Based on schema-v2.sql
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
      // ================================================================
      // CORE TABLES
      // ================================================================

      teams: {
        Row: {
          team_id: string
          team_name: string
          company_name: string
          subscription_tier: 'free' | 'starter' | 'professional' | 'enterprise'
          is_active: boolean
          created_at: string
          updated_at: string
          settings: Json
        }
        Insert: {
          team_id?: string
          team_name: string
          company_name: string
          subscription_tier?: 'free' | 'starter' | 'professional' | 'enterprise'
          is_active?: boolean
          created_at?: string
          updated_at?: string
          settings?: Json
        }
        Update: {
          team_id?: string
          team_name?: string
          company_name?: string
          subscription_tier?: 'free' | 'starter' | 'professional' | 'enterprise'
          is_active?: boolean
          created_at?: string
          updated_at?: string
          settings?: Json
        }
      }

      role_templates: {
        Row: {
          template_id: string
          template_name: string
          description: string | null
          is_admin_role: boolean
          is_system_template: boolean
          created_at: string
        }
        Insert: {
          template_id?: string
          template_name: string
          description?: string | null
          is_admin_role?: boolean
          is_system_template?: boolean
          created_at?: string
        }
        Update: {
          template_id?: string
          template_name?: string
          description?: string | null
          is_admin_role?: boolean
          is_system_template?: boolean
          created_at?: string
        }
      }

      roles: {
        Row: {
          role_id: string
          team_id: string
          role_name: string
          description: string | null
          based_on_template: string | null
          is_admin_role: boolean
          is_custom: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          role_id?: string
          team_id: string
          role_name: string
          description?: string | null
          based_on_template?: string | null
          is_admin_role?: boolean
          is_custom?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          role_id?: string
          team_id?: string
          role_name?: string
          description?: string | null
          based_on_template?: string | null
          is_admin_role?: boolean
          is_custom?: boolean
          created_at?: string
          updated_at?: string
        }
      }

      permissions: {
        Row: {
          permission_id: string
          permission_key: string
          permission_name: string
          module: string
          description: string | null
          created_at: string
        }
        Insert: {
          permission_id?: string
          permission_key: string
          permission_name: string
          module: string
          description?: string | null
          created_at?: string
        }
        Update: {
          permission_id?: string
          permission_key?: string
          permission_name?: string
          module?: string
          description?: string | null
          created_at?: string
        }
      }

      template_permissions: {
        Row: {
          template_id: string
          permission_id: string
          created_at: string
        }
        Insert: {
          template_id: string
          permission_id: string
          created_at?: string
        }
        Update: {
          template_id?: string
          permission_id?: string
          created_at?: string
        }
      }

      role_permissions: {
        Row: {
          role_id: string
          permission_id: string
          granted_by: string | null
          granted_at: string
        }
        Insert: {
          role_id: string
          permission_id: string
          granted_by?: string | null
          granted_at?: string
        }
        Update: {
          role_id?: string
          permission_id?: string
          granted_by?: string | null
          granted_at?: string
        }
      }

      users: {
        Row: {
          user_id: string // Matches Supabase auth.users.id
          team_id: string | null
          role_id: string | null
          email: string
          username: string | null
          first_name: string | null
          last_name: string | null
          is_master_admin: boolean
          status: 'active' | 'inactive' | 'suspended'
          created_at: string
          updated_at: string
          last_login: string | null
          avatar_url: string | null
        }
        Insert: {
          user_id: string
          team_id?: string | null
          role_id?: string | null
          email: string
          username?: string | null
          first_name?: string | null
          last_name?: string | null
          is_master_admin?: boolean
          status?: 'active' | 'inactive' | 'suspended'
          created_at?: string
          updated_at?: string
          last_login?: string | null
          avatar_url?: string | null
        }
        Update: {
          user_id?: string
          team_id?: string | null
          role_id?: string | null
          email?: string
          username?: string | null
          first_name?: string | null
          last_name?: string | null
          is_master_admin?: boolean
          status?: 'active' | 'inactive' | 'suspended'
          created_at?: string
          updated_at?: string
          last_login?: string | null
          avatar_url?: string | null
        }
      }

      // ================================================================
      // BUSINESS ENTITY TABLES
      // ================================================================

      candidates: {
        Row: {
          candidate_id: string
          team_id: string
          first_name: string
          last_name: string
          email: string
          phone: string | null
          location: string | null
          current_title: string | null
          current_employer: string | null
          linkedin_url: string | null
          resume_url: string | null
          skills: string[] | null
          experience_years: number | null
          status: 'new' | 'screening' | 'interview' | 'offer' | 'hired' | 'rejected' | 'withdrawn'
          source: string | null
          rating: number | null
          notes: string | null
          created_by: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          candidate_id?: string
          team_id: string
          first_name: string
          last_name: string
          email: string
          phone?: string | null
          location?: string | null
          current_title?: string | null
          current_employer?: string | null
          linkedin_url?: string | null
          resume_url?: string | null
          skills?: string[] | null
          experience_years?: number | null
          status?: 'new' | 'screening' | 'interview' | 'offer' | 'hired' | 'rejected' | 'withdrawn'
          source?: string | null
          rating?: number | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          candidate_id?: string
          team_id?: string
          first_name?: string
          last_name?: string
          email?: string
          phone?: string | null
          location?: string | null
          current_title?: string | null
          current_employer?: string | null
          linkedin_url?: string | null
          resume_url?: string | null
          skills?: string[] | null
          experience_years?: number | null
          status?: 'new' | 'screening' | 'interview' | 'offer' | 'hired' | 'rejected' | 'withdrawn'
          source?: string | null
          rating?: number | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
      }

      vendors: {
        Row: {
          vendor_id: string
          team_id: string
          vendor_name: string
          company_name: string
          email: string
          phone: string | null
          website: string | null
          address_line1: string | null
          address_line2: string | null
          city: string | null
          state: string | null
          zip_code: string | null
          country: string | null
          tax_id: string | null
          payment_terms: string | null
          preferred_payment_method: string | null
          status: 'active' | 'inactive' | 'suspended' | 'blacklisted'
          rating: number | null
          notes: string | null
          created_by: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          vendor_id?: string
          team_id: string
          vendor_name: string
          company_name: string
          email: string
          phone?: string | null
          website?: string | null
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          state?: string | null
          zip_code?: string | null
          country?: string | null
          tax_id?: string | null
          payment_terms?: string | null
          preferred_payment_method?: string | null
          status?: 'active' | 'inactive' | 'suspended' | 'blacklisted'
          rating?: number | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          vendor_id?: string
          team_id?: string
          vendor_name?: string
          company_name?: string
          email?: string
          phone?: string | null
          website?: string | null
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          state?: string | null
          zip_code?: string | null
          country?: string | null
          tax_id?: string | null
          payment_terms?: string | null
          preferred_payment_method?: string | null
          status?: 'active' | 'inactive' | 'suspended' | 'blacklisted'
          rating?: number | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
      }

      clients: {
        Row: {
          client_id: string
          team_id: string
          client_name: string
          industry: string | null
          website: string | null
          primary_contact_name: string | null
          primary_contact_email: string | null
          primary_contact_phone: string | null
          address_line1: string | null
          address_line2: string | null
          city: string | null
          state: string | null
          zip_code: string | null
          country: string | null
          company_size: string | null
          annual_revenue: string | null
          status: 'active' | 'inactive' | 'prospect' | 'former'
          rating: number | null
          notes: string | null
          created_by: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          client_id?: string
          team_id: string
          client_name: string
          industry?: string | null
          website?: string | null
          primary_contact_name?: string | null
          primary_contact_email?: string | null
          primary_contact_phone?: string | null
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          state?: string | null
          zip_code?: string | null
          country?: string | null
          company_size?: string | null
          annual_revenue?: string | null
          status?: 'active' | 'inactive' | 'prospect' | 'former'
          rating?: number | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          client_id?: string
          team_id?: string
          client_name?: string
          industry?: string | null
          website?: string | null
          primary_contact_name?: string | null
          primary_contact_email?: string | null
          primary_contact_phone?: string | null
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          state?: string | null
          zip_code?: string | null
          country?: string | null
          company_size?: string | null
          annual_revenue?: string | null
          status?: 'active' | 'inactive' | 'prospect' | 'former'
          rating?: number | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
      }

      job_requirements: {
        Row: {
          requirement_id: string
          team_id: string
          client_id: string | null
          job_title: string
          job_description: string | null
          required_skills: string[] | null
          preferred_skills: string[] | null
          experience_level: string | null
          employment_type: 'full-time' | 'part-time' | 'contract' | 'contract-to-hire' | 'temporary'
          location: string | null
          remote_type: 'on-site' | 'remote' | 'hybrid' | null
          min_salary: number | null
          max_salary: number | null
          salary_currency: string
          bill_rate: number | null
          status: 'draft' | 'open' | 'on-hold' | 'filled' | 'cancelled'
          priority: 'low' | 'medium' | 'high' | 'urgent' | null
          openings_count: number
          filled_count: number
          start_date: string | null
          end_date: string | null
          notes: string | null
          created_by: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          requirement_id?: string
          team_id: string
          client_id?: string | null
          job_title: string
          job_description?: string | null
          required_skills?: string[] | null
          preferred_skills?: string[] | null
          experience_level?: string | null
          employment_type: 'full-time' | 'part-time' | 'contract' | 'contract-to-hire' | 'temporary'
          location?: string | null
          remote_type?: 'on-site' | 'remote' | 'hybrid' | null
          min_salary?: number | null
          max_salary?: number | null
          salary_currency?: string
          bill_rate?: number | null
          status?: 'draft' | 'open' | 'on-hold' | 'filled' | 'cancelled'
          priority?: 'low' | 'medium' | 'high' | 'urgent' | null
          openings_count?: number
          filled_count?: number
          start_date?: string | null
          end_date?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          requirement_id?: string
          team_id?: string
          client_id?: string | null
          job_title?: string
          job_description?: string | null
          required_skills?: string[] | null
          preferred_skills?: string[] | null
          experience_level?: string | null
          employment_type?: 'full-time' | 'part-time' | 'contract' | 'contract-to-hire' | 'temporary'
          location?: string | null
          remote_type?: 'on-site' | 'remote' | 'hybrid' | null
          min_salary?: number | null
          max_salary?: number | null
          salary_currency?: string
          bill_rate?: number | null
          status?: 'draft' | 'open' | 'on-hold' | 'filled' | 'cancelled'
          priority?: 'low' | 'medium' | 'high' | 'urgent' | null
          openings_count?: number
          filled_count?: number
          start_date?: string | null
          end_date?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
      }

      submissions: {
        Row: {
          submission_id: string
          team_id: string
          requirement_id: string
          candidate_id: string
          vendor_id: string | null
          submitted_rate: number | null
          submitted_rate_currency: string
          availability_date: string | null
          status: 'submitted' | 'screening' | 'client-review' | 'interview' | 'offer' | 'accepted' | 'rejected' | 'withdrawn'
          stage: string | null
          notes: string | null
          rejection_reason: string | null
          submitted_by: string | null
          submitted_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          submission_id?: string
          team_id: string
          requirement_id: string
          candidate_id: string
          vendor_id?: string | null
          submitted_rate?: number | null
          submitted_rate_currency?: string
          availability_date?: string | null
          status?: 'submitted' | 'screening' | 'client-review' | 'interview' | 'offer' | 'accepted' | 'rejected' | 'withdrawn'
          stage?: string | null
          notes?: string | null
          rejection_reason?: string | null
          submitted_by?: string | null
          submitted_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          submission_id?: string
          team_id?: string
          requirement_id?: string
          candidate_id?: string
          vendor_id?: string | null
          submitted_rate?: number | null
          submitted_rate_currency?: string
          availability_date?: string | null
          status?: 'submitted' | 'screening' | 'client-review' | 'interview' | 'offer' | 'accepted' | 'rejected' | 'withdrawn'
          stage?: string | null
          notes?: string | null
          rejection_reason?: string | null
          submitted_by?: string | null
          submitted_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
      }

      interviews: {
        Row: {
          interview_id: string
          team_id: string
          submission_id: string
          interview_type: 'phone-screen' | 'technical' | 'behavioral' | 'panel' | 'final' | 'other'
          interview_round: number
          scheduled_at: string
          duration_minutes: number
          location: string | null
          meeting_link: string | null
          interviewer_names: string[] | null
          interviewer_emails: string[] | null
          status: 'scheduled' | 'completed' | 'cancelled' | 'no-show' | 'rescheduled'
          outcome: 'pass' | 'fail' | 'strong-pass' | 'strong-fail' | 'pending' | null
          feedback: string | null
          rating: number | null
          notes: string | null
          created_by: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          interview_id?: string
          team_id: string
          submission_id: string
          interview_type: 'phone-screen' | 'technical' | 'behavioral' | 'panel' | 'final' | 'other'
          interview_round?: number
          scheduled_at: string
          duration_minutes?: number
          location?: string | null
          meeting_link?: string | null
          interviewer_names?: string[] | null
          interviewer_emails?: string[] | null
          status?: 'scheduled' | 'completed' | 'cancelled' | 'no-show' | 'rescheduled'
          outcome?: 'pass' | 'fail' | 'strong-pass' | 'strong-fail' | 'pending' | null
          feedback?: string | null
          rating?: number | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          interview_id?: string
          team_id?: string
          submission_id?: string
          interview_type?: 'phone-screen' | 'technical' | 'behavioral' | 'panel' | 'final' | 'other'
          interview_round?: number
          scheduled_at?: string
          duration_minutes?: number
          location?: string | null
          meeting_link?: string | null
          interviewer_names?: string[] | null
          interviewer_emails?: string[] | null
          status?: 'scheduled' | 'completed' | 'cancelled' | 'no-show' | 'rescheduled'
          outcome?: 'pass' | 'fail' | 'strong-pass' | 'strong-fail' | 'pending' | null
          feedback?: string | null
          rating?: number | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
      }

      projects: {
        Row: {
          project_id: string
          team_id: string
          client_id: string | null
          submission_id: string | null
          project_name: string
          project_description: string | null
          project_type: 'contract' | 'full-time-placement' | 'contract-to-hire' | 'temporary' | null
          start_date: string
          end_date: string | null
          actual_end_date: string | null
          bill_rate: number | null
          pay_rate: number | null
          currency: string
          status: 'draft' | 'active' | 'on-hold' | 'completed' | 'cancelled'
          notes: string | null
          created_by: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          project_id?: string
          team_id: string
          client_id?: string | null
          submission_id?: string | null
          project_name: string
          project_description?: string | null
          project_type?: 'contract' | 'full-time-placement' | 'contract-to-hire' | 'temporary' | null
          start_date: string
          end_date?: string | null
          actual_end_date?: string | null
          bill_rate?: number | null
          pay_rate?: number | null
          currency?: string
          status?: 'draft' | 'active' | 'on-hold' | 'completed' | 'cancelled'
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          project_id?: string
          team_id?: string
          client_id?: string | null
          submission_id?: string | null
          project_name?: string
          project_description?: string | null
          project_type?: 'contract' | 'full-time-placement' | 'contract-to-hire' | 'temporary' | null
          start_date?: string
          end_date?: string | null
          actual_end_date?: string | null
          bill_rate?: number | null
          pay_rate?: number | null
          currency?: string
          status?: 'draft' | 'active' | 'on-hold' | 'completed' | 'cancelled'
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
      }

      timesheets: {
        Row: {
          timesheet_id: string
          team_id: string
          project_id: string
          candidate_id: string
          week_ending: string
          regular_hours: number
          overtime_hours: number
          total_hours: number
          status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'paid'
          submitted_at: string | null
          approved_at: string | null
          approved_by: string | null
          notes: string | null
          created_by: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          timesheet_id?: string
          team_id: string
          project_id: string
          candidate_id: string
          week_ending: string
          regular_hours?: number
          overtime_hours?: number
          status?: 'draft' | 'submitted' | 'approved' | 'rejected' | 'paid'
          submitted_at?: string | null
          approved_at?: string | null
          approved_by?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          timesheet_id?: string
          team_id?: string
          project_id?: string
          candidate_id?: string
          week_ending?: string
          regular_hours?: number
          overtime_hours?: number
          status?: 'draft' | 'submitted' | 'approved' | 'rejected' | 'paid'
          submitted_at?: string | null
          approved_at?: string | null
          approved_by?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
      }

      invoices: {
        Row: {
          invoice_id: string
          team_id: string
          client_id: string
          project_id: string | null
          invoice_number: string
          invoice_date: string
          due_date: string
          subtotal: number
          tax_amount: number
          total_amount: number
          currency: string
          status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
          paid_date: string | null
          payment_method: string | null
          notes: string | null
          terms: string | null
          created_by: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          invoice_id?: string
          team_id: string
          client_id: string
          project_id?: string | null
          invoice_number: string
          invoice_date: string
          due_date: string
          subtotal: number
          tax_amount?: number
          total_amount: number
          currency?: string
          status?: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
          paid_date?: string | null
          payment_method?: string | null
          notes?: string | null
          terms?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          invoice_id?: string
          team_id?: string
          client_id?: string
          project_id?: string | null
          invoice_number?: string
          invoice_date?: string
          due_date?: string
          subtotal?: number
          tax_amount?: number
          total_amount?: number
          currency?: string
          status?: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
          paid_date?: string | null
          payment_method?: string | null
          notes?: string | null
          terms?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
      }

      immigration: {
        Row: {
          case_id: string
          team_id: string
          candidate_id: string
          visa_type: string
          petition_type: string | null
          case_number: string | null
          filing_date: string | null
          approval_date: string | null
          expiration_date: string | null
          status: 'planning' | 'in-progress' | 'approved' | 'denied' | 'withdrawn' | 'expired'
          priority_date: string | null
          attorney_name: string | null
          attorney_firm: string | null
          attorney_email: string | null
          notes: string | null
          documents: Json
          created_by: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          case_id?: string
          team_id: string
          candidate_id: string
          visa_type: string
          petition_type?: string | null
          case_number?: string | null
          filing_date?: string | null
          approval_date?: string | null
          expiration_date?: string | null
          status?: 'planning' | 'in-progress' | 'approved' | 'denied' | 'withdrawn' | 'expired'
          priority_date?: string | null
          attorney_name?: string | null
          attorney_firm?: string | null
          attorney_email?: string | null
          notes?: string | null
          documents?: Json
          created_by?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          case_id?: string
          team_id?: string
          candidate_id?: string
          visa_type?: string
          petition_type?: string | null
          case_number?: string | null
          filing_date?: string | null
          approval_date?: string | null
          expiration_date?: string | null
          status?: 'planning' | 'in-progress' | 'approved' | 'denied' | 'withdrawn' | 'expired'
          priority_date?: string | null
          attorney_name?: string | null
          attorney_firm?: string | null
          attorney_email?: string | null
          notes?: string | null
          documents?: Json
          created_by?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
      }

      notes: {
        Row: {
          note_id: string
          team_id: string
          entity_type: 'candidate' | 'vendor' | 'client' | 'requirement' | 'submission' | 'interview' | 'project'
          entity_id: string
          content: string
          is_important: boolean
          created_by: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          note_id?: string
          team_id: string
          entity_type: 'candidate' | 'vendor' | 'client' | 'requirement' | 'submission' | 'interview' | 'project'
          entity_id: string
          content: string
          is_important?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          note_id?: string
          team_id?: string
          entity_type?: 'candidate' | 'vendor' | 'client' | 'requirement' | 'submission' | 'interview' | 'project'
          entity_id?: string
          content?: string
          is_important?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
      }

      activities: {
        Row: {
          activity_id: string
          team_id: string
          activity_type: string
          entity_type: string
          entity_id: string
          action: 'created' | 'updated' | 'deleted' | 'viewed' | 'exported' | 'imported' | 'sent' | 'received'
          description: string | null
          changes: Json | null
          user_id: string | null
          user_email: string | null
          user_name: string | null
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          activity_id?: string
          team_id: string
          activity_type: string
          entity_type: string
          entity_id: string
          action: 'created' | 'updated' | 'deleted' | 'viewed' | 'exported' | 'imported' | 'sent' | 'received'
          description?: string | null
          changes?: Json | null
          user_id?: string | null
          user_email?: string | null
          user_name?: string | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          activity_id?: string
          team_id?: string
          activity_type?: string
          entity_type?: string
          entity_id?: string
          action?: 'created' | 'updated' | 'deleted' | 'viewed' | 'exported' | 'imported' | 'sent' | 'received'
          description?: string | null
          changes?: Json | null
          user_id?: string | null
          user_email?: string | null
          user_name?: string | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}

// ================================================================
// CUSTOM TYPES FOR APPLICATION USE
// ================================================================

export interface UserWithRole {
  user_id: string
  team_id: string | null
  role_id: string | null
  email: string
  username: string | null
  first_name: string | null
  last_name: string | null
  is_master_admin: boolean
  status: 'active' | 'inactive' | 'suspended'
  role?: {
    role_id: string
    role_name: string
    is_admin_role: boolean
  } | null
  team?: {
    team_id: string
    team_name: string
    company_name: string
  } | null
}

export interface TeamContext {
  teamId: string | null
  isMasterAdmin: boolean
  isLocalAdmin: boolean
  permissions: string[]
}

export interface UserTeamInfo {
  user: UserWithRole
  teamContext: TeamContext
}

export interface RoleWithPermissions {
  role_id: string
  team_id: string
  role_name: string
  description: string | null
  is_admin_role: boolean
  is_custom: boolean
  based_on_template: string | null
  permissions: Array<{
    permission_id: string
    permission_key: string
    permission_name: string
    module: string
  }>
}

export interface PermissionModule {
  module: string
  permissions: Array<{
    permission_id: string
    permission_key: string
    permission_name: string
    description: string | null
  }>
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T = any> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}
