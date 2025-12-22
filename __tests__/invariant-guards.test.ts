/**
 * Unit tests for invariant guard functions
 *
 * Tests all 4 required validation functions with valid and invalid states
 */

import {
  validateUserTeamConsistency,
  validateMembershipState,
  validatePendingUserAccess,
  validateApprovedUserAccess,
  InvalidUserStateError,
  InvalidMembershipStateError,
  AccessDeniedError,
} from '@/lib/utils/invariant-guards'

describe('invariant-guards', () => {
  // ========================================================================
  // validateUserTeamConsistency Tests
  // ========================================================================

  describe('validateUserTeamConsistency', () => {
    it('accepts valid master admin user', () => {
      const masterAdmin = {
        id: 'master-001',
        is_master_admin: true,
        team_id: null,
        role_id: null,
      }

      expect(() => validateUserTeamConsistency(masterAdmin)).not.toThrow()
    })

    it('rejects master admin with team_id set', () => {
      const invalidMasterAdmin = {
        id: 'master-002',
        is_master_admin: true,
        team_id: 'team-uuid-123',
        role_id: null,
      }

      expect(() => validateUserTeamConsistency(invalidMasterAdmin)).toThrow(
        InvalidUserStateError
      )
      expect(() => validateUserTeamConsistency(invalidMasterAdmin)).toThrow(
        /Master admin user has invalid state/
      )
    })

    it('rejects master admin with role_id set', () => {
      const invalidMasterAdmin = {
        id: 'master-003',
        is_master_admin: true,
        team_id: null,
        role_id: 'role-uuid-456',
      }

      expect(() => validateUserTeamConsistency(invalidMasterAdmin)).toThrow(
        InvalidUserStateError
      )
      expect(() => validateUserTeamConsistency(invalidMasterAdmin)).toThrow(
        /Master admins must have team_id=null and role_id=null/
      )
    })

    it('rejects master admin with both team_id and role_id set', () => {
      const invalidMasterAdmin = {
        id: 'master-004',
        is_master_admin: true,
        team_id: 'team-uuid-123',
        role_id: 'role-uuid-456',
      }

      expect(() => validateUserTeamConsistency(invalidMasterAdmin)).toThrow(
        InvalidUserStateError
      )
    })

    it('accepts valid team user', () => {
      const teamUser = {
        id: 'user-001',
        is_master_admin: false,
        team_id: 'team-uuid-123',
        role_id: 'role-uuid-456',
      }

      expect(() => validateUserTeamConsistency(teamUser)).not.toThrow()
    })

    it('rejects team user with null team_id', () => {
      const invalidTeamUser = {
        id: 'user-002',
        is_master_admin: false,
        team_id: null,
        role_id: 'role-uuid-456',
      }

      expect(() => validateUserTeamConsistency(invalidTeamUser)).toThrow(
        InvalidUserStateError
      )
      expect(() => validateUserTeamConsistency(invalidTeamUser)).toThrow(
        /Team users must have non-null team_id and role_id/
      )
    })

    it('rejects team user with null role_id', () => {
      const invalidTeamUser = {
        id: 'user-003',
        is_master_admin: false,
        team_id: 'team-uuid-123',
        role_id: null,
      }

      expect(() => validateUserTeamConsistency(invalidTeamUser)).toThrow(
        InvalidUserStateError
      )
      expect(() => validateUserTeamConsistency(invalidTeamUser)).toThrow(
        /Team users must have non-null team_id and role_id/
      )
    })

    it('rejects team user with both team_id and role_id null', () => {
      const invalidTeamUser = {
        id: 'user-004',
        is_master_admin: false,
        team_id: null,
        role_id: null,
      }

      expect(() => validateUserTeamConsistency(invalidTeamUser)).toThrow(
        InvalidUserStateError
      )
    })
  })

  // ========================================================================
  // validateMembershipState Tests
  // ========================================================================

  describe('validateMembershipState', () => {
    it('accepts valid approved membership', () => {
      const approvedMembership = {
        id: 'mem-001',
        status: 'approved' as const,
        approved_at: '2024-01-15T10:00:00Z',
        approved_by: 'admin-user-123',
        rejected_at: null,
      }

      expect(() => validateMembershipState(approvedMembership)).not.toThrow()
    })

    it('rejects approved membership missing approved_at', () => {
      const invalidMembership = {
        id: 'mem-002',
        status: 'approved' as const,
        approved_at: null,
        approved_by: 'admin-user-123',
        rejected_at: null,
      }

      expect(() => validateMembershipState(invalidMembership)).toThrow(
        InvalidMembershipStateError
      )
      expect(() => validateMembershipState(invalidMembership)).toThrow(
        /Approved membership missing approval metadata/
      )
    })

    it('rejects approved membership missing approved_by', () => {
      const invalidMembership = {
        id: 'mem-003',
        status: 'approved' as const,
        approved_at: '2024-01-15T10:00:00Z',
        approved_by: null,
        rejected_at: null,
      }

      expect(() => validateMembershipState(invalidMembership)).toThrow(
        InvalidMembershipStateError
      )
      expect(() => validateMembershipState(invalidMembership)).toThrow(
        /Approved membership missing approval metadata/
      )
    })

    it('rejects approved membership missing both approved_at and approved_by', () => {
      const invalidMembership = {
        id: 'mem-004',
        status: 'approved' as const,
        approved_at: null,
        approved_by: null,
        rejected_at: null,
      }

      expect(() => validateMembershipState(invalidMembership)).toThrow(
        InvalidMembershipStateError
      )
    })

    it('accepts valid pending membership', () => {
      const pendingMembership = {
        id: 'mem-005',
        status: 'pending' as const,
        approved_at: null,
        approved_by: null,
        rejected_at: null,
      }

      expect(() => validateMembershipState(pendingMembership)).not.toThrow()
    })

    it('accepts valid rejected membership', () => {
      const rejectedMembership = {
        id: 'mem-006',
        status: 'rejected' as const,
        approved_at: null,
        approved_by: null,
        rejected_at: '2024-01-15T12:00:00Z',
      }

      expect(() => validateMembershipState(rejectedMembership)).not.toThrow()
    })

    it('rejects rejected membership missing rejected_at', () => {
      const invalidMembership = {
        id: 'mem-007',
        status: 'rejected' as const,
        approved_at: null,
        approved_by: null,
        rejected_at: null,
      }

      expect(() => validateMembershipState(invalidMembership)).toThrow(
        InvalidMembershipStateError
      )
      expect(() => validateMembershipState(invalidMembership)).toThrow(
        /Rejected membership missing rejection timestamp/
      )
    })

    it('rejects invalid membership status', () => {
      const invalidMembership = {
        id: 'mem-008',
        status: 'invalid' as any,
        approved_at: null,
        approved_by: null,
        rejected_at: null,
      }

      expect(() => validateMembershipState(invalidMembership)).toThrow(
        InvalidMembershipStateError
      )
      expect(() => validateMembershipState(invalidMembership)).toThrow(
        /Invalid membership status/
      )
    })
  })

  // ========================================================================
  // validatePendingUserAccess Tests
  // ========================================================================

  describe('validatePendingUserAccess', () => {
    it('allows user without pending membership', () => {
      const approvedUser = {
        id: 'user-001',
        pending_membership_status: null,
      }

      expect(() =>
        validatePendingUserAccess(approvedUser, 'candidates')
      ).not.toThrow()
    })

    it('allows user with undefined pending_membership_status', () => {
      const user = {
        id: 'user-002',
      }

      expect(() =>
        validatePendingUserAccess(user, 'clients')
      ).not.toThrow()
    })

    it('denies user with pending membership', () => {
      const pendingUser = {
        id: 'user-003',
        pending_membership_status: 'pending',
      }

      expect(() =>
        validatePendingUserAccess(pendingUser, 'vendors')
      ).toThrow(AccessDeniedError)
      expect(() =>
        validatePendingUserAccess(pendingUser, 'vendors')
      ).toThrow(/User has pending membership, cannot access vendors/)
    })

    it('includes resource name in error message', () => {
      const pendingUser = {
        id: 'user-004',
        pending_membership_status: 'pending',
      }

      expect(() =>
        validatePendingUserAccess(pendingUser, 'interviews')
      ).toThrow(/cannot access interviews/)
    })

    it('denies user with approved status (only pending should be denied)', () => {
      const approvedUser = {
        id: 'user-005',
        pending_membership_status: 'approved',
      }

      expect(() =>
        validatePendingUserAccess(approvedUser, 'submissions')
      ).not.toThrow()
    })
  })

  // ========================================================================
  // validateApprovedUserAccess Tests
  // ========================================================================

  describe('validateApprovedUserAccess', () => {
    it('allows user approved for team', () => {
      const user = {
        id: 'user-001',
        approved_teams: ['team-uuid-123', 'team-uuid-456'],
      }

      expect(() =>
        validateApprovedUserAccess(user, 'team-uuid-123')
      ).not.toThrow()
    })

    it('allows user approved for one of multiple teams', () => {
      const user = {
        id: 'user-002',
        approved_teams: ['team-uuid-abc', 'team-uuid-def', 'team-uuid-ghi'],
      }

      expect(() =>
        validateApprovedUserAccess(user, 'team-uuid-def')
      ).not.toThrow()
    })

    it('denies user not approved for team', () => {
      const user = {
        id: 'user-003',
        approved_teams: ['team-uuid-123'],
      }

      expect(() =>
        validateApprovedUserAccess(user, 'team-uuid-456')
      ).toThrow(AccessDeniedError)
      expect(() =>
        validateApprovedUserAccess(user, 'team-uuid-456')
      ).toThrow(/User not approved for team team-uuid-456/)
    })

    it('denies user with empty approved_teams array', () => {
      const user = {
        id: 'user-004',
        approved_teams: [],
      }

      expect(() =>
        validateApprovedUserAccess(user, 'team-uuid-123')
      ).toThrow(AccessDeniedError)
    })

    it('denies user with undefined approved_teams', () => {
      const user = {
        id: 'user-005',
      }

      expect(() =>
        validateApprovedUserAccess(user, 'team-uuid-123')
      ).toThrow(AccessDeniedError)
    })

    it('includes team_id in error message', () => {
      const user = {
        id: 'user-006',
        approved_teams: ['team-uuid-xyz'],
      }

      expect(() =>
        validateApprovedUserAccess(user, 'team-uuid-special')
      ).toThrow(/team-uuid-special/)
    })
  })

  // ========================================================================
  // Error Type Tests
  // ========================================================================

  describe('error types', () => {
    it('InvalidUserStateError has correct name and extends Error', () => {
      const error = new InvalidUserStateError('test message')
      expect(error).toBeInstanceOf(Error)
      expect(error.name).toBe('InvalidUserStateError')
      expect(error.message).toBe('test message')
    })

    it('InvalidMembershipStateError has correct name and extends Error', () => {
      const error = new InvalidMembershipStateError('test message')
      expect(error).toBeInstanceOf(Error)
      expect(error.name).toBe('InvalidMembershipStateError')
      expect(error.message).toBe('test message')
    })

    it('AccessDeniedError has correct name and extends Error', () => {
      const error = new AccessDeniedError('test message')
      expect(error).toBeInstanceOf(Error)
      expect(error.name).toBe('AccessDeniedError')
      expect(error.message).toBe('test message')
    })
  })
})
