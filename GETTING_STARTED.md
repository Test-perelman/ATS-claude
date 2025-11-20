# 🚀 Getting Started with Perelman ATS

## You're Almost Ready!

Your complete ATS system has been scaffolded and is ready to run. Follow these steps:

---

## Step 1: Install Dependencies ⚙️

Open your terminal in this directory and run:

```bash
npm install
```

This will install all required packages (~2-3 minutes).

---

## Step 2: Get Your Service Role Key 🔑

**IMPORTANT**: You need to add your Supabase Service Role Key to the `.env.local` file.

### How to get it:

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Select your project: `awujhuncfghjshggkqyo`
3. Click **Settings** (gear icon) in the left sidebar
4. Click **API** under Configuration
5. Scroll to **Project API keys**
6. Copy the **`service_role`** key (NOT the anon key - you already have that)

### Add it to .env.local:

Open `.env.local` and add this line:

```bash
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

Replace `your_service_role_key_here` with the actual key you copied.

**Why do you need this?**
- The Service Role Key bypasses Row Level Security (RLS)
- It's needed for the database setup script to create tables
- It should only be used server-side (never in client code)

---

## Step 3: Set Up Database 🗄️

Run the database setup script:

```bash
npm run db:setup
```

### What this does:

- ✅ Creates 20+ tables with relationships
- ✅ Adds indexes for performance
- ✅ Creates default roles (Super Admin, Sales Manager, etc.)
- ✅ Inserts 40+ permissions
- ✅ Adds visa status options (H-1B, OPT, CPT, etc.)
- ✅ Inserts config dropdown values
- ✅ Sets up triggers for auto-updating timestamps

### Expected output:

```
🚀 Starting database setup...
📊 Creating tables and initial data...
✅ Database schema created successfully!
✨ Database setup completed!
```

**If you see errors:**
- Double-check your Service Role Key is correct
- Verify your Supabase project is active (not paused)
- Check your internet connection

---

## Step 4: Run the Application 🎯

Start the development server:

```bash
npm run dev
```

Open your browser and go to:

**[http://localhost:3000](http://localhost:3000)**

You should see the dashboard! 🎉

---

## What's Working Now ✅

### Fully Implemented:

1. **Dashboard** - KPIs, recent activity, quick actions
2. **Candidates Module** - Complete with:
   - List page with search/filters
   - Detail page with full information
   - Timeline view showing all activities
   - API functions with auto-deduplication
   - Audit logging

### Navigation Ready:

All pages are accessible via the sidebar:
- ✅ Dashboard
- ✅ Candidates (fully functional)
- 📋 Bench (placeholder)
- 📋 Vendors (placeholder)
- 📋 Clients (placeholder)
- 📋 Requirements (placeholder)
- 📋 Submissions (placeholder)
- 📋 Interviews (placeholder)
- 📋 Projects (placeholder)
- 📋 Timesheets (placeholder)
- 📋 Invoices (placeholder)
- 📋 Immigration (placeholder)
- 📋 Reports (placeholder)
- 📋 Settings (placeholder)

---

## Try It Out! 🧪

### 1. Create Your First Candidate

1. Click **Candidates** in the sidebar
2. Click **Add Candidate** button
3. (Coming soon - for now, you can add via Supabase dashboard)

### 2. Add a Candidate via Supabase Dashboard:

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Click **Table Editor**
4. Select **candidates** table
5. Click **Insert** → **Insert row**
6. Fill in:
   - `first_name`: "John"
   - `last_name`: "Doe"
   - `email_address`: "john.doe@example.com"
   - `phone_number`: "555-0123"
   - `bench_status`: "available"
7. Click **Save**

### 3. View the Candidate:

1. Go back to your app at [http://localhost:3000/candidates](http://localhost:3000/candidates)
2. You should see John Doe in the list!
3. Click "View" to see the detail page
4. Click the "Timeline" tab to see the activity timeline

---

## Next Steps 📝

### Immediate:

1. **Explore the Candidates Module**
   - See how list/detail pages work
   - Check out the timeline implementation
   - Review the API functions in `src/lib/api/candidates.ts`

2. **Build Other Modules**
   - Copy the Candidates pattern for Vendors, Clients, etc.
   - Each module follows the same structure
   - Refer to `SETUP.md` for detailed patterns

### Short Term:

1. **Add Create/Edit Forms**
   - Use React Hook Form + Zod validation
   - Follow the form pattern

2. **Implement File Upload**
   - Set up Supabase Storage
   - Add resume upload for candidates
   - Store attachments

3. **Add Authentication**
   - Use Supabase Auth
   - Add login/signup pages
   - Protect routes

### Medium Term:

1. **Complete All Modules**
   - Vendors
   - Clients
   - Requirements
   - Submissions (with pipeline view)
   - Interviews (with calendar)
   - Projects
   - Timesheets
   - Invoices
   - Immigration
   - Bench Management

2. **Add Row Level Security (RLS)**
   - Configure RLS policies in Supabase
   - Implement role-based access

3. **Build Reports**
   - Use Recharts for visualizations
   - Add custom reports

---

## Project Structure 📁

```
perelman-ats/
├── src/
│   ├── app/                           # Next.js App Router
│   │   ├── (app)/                    # App layout group
│   │   │   ├── dashboard/            # ✅ Working
│   │   │   ├── candidates/           # ✅ Fully implemented
│   │   │   ├── vendors/              # 📋 Placeholder
│   │   │   ├── clients/              # 📋 Placeholder
│   │   │   └── ...                   # Other modules
│   │   ├── layout.tsx                # Root layout
│   │   ├── page.tsx                  # Redirects to dashboard
│   │   └── globals.css               # Global styles
│   ├── components/
│   │   ├── ui/                       # Reusable UI components
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Select.tsx
│   │   │   └── Badge.tsx
│   │   ├── layout/                   # Layout components
│   │   │   ├── Sidebar.tsx
│   │   │   └── Header.tsx
│   │   └── common/                   # Common components
│   │       └── Timeline.tsx
│   ├── lib/
│   │   ├── supabase/                 # Supabase client
│   │   │   └── client.ts
│   │   ├── api/                      # API functions
│   │   │   └── candidates.ts         # ✅ Complete example
│   │   └── utils/                    # Utility functions
│   │       ├── deduplication.ts      # Auto-deduplication
│   │       ├── audit.ts              # Audit logging
│   │       ├── permissions.ts        # RBAC
│   │       ├── timeline.ts           # Timeline aggregation
│   │       ├── format.ts             # Formatting
│   │       └── cn.ts                 # Class names
│   └── types/
│       └── database.ts               # TypeScript types
├── scripts/
│   └── setup-database.js             # Database setup script
├── .env.local                        # Environment variables
├── package.json                      # Dependencies
├── tsconfig.json                     # TypeScript config
├── tailwind.config.js                # Tailwind config
├── README.md                         # Main documentation
├── SETUP.md                          # Development guide
└── GETTING_STARTED.md                # This file!
```

---

## Key Files to Know 🗂️

### For Building New Modules:

1. **`src/lib/api/candidates.ts`**
   - Complete API implementation
   - Copy this pattern for other modules

2. **`src/app/(app)/candidates/page.tsx`**
   - List page with search/filters
   - Copy this for other list pages

3. **`src/app/(app)/candidates/[id]/page.tsx`**
   - Detail page with tabs
   - Timeline integration
   - Copy this for other detail pages

4. **`src/lib/utils/timeline.ts`**
   - Timeline aggregation logic
   - Add functions for each entity type

### For Understanding Core Logic:

1. **`src/lib/utils/deduplication.ts`**
   - How auto-deduplication works
   - Fuzzy matching logic

2. **`src/lib/utils/audit.ts`**
   - Audit log creation
   - Activity tracking

3. **`src/lib/utils/permissions.ts`**
   - Role-based access control
   - Permission checking

---

## Common Tasks 🛠️

### Add a New Module:

1. Create API functions in `src/lib/api/[module].ts`
2. Create list page in `src/app/(app)/[module]/page.tsx`
3. Create detail page in `src/app/(app)/[module]/[id]/page.tsx`
4. Add timeline function in `src/lib/utils/timeline.ts`
5. Update sidebar navigation if needed

### Query the Database:

```typescript
import { supabase } from '@/lib/supabase/client';

