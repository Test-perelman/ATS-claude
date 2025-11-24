import { createServerClient, createClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

// Routes that don't require authentication
const PUBLIC_ROUTES = [
  '/admin/signup',
  '/admin/login',
  '/access-request',
];

// Routes that are only for authenticated users without team access
const AUTH_ONLY_ROUTES = ['/access-request'];

// Routes that require team access
const PROTECTED_ROUTES = [
  '/dashboard',
  '/candidates',
  '/vendors',
  '/clients',
  '/requirements',
  '/submissions',
  '/projects',
  '/timesheets',
  '/invoices',
  '/settings',
  '/bench',
];

export async function middleware(request: NextRequest) {
  try {
    // Get session
    const response = NextResponse.next({
      request: {
        headers: request.headers,
      },
    });

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

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const pathname = request.nextUrl.pathname;

    // Allow public routes
    if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
      // If already authenticated, redirect to dashboard
      if (user) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
      return response;
    }

    // Require authentication for protected routes
    if (!user) {
      // Redirect to login
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }

    // Get user record with team_id
    const { data: userData } = await supabase
      .from('users')
      .select('team_id')
      .eq('user_id', user.id)
      .single();

    const hasTeam = userData?.team_id;

    // If user doesn't have team, they can only access /access-request
    if (!hasTeam && !AUTH_ONLY_ROUTES.some((route) => pathname.startsWith(route))) {
      return NextResponse.redirect(new URL('/access-request', request.url));
    }

    // If user has team, they cannot access /access-request
    if (hasTeam && pathname.startsWith('/access-request')) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    return response;
  } catch (error) {
    console.error('Middleware error:', error);
    // Default to redirecting to login on error
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
