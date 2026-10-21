import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { computeRouteRedirect } from '@/lib/auth/role-redirect';
import { UserRole } from '@/types/database';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  // If Supabase keys are placeholders or missing, pass through to avoid breaking local dev preview
  if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('your-project-id')) {
    return supabaseResponse;
  }

  try {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, {
              ...options,
              maxAge: options?.maxAge ?? 60 * 60 * 24 * 365,
              sameSite: options?.sameSite ?? 'lax',
              path: options?.path ?? '/',
            })
          );
        },
      },
    });

    // IMPORTANT RULE: Always use getUser() on the server, NEVER getSession()
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let role: UserRole | null = null;
    let hasCampus: boolean | undefined = undefined;

    if (user) {
      // Query role and campus from profiles table
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, campus_id')
        .eq('id', user.id)
        .single();

      role = (profile?.role as UserRole) || 'student';
      hasCampus = !!profile?.campus_id;
    }

    // Allow auth routes like /api/auth/signout and /auth/callback to pass through directly
    if (request.nextUrl.pathname.startsWith('/api/auth') || request.nextUrl.pathname.startsWith('/auth')) {
      return supabaseResponse;
    }

    const redirectPath = computeRouteRedirect({
      pathname: request.nextUrl.pathname,
      isAuthenticated: !!user,
      role,
      hasCampus,
      email: user?.email,
    });

    if (redirectPath && redirectPath !== request.nextUrl.pathname) {
      const url = request.nextUrl.clone();
      url.pathname = redirectPath;
      const redirectResponse = NextResponse.redirect(url);
      // Crucial: preserve refreshed auth session tokens across redirect responses
      supabaseResponse.cookies.getAll().forEach((cookie) => {
        redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
      });
      return redirectResponse;
    }

    // Attach strict no-store cache control headers for protected paths to prevent browser bfcache back-navigation exposure
    if (
      request.nextUrl.pathname.startsWith('/student') ||
      request.nextUrl.pathname.startsWith('/faculty') ||
      request.nextUrl.pathname.startsWith('/admin')
    ) {
      supabaseResponse.headers.set(
        'Cache-Control',
        'no-store, no-cache, must-revalidate, proxy-revalidate'
      );
      supabaseResponse.headers.set('Pragma', 'no-cache');
      supabaseResponse.headers.set('Expires', '0');
    }
  } catch (error) {
    console.error('Middleware auth check error:', error);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, images, svg, icons
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
