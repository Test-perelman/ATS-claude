# Perelman ATS - Setup Guide

## Quick Start

Follow these steps to get your ATS system running:

### Step 1: Install Dependencies

```bash
npm install
```

This will install all required packages including:
- Next.js 14
- React 18
- Supabase client
- Tailwind CSS
- Date utilities (date-fns)
- Fuzzy search (fuse.js)
- Form handling (react-hook-form)
- And more...

### Step 2: Get Service Role Key (IMPORTANT)

The `.env.local` file already has your Supabase URL and Anon Key, but you need to add the **Service Role Key** for admin operations:

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to: **Settings** → **API**
4. Copy the **service_role** key (under "Project API keys")
5. Add it to `.env.local`:

```bash
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

### Step 3: Set Up Database

Run the database setup script to create all tables:

```bash
npm run db:setup
```

This script will:
- Create all 20+ tables with proper relationships
- Set up indexes for performance
- Insert default roles (Super Admin, Sales Manager, etc.)
- Insert default permissions (40+ permissions)
- Insert visa status options (H-1B, OPT, CPT, etc.)
- Insert config dropdown values
- Create triggers for updated_at fields

**Expected output:**
```
🚀 Starting database setup...
📊 Creating tables and initial data...
✅ Database schema created successfully!
✨ Database setup completed!
```

### Step 4: Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

You should see the dashboard!

---

## Current Implementation Status

### ✅ Completed

1. **Infrastructure**
   - Project structure with Next.js 14 App Router
   - Supabase PostgreSQL database integration
   - TypeScript configuration
   - Tailwind CSS styling

2. **Database**
   - Complete ERD with 20+ tables
   - Auto-generated TypeScript types
   - Setup script ready to run

3. **Core Utilities**
   - Auto-deduplication logic (fuzzy matching)
   - Audit log system
   - Timeline aggregation
   - Permission checking (RBAC)
   - Formatting utilities

4. **UI Components**
   - Button, Card, Input, Select, Badge
   - Timeline component
   - Layout (Sidebar, Header)

5. **Pages**
   - Dashboard with KPIs
   - Candidates list page (with search/filters)
   - Candidate detail page (with timeline)
   - Complete Candidates API

### 🚧 To Be Built

The following modules follow the same pattern as Candidates:

1. **Vendors Module** (`/vendors`)
   - List page with search
   - Detail page with timeline
   - API functions
   - Auto-deduplication

2. **Clients Module** (`/clients`)
   - List page with search
   - Detail page with timeline
   - API functions
   - Auto-deduplication

3. **Job Requirements** (`/requirements`)
   - List page with filters
   - Detail page
   - Match candidates to jobs

4. **Submissions** (`/submissions`)
   - List page with pipeline view
   - Detail page with interview tracking
   - Submit candidates to jobs

5. **Interviews** (`/interviews`)
   - Calendar view
   - Schedule interviews
   - Track results

6. **Projects** (`/projects`)
   - Active placements list
   - Detail page
   - Link to timesheets/invoices

7. **Timesheets** (`/timesheets`)
   - Weekly timesheet entry
   - Approval workflow
   - Link to invoices

8. **Invoices** (`/invoices`)
   - Invoice generation
   - Payment tracking
   - Reports

9. **Immigration** (`/immigration`)
   - Visa expiry tracking
   - Document management
   - Compliance alerts

10. **Bench Management** (`/bench`)
    - Pipeline view of bench
    - Add/remove candidates
    - Bench history

11. **Settings** (`/settings`)
    - User management
    - Role & permission configuration
    - Config dropdowns management

---

## Building Additional Modules

Each module follows this pattern (using Candidates as reference):

### 1. Create API Functions

File: `src/lib/api/[module].ts`

```typescript
import { supabase } from '@/lib/supabase/client';
import { createAuditLog, createActivity } from '@/lib/utils/audit';

export async function getEntities() {
  const { data, error } = await supabase
    .from('table_name')
    .select('*')
    .order('created_at', { ascending: false });
  return { data, error };
}

export async function getEntityById(id: string) {
  const { data, error } = await supabase
    .from('table_name')
    .select('*')
    .eq('id_field', id)
    .single();
  return { data, error };
}

export async function createEntity(data: any, userId?: string) {
  // Check for duplicates
  // Insert
  // Create audit log
  // Create activity
}

export async function updateEntity(id: string, updates: any, userId?: string) {
  // Get old data
  // Update
  // Create audit log
  // Create activity
}
```

### 2. Create List Page

File: `src/app/(app)/[module]/page.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { getEntities } from '@/lib/api/[module]';

