import { UserRole } from '@/types/database';

export interface RouteRedirectParams {
  pathname: string;
  isAuthenticated: boolean;
  role?: UserRole | null;
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
 * 2. Students attempting to open /admin or /faculty -> redirected to /student.
 * 3. Faculty attempting to open /admin -> redirected to /faculty.
 * 4. Logged-in users visiting / or /login -> redirected to their role's dashboard.
 *
 * Returns a redirect path string, or null if the navigation is allowed.
 */
export function computeRouteRedirect({
  pathname,
  isAuthenticated,
  role,
}: RouteRedirectParams): string | null {
  const isProtectedRoute =
    pathname.startsWith('/student') ||
    pathname.startsWith('/faculty') ||
    pathname.startsWith('/admin');

  // Rule 1: Logged-out users requesting protected paths go to /login
  if (!isAuthenticated) {
    if (isProtectedRoute) {
      return '/login';
    }
    return null;
  }

  // Rule 4: Logged-in users landing on root / or /login go straight to their dashboard
  if (pathname === '/' || pathname === '/login') {
    return getDashboardForRole(role);
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
