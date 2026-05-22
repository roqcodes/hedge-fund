import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

/**
 * Server-side auth guard.
 *
 * Runs at the edge before every matched request. Checks for a valid session
 * cookie and redirects unauthenticated users to the login page.
 *
 * Public routes (login page, health check, static assets) are whitelisted.
 */

const SESSION_SECRET = process.env.SESSION_SECRET || 'secret-key-must-be-32-characters-long-default';
const encodedKey = new TextEncoder().encode(SESSION_SECRET);

// Routes that do NOT require authentication
const PUBLIC_PATHS = new Set(['/', '/api/health']);

function isPublic(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true;
  // Allow all static assets & Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.ico') ||
    pathname.endsWith('.jpg') ||
    pathname.endsWith('.jpeg') ||
    pathname.endsWith('.webp')
  ) {
    return true;
  }
  return false;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes through
  if (isPublic(pathname)) {
    return NextResponse.next();
  }

  // Check for session cookie
  const sessionCookie = request.cookies.get('session')?.value;
  if (!sessionCookie) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Verify the JWT is valid and not expired
  try {
    await jwtVerify(sessionCookie, encodedKey, { algorithms: ['HS256'] });
    return NextResponse.next();
  } catch {
    // Invalid or expired token → redirect to login
    const response = NextResponse.redirect(new URL('/', request.url));
    response.cookies.delete('session');
    return response;
  }
}

export const config = {
  // Run middleware on all routes except Next.js internals and static files
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
