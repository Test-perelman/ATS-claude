# Perelman ATS - IT Staffing Management System

A complete ATS (Applicant Tracking System) + Internal Operations Web Application for US-based IT staffing consultancies.

## Features

- **Candidate Management** - Full CRUD with auto-deduplication
- **Bench Management** - Track consultants on bench with pipeline view
- **Vendor & Client Management** - Manage relationships and contacts
- **Job Requirements** - Track open positions
- **Submissions** - Submit candidates to jobs
- **Interview Tracking** - Schedule and track interviews
- **Project Management** - Manage placements and ongoing projects
- **Timesheets** - Track hours worked
- **Invoicing** - Generate and track invoices
- **Immigration & Compliance** - Track visa statuses and expirations
- **Role-Based Access Control** - 5 roles with granular permissions
- **Timeline View** - Every entity has a complete activity timeline
- **Audit Logs** - Track all changes
- **File Management** - Upload resumes, documents, attachments
- **Auto-Deduplication** - Intelligent fuzzy matching for entities

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **File Storage**: Supabase Storage
- **State Management**: React Hooks, Zustand (optional)

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account (free tier works)

### Installation

1. **Install Dependencies**

\`\`\`bash
npm install
\`\`\`

2. **Environment Variables**

The `.env.local` file has already been created with your Supabase credentials:

\`\`\`
NEXT_PUBLIC_SUPABASE_URL=https://awujhuncfghjshggkqyo.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
\`\`\`

**IMPORTANT**: Get your Service Role Key from Supabase Dashboard:
- Go to: Supabase Dashboard → Project Settings → API
- Copy the `service_role` key
- Add it to `.env.local`:

\`\`\`
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
\`\`\`

3. **Set Up Database**

Run the database setup script to create all tables:

\`\`\`bash
npm run db:setup
\`\`\`

This will create:
- All tables (users, candidates, vendors, clients, etc.)
- Default roles (Super Admin, Sales Manager, etc.)
- Default permissions
- Visa status options
- Config dropdowns

4. **Run Development Server**

\`\`\`bash
npm run dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

\`\`\`
perelman-ats/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── (app)/             # App layout group
│   │   │   ├── dashboard/
│   │   │   ├── candidates/
│   │   │   ├── vendors/
│   │   │   ├── clients/
│   │   │   ├── requirements/
│   │   │   ├── submissions/
│   │   │   ├── interviews/
│   │   │   ├── projects/
│   │   │   ├── timesheets/
│   │   │   ├── invoices/
│   │   │   ├── immigration/
│   │   │   ├── bench/
│   │   │   └── settings/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── ui/                # Reusable UI components
│   │   ├── layout/            # Layout components
│   │   └── common/            # Common components
│   ├── lib/
│   │   ├── supabase/          # Supabase client
│   │   └── utils/             # Utility functions
│   └── types/                 # TypeScript types
├── scripts/
│   └── setup-database.js      # Database setup script
├── .env.local                 # Environment variables
├── package.json
└── README.md
\`\`\`

## Database Schema

The database includes these main tables:

- **users** - System users with roles
- **roles** - User roles (Super Admin, Sales Manager, etc.)
- **permissions** - Granular permissions
- **role_permissions** - Role-permission mappings
- **candidates** - Consultant/candidate records
- **visa_status** - Visa types (H-1B, OPT, etc.)
- **vendors** - Vendor companies
- **clients** - Client companies
- **job_requirements** - Open positions
- **submissions** - Candidate submissions to jobs
- **interviews** - Interview schedules and results
- **projects** - Active placements
- **timesheets** - Hours tracking
- **invoices** - Billing
- **immigration** - Visa and compliance tracking
- **bench_history** - Bench status history
- **attachments** - File storage metadata
- **notes** - Notes on any entity
- **activities** - Activity timeline
- **audit_log** - Complete audit trail
- **config_dropdowns** - Configurable options
- **notifications** - User notifications

## Key Features Explained

### Auto-Deduplication

When creating a new candidate, vendor, or client, the system:
1. Checks for exact matches (email, phone, passport)
2. If no exact match, performs fuzzy matching on names
3. If match found, prompts to update existing record
4. Automatically appends new data to existing records

### Timeline View

Every entity has a timeline that shows:
- All field changes (from audit log)
- Notes added
- Related activities (submissions, interviews, projects)
- File uploads
- Status changes

### Role-Based Permissions

5 built-in roles:
- **Super Admin** - Full system access
- **Sales Manager** - Manage sales team, vendors, clients
- **Sales Executive** - Handle submissions, vendors
- **Recruiter Manager** - Manage recruiting team, candidates
- **Recruiter Executive** - Source and manage candidates

Each role has specific permissions for create/read/update/delete operations on each module.

## Development Guide

### Adding a New Module

1. Create the page in `src/app/(app)/[module-name]/page.tsx`
2. Create detail page in `src/app/(app)/[module-name]/[id]/page.tsx`
3. Add API functions in `src/lib/api/[module-name].ts`
4. Add permission checks using `src/lib/utils/permissions.ts`
5. Implement auto-deduplication if needed
6. Add audit logging for all changes
7. Implement timeline view on detail page

### Database Queries

Use Supabase client from `src/lib/supabase/client.ts`:

\`\`\`typescript
import { supabase } from '@/lib/supabase/client';

// Fetch data
const { data, error } = await supabase
  .from('candidates')
  .select('*')
  .eq('bench_status', 'on_bench');

// Insert with deduplication
const duplicate = await findDuplicateCandidates(candidateData);
if (duplicate.found) {
  // Merge and update
} else {
  // Create new
}

// Create audit log
await createAuditLog({
  entityName: 'candidates',
  entityId: candidate.candidate_id,
  action: 'UPDATE',
  oldValue: oldData,
  newValue: newData,
  userId: currentUser.user_id,
});
\`\`\`

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run db:setup` - Set up database schema

## Next Steps

After basic setup:

1. **Create First User**: Manually insert a user in Supabase or build signup page
2. **Configure Permissions**: Assign permissions to roles in Settings
3. **Add Sample Data**: Create test candidates, vendors, clients
4. **Customize Dropdowns**: Add custom options in Config Dropdowns
5. **Set Up Storage**: Configure Supabase Storage for file uploads
6. **Deploy**: Deploy to Vercel or your preferred platform

## Security Notes

- Never commit `.env.local` to version control
- Service Role Key should only be used server-side
- Implement Row Level Security (RLS) policies in Supabase
- Use role-based permissions for all sensitive operations
- Validate and sanitize all user inputs

## Support

For issues or questions:
1. Check the code comments and type definitions
2. Review Supabase documentation: https://supabase.com/docs
3. Review Next.js documentation: https://nextjs.org/docs

## License

Proprietary - All rights reserved
