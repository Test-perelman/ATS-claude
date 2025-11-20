# Perelman ATS - Complete Development Guide

## 🚀 Quick Start

### Step 1: Install Dependencies

```bash
npm install
```

### Step 2: Configure Environment

Your `.env.local` already has Supabase credentials. Make sure it includes:
- `NEXT_PUBLIC_SUPABASE_URL` ✅
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` ✅
- `SUPABASE_SERVICE_ROLE_KEY` ✅ (Added)

### Step 3: Create Database Tables

**Option A: Via Supabase SQL Editor (Recommended)**

1. Go to https://app.supabase.com/project/YOUR_PROJECT_ID/sql
2. Click "New Query"
3. Copy content from `scripts/schema.sql`
4. Click "Run"

**Option B: Via Script**
```bash
npm run db:setup
```

### Step 4: Populate Mock Data

```bash
npm run db:seed-mock
```

This creates:
- 10 Users (Sales & Recruiting teams)
- 15 Vendors
- 26 Clients
- 50 Candidates
- 30 Job Requirements
- 40 Submissions
- 27 Interviews
- 15 Projects
- 40 Timesheets
- 15 Invoices
- 30 Notes

### Step 5: Start Development Server

```bash
npm run dev
```

Visit: http://localhost:3000

---

## 📊 Current Implementation Status

### ✅ Fully Implemented

1. **Dashboard** - KPIs, activity feed, quick actions
2. **Candidates Module** - List, detail, create, timeline, API
3. **Infrastructure** - Database, utilities, UI components

### 🚧 Ready to Build

All other modules need to be implemented following the Candidates pattern:
- Vendors, Clients, Requirements, Submissions, Interviews
- Projects, Timesheets, Invoices, Immigration, Bench, Reports, Settings

---

## 🎯 Module-by-Module Build Guide

Follow this sequence to build each module with mock data testing.

---

## Module 1: Vendors 🏢

**Priority: HIGH** - Required for job requirements and submissions

### Step 1: Create API Functions

Create: `src/lib/api/vendors.ts`

```typescript
import { supabase } from '@/lib/supabase/client';
import { createAuditLog, createActivity } from '@/lib/utils/audit';