export default function ListPage() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    loadItems();
  }, []);

  async function loadItems() {
    const { data } = await getEntities();
    setItems(data || []);
  }

  return (
    <div>
      {/* Header with Add button */}
      {/* Filters */}
      {/* Table/Grid of items */}
    </div>
  );
}
```

### 3. Create Detail Page

File: `src/app/(app)/[module]/[id]/page.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Timeline } from '@/components/common/Timeline';
import { getEntityById } from '@/lib/api/[module]';
import { getEntityTimeline } from '@/lib/utils/timeline';

export default function DetailPage() {
  const params = useParams();
  const [item, setItem] = useState(null);
  const [timeline, setTimeline] = useState([]);

  useEffect(() => {
    loadItem();
    loadTimeline();
  }, []);

  // Tabs: Overview, Timeline, Related Data

  return (
    <div>
      {/* Header with edit/delete buttons */}
      {/* Tabs */}
      {/* Tab content */}
    </div>
  );
}
```

### 4. Add Timeline Support

File: `src/lib/utils/timeline.ts`

Add a new function following the pattern:

```typescript
export async function getVendorTimeline(vendorId: string): Promise<TimelineItem[]> {
  // Fetch audit logs
  // Fetch activities
  // Fetch notes
  // Fetch related records
  // Sort by timestamp
  return timeline;
}
```

---

## Database Access

### Using Supabase Client

```typescript
import { supabase } from '@/lib/supabase/client';

// Select
const { data, error } = await supabase
  .from('table_name')
  .select('*')
  .eq('field', 'value');

// Insert
const { data, error } = await supabase
  .from('table_name')
  .insert({ field1: 'value1', field2: 'value2' });

// Update
const { data, error } = await supabase
  .from('table_name')
  .update({ field: 'new_value' })
  .eq('id', 'some-id');

// Delete
const { data, error } = await supabase
  .from('table_name')
  .delete()
  .eq('id', 'some-id');

// Join tables
const { data, error } = await supabase
  .from('submissions')
  .select(\`
    *,
    candidate:candidates(first_name, last_name),
    job:job_requirements(job_title)
  \`)
  .eq('submission_status', 'submitted');
```

### Auto-Deduplication

```typescript
import { findDuplicateCandidates } from '@/lib/utils/deduplication';

const duplicate = await findDuplicateCandidates({
  email_address: data.email,
  phone_number: data.phone,
  first_name: data.firstName,
  last_name: data.lastName,
});

if (duplicate.found) {
  // Show user: "Found existing record. Merge or create new?"
  // If merge: call mergeCandidate()
  // If new: proceed with create
}
```

### Audit Logging

```typescript
import { createAuditLog } from '@/lib/utils/audit';

await createAuditLog({
  entityName: 'candidates',
  entityId: candidate.candidate_id,
  action: 'UPDATE',
  oldValue: oldData,
  newValue: newData,
  userId: currentUser.user_id,
});
```

---

## Next Steps

### Immediate

1. **Run `npm install`**
2. **Add Service Role Key to `.env.local`**
3. **Run `npm run db:setup`**
4. **Run `npm run dev`**
5. **Create your first candidate**

### Short Term

1. Build Vendors module (copy Candidates pattern)
2. Build Clients module
3. Build Requirements module
4. Add authentication (Supabase Auth)
5. Implement file upload (Supabase Storage)

### Medium Term

1. Complete all modules
2. Add Row Level Security (RLS) policies
3. Build submission pipeline view
4. Add email notifications
5. Build reports and analytics

### Long Term

1. Mobile app (React Native)
2. Email integration
3. Calendar sync
4. Advanced search
5. AI-powered candidate matching

---

## Troubleshooting

### Database setup fails

- Check your Service Role Key is correct
- Verify your Supabase project is active
- Check network connection
- Look for specific error messages

### Pages show "Loading..." indefinitely

- Open browser console (F12)
- Check for network errors
- Verify API calls are reaching Supabase
- Check Supabase project isn't paused

### TypeScript errors

- Run `npm install` again
- Delete `node_modules` and run `npm install`
- Check `tsconfig.json` paths are correct

---

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [React Hook Form](https://react-hook-form.com/)

---

## Support

For questions or issues, check the code comments and refer to the implementations in:
- `src/app/(app)/candidates/` - Complete module example
- `src/lib/api/candidates.ts` - API functions example
- `src/lib/utils/` - Utility functions

Happy coding! 🚀
