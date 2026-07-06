'use server';

import { authenticateWithCognito, createSession, deleteSession, getSessionUser } from '@/lib/auth';
import { User } from '@/types';
import { loginSchema } from '@/lib/validations';
import { query } from '@/lib/db';

export interface AuthActionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Server Action to authenticate a user and establish a session.
 * Enforces authorization: branch managers can only log in at their assigned branch slug,
 * and admins can only log in at the root (superadmin) context.
 */
export async function loginAction(email: string, securityKey: string, branchSlug?: string): Promise<AuthActionResult<User>> {
  try {
    const validation = loginSchema.safeParse({ email, securityKey });
    if (!validation.success) {
      return { success: false, error: validation.error.issues.map((i) => i.message).join(', ') };
    }

    const user = await authenticateWithCognito(validation.data.email, validation.data.securityKey);

    // ── Authorization gate ──────────────────────────────────────────────
    if (branchSlug) {
      // Branch portal: branch managers and staff assigned to THIS branch may enter
      const { isBranchPortalRole } = await import('@/lib/rbac');
      if (!isBranchPortalRole(user.role)) {
        return { success: false, error: 'Access denied. Only branch users can sign in through a branch portal.' };
      }
      const branchRes = await query(
        `SELECT id FROM branches WHERE slug = $1 LIMIT 1`,
        [branchSlug]
      );
      if (branchRes.rows.length === 0) {
        return { success: false, error: 'This branch portal does not exist.' };
      }
      if (branchRes.rows[0].id !== user.branchId) {
        return { success: false, error: 'Access denied. You are not authorized to access this branch.' };
      }
    } else {
      // Superadmin portal: only admins may enter
      if (user.role !== 'admin') {
        return { success: false, error: 'Access denied. Branch users should sign in through their branch portal URL.' };
      }
    }

    await createSession(user, branchSlug);

    if (user.role === 'customer' && user.id) {
      const customerRes = await query(
        `SELECT status FROM customers WHERE cognito_user_id = $1 LIMIT 1`,
        [user.id],
      );
      if (customerRes.rows.length === 0) {
        await deleteSession(branchSlug);
        return { success: false, error: 'Customer account is not linked to a customer record.' };
      }
      if (String(customerRes.rows[0].status) === 'inactive') {
        await deleteSession(branchSlug);
        return { success: false, error: 'Your customer account is inactive. Contact your branch.' };
      }
    }
    
    return { success: true, data: user };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An error occurred during authentication.';
    return { success: false, error: message };
  }
}

/**
 * Server Action to end a session.
 */
export async function logoutAction(branchSlug?: string): Promise<AuthActionResult<void>> {
  try {
    await deleteSession(branchSlug);
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An error occurred during logout.';
    return { success: false, error: message };
  }
}

/**
 * Server Action to retrieve the current active user session.
 */
export async function getCurrentUserAction(branchSlug?: string): Promise<AuthActionResult<User | null>> {
  try {
    const user = await getSessionUser(branchSlug);
    return { success: true, data: user };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An error occurred while fetching user session.';
    return { success: false, error: message };
  }
}
