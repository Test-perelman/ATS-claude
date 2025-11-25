import { createClient } from '@supabase/supabase-js';
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Use SSR-compatible browser client for proper cookie handling with Next.js middleware
export const supabase = createBrowserClient<Database>(
  supabaseUrl,
  supabaseAnonKey
);

// Server-side client (for API routes)
export const createServerClient = () => {
  return createClient<Database>(
    supabaseUrl,
    process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey
  );
};

// Typed helper functions for write operations
// These helpers ensure proper TypeScript typing for Supabase insert/update operations

/**
 * Typed insert helper - ensures payload matches table Insert type
 * @param table - The table name from Database schema
 * @param payload - Strongly typed insert payload
 * @returns Promise with data and error
 */
export async function typedInsert<T extends keyof Database['public']['Tables']>(
  table: T,
  payload: Database['public']['Tables'][T]['Insert']
) {
  // Type assertion needed due to Supabase's generic inference limitations
  // The payload is already strongly typed via the function signature
  const query = supabase.from(table) as any;
  return query.insert(payload).select().single() as Promise<{
    data: Database['public']['Tables'][T]['Row'] | null;
    error: any;
  }>;
}

/**
 * Typed update helper - ensures payload matches table Update type
 * @param table - The table name from Database schema
 * @param idColumn - The primary key column name
 * @param idValue - The ID value to match
 * @param payload - Strongly typed update payload
 * @returns Promise with data and error
 */
export async function typedUpdate<T extends keyof Database['public']['Tables']>(
  table: T,
  idColumn: keyof Database['public']['Tables'][T]['Row'],
  idValue: string,
  payload: Database['public']['Tables'][T]['Update']
) {
  // Type assertion needed due to Supabase's generic inference limitations
  // The payload is already strongly typed via the function signature
  const query = supabase.from(table) as any;
  return query.update(payload).eq(idColumn as string, idValue).select().single() as Promise<{
    data: Database['public']['Tables'][T]['Row'] | null;
    error: any;
  }>;
}

/**
 * Typed upsert helper - ensures payload matches table Insert type
 * @param table - The table name from Database schema
 * @param payload - Strongly typed upsert payload
 * @param options - Upsert options (onConflict, etc.)
 * @returns Promise with data and error
 */
export async function typedUpsert<T extends keyof Database['public']['Tables']>(
  table: T,
  payload: Database['public']['Tables'][T]['Insert'] | Database['public']['Tables'][T]['Insert'][],
  options?: { onConflict?: string; ignoreDuplicates?: boolean }
) {
  // Type assertion needed due to Supabase's generic inference limitations
  const query = supabase.from(table) as any;
  return query.upsert(payload, options) as Promise<{
    data: Database['public']['Tables'][T]['Row'][] | null;
    error: any;
  }>;
}