const { data, error } = await supabase
  .from('table_name')
  .select('*')
  .eq('field', 'value');
```

### Add Audit Logging:

```typescript
import { createAuditLog } from '@/lib/utils/audit';

await createAuditLog({
  entityName: 'candidates',
  entityId: id,
  action: 'UPDATE',
  oldValue: oldData,
  newValue: newData,
  userId: currentUser.user_id,
});
```

---

## Getting Help 💬

### Documentation:

- **README.md** - Overview and features
- **SETUP.md** - Detailed development guide
- **This file** - Quick start instructions

### Code Examples:

- Look at the Candidates module for complete examples
- All utilities have JSDoc comments
- TypeScript types provide inline documentation

### External Resources:

- [Next.js Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)

---

## What You Have 🎁

### Infrastructure ✅

- Complete project structure
- Database schema for 20+ tables
- TypeScript types auto-generated
- Tailwind CSS configured
- Next.js 14 with App Router

### Core Systems ✅

- Auto-deduplication with fuzzy matching
- Complete audit logging
- Timeline aggregation
- Role-based permissions (RBAC)
- Formatting utilities

### UI Components ✅

- Button, Card, Input, Select, Badge
- Timeline component
- Sidebar navigation
- Header with search

### Complete Module Example ✅

- Candidates module (fully implemented)
- List page with search
- Detail page with tabs
- Timeline view
- API with CRUD operations

---

## Ready to Build! 🎯

You now have:
1. ✅ Complete infrastructure
2. ✅ Database ready to use
3. ✅ One full module as a reference
4. ✅ All utilities and helpers
5. ✅ UI components library
6. ✅ Clear patterns to follow

**Just run:**

```bash
npm install
# Add Service Role Key to .env.local
npm run db:setup
npm run dev
```

**Then visit:** [http://localhost:3000](http://localhost:3000)

---

## Questions?

- Review the Candidates module implementation
- Check SETUP.md for detailed patterns
- Look at inline code comments
- Refer to utility function documentation

---

**Happy coding! 🚀**

The foundation is solid. Now build amazing features on top of it!
