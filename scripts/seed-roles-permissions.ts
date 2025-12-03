/**
 * Seed script for default roles and permissions
 * Run this after applying the migration
 *
 * Usage: npx ts-node scripts/seed-roles-permissions.ts
 */

import { createServerClient } from '@/lib/supabase/client';

const serverClient = createServerClient();

// Default permissions grouped by module
const PERMISSIONS_BY_MODULE = {
  'Candidates': [
    { key: 'candidate.create', description: 'Create new candidates' },
    { key: 'candidate.read', description: 'View candidates' },
    { key: 'candidate.update', description: 'Edit candidate information' },
    { key: 'candidate.delete', description: 'Delete candidates' },
  ],
  'Vendors': [
    { key: 'vendor.create', description: 'Create new vendors' },
    { key: 'vendor.read', description: 'View vendors' },
    { key: 'vendor.update', description: 'Edit vendor information' },
    { key: 'vendor.delete', description: 'Delete vendors' },
  ],
  'Clients': [
    { key: 'client.create', description: 'Create new clients' },
    { key: 'client.read', description: 'View clients' },
    { key: 'client.update', description: 'Edit client information' },
    { key: 'client.delete', description: 'Delete clients' },
  ],
  'Jobs': [
    { key: 'job.create', description: 'Create job requirements' },
    { key: 'job.read', description: 'View job requirements' },
    { key: 'job.update', description: 'Edit job requirements' },
    { key: 'job.delete', description: 'Delete job requirements' },
  ],
  'Submissions': [
    { key: 'submission.create', description: 'Submit candidates for jobs' },
    { key: 'submission.read', description: 'View submissions' },
    { key: 'submission.update', description: 'Edit submissions' },
    { key: 'submission.delete', description: 'Delete submissions' },
  ],
  'Interviews': [
    { key: 'interview.create', description: 'Schedule interviews' },
    { key: 'interview.read', description: 'View interviews' },
    { key: 'interview.update', description: 'Update interview details' },
    { key: 'interview.delete', description: 'Delete interviews' },
  ],
  'Projects': [
    { key: 'project.create', description: 'Create new projects' },
    { key: 'project.read', description: 'View projects' },
    { key: 'project.update', description: 'Edit project details' },
    { key: 'project.delete', description: 'Delete projects' },
  ],
  'Timesheets': [
    { key: 'timesheet.create', description: 'Create timesheets' },
    { key: 'timesheet.read', description: 'View timesheets' },
    { key: 'timesheet.update', description: 'Edit timesheets' },
    { key: 'timesheet.approve', description: 'Approve timesheets' },
  ],
  'Invoices': [
    { key: 'invoice.create', description: 'Create invoices' },
    { key: 'invoice.read', description: 'View invoices' },
    { key: 'invoice.update', description: 'Edit invoices' },
    { key: 'invoice.delete', description: 'Delete invoices' },
  ],
  'Immigration': [
    { key: 'immigration.create', description: 'Create immigration records' },
    { key: 'immigration.read', description: 'View immigration records' },
    { key: 'immigration.update', description: 'Update immigration records' },
  ],
  'Users & Roles': [
    { key: 'user.create', description: 'Create new users' },
    { key: 'user.read', description: 'View users' },
    { key: 'user.update', description: 'Edit user information' },
    { key: 'user.delete', description: 'Delete users' },
    { key: 'roles.manage', description: 'Create and configure roles' },
  ],
  'Settings': [
    { key: 'settings.manage', description: 'Manage team settings' },
    { key: 'audit.view', description: 'View audit logs' },
    { key: 'reports.view', description: 'View reports' },
  ],
};

