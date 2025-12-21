# Perelman ATS - Database Schema

**Connected to Supabase Project:** `awujhuncfghjshggkqyo`

## Overview

Your database contains **16 main tables** with Row Level Security (RLS) enabled, organized around an ATS (Applicant Tracking System) with team-based multi-tenancy.

---

## Tables & Schemas

### 1. **teams** (Team Management)
Multi-tenant organization support
- `id` (UUID) - Primary key, team identifier
- `team_id` (UUID) - Foreign key reference
- Row Level Security: Master admins can manage all teams; users see only their team

### 2. **users** (User Management)
Authentication and user profiles
- `id` (TEXT) - Primary key, Firebase/Auth user ID
- `team_id` (UUID) - Foreign key to teams
- `is_master_admin` (BOOLEAN) - Superuser flag
- Row Level Security:
  - Users can read/update own record
  - Master admins see all users
  - Team members see other team members

### 3. **roles** (Role-Based Access Control)
Define roles within teams
- `id` (UUID) - Primary key
- `team_id` (UUID) - Tenant isolation
- Row Level Security: Team members manage their team's roles; master admins see all

### 4. **role_permissions** (Role to Permission Mapping)
Links roles to permissions
- `role_id` (UUID) - Foreign key to roles
- `permission_id` (UUID) - Foreign key to permissions
- Row Level Security: Access based on role's team membership

### 5. **permissions** (Permission Definitions)
Available system permissions (read-only to users)
- `id` (UUID) - Primary key
- `name` (TEXT) - Permission name (e.g., "create_candidate")
- Row Level Security: All authenticated users can read

### 6. **role_templates** (Predefined Role Templates)
System-wide role templates (used to clone roles)
- `id` (UUID) - Primary key
- Available to all authenticated users
- Row Level Security: Only master admins can insert

### 7. **template_permissions** (Template Permission Mapping)
Links role templates to permissions
- Similar structure to role_permissions
- Row Level Security: Authenticated users can read

### 8. **candidates** (Job Candidates)
Candidate profiles and applicant data
- `id` (UUID) - Primary key
- `team_id` (UUID) - Tenant isolation
- Row Level Security: Team isolation + master admin access

### 9. **vendors** (Recruitment Vendors/Partners)
External recruitment partners and suppliers
- `id` (UUID) - Primary key
- `team_id` (UUID) - Tenant isolation
- Row Level Security: Team isolation + master admin access

### 10. **clients** (Client Organizations)
Companies/organizations hiring through the ATS
- `id` (UUID) - Primary key
- `team_id` (UUID) - Tenant isolation
- Row Level Security: Team isolation + master admin access

### 11. **job_requirements** (Job Postings/Requisitions)
Open positions and job descriptions
- `id` (UUID) - Primary key
- `team_id` (UUID) - Tenant isolation
- Row Level Security: Team isolation + master admin access

### 12. **submissions** (Candidate Submissions)
Submissions of candidates to job requirements
- `id` (UUID) - Primary key
- `team_id` (UUID) - Tenant isolation
- Row Level Security: Team isolation + master admin access

### 13. **interviews** (Interview Records)
Interview scheduling and results
- `id` (UUID) - Primary key
- `team_id` (UUID) - Tenant isolation
- Row Level Security: Team isolation + master admin access

### 14. **projects** (Projects/Assignments)
Project management and work assignments
- `id` (UUID) - Primary key
- `team_id` (UUID) - Tenant isolation
- Row Level Security: Team isolation + master admin access

### 15. **timesheets** (Time Tracking)
Employee/contractor time tracking records
- `id` (UUID) - Primary key
- `team_id` (UUID) - Tenant isolation
- Row Level Security: Team isolation + master admin access

### 16. **invoices** (Billing/Invoices)
Invoice generation and billing records
- `id` (UUID) - Primary key
- `team_id` (UUID) - Tenant isolation
- Row Level Security: Team isolation + master admin access

### 17. **immigration** (Immigration Sponsorship)
Immigration/visa sponsorship tracking
- `id` (UUID) - Primary key
- `team_id` (UUID) - Tenant isolation
- Row Level Security: Team isolation + master admin access

### 18. **notes** (Notes/Comments)
Notes, comments, and annotations across the system
- `id` (UUID) - Primary key
- `team_id` (UUID) - Tenant isolation
- Row Level Security: Team isolation + master admin access

### 19. **activities** (Activity Log)
Audit trail and activity logging
- `id` (UUID) - Primary key
- `team_id` (UUID) - Tenant isolation
- Row Level Security: Master admins + team members can read/write

---

## Security Architecture

### Row Level Security (RLS) Enabled
All tables have RLS enabled with policies for:

1. **Master Admin Access** - Users with `is_master_admin = true` can access all records
2. **Team Isolation** - Users only see records from their team (`team_id`)
3. **Self-Service** - Users can read/update their own records (users table)
4. **Read-Only Systems** - Permissions and templates are read-only

### Helper Functions (Security Definers)
- `_rls_current_user_id()` - Get current user ID
- `_rls_current_user_team_id()` - Get current user's team
- `_rls_is_master_admin()` - Check if user is master admin

### Grants
Tables have appropriate grants to `authenticated` and `anon` roles:
- **authenticated**: SELECT, INSERT, UPDATE, DELETE (subject to RLS)
- **anon**: SELECT only on most tables

---

## Key Relationships

```
teams (1) ─── (many) users
          ├── (many) roles
          ├── (many) candidates
          ├── (many) vendors
          ├── (many) clients
          ├── (many) job_requirements
          ├── (many) submissions
          ├── (many) interviews
          ├── (many) projects
          ├── (many) timesheets
          ├── (many) invoices
          ├── (many) immigration
          ├── (many) notes
          └── (many) activities

roles (1) ─── (many) role_permissions ─── (many) permissions

role_templates (1) ─── (many) template_permissions ─── (many) permissions
```

---

## Multi-Tenancy Model

This is a **team-based SaaS multi-tenancy** architecture:

- **Tenant**: Team (via `team_id` field on data tables)
- **Isolation**: Row-level, enforced at database level via RLS
- **Master Admin**: Single superuser role with access to all teams
- **Cross-Tenant Data**: Only users table + permissions/templates are shared

---

## Common Queries

### Get all candidates for current user's team:
```sql
SELECT * FROM candidates
WHERE team_id = (SELECT team_id FROM users WHERE id = current_user_id)
```

### Get all users in a team:
```sql
SELECT * FROM users
WHERE team_id = $1
```

### Clone a role template:
```sql
INSERT INTO roles (id, team_id, name, ...)
SELECT gen_random_uuid(), $team_id, name, ...
FROM role_templates
WHERE id = $template_id

INSERT INTO role_permissions (role_id, permission_id)
SELECT $new_role_id, permission_id
FROM template_permissions
WHERE role_template_id = $template_id
```

---

## Connection Info

- **URL**: https://awujhuncfghjshggkqyo.supabase.co
- **Database**: PostgreSQL (Supabase)
- **Port**: 5432
- **Schema**: public

---

## Notes

- All UUIDs are generated as `gen_random_uuid()`
- User IDs are TEXT (Firebase/Auth format)
- All tables have Row Level Security enabled
- No foreign keys explicitly enforced in migration (managed at application level)
- Activities table logs all operations for audit trail
