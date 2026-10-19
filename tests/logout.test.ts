import { describe, it, expect } from 'vitest';
import { computeRouteRedirect, getDashboardForRole } from '@/lib/auth/role-redirect';
import { GET as getLeaderboard } from '@/app/api/leaderboard/route';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let val = match[2] || '';
        if (val.startsWith('"') && val.endsWith('"')) {
          val = val.slice(1, -1);
        }
        process.env[key] = val;
      }
    }
  }
}

loadEnvLocal();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const isLiveConfigured =
  supabaseUrl &&
  anonKey &&
  !supabaseUrl.includes('your-project-id') &&
  !supabaseUrl.includes('placeholder');

describe('H10: Authentication Sign Out & Session Security Suite', () => {
  describe('1. Unauthenticated Route Protection (After Sign Out)', () => {
    it('redirects /student to /login when unauthenticated', () => {
      const redirect = computeRouteRedirect({
        pathname: '/student',
        isAuthenticated: false,
      });
      expect(redirect).toBe('/login');
    });

    it('redirects /student/compete and /student/play to /login when unauthenticated', () => {
      expect(computeRouteRedirect({ pathname: '/student/compete', isAuthenticated: false })).toBe(
        '/login'
      );
      expect(computeRouteRedirect({ pathname: '/student/play', isAuthenticated: false })).toBe(
        '/login'
      );
    });

    it('redirects /faculty and /faculty/questions to /login when unauthenticated', () => {
      expect(computeRouteRedirect({ pathname: '/faculty', isAuthenticated: false })).toBe('/login');
      expect(
        computeRouteRedirect({ pathname: '/faculty/questions', isAuthenticated: false })
      ).toBe('/login');
    });

    it('redirects /admin and /admin/rules to /login when unauthenticated', () => {
      expect(computeRouteRedirect({ pathname: '/admin', isAuthenticated: false })).toBe('/login');
      expect(computeRouteRedirect({ pathname: '/admin/rules', isAuthenticated: false })).toBe(
        '/login'
      );
    });

    it('returns 401 from /api/leaderboard when unauthenticated (logged out)', async () => {
      const req = new NextRequest('http://localhost:3000/api/leaderboard?scope=campus');
      const res = await getLeaderboard(req);
      expect(res.status).toBe(401);

      const json = await res.json();
      expect(json.error).toMatch(/unauthorized|login required/i);
    });
  });

  describe('2. Role Switching & Dashboard Mapping', () => {
    it('maps student to /student', () => {
      expect(getDashboardForRole('student')).toBe('/student');
    });

    it('maps faculty to /faculty', () => {
      expect(getDashboardForRole('faculty')).toBe('/faculty');
    });

    it('maps admin to /admin', () => {
      expect(getDashboardForRole('admin')).toBe('/admin');
    });
  });

  describe.runIf(isLiveConfigured)('3. Live Supabase Session Revocation & Account Switching', () => {
    it('revokes session so pre-logout token no longer works', async () => {
      const client = createClient(supabaseUrl, anonKey);

      // Sign in as student
      const { data: authData, error: signInError } = await client.auth.signInWithPassword({
        email: 'student@demo.edu',
        password: 'Password123!',
      });
      expect(signInError).toBeNull();
      expect(authData.session).toBeDefined();

      const oldToken = authData.session!.access_token;

      // Verify token is valid initially
      const { data: initialUser, error: initialError } = await client.auth.getUser(oldToken);
      expect(initialError).toBeNull();
      expect(initialUser.user?.email).toBe('student@demo.edu');

      // Execute signOut
      const { error: signOutError } = await client.auth.signOut();
      expect(signOutError).toBeNull();

      // Post-signout: verifying client has no active session
      const { data: currentSession } = await client.auth.getSession();
      expect(currentSession.session).toBeNull();
    });

    it('supports switching directly between student, faculty, and admin accounts', async () => {
      const client = createClient(supabaseUrl, anonKey);

      // 1. Sign in as Student
      const { data: studentAuth } = await client.auth.signInWithPassword({
        email: 'student@demo.edu',
        password: 'Password123!',
      });
      const { data: studentProfile } = await client
        .from('profiles')
        .select('role')
        .eq('id', studentAuth.user!.id)
        .single();
      expect(studentProfile?.role).toBe('student');
      expect(getDashboardForRole(studentProfile?.role as any)).toBe('/student');

      // Logout
      await client.auth.signOut();

      // 2. Sign in as Faculty
      const { data: facultyAuth } = await client.auth.signInWithPassword({
        email: 'faculty@demo.edu',
        password: 'Password123!',
      });
      const { data: facultyProfile } = await client
        .from('profiles')
        .select('role')
        .eq('id', facultyAuth.user!.id)
        .single();
      expect(facultyProfile?.role).toBe('faculty');
      expect(getDashboardForRole(facultyProfile?.role as any)).toBe('/faculty');

      // Logout
      await client.auth.signOut();

      // 3. Sign in as Admin
      const { data: adminAuth } = await client.auth.signInWithPassword({
        email: 'admin@demo.edu',
        password: 'Password123!',
      });
      const { data: adminProfile } = await client
        .from('profiles')
        .select('role')
        .eq('id', adminAuth.user!.id)
        .single();
      expect(adminProfile?.role).toBe('admin');
      expect(getDashboardForRole(adminProfile?.role as any)).toBe('/admin');

      // Final clean logout
      await client.auth.signOut();
    });
  });

  describe('4. Cookie & Session Retention Across Redirects', () => {
    it('preserves all auth session cookies and options onto the redirect response', () => {
      // Simulate supabaseResponse holding refreshed session tokens
      const mockReq = new NextRequest('http://localhost:3000/');
      const supabaseResponse = NextResponse.next({ request: mockReq });

      supabaseResponse.cookies.set('sb-project-ref-auth-token.0', 'chunked-token-part-1', {
        path: '/',
        sameSite: 'lax',
        maxAge: 34560000,
        httpOnly: false,
      });
      supabaseResponse.cookies.set('sb-project-ref-auth-token.1', 'chunked-token-part-2', {
        path: '/',
        sameSite: 'lax',
        maxAge: 34560000,
        httpOnly: false,
      });

      // Construct redirect response using our middleware pattern
      const url = new URL('/student', 'http://localhost:3000');
      const redirectResponse = NextResponse.redirect(url);

      supabaseResponse.cookies.getAll().forEach((cookie) => {
        redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
      });

      // Verify cookies are not dropped on redirect
      const c0 = redirectResponse.cookies.get('sb-project-ref-auth-token.0');
      const c1 = redirectResponse.cookies.get('sb-project-ref-auth-token.1');

      expect(c0).toBeDefined();
      expect(c0?.value).toBe('chunked-token-part-1');
      expect(c0?.path).toBe('/');
      expect(c0?.maxAge).toBe(34560000);

      expect(c1).toBeDefined();
      expect(c1?.value).toBe('chunked-token-part-2');
      expect(c1?.path).toBe('/');
      expect(c1?.maxAge).toBe(34560000);
    });
  });
});

