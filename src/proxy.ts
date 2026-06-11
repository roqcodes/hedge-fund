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

const SYSTEM_PATHS = new Set(['users', 'branches', 'finance', 'funds', 'group', 'investors', 'invoices', 'physical', 'reports', 'settings', 'usdt', 'api']);

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

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes through
  if (isPublic(pathname)) {
    return NextResponse.next();
  }

  // Parse slug from pathname (e.g., /fujairah-west/funds -> fujairah-west)
  const pathParts = pathname.split('/').filter(Boolean);
  const firstSegment = pathParts[0];
  const isBranchPath = firstSegment && !SYSTEM_PATHS.has(firstSegment);
  const slug = isBranchPath ? firstSegment : undefined;
  const cookieName = slug ? `session_${slug}` : 'session_superadmin';

  // Check for session cookie
  const sessionCookie = request.cookies.get(cookieName)?.value;
  if (!sessionCookie) {
    // If they are visiting a branch path like /fujairah-west, let it pass through
    // so AppLayout can render the customized branch login page.
    if (pathParts.length === 1 && isBranchPath) {
      return NextResponse.next();
    }
    // Redirect to the correct login page
    const redirectUrl = slug ? new URL(`/${slug}`, request.url) : new URL('/', request.url);
    return NextResponse.redirect(redirectUrl);
  }

  // Verify the JWT is valid and not expired, then enforce context matching
  try {
    const { payload } = await jwtVerify(sessionCookie, encodedKey, { algorithms: ['HS256'] });

    // ── Context enforcement ─────────────────────────────────────────────
    if (slug) {
      // Branch context: the session MUST belong to a branch_manager
      if (payload.role !== 'branch_manager') {
        throw new Error('Role mismatch: admin session used on branch path');
      }
    } else {
      // Superadmin context: the session MUST belong to an admin
      if (payload.role !== 'admin') {
        throw new Error('Role mismatch: branch session used on superadmin path');
      }
    }

    return NextResponse.next();
  } catch {
    // Invalid or expired token → redirect to correct login page
    const redirectUrl = (pathParts.length === 1 && isBranchPath) 
      ? request.url 
      : (slug ? new URL(`/${slug}`, request.url).toString() : new URL('/', request.url).toString());
      
    const response = NextResponse.redirect(redirectUrl);
    response.cookies.delete(cookieName);
    return response;
  }
}

export const config = {
  // Run middleware on all routes except Next.js internals and static files
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