// Default role definitions with permission templates
const DEFAULT_ROLES = [
  {
    name: 'Master Admin',
    description: 'Complete access across all teams and global configuration',
    permissions: ['*'], // Wildcard means all permissions
  },
  {
    name: 'Local Admin',
    description: 'Admin for their team with full team-scoped access',
    permissions: [
      'candidate.create', 'candidate.read', 'candidate.update', 'candidate.delete',
      'vendor.create', 'vendor.read', 'vendor.update', 'vendor.delete',
      'client.create', 'client.read', 'client.update', 'client.delete',
      'job.create', 'job.read', 'job.update', 'job.delete',
      'submission.create', 'submission.read', 'submission.update', 'submission.delete',
      'interview.create', 'interview.read', 'interview.update', 'interview.delete',
      'project.create', 'project.read', 'project.update', 'project.delete',
      'timesheet.create', 'timesheet.read', 'timesheet.update', 'timesheet.approve',
      'invoice.create', 'invoice.read', 'invoice.update', 'invoice.delete',
      'immigration.create', 'immigration.read', 'immigration.update',
      'user.create', 'user.read', 'user.update', 'user.delete',
      'roles.manage',
      'settings.manage', 'audit.view', 'reports.view',
    ],
  },
  {
    name: 'Sales Manager',
    description: 'Manage candidates, vendors, clients, and job placements',
    permissions: [
      'candidate.create', 'candidate.read', 'candidate.update',
      'vendor.read', 'vendor.update',
      'client.read', 'client.update',
      'job.read',
      'submission.create', 'submission.read', 'submission.update',
      'interview.read', 'interview.update',
      'project.read',
      'reports.view',
    ],
  },
  {
    name: 'Manager',
    description: 'General access to candidates, vendors, clients and projects',
    permissions: [
      'candidate.create', 'candidate.read', 'candidate.update',
      'vendor.read',
      'client.read',
      'job.read',
      'submission.read',
      'interview.read',
      'project.read',
      'timesheet.read',
      'reports.view',
    ],
  },
  {
    name: 'Recruiter',
    description: 'Manage candidates and submissions',
    permissions: [
      'candidate.create', 'candidate.read', 'candidate.update',
      'job.read',
      'submission.create', 'submission.read', 'submission.update',
      'interview.create', 'interview.read', 'interview.update',
    ],
  },
  {
    name: 'Finance',
    description: 'Manage invoices, timesheets, and financial reports',
    permissions: [
      'timesheet.read', 'timesheet.approve',
      'invoice.create', 'invoice.read', 'invoice.update',
      'project.read',
      'reports.view',
    ],
  },
  {
    name: 'View-Only',
    description: 'Read-only access to all core modules',
    permissions: [
      'candidate.read',
      'vendor.read',
      'client.read',
      'job.read',
      'submission.read',
      'interview.read',
      'project.read',
      'timesheet.read',
      'invoice.read',
      'immigration.read',
      'reports.view',
    ],
  },
];

async function seedRolesAndPermissions() {
  try {
    console.log('🌱 Starting seed: Roles and Permissions\n');

    // Step 1: Create all permissions
    console.log('📝 Creating permissions...');
    const permissionMap: Record<string, string> = {}; // key -> id mapping

    for (const [module, perms] of Object.entries(PERMISSIONS_BY_MODULE)) {
      for (const perm of perms) {
        // Check if permission already exists
        const { data: existing } = await serverClient
          .from('permissions')
          .select('permission_id')
          .eq('permission_key', perm.key)
          .single();

        if (existing) {
          permissionMap[perm.key] = (existing as any).permission_id;
          console.log(`  ✓ Permission already exists: ${perm.key}`);
        } else {
          // Create new permission
          const { data: newPerm, error } = await serverClient
            .from('permissions')
            .insert({
              permission_key: perm.key,
              permission_description: perm.description,
              module_name: module,
            })
            .select('permission_id')
            .single();

          if (error) {
            console.error(`  ✗ Failed to create ${perm.key}:`, error.message);
          } else {
            permissionMap[perm.key] = (newPerm as any).permission_id;
            console.log(`  ✓ Created permission: ${perm.key}`);
          }
        }
      }
    }

    // Step 2: Create default roles and assign permissions
    console.log('\n👥 Creating roles and assigning permissions...');

    for (const role of DEFAULT_ROLES) {
      // Check if role already exists
      const { data: existing } = await serverClient
        .from('roles')
        .select('role_id')
        .eq('role_name', role.name)
        .single();

      let roleId: string;

      if (existing) {
        roleId = (existing as any).role_id;
        console.log(`  ✓ Role already exists: ${role.name}`);
      } else {
        // Create new role
        const { data: newRole, error } = await serverClient
          .from('roles')
          .insert({
            role_name: role.name,
            role_description: role.description,
          })
          .select('role_id')
          .single();

        if (error) {
          console.error(`  ✗ Failed to create ${role.name}:`, error.message);
          continue;
        }

        roleId = (newRole as any).role_id;
        console.log(`  ✓ Created role: ${role.name}`);
      }

      // Assign permissions to role
      if (role.permissions.includes('*')) {
        // Master Admin gets all permissions
        for (const permId of Object.values(permissionMap)) {
          // Check if already assigned
          const { data: exists } = await serverClient
            .from('role_permissions')
            .select('role_permission_id')
            .eq('role_id', roleId)
            .eq('permission_id', permId)
            .single();

          if (!exists) {
            const { error } = await serverClient
              .from('role_permissions')
              .insert({
                role_id: roleId,
                permission_id: permId,
                allowed: true,
              });

            if (!error) {
              console.log(`    ✓ Assigned permission to ${role.name}`);
            }
          }
        }
      } else {
        // Assign specific permissions
        for (const permKey of role.permissions) {
          const permId = permissionMap[permKey];
          if (!permId) {
            console.warn(`    ⚠ Permission not found: ${permKey}`);
            continue;
          }

          // Check if already assigned
          const { data: exists } = await serverClient
            .from('role_permissions')
            .select('role_permission_id')
            .eq('role_id', roleId)
            .eq('permission_id', permId)
            .single();

          if (!exists) {
            const { error } = await serverClient
              .from('role_permissions')
              .insert({
                role_id: roleId,
                permission_id: permId,
                allowed: true,
              });

            if (!error) {
              console.log(`    ✓ Assigned ${permKey} to ${role.name}`);
            }
          }
        }
      }
    }

    console.log('\n✅ Seed completed successfully!\n');
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
}

seedRolesAndPermissions();
