import { NextRequest, NextResponse } from 'next/server';
import { decrypt } from '@/lib/session';

const PUBLIC_PATHS = ['/login', '/api/auth/'];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Short-circuit for PWA and static assets to ensure installability
  if (
    pathname === '/manifest.json' ||
    pathname === '/manifest.webmanifest' ||
    pathname === '/sw.js' ||
    pathname.startsWith('/workbox-') ||
    pathname.startsWith('/fallback-') ||
    pathname.startsWith('/web-app-manifest-') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  // Allow other public paths through
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = request.cookies.get('zapbill_session')?.value;
  const session = await decrypt(token);

  if (!session) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
