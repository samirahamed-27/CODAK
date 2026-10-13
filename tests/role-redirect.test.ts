import { describe, it, expect } from 'vitest';
import { getDashboardForRole, computeRouteRedirect } from '../src/lib/auth/role-redirect';

describe('Role Dashboard Mapping', () => {
  it('maps student role to /student', () => {
    expect(getDashboardForRole('student')).toBe('/student');
  });

  it('maps faculty role to /faculty', () => {
    expect(getDashboardForRole('faculty')).toBe('/faculty');
  });

  it('maps admin role to /admin', () => {
    expect(getDashboardForRole('admin')).toBe('/admin');
  });

  it('defaults undefined or unknown role to /student', () => {
    expect(getDashboardForRole(undefined)).toBe('/student');
    expect(getDashboardForRole(null)).toBe('/student');
  });
});

describe('Route Protection & Middleware Redirection Logic', () => {
  describe('Unauthenticated Users (Logged Out)', () => {
    it('redirects unauthenticated users trying to access /student to /login', () => {
      const redirect = computeRouteRedirect({
        pathname: '/student',
        isAuthenticated: false,
      });
      expect(redirect).toBe('/login');
    });

    it('redirects unauthenticated users trying to access /faculty to /login', () => {
      const redirect = computeRouteRedirect({
        pathname: '/faculty',
        isAuthenticated: false,
      });
      expect(redirect).toBe('/login');
    });

    it('redirects unauthenticated users trying to access /admin to /login', () => {
      const redirect = computeRouteRedirect({
        pathname: '/admin',
        isAuthenticated: false,
      });
      expect(redirect).toBe('/login');
    });

    it('allows unauthenticated users to visit public landing page /', () => {
      const redirect = computeRouteRedirect({
        pathname: '/',
        isAuthenticated: false,
      });
      expect(redirect).toBeNull();
    });

    it('allows unauthenticated users to visit /login', () => {
      const redirect = computeRouteRedirect({
        pathname: '/login',
        isAuthenticated: false,
      });
      expect(redirect).toBeNull();
    });
  });

  describe('Logged-in Users Landing on Public Pages', () => {
    it('redirects logged-in student from / to /student', () => {
      const redirect = computeRouteRedirect({
        pathname: '/',
        isAuthenticated: true,
        role: 'student',
      });
      expect(redirect).toBe('/student');
    });

    it('redirects logged-in student from /login to /student', () => {
      const redirect = computeRouteRedirect({
        pathname: '/login',
        isAuthenticated: true,
        role: 'student',
      });
      expect(redirect).toBe('/student');
    });

    it('redirects logged-in faculty from / to /faculty', () => {
      const redirect = computeRouteRedirect({
        pathname: '/',
        isAuthenticated: true,
        role: 'faculty',
      });
      expect(redirect).toBe('/faculty');
    });

    it('redirects logged-in admin from / to /admin', () => {
      const redirect = computeRouteRedirect({
        pathname: '/',
        isAuthenticated: true,
        role: 'admin',
      });
      expect(redirect).toBe('/admin');
    });
  });

  describe('Role-Based Boundary Protection', () => {
    it('redirects a student attempting to open /admin back to /student', () => {
      const redirect = computeRouteRedirect({
        pathname: '/admin',
        isAuthenticated: true,
        role: 'student',
      });
      expect(redirect).toBe('/student');
    });

    it('redirects a student attempting to open /faculty back to /student', () => {
      const redirect = computeRouteRedirect({
        pathname: '/faculty',
        isAuthenticated: true,
        role: 'student',
      });
      expect(redirect).toBe('/student');
    });

    it('redirects faculty attempting to open /admin back to /faculty', () => {
      const redirect = computeRouteRedirect({
        pathname: '/admin',
        isAuthenticated: true,
        role: 'faculty',
      });
      expect(redirect).toBe('/faculty');
    });

    it('allows faculty to access /faculty', () => {
      const redirect = computeRouteRedirect({
        pathname: '/faculty',
        isAuthenticated: true,
        role: 'faculty',
      });
      expect(redirect).toBeNull();
    });

    it('allows admin to access /admin', () => {
      const redirect = computeRouteRedirect({
        pathname: '/admin',
        isAuthenticated: true,
        role: 'admin',
      });
      expect(redirect).toBeNull();
    });

    it('allows student to access /student and subpages', () => {
      const redirectHome = computeRouteRedirect({
        pathname: '/student',
        isAuthenticated: true,
        role: 'student',
      });
      expect(redirectHome).toBeNull();

      const redirectLearn = computeRouteRedirect({
        pathname: '/student/learn',
        isAuthenticated: true,
        role: 'student',
      });
      expect(redirectLearn).toBeNull();
    });
  });
});
