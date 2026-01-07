import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_ROUTES = ['/auth/login', '/auth/signup', '/auth/reset-password', '/auth/callback', '/auth/verify-email', '/auth/admin-setup'];
const ADMIN_ROUTES = ['/admin'];

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Create a new response object that will carry the updated cookies
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  // API routes should not redirect - they should just refresh the session
  const isApiRoute = pathname.startsWith('/api');

  // [MW-IN] MANDATORY TRACE
  console.log('[MW-IN]', {
    url: request.url,
    method: request.method,
    cookies: request.cookies.getAll().map(c => ({
      name: c.name,
      length: c.value.length
    }))
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => {
          const cookies = request.cookies.getAll();
          console.log('[Middleware] getAll() called, returning:', cookies.map(c => c.name));
          return cookies;
        },
        setAll: (cookiesToSet) => {
          console.log('[Middleware] setAll() called with', cookiesToSet.length, 'cookies');
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              console.log(`[Middleware] Setting cookie: ${name}`);
              response.cookies.set(name, value, options);
            });
          } catch (error) {
            console.error('[Middleware] Error setting cookies:', error);
          }
        },
      },
    }
  );

  // [MW-SUPABASE] MANDATORY TRACE
  console.log('[MW-SUPABASE] getUser START');
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError) {
    console.log('[MW-SUPABASE] getUser ERROR', {
      message: authError.message,
      status: (authError as any).status
    });
  } else {
    console.log('[MW-SUPABASE] getUser RESULT', {
      userExists: !!user,
      userId: user?.id,
      userEmail: user?.email
    });
  }

  // For API routes, just return the response with refreshed session cookies
  if (isApiRoute) {
    return response;
  }

  // Public routes
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    if (user && !pathname.startsWith('/auth/callback')) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return response;
  }

  // Require authentication
  if (!user) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  // Email verification check disabled - users can proceed without email confirmation
  // This allows authenticated users to access the app immediately after login

  // Get user profile (convert UUID to TEXT for id field)
  const { data: profile } = await supabase
    .from('users')
    .select('is_master_admin, role:roles(is_admin)')
    .eq('id', user.id.toString())
    .single();

  // Admin routes: Master admin only
  if (ADMIN_ROUTES.some((route) => pathname.startsWith(route))) {
    if (!profile?.is_master_admin) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // [MW-OUT] MANDATORY TRACE
  console.log('[MW-OUT]', {
    setCookie: response.headers.get('set-cookie')
  });

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * NOTE: API routes ARE included so sessions can be refreshed properly
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
