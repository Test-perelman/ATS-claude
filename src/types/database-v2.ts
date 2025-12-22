/**
 * v2 Type Definitions
 *
 * New types for multi-tenant v2 membership system
 * These extend the base database types with membership tracking
 */

/**
 * Team Membership - User's membership status in a team
 * NEW in v2: Tracks pending/approved/rejected status
 */
export interface TeamMembership {
  id: string  // UUID primary key
  user_id: string  // FK to users
  team_id: string  // FK to teams
  status: 'pending' | 'approved' | 'rejected'  // Membership status
  requested_at: string  // When membership was requested
  requested_role_id?: string | null  // What role was requested
  approved_at?: string | null  // When approved
  approved_by?: string | null  // Which admin approved
  rejection_reason?: string | null  // Why rejected
  rejected_at?: string | null  // When rejected
}

/**
 * Team Settings - Configuration for teams
 * NEW in v2: Enables/disables discoverability
 */
export interface TeamSettings {
  team_id: string  // UUID, FK to teams (PRIMARY KEY)
  is_discoverable: boolean  // Can new users see and request access?
  description?: string | null  // Team description
  created_at?: string
  updated_at?: string
}

/**
 * Team Context v2 - User's access to a team
 * Updated in v2: Includes membership status check
 */
export interface TeamContextV2 {
  teamId: string | null  // null for master admins
  isMasterAdmin: boolean  // System superuser
  isLocalAdmin: boolean  // Team administrator
  isApproved: boolean  // Membership is approved (NEW in v2)
  membershipStatus?: 'approved' | 'pending' | 'rejected'  // NEW in v2
  permissions: string[]  // Array of permission keys
}

/**
 * Signup Flow State v2
 * Intermediate state during signup process
 */
export interface SignupFlowState {
  authUserId: string
  email: string
  emailVerified: boolean
  step: 'email-verification' | 'team-selection' | 'create-team' | 'join-team' | 'complete'
  selectedTeamId?: string
  selectedAction?: 'create-team' | 'join-team'
}

/**
 * Admin Action Result
 * Response for admin-only operations (approve/reject)
 */
export interface AdminActionResult {
  success: boolean
  membershipId: string
  userId: string
  teamId: string
  action: 'approved' | 'rejected'
  message?: string
  error?: string
}
