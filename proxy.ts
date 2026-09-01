import { NextRequest, NextResponse } from 'next/server';
import { decrypt } from '@/lib/session';
import { hasAdminUser } from '@/lib/db/client';

const PUBLIC_PATHS = ['/login', '/setup', '/menu'];

// Admin-only pages. Menu management is open to staff too (see layout.tsx nav).
// API routes enforce their own admin check inline (existing pattern in this
// codebase), so they aren't listed here.
const ADMIN_ONLY_PREFIXES = [
  '/admin',
  '/settings',
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname === '/manifest.json' ||
    pathname === '/manifest.webmanifest' ||
    pathname === '/sw.js' ||
    pathname.startsWith('/workbox-') ||
    pathname.startsWith('/fallback-') ||
    pathname.startsWith('/web-app-manifest-') ||
    pathname === '/favicon.ico' ||
    pathname === '/apple-icon.png' ||
    pathname === '/icon0.svg'
  ) {
    return NextResponse.next();
  }

  // No admin account yet: force everything through the first-run setup wizard.
  if (!hasAdminUser() && pathname !== '/setup') {
    return NextResponse.redirect(new URL('/setup', request.url));
  }

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = request.cookies.get('zapbill_session')?.value;
  const session = await decrypt(token);

  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (session.role !== 'admin' && ADMIN_ONLY_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL('/checkout', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
