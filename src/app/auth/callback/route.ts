import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') || '/dashboard';

  if (code) {
    const response = NextResponse.next();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    // Exchange code for session
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Ensure user record exists (important for OAuth users)
      try {
        const ensureResponse = await fetch(
          new URL('/api/auth/ensure-user', request.url),
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              // Pass cookies to ensure user context
              'Cookie': request.headers.get('cookie') || '',
            },
          }
        );

        if (!ensureResponse.ok) {
          console.warn('[callback] Failed to ensure user record, continuing anyway');
        }
      } catch (err) {
        console.error('[callback] Error ensuring user record:', err);
        // Continue anyway - user is authenticated even if record creation fails
      }

      // Redirect after successful session exchange
      return NextResponse.redirect(new URL(next, request.url));
    }
  }

  // Return to login page if no code or exchange failed
  return NextResponse.redirect(new URL('/auth/login', request.url));
}
