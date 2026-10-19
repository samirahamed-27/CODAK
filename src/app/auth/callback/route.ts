import { createClient } from '@/lib/supabase/server';
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Determine destination: respect explicit non-root next, or resolve by profile role
      let destination = next;
      if (destination === '/' || !destination) {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role, campus_id')
            .eq('id', user.id)
            .maybeSingle();

          const role = profile?.role || 'student';
          if (role === 'faculty') {
            destination = '/faculty';
          } else if (role === 'admin') {
            destination = '/admin';
          } else {
            destination = profile?.campus_id ? '/student' : '/select-campus';
          }
        } else {
          destination = '/student';
        }
      }

      const forwardedHost = request.headers.get('x-forwarded-host');
      const isLocalEnv = process.env.NODE_ENV === 'development';

      if (isLocalEnv) {
        return NextResponse.redirect(`${requestUrl.origin}${destination}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${destination}`);
      } else {
        return NextResponse.redirect(`${requestUrl.origin}${destination}`);
      }
    }
    console.error('OAuth code exchange error:', error);
  }

  // Redirect to login with error parameter if code exchange fails or is missing
  return NextResponse.redirect(`${requestUrl.origin}/login?error=oauth_failed`);
}
