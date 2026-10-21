import { UserRole } from '@/types/database';
import { isDemoAccount } from '@/lib/auth/demo';

export interface RouteRedirectParams {
  pathname: string;
  isAuthenticated: boolean;
  role?: UserRole | null;
  hasCampus?: boolean;
  email?: string | null;
}

/**
 * Maps a user's role to their designated home dashboard
 */
export function getDashboardForRole(role?: UserRole | null): string {
  switch (role) {
    case 'faculty':
      return '/faculty';
    case 'admin':
      return '/admin';
    case 'student':
    default:
      return '/student';
  }
}

/**
 * Pure function to calculate route authorization and redirection.
 *
 * Enforces:
 * 1. Unauthenticated users cannot view /student, /faculty, or /admin -> redirected to /login.
 * 2. Authenticated users without an assigned campus are redirected to /select-campus (except API and logout).
 * 3. Authenticated users with an assigned campus visiting /select-campus -> redirected to their role's dashboard.
 * 4. Students attempting to open /admin or /faculty -> redirected to /student.
 * 5. Faculty attempting to open /admin -> redirected to /faculty.
 * 6. Logged-in users visiting / or /login -> redirected to their role's dashboard.
 *
 * Returns a redirect path string, or null if the navigation is allowed.
 */
export function computeRouteRedirect({
  pathname,
  isAuthenticated,
  role,
  hasCampus,
  email,
}: RouteRedirectParams): string | null {
  const isProtectedRoute =
    pathname.startsWith('/student') ||
    pathname.startsWith('/faculty') ||
    pathname.startsWith('/admin');

  // Rule 1: Logged-out users requesting protected paths go to /login
  if (!isAuthenticated) {
    if (isProtectedRoute || pathname === '/select-campus') {
      return '/login';
    }
    return null;
  }

  // Rule 2: Campus onboarding enforcement for authenticated student accounts without a campus
  if (role === 'student' && hasCampus === false && !isDemoAccount(email)) {
    if (pathname.startsWith('/api') || pathname === '/redeem-invite') {
      return null;
    }
    if (pathname !== '/select-campus') {
      return '/select-campus';
    }
    return null;
  }

  // Rule 3: Non-students or students who already have a campus shouldn't stay on /select-campus
  if (pathname === '/select-campus') {
    return getDashboardForRole(role);
  }

  // Rule 6: Logged-in users landing on root / or /login go straight to their dashboard (or /select-campus if student lacks campus)
  if (pathname === '/' || pathname === '/login') {
    if (role === 'student' && hasCampus === false) {
      return '/select-campus';
    }
    return getDashboardForRole(role);
  }

  // Universal access for demo accounts across all portals (student, faculty, admin)
  if (email && isDemoAccount(email)) {
    return null;
  }

  // Rule 2 & 3: Role-based boundary enforcement
  if (pathname.startsWith('/admin')) {
    if (role !== 'admin') {
      return role === 'faculty' ? '/faculty' : '/student';
    }
  }

  if (pathname.startsWith('/faculty')) {
    if (role === 'student') {
      return '/student';
    }
  }

  // Allowed navigation
  return null;
}
