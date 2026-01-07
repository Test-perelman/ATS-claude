# Perelman ATS - Multi-Tenant Quick Start Guide

## Overview
The Perelman ATS platform is now a complete multi-tenant system where teams can manage their own data, and a Master Admin can oversee the entire platform.

## Getting Started

### 1. Start the App
```bash
npm run dev
```
Server runs on `http://localhost:3000`

### 2. First User Signup
- Visit `http://localhost:3000/auth/signup`
- Sign up with any email
- **First user automatically becomes Master Admin**
- Redirected to `/master-admin/teams` dashboard

### 3. Create Your First Team
- Go to `/master-admin/teams`
- Click "Create Team"
- Fill in team name, description, and mark as "discoverable" to allow public access
- Submit to create team

### 4. Subsequent User Signup
- Another user signs up on `/auth/signup`
- Redirected to `/team-discovery`
- Sees all "discoverable" teams
- Can request access to any team

### 5. Approve Access Request
- Master Admin goes to `/master-admin/access-requests`
- Sees pending requests from users
- Selects a role for the user
- Clicks "Approve"
- User gets team membership and can now login to access team data

## User Roles & Permissions

### Master Admin
- Create teams
- View all users across platform
- Approve/reject all access requests
- Manage teams and team members globally

### Team Admin
- Manage team members
- Approve/reject access requests for their team
- Configure team settings
- Manage team-scoped data

### Regular Users
- Access team data after approval
- Follow role-based permissions
- Request access to discoverable teams

## Key Pages

| Page | URL | Access |
|------|-----|--------|
| Team Discovery | `/team-discovery` | Authenticated users |
| Access Request Status | `/access-request` | After submitting request |
| Master Admin Teams | `/master-admin/teams` | Master Admin only |
| Master Admin Users | `/master-admin/users` | Master Admin only |
| Master Admin Access Requests | `/master-admin/access-requests` | Master Admin / Team Admin |

## API Endpoints

### Public
- `GET /api/teams/discoverable` - List discoverable teams

### Authenticated
- `POST /api/access-requests` - Submit access request
- `GET /api/access-requests` - Get access requests

### Admin
- `GET /api/admin/teams` - List all teams
- `POST /api/admin/teams` - Create new team
- `GET /api/admin/users` - List all users
- `PUT /api/access-requests/:id/approve` - Approve request
- `PUT /api/access-requests/:id/reject` - Reject request

## Database Tables

- `users` - User profiles (with `is_master_admin` flag)
- `teams` - Team records
- `team_settings` - Team configuration (discoverable toggle)
- `team_memberships` - User membership in teams
- `team_access_requests` - Access request records
- `roles` - Team-specific roles
- `permissions` - Role permissions

## Testing the Flow

### Complete Signup to Login Flow
1. Create account (first user = Master Admin)
2. Create a discoverable team
3. Create another account (second user)
4. Request access to the team you created
5. Approve the request as Master Admin
6. Second user can now login and see team data

## Default Roles Created per Team
When a team is created, these roles are automatically added:
- **Team Admin** (admin=true) - Full team control
- **Recruiter** (admin=false) - Manage candidates/jobs
- **Manager** (admin=false) - View/manage team projects
- **Finance** (admin=false) - Handle invoicing/payments
- **Viewer** (admin=false) - Read-only access

## Security

- **Authentication**: Supabase Auth + cookie-based sessions
- **Authorization**: Row-level security (RLS) policies
- **Team Isolation**: RLS ensures users see only their team's data
- **Admin Bypass**: Master Admins bypass team filtering

## Troubleshooting

### User can't access team after approval
- Check that `team_memberships` was created
- Verify `users.team_id` is set
- Check that role has required permissions

### Team doesn't appear in discovery
- Ensure `team_settings.is_discoverable = true`
- Refresh the browser cache

### Access request fails
- Check for duplicate pending requests (one per team per user)
- Verify team exists
- Ensure user is authenticated

## Next Steps

1. Deploy to Vercel
2. Configure custom domain
3. Set up email notifications
4. Add SSO integration
5. Customize role templates

---

For more details, see `IMPLEMENTATION_COMPLETE.md`
