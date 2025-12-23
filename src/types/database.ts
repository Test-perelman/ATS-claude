/**
 * Database type definitions
 * Auto-generated schema matching actual Supabase database
 *
 * CRITICAL: Column names must match the actual schema:
 * - users.id (TEXT) - NOT user_id or user_id
 * - teams.id (UUID)
 * - roles.id (UUID)
 *
 * Multi-tenant: team_id is the primary tenant identifier
 * Auth: users.id is a TEXT copy of auth.users.id (UUID cast to TEXT)
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
      // TEAMS: Multi-tenant company containers
      // ================================================================
      teams: {
        Row: {
          id: string  // UUID primary key
          name: string  // Team/company name (UNIQUE)
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_at?: string
          updated_at?: string
        }
      }

      // ================================================================
      // PERMISSIONS: System-wide permission catalog (read-only)
      // ================================================================
      permissions: {
        Row: {
          id: string  // UUID primary key
          key: string  // Unique permission key (e.g., 'candidates.create')
          name: string  // Display name
          module: string  // Module/resource (e.g., 'candidates', 'clients')
          created_at: string
        }
        Insert: {
          id?: string
          key: string
          name: string
          module: string
          created_at?: string
        }
        Update: {
          id?: string
          key?: string
          name?: string
          module?: string
          created_at?: string
        }
      }

      // ================================================================
      // ROLES: Team-scoped roles (master admins have NULL team_id)
      // ================================================================
      roles: {
        Row: {
          id: string  // UUID primary key
          team_id: string | null  // NULL = master admin role, otherwise team-scoped
          name: string  // Role name (e.g., 'owner', 'admin', 'member')
          is_admin: boolean  // Can manage team/permissions
          created_at: string
        }
        Insert: {
          id?: string
          team_id?: string | null
          name: string
          is_admin?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          team_id?: string | null
          name?: string
          is_admin?: boolean
          created_at?: string
        }
      }

      // ================================================================
      // ROLE_PERMISSIONS: Join table (no additional metadata)
      // ================================================================
      role_permissions: {
        Row: {
          role_id: string  // UUID FK to roles
          permission_id: string  // UUID FK to permissions
        }
        Insert: {
          role_id: string
          permission_id: string
        }
        Update: {
          role_id?: string
          permission_id?: string
        }
      }

      // ================================================================
      // USERS: Application user accounts (linked to auth.users)
      // ================================================================
      users: {
        Row: {
          id: string  // TEXT primary key (copy of auth.users.id as TEXT)
          email: string  // UNIQUE
          team_id: string | null  // FK to teams (NULL for master admins)
          role_id: string | null  // FK to roles (NULL for master admins or unassigned)
          is_master_admin: boolean  // TRUE = ignore team_id/role_id, access all teams
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string  // Must be provided (auth.users.id)
          email: string
          team_id?: string | null
          role_id?: string | null
          is_master_admin?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          team_id?: string | null
          role_id?: string | null
          is_master_admin?: boolean
          created_at?: string
          updated_at?: string
        }
      }

      // ================================================================
      // CANDIDATES: Job candidates (team-scoped)
      // ================================================================
      candidates: {
        Row: {
          id: string  // UUID primary key
          team_id: string  // FK to teams (required)
          first_name: string
          last_name: string
          email: string
          phone: string | null
          location: string | null
          current_title: string | null
          current_employer: string | null
          skills: string[] | null  // Text array
          experience_years: number | null
          status: string  // e.g., 'new', 'screening', 'interview', etc.
          created_by: string | null  // FK to users
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          team_id: string
          first_name: string
          last_name: string
          email: string
          phone?: string | null
          location?: string | null
          current_title?: string | null
          current_employer?: string | null
          skills?: string[] | null
          experience_years?: number | null
          status?: string
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          first_name?: string
          last_name?: string
          email?: string
          phone?: string | null
          location?: string | null
          current_title?: string | null
          current_employer?: string | null
          skills?: string[] | null
          experience_years?: number | null
          status?: string
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }

      // ================================================================
      // VENDORS: Service vendors/suppliers (team-scoped)
      // ================================================================
      vendors: {
        Row: {
          id: string  // UUID primary key
          team_id: string  // FK to teams (required)
          name: string
          email: string
          phone: string | null
          status: string  // e.g., 'active', 'inactive'
          created_by: string | null  // FK to users
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          team_id: string
          name: string
          email: string
          phone?: string | null
          status?: string
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          name?: string
          email?: string
          phone?: string | null
          status?: string
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }

      // ================================================================
      // CLIENTS: Client companies (team-scoped)
      // ================================================================
      clients: {
        Row: {
          id: string  // UUID primary key
          team_id: string  // FK to teams (required)
          name: string
          industry: string | null
          contact_name: string | null
          contact_email: string | null
          status: string  // e.g., 'active', 'inactive'
          created_by: string | null  // FK to users
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          team_id: string
          name: string
          industry?: string | null
          contact_name?: string | null
          contact_email?: string | null
          status?: string
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          name?: string
          industry?: string | null
          contact_name?: string | null
          contact_email?: string | null
          status?: string
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }

      // ================================================================
      // JOB_REQUIREMENTS: Job openings (team-scoped)
      // ================================================================
      job_requirements: {
        Row: {
          id: string  // UUID primary key
          team_id: string  // FK to teams (required)
          client_id: string | null  // FK to clients
          title: string
          description: string | null
          status: string  // e.g., 'open', 'closed'
          created_by: string | null  // FK to users
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          team_id: string
          client_id?: string | null
          title: string
          description?: string | null
          status?: string
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          client_id?: string | null
          title?: string
          description?: string | null
          status?: string
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }

      // ================================================================
      // SUBMISSIONS: Candidate submissions to requirements (team-scoped)
      // ================================================================
      submissions: {
        Row: {
          id: string  // UUID primary key
          team_id: string  // FK to teams (required)
          requirement_id: string  // FK to job_requirements (required)
          candidate_id: string  // FK to candidates (required)
          vendor_id: string | null  // FK to vendors
          status: string  // e.g., 'submitted', 'accepted', 'rejected'
          created_by: string | null  // FK to users
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          team_id: string
          requirement_id: string
          candidate_id: string
          vendor_id?: string | null
          status?: string
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          requirement_id?: string
          candidate_id?: string
          vendor_id?: string | null
          status?: string
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }

      // ================================================================
      // INTERVIEWS: Interview scheduling (team-scoped)
      // ================================================================
      interviews: {
        Row: {
          id: string  // UUID primary key
          team_id: string  // FK to teams (required)
          submission_id: string  // FK to submissions (required)
          scheduled_at: string  // Timestamp
          status: string  // e.g., 'scheduled', 'completed', 'canceled'
          outcome: string | null  // e.g., 'pass', 'fail', 'pending'
          created_by: string | null  // FK to users
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          team_id: string
          submission_id: string
          scheduled_at: string
          status?: string
          outcome?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          submission_id?: string
          scheduled_at?: string
          status?: string
          outcome?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }

      // ================================================================
      // PROJECTS: Staffing projects (team-scoped)
      // ================================================================
      projects: {
        Row: {
          id: string  // UUID primary key
          team_id: string  // FK to teams (required)
          client_id: string | null  // FK to clients
          name: string
          start_date: string  // Date (YYYY-MM-DD)
          end_date: string | null  // Date
          status: string  // e.g., 'active', 'completed', 'paused'
          created_by: string | null  // FK to users
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          team_id: string
          client_id?: string | null
          name: string
          start_date: string
          end_date?: string | null
          status?: string
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          client_id?: string | null
          name?: string
          start_date?: string
          end_date?: string | null
          status?: string
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }

      // ================================================================
      // TIMESHEETS: Hours tracking (team-scoped)
      // ================================================================
      timesheets: {
        Row: {
          id: string  // UUID primary key
          team_id: string  // FK to teams (required)
          project_id: string  // FK to projects (required)
          candidate_id: string  // FK to candidates (required)
          week_ending: string  // Date (YYYY-MM-DD)
          hours: number  // Decimal(5,2)
          status: string  // e.g., 'draft', 'submitted', 'approved'
          created_by: string | null  // FK to users
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          team_id: string
          project_id: string
          candidate_id: string
          week_ending: string
          hours?: number
          status?: string
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          project_id?: string
          candidate_id?: string
          week_ending?: string
          hours?: number
          status?: string
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }

      // ================================================================
      // INVOICES: Billing/invoicing (team-scoped)
      // ================================================================
      invoices: {
        Row: {
          id: string  // UUID primary key
          team_id: string  // FK to teams (required)
          client_id: string  // FK to clients (required)
          number: string  // Invoice number (UNIQUE per team)
          amount: number  // Decimal(12,2)
          status: string  // e.g., 'draft', 'sent', 'paid'
          due_date: string | null  // Date
          created_by: string | null  // FK to users
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          team_id: string
          client_id: string
          number: string
          amount: number
          status?: string
          due_date?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          client_id?: string
          number?: string
          amount?: number
          status?: string
          due_date?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }

      // ================================================================
      // IMMIGRATION: Immigration case tracking (team-scoped)
      // ================================================================
      immigration: {
        Row: {
          id: string  // UUID primary key
          team_id: string  // FK to teams (required)
          candidate_id: string  // FK to candidates (required)
          visa_type: string  // e.g., 'H1B', 'EB3', etc.
          status: string  // e.g., 'in-progress', 'approved', 'rejected'
          created_by: string | null  // FK to users
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          team_id: string
          candidate_id: string
          visa_type: string
          status?: string
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          candidate_id?: string
          visa_type?: string
          status?: string
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }

      // ================================================================
      // NOTES: Generic notes/comments (team-scoped)
      // ================================================================
      notes: {
        Row: {
          id: string  // UUID primary key
          team_id: string  // FK to teams (required)
          entity_type: string  // e.g., 'candidate', 'project', 'client'
          entity_id: string  // UUID of the related entity
          content: string  // Note content
          created_by: string | null  // FK to users
          created_at: string
        }
        Insert: {
          id?: string
          team_id: string
          entity_type: string
          entity_id: string
          content: string
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          entity_type?: string
          entity_id?: string
          content?: string
          created_by?: string | null
          created_at?: string
        }
      }
    }
    Views: {}
    Functions: {}
    Enums: {}
    CompositeTypes: {}
  }
}

// ============================================================================
// APPLICATION TYPE DEFINITIONS (Not from schema)
// ============================================================================

/**
 * User with role information
 * Used in API responses and server-side operations
 */
export interface UserWithRole {
  user_id: string  // Copy of users.id (TEXT)
  email: string
  team_id: string | null
  role_id: string | null
  is_master_admin: boolean
  created_at?: string
  updated_at?: string
  role?: {
    role_id: string
    role_name: string
    is_admin: boolean  // FIXED: was is_admin_role, now matches database column name
  } | null
  team?: {
    team_id: string
    team_name: string
    company_name?: string
  } | null
}

/**
 * Generic API response envelope
 */
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}