export async function getVendors(filters?: {
  search?: string;
  tierLevel?: string;
  isActive?: boolean;
}) {
  let query = supabase
    .from('vendors')
    .select('*')
    .order('vendor_name');

  if (filters?.search) {
    query = query.or(\`vendor_name.ilike.%\${filters.search}%,contact_name.ilike.%\${filters.search}%\`);
  }

  if (filters?.tierLevel) {
    query = query.eq('tier_level', filters.tierLevel);
  }

  if (filters?.isActive !== undefined) {
    query = query.eq('is_active', filters.isActive);
  }

  return await query;
}

export async function getVendorById(id: string) {
  return await supabase
    .from('vendors')
    .select('*')
    .eq('vendor_id', id)
    .single();
}

export async function createVendor(data: any, userId?: string) {
  const result = await supabase
    .from('vendors')
    .insert([{ ...data, created_by: userId }])
    .select()
    .single();

  if (result.data && userId) {
    await createActivity({
      entityType: 'vendors',
      entityId: result.data.vendor_id,
      activityType: 'created',
      activityTitle: 'Vendor Created',
      activityDescription: \`Vendor \${data.vendor_name} was created\`,
      createdBy: userId,
    });
  }

  return result;
}

export async function updateVendor(id: string, updates: any, userId?: string) {
  const result = await supabase
    .from('vendors')
    .update({ ...updates, updated_by: userId })
    .eq('vendor_id', id)
    .select()
    .single();

  if (result.data && userId) {
    await createActivity({
      entityType: 'vendors',
      entityId: id,
      activityType: 'updated',
      activityTitle: 'Vendor Updated',
      activityDescription: 'Vendor information was updated',
      createdBy: userId,
    });
  }

  return result;
}
```

### Step 2: Create List Page

Update: `src/app/(app)/vendors/page.tsx`

```typescript
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { getVendors } from '@/lib/api/vendors';

export default function VendorsPage() {
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState('');

  useEffect(() => {
    loadVendors();
  }, [search, tierFilter]);

  async function loadVendors() {
    setLoading(true);
    const { data } = await getVendors({
      search: search || undefined,
      tierLevel: tierFilter || undefined,
    });
    setVendors(data || []);
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Vendors</h1>
          <p className="mt-2 text-gray-600">Manage your vendor relationships</p>
        </div>
        <Link href="/vendors/new">
          <Button>Add Vendor</Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Input
              placeholder="Search vendors..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Select
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value)}
              options={[
                { value: '', label: 'All Tiers' },
                { value: 'Tier 1', label: 'Tier 1' },
                { value: 'Tier 2', label: 'Tier 2' },
                { value: 'Tier 3', label: 'Tier 3' },
                { value: 'MSP', label: 'MSP' },
                { value: 'Direct', label: 'Direct' },
              ]}
            />
            <Button variant="outline" onClick={loadVendors}>
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results Table */}
      <Card>
        <CardHeader>
          <CardTitle>{vendors.length} Vendors</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 text-center text-gray-500">Loading...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Vendor Name</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Tier</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Contact</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Payment Terms</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {vendors.map((vendor) => (
                    <tr key={vendor.vendor_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <Link
                          href={\`/vendors/\${vendor.vendor_id}\`}
                          className="font-medium text-blue-600 hover:underline"
                        >
                          {vendor.vendor_name}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="info">{vendor.tier_level}</Badge>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div>{vendor.contact_name}</div>
                        <div className="text-gray-500">{vendor.contact_email}</div>
                      </td>
                      <td className="px-4 py-3 text-sm">{vendor.payment_terms || '-'}</td>
                      <td className="px-4 py-3">
                        <Badge variant={vendor.is_active ? 'success' : 'error'}>
                          {vendor.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={\`/vendors/\${vendor.vendor_id}\`}>
                          <Button size="sm" variant="outline">View</Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

### Step 3: Create "Add Vendor" Page

Create: `src/app/(app)/vendors/new/page.tsx`

Follow the pattern from `src/app/(app)/candidates/new/page.tsx`:
- Form with vendor fields (name, tier, contact info, payment terms)
- Validation
- Submit handler that calls `createVendor()`
- Redirect to vendor detail after creation

### Step 4: Test with Mock Data

1. Visit http://localhost:3000/vendors
2. You should see 15 vendors from mock data
3. Click "View" on any vendor
4. Click "Add Vendor" and create a new one
5. Verify the new vendor appears in the list

---

## Module 2: Clients 🏦

**Priority: HIGH** - Required for job requirements

### Follow Same Pattern as Vendors

**Files to create:**
1. `src/lib/api/clients.ts` - CRUD functions
2. Update `src/app/(app)/clients/page.tsx` - List page
3. Create `src/app/(app)/clients/new/page.tsx` - Create form
4. Update `src/app/(app)/clients/[id]/page.tsx` - Detail page

**Key Fields:**
- client_name, industry, address, city, state
- primary_contact_name, primary_contact_email, primary_contact_phone
- payment_terms, website, is_active

**Test:** 26 clients already in database from mock data

---

## Module 3: Job Requirements 📋

**Priority: HIGH** - Core functionality

### API Functions

Create: `src/lib/api/requirements.ts`

```typescript
export async function getJobRequirements(filters?: {
  search?: string;
  status?: string;
  clientId?: string;
  priority?: string;
}) {
  let query = supabase
    .from('job_requirements')
    .select(\`
      *,
      vendor:vendors(vendor_name),
      client:clients(client_name)
    \`)
    .order('created_at', { ascending: false });

  if (filters?.search) {
    query = query.ilike('job_title', \`%\${filters.search}%\`);
  }

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  if (filters?.clientId) {
    query = query.eq('client_id', filters.clientId);
  }

  if (filters?.priority) {
    query = query.eq('priority', filters.priority);
  }

  return await query;
}
```

**Key Features:**
- List with filters (status, priority, client)
- Detail view showing requirements
- Match candidates feature (compare skills)
- Submit candidate to job

**Test:** 30 job requirements in database

---

## Module 4: Submissions 📤

**Priority: HIGH** - Tracks candidate progress

### API with Relationships

Create: `src/lib/api/submissions.ts`

```typescript
export async function getSubmissions(filters?: {
  candidateId?: string;
  jobId?: string;
  status?: string;
}) {
  let query = supabase
    .from('submissions')
    .select(\`
      *,
      candidate:candidates(candidate_id, first_name, last_name, email_address),
      job:job_requirements(job_id, job_title, client_id),
      client:job_requirements(client:clients(client_name))
    \`)
    .order('submitted_at', { ascending: false });

  // Apply filters...

  return await query;
}
```

**Key Features:**
- Pipeline view (submitted → screening → shortlisted → offered)
- Link to interviews
- Track bill rate, pay rate, margin
- Status updates

**Test:** 40 submissions in database

---

## Module 5: Interviews 📅

**Priority: MEDIUM** - Interview scheduling

### Calendar View

Create: `src/app/(app)/interviews/page.tsx`

**Features:**
- Calendar view of upcoming interviews
- Schedule new interview (linked to submission)
- Record interview results
- Add feedback notes

**Table Fields:**
- submission_id, interview_round, scheduled_time
- interviewer_name, interview_mode
- result, feedback_notes, rating

**Test:** 27 interviews in database

---

## Module 6: Projects (Placements) 🚀

**Priority: HIGH** - Active placements

### Project Management

**Key Features:**
- List active projects
- Detail view with project info
- Link to timesheets
- Link to invoices
- Track start/end dates, rates, PO numbers

**Fields:**
- candidate_id, client_id, vendor_id
- bill_rate_final, pay_rate_final, margin
- po_number, timesheet_portal
- status (active, completed, terminated)

**Test:** 15 projects in database

---

## Module 7: Timesheets ⏰

**Priority: MEDIUM** - Time tracking

### Weekly Timesheet Entry

**Features:**
- Weekly timesheet entry per project
- Approval workflow
- Hours breakdown (regular + overtime)
- Link to invoice generation

**Fields:**
- project_id, candidate_id
- week_start, week_end
- hours_worked, regular_hours, overtime_hours
- approved_by_client, approval_date

**Test:** 40 timesheets in database

---

## Module 8: Invoices 💰

**Priority: MEDIUM** - Billing

### Invoice Management

**Features:**
- Generate invoice from timesheet
- Track payment status
- Invoice number auto-generation
- Payment tracking

**Fields:**
- project_id, client_id, invoice_number
- invoice_amount, invoice_date
- payment_due_date, payment_received_date
- status (draft, sent, paid, overdue)

**Test:** 15 invoices in database

---

## Module 9: Immigration 🛂

**Priority: LOW** - Compliance tracking

### Visa Management

**Features:**
- Track visa expiry dates
- Document uploads (I-797, passport)
- Compliance alerts (90 days before expiry)
- LCA tracking

**Fields:**
- candidate_id, visa_type, visa_expiry_date
- i94_expiry_date, lca_number, petition_number
- worksite_address, alert_before_days

---

## Module 10: Bench Management 📊

**Priority: MEDIUM** - Resource management

### Bench Pipeline

**Features:**
- View all candidates on bench
- Filter by availability
- Bench history tracking
- Quick actions (submit to job, mark as placed)

**Uses:**
- candidates table (filter by bench_status)
- bench_history table

---

## Module 11: Reports 📈

**Priority: LOW** - Analytics

### Report Types

1. **Submission Pipeline Report**
   - Count by status
   - Conversion rates
   - Average time in each stage

2. **Revenue Report**
   - Active projects revenue
   - Invoice status breakdown
   - Payment collections

3. **Bench Utilization**
   - Bench vs placed ratio
   - Average bench time

4. **Candidate Activity**
   - Submissions per candidate
   - Placement success rate

---

## Module 12: Settings ⚙️

**Priority: LOW** - Admin functions

### Settings Sections

1. **User Management**
   - Create/edit users
   - Assign roles
   - Manage permissions

2. **Config Dropdowns**
   - Manage dropdown values
   - Add custom options

3. **System Settings**
   - Email templates
   - Notification preferences
   - Company info

---

## 🧪 Testing Each Module

### Standard Test Flow

After implementing each module:

1. **View List Page**
   - Check data loads from mock database
   - Test search/filters
   - Verify pagination (if added)

2. **Create New Record**
   - Click "Add" button
   - Fill form
   - Submit
   - Verify it appears in list

3. **View Detail Page**
   - Click on record
   - Verify all data displays
   - Check relationships load correctly

4. **Edit Record**
   - Click edit
   - Update fields
   - Save
   - Verify changes persist

5. **Check Timeline**
   - Verify activities appear
   - Check audit logs created

---

## 🛠️ Development Utilities

### Add More Mock Data

To add more data anytime:

```bash
npm run db:seed-mock
```

This adds another batch without duplicating (emails are unique).

### Reset Database

To start fresh:

1. Go to Supabase Dashboard → SQL Editor
2. Run: `DROP SCHEMA public CASCADE; CREATE SCHEMA public;`
3. Run the schema.sql again
4. Run `npm run db:seed-mock`

### Debug Database

Use Supabase Table Editor:
- View data directly
- Edit records manually
- Check relationships
- Verify indexes

---

## 📚 Code Patterns Reference

### 1. API Function Pattern

```typescript
// src/lib/api/[module].ts
import { supabase } from '@/lib/supabase/client';

export async function getItems() {
  return await supabase.from('table').select('*');
}

export async function getItemById(id: string) {
  return await supabase.from('table').select('*').eq('id', id).single();
}

export async function createItem(data: any) {
  return await supabase.from('table').insert([data]).select().single();
}

export async function updateItem(id: string, updates: any) {
  return await supabase.from('table').update(updates).eq('id', id).select().single();
}

export async function deleteItem(id: string) {
  return await supabase.from('table').delete().eq('id', id);
}
```

### 2. List Page Pattern

```typescript
// src/app/(app)/[module]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { getItems } from '@/lib/api/[module]';

export default function ListPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadItems();
  }, []);

  async function loadItems() {
    setLoading(true);
    const { data } = await getItems();
    setItems(data || []);
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      {/* Header with Add button */}
      <div className="flex justify-between">
        <h1>Items</h1>
        <Link href="/items/new">
          <Button>Add Item</Button>
        </Link>
      </div>

      {/* Table */}
      <Card>
        <table>
          {/* Render items */}
        </table>
      </Card>
    </div>
  );
}
```

### 3. Detail Page Pattern

```typescript
// src/app/(app)/[module]/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { getItemById } from '@/lib/api/[module]';

export default function DetailPage() {
  const params = useParams();
  const [item, setItem] = useState(null);

  useEffect(() => {
    loadItem();
  }, []);

  async function loadItem() {
    const { data } = await getItemById(params.id as string);
    setItem(data);
  }

  return (
    <div className="space-y-6">
      <h1>{item?.name}</h1>
      {/* Display item details */}
    </div>
  );
}
```

### 4. Form Page Pattern

```typescript
// src/app/(app)/[module]/new/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { createItem } from '@/lib/api/[module]';

export default function NewItemPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({});

  async function handleSubmit(e) {
    e.preventDefault();
    const { data } = await createItem(formData);
    router.push(\`/items/\${data.id}\`);
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
      <Button type="submit">Create</Button>
    </form>
  );
}
```

---

## 🎯 Recommended Build Order

1. ✅ **Candidates** (Done)
2. **Vendors** (Needed for jobs)
3. **Clients** (Needed for jobs)
4. **Job Requirements** (Core functionality)
5. **Submissions** (Core functionality)
6. **Interviews** (Follows submissions)
7. **Projects** (Placements)
8. **Timesheets** (Billing)
9. **Invoices** (Billing)
10. **Bench Management** (Resource planning)
11. **Immigration** (Compliance)
12. **Reports** (Analytics)
13. **Settings** (Admin)

---

## 📞 Support

**Reference Files:**
- `src/app/(app)/candidates/` - Complete working example
- `src/lib/api/candidates.ts` - Full API implementation
- `scripts/seed-mock-data.js` - Mock data structure

**Helpful Commands:**
```bash
npm run dev                # Start dev server
npm run db:seed-mock       # Add mock data
npm run build              # Production build
```

**Need Help?**
- Check browser console (F12) for errors
- Inspect Supabase Dashboard → Table Editor
- Review existing Candidates module for patterns

Happy building! 🚀
