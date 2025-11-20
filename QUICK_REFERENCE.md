# Quick Reference Card 📋

## Instant Commands

```bash
# Install dependencies
npm install

# Set up database
npm run db:setup

# Run dev server
npm run dev

# Build for production
npm run build
```

---

## File Locations

| What | Where |
|------|-------|
| Add new page | `src/app/(app)/[module]/page.tsx` |
| Add API functions | `src/lib/api/[module].ts` |
| UI components | `src/components/ui/` |
| Utilities | `src/lib/utils/` |
| Types | `src/types/database.ts` |
| Supabase client | `src/lib/supabase/client.ts` |

---

## Code Snippets

### Query Database

```typescript
import { supabase } from '@/lib/supabase/client';

// Select
const { data, error } = await supabase
  .from('candidates')
  .select('*')
  .eq('bench_status', 'on_bench');

// Insert
const { data, error } = await supabase
  .from('candidates')
  .insert({ first_name: 'John', last_name: 'Doe' });

// Update
const { data, error } = await supabase
  .from('candidates')
  .update({ bench_status: 'placed' })
  .eq('candidate_id', id);

// Join
const { data, error } = await supabase
  .from('submissions')
  .select(`
    *,
    candidate:candidates(first_name, last_name),
    job:job_requirements(job_title)
  `);
```

### Create Audit Log

```typescript
import { createAuditLog } from '@/lib/utils/audit';

await createAuditLog({
  entityName: 'candidates',
  entityId: candidate_id,
  action: 'UPDATE',
  oldValue: oldData,
  newValue: newData,
  userId: user_id,
});
```

### Check Duplicates

```typescript
import { findDuplicateCandidates } from '@/lib/utils/deduplication';

const duplicate = await findDuplicateCandidates({
  email_address: email,
  phone_number: phone,
  first_name: firstName,
  last_name: lastName,
});

if (duplicate.found) {
  // Handle duplicate
}
```

### Get Timeline

```typescript
import { getCandidateTimeline } from '@/lib/utils/timeline';

const timeline = await getCandidateTimeline(candidate_id);
```

### Format Data

```typescript
import { formatDate, formatCurrency, formatPhoneNumber } from '@/lib/utils/format';

const date = formatDate('2024-01-15'); // "Jan 15, 2024"
const money = formatCurrency(5000); // "$5,000.00"
const phone = formatPhoneNumber('5551234567'); // "(555) 123-4567"
```

---

## Component Usage

### Button

```tsx
import { Button } from '@/components/ui/Button';

<Button variant="primary" size="md" onClick={handleClick}>
  Click Me
</Button>

// Variants: primary, secondary, outline, ghost, danger
// Sizes: sm, md, lg
```

### Card

```tsx
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';

<Card>
  <CardHeader>
    <CardTitle>Title Here</CardTitle>
  </CardHeader>
  <CardContent>
    Content here
  </CardContent>
</Card>
```

### Input

```tsx
import { Input } from '@/components/ui/Input';

<Input
  label="Email"
  type="email"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  error={errors.email}
  required
/>
```

### Select

```tsx
import { Select } from '@/components/ui/Select';

<Select
  label="Status"
  value={status}
  onChange={(e) => setStatus(e.target.value)}
  options={[
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
  ]}
/>
```

### Badge

```tsx
import { Badge } from '@/components/ui/Badge';

<Badge variant="status" status="on_bench" />
```

### Timeline

```tsx
import { Timeline } from '@/components/common/Timeline';

<Timeline items={timelineItems} />
```

---

## Database Tables

| Table | Description |
|-------|-------------|
| `users` | System users |
| `roles` | User roles |
| `permissions` | Permissions |
| `role_permissions` | Role-permission mapping |
| `candidates` | Consultants/candidates |
| `visa_status` | Visa types |
| `vendors` | Vendor companies |
| `clients` | Client companies |
| `job_requirements` | Open positions |
| `submissions` | Candidate submissions |
| `interviews` | Interview schedules |
| `projects` | Active placements |
| `timesheets` | Hours tracking |
| `invoices` | Billing |
| `immigration` | Visa tracking |
| `bench_history` | Bench tracking |
| `attachments` | File metadata |
| `notes` | Notes on entities |
| `activities` | Activity timeline |
| `audit_log` | Audit trail |
| `config_dropdowns` | Config options |
| `notifications` | User notifications |

---

## Permissions

```typescript
import { hasPermission, PERMISSIONS } from '@/lib/utils/permissions';

// Check permission
const canCreate = await hasPermission(userId, PERMISSIONS.CANDIDATE_CREATE);

// Available permissions:
PERMISSIONS.CANDIDATE_CREATE
PERMISSIONS.CANDIDATE_READ
PERMISSIONS.CANDIDATE_UPDATE
PERMISSIONS.CANDIDATE_DELETE
// ... (40+ more)
```

---

## Roles

1. **Super Admin** - Full access
2. **Sales Manager** - Manage sales team
3. **Sales Executive** - Handle submissions
4. **Recruiter Manager** - Manage recruiting
5. **Recruiter Executive** - Source candidates

---

## Environment Variables

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key
```

---

## API Pattern

```typescript
// src/lib/api/candidates.ts (example)

export async function getCandidates(filters?) {
  const { data, error } = await supabase
    .from('candidates')
    .select('*')
    .order('created_at', { ascending: false });
  return { data, error };
}

export async function getCandidateById(id: string) {
  const { data, error } = await supabase
    .from('candidates')
    .select('*')
    .eq('candidate_id', id)
    .single();
  return { data, error };
}

export async function createCandidate(data, userId) {
  // Check duplicates
  // Insert
  // Create audit log
  // Create activity
}

export async function updateCandidate(id, updates, userId) {
  // Get old data
  // Update
  // Create audit log
}
```

---

## Page Pattern

```typescript
// src/app/(app)/[module]/page.tsx (list page)

'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { getItems } from '@/lib/api/module';

export default function ListPage() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    loadItems();
  }, []);

  async function loadItems() {
    const { data } = await getItems();
    setItems(data || []);
  }

  return (
    <div>
      {/* Header, filters, table */}
    </div>
  );
}
```

---

## Useful Links

- Dashboard: http://localhost:3000/dashboard
- Candidates: http://localhost:3000/candidates
- Supabase: https://app.supabase.com
- Next.js Docs: https://nextjs.org/docs
- Tailwind Docs: https://tailwindcss.com/docs

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| DB setup fails | Check Service Role Key |
| Loading forever | Check browser console |
| Type errors | Run `npm install` |
| Can't see data | Check Supabase Table Editor |

---

**Keep this open while building! 📌**
