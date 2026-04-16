import { NextRequest, NextResponse } from 'next/server';
import { decrypt } from '@/lib/session';

const PUBLIC_PATHS = ['/login', '/api/auth/', '/menu', '/api/dishes/public'];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isKioskMode = request.cookies.has('kiosk_mode');

  // Short-circuit for PWA and static assets to ensure installability
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

  // Allow other public paths through
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = request.cookies.get('zapbill_session')?.value;
  const session = await decrypt(token);

  // 1. If user is in Kiosk Mode (scanned QR) and is NOT logged in as staff
  // Force them back to the menu
  if (isKioskMode && !session) {
    return NextResponse.redirect(new URL('/menu', request.url));
  }

  // 2. Auth Protection for staff routes
  if (!session) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
