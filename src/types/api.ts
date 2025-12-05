/**
 * Standard API Response Types
 *
 * All helper functions should return one of these types to ensure consistency
 * across the codebase. Use the union type pattern to ensure type safety.
 */

/**
 * Standard API response with data
 * @template T The data type being returned
 */
export type ApiSuccess<T> = {
  data: T;
  error?: never;
};

/**
 * Standard API response with error
 */
export type ApiError = {
  data?: never;
  error: string;
};

/**
 * Standard API response - union of success or error
 * @template T The data type being returned
 *
 * Usage:
 * ```typescript
 * type GetUserResponse = ApiResponse<User>;
 *
 * async function getUser(id: string): Promise<GetUserResponse> {
 *   try {
 *     const { data, error } = await supabase.from('users').select().eq('id', id).single();
 *     if (error) {
 *       return { error: error.message };
 *     }
 *     return { data };
 *   } catch (err) {
 *     return { error: 'An unexpected error occurred' };
 *   }
 * }
 * ```
 */
export type ApiResponse<T> = ApiSuccess<T> | ApiError;

/**
 * Standard void response (for operations that don't return data)
 *
 * Usage:
 * ```typescript
 * async function deleteUser(id: string): Promise<ApiVoidResponse> {
 *   try {
 *     const { error } = await supabase.from('users').delete().eq('id', id);
 *     if (error) {
 *       return { error: error.message };
 *     }
 *     return { data: true };
 *   } catch (err) {
 *     return { error: 'An unexpected error occurred' };
 *   }
 * }
 * ```
 */
export type ApiVoidResponse = ApiSuccess<boolean> | ApiError;

/**
 * Standard array response
 * @template T The array element type
 */
export type ApiArrayResponse<T> = ApiSuccess<T[]> | ApiError;
