import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_PATHS = ['/login', '/forgot-password', '/reset-password'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Allow Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/api/')
  ) {
    return NextResponse.next();
  }

  // The refresh-token cookie is HttpOnly – only the API can read it.
  // We use a separate lightweight session-indicator cookie (non-sensitive)
  // to tell the middleware whether the user has a session.
  const sessionIndicator = request.cookies.get('deluxnet_session')?.value;

  if (!sessionIndicator) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
