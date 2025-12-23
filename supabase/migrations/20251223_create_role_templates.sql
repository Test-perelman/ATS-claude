-- Create role_templates table (stores default role configurations)
CREATE TABLE IF NOT EXISTS role_templates (
  template_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_admin_role BOOLEAN NOT NULL DEFAULT false,  -- Used when cloning to roles table
  is_system_template BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create template_permissions table (maps permissions to role templates)
CREATE TABLE IF NOT EXISTS template_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES role_templates(template_id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,  -- FIXED: permissions.id not permission_id
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(template_id, permission_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_role_templates_is_system ON role_templates(is_system_template);
CREATE INDEX IF NOT EXISTS idx_template_permissions_template ON template_permissions(template_id);
CREATE INDEX IF NOT EXISTS idx_template_permissions_permission ON template_permissions(permission_id);

-- Enable RLS
ALTER TABLE role_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_permissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- role_templates: All authenticated users can read, only master admins can write
CREATE POLICY role_templates_select ON role_templates
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY role_templates_insert ON role_templates
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()::text AND is_master_admin = true
    )
  );

CREATE POLICY role_templates_update ON role_templates
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()::text AND is_master_admin = true
    )
  );

-- template_permissions: All authenticated users can read, only master admins can write
CREATE POLICY template_permissions_select ON template_permissions
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY template_permissions_insert ON template_permissions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()::text AND is_master_admin = true
    )
  );

CREATE POLICY template_permissions_update ON template_permissions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()::text AND is_master_admin = true
    )
  );

-- Grant access to authenticated role
GRANT SELECT ON role_templates TO authenticated;
GRANT SELECT ON template_permissions TO authenticated;
