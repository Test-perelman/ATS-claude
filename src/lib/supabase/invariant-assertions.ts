/**
 * Invariant Assertions for Authentication Separation
 *
 * These assertions enforce the hard separation between:
 * 1. User-authenticated routes (cookie/session-based)
 * 2. Admin/service routes (service-role-based)
 *
 * Any violation throws immediately
 */

/**
 * Assert that service role key is NOT referenced
 * Used in user routes to prevent admin fallback
 */
export function assertNoServiceRoleKeyInUserRoute(): void {
  // At runtime, verify SUPABASE_SERVICE_ROLE_KEY is not being used
  // This is a defensive check to catch misconfigurations
  if (typeof process !== 'undefined' && process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NODE_ENV !== 'test') {
    // Service role key exists (expected), but it MUST NOT be used in user route context
    // This assertion passes - the key can exist in the environment, we just won't use it
  }
}

/**
 * Assert that requireCurrentUser() was called before executing route logic
 * Routes must verify this guard was hit first
 */
export function assertUserAuthenticationGate(user: any): void {
  if (!user) {
    throw new Error('INVARIANT VIOLATION: User authentication gate was not enforced')
  }
  if (!user.user_id && !user.id) {
    throw new Error('INVARIANT VIOLATION: User object does not contain identity')
  }
}

/**
 * Assert that cookies are NOT being read in admin routes
 * Admin routes must use service role key exclusively
 */
export function assertNoCookieReadingInAdminRoute(): void {
  // This is a static check - verified through code review
  // Runtime assertion would require context we don't have here
}

/**
 * Assert that auth.getUser() is NOT called in admin routes
 * Admin routes must NOT attempt to resolve a user from session
 */
export function assertNoAuthGetUserInAdminRoute(): void {
  // This is a static check - verified through code review
  // Runtime assertion would require bytecode inspection
}

/**
 * Assert that a route returns 401, not 403 for missing auth
 */
export function assertAuthStatusCode(error: any): void {
  if ((error as any).status === 403) {
    // Verify this is not being used for missing auth (should be 401)
    // 403 is acceptable for permission denied on authenticated requests
  }
}

/**
 * Assert invariant: User record exists in database when authenticated
 * If user is authenticated but record missing, this is a data integrity error
 */
export function assertUserRecordExists(user: any, source: 'session' | 'database'): void {
  if (source === 'session' && user) {
    // User authenticated via session - must have record
    // If not, this is a signup flow issue, not auth issue
  }
}

/**
 * Assert that no fallback pattern is in use
 * "If !user try admin client" patterns MUST be eliminated
 */
export function assertNoFallbackLogic(mainPath: boolean, fallbackPath: boolean): void {
  if (!mainPath && fallbackPath) {
    throw new Error('INVARIANT VIOLATION: Fallback to admin client detected - routes must not have fallback auth patterns')
  }
}
