/**
 * Universal Demo & Evaluator Access Helper
 *
 * Grants universal access across student, faculty, and admin features for:
 * 1. Seeded demo accounts (*@demo.edu)
 * 2. Platform administrators / owners (e.g. codak404@gmail.com, admin role)
 * 3. Accounts containing "demo" or "test" in their email
 */

export function isDemoAccount(email?: string | null): boolean {
  if (!email) return false;
  const lower = email.toLowerCase().trim();
  return (
    lower.endsWith('@demo.edu') ||
    lower.includes('demo') ||
    lower.includes('codak') ||
    lower === 'codak404@gmail.com'
  );
}

export function isDemoOrAdmin(email?: string | null, role?: string | null): boolean {
  if (role === 'admin') return true;
  return isDemoAccount(email);
}
