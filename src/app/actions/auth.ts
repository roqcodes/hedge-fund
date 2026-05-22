'use server';

import { authenticateWithCognito, createSession, deleteSession, getSessionUser } from '@/lib/auth';
import { User } from '@/types';
import { loginSchema } from '@/lib/validations';

export interface AuthActionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Server Action to authenticate a user and establish a session.
 */
export async function loginAction(email: string, securityKey: string): Promise<AuthActionResult<User>> {
  try {
    const validation = loginSchema.safeParse({ email, securityKey });
    if (!validation.success) {
      return { success: false, error: validation.error.issues.map((i) => i.message).join(', ') };
    }

    const user = await authenticateWithCognito(validation.data.email, validation.data.securityKey);
    await createSession(user);
    
    return { success: true, data: user };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An error occurred during authentication.';
    return { success: false, error: message };
  }
}

/**
 * Server Action to end a session.
 */
export async function logoutAction(): Promise<AuthActionResult<void>> {
  try {
    await deleteSession();
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An error occurred during logout.';
    return { success: false, error: message };
  }
}

/**
 * Server Action to retrieve the current active user session.
 */
export async function getCurrentUserAction(): Promise<AuthActionResult<User | null>> {
  try {
    const user = await getSessionUser();
    return { success: true, data: user };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An error occurred while fetching user session.';
    return { success: false, error: message };
  }
}
