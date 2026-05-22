'use server';

import { authenticateWithCognito, createSession, deleteSession, getSessionUser } from '@/lib/auth';
import { User } from '@/types';

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
    if (!email || !securityKey) {
      return { success: false, error: 'Email and security key are required.' };
    }

    const user = await authenticateWithCognito(email, securityKey);
    await createSession(user);
    
    return { success: true, data: user };
  } catch (error: any) {
    return { success: false, error: error.message || 'An error occurred during authentication.' };
  }
}

/**
 * Server Action to end a session.
 */
export async function logoutAction(): Promise<AuthActionResult<void>> {
  try {
    await deleteSession();
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'An error occurred during logout.' };
  }
}

/**
 * Server Action to retrieve the current active user session.
 */
export async function getCurrentUserAction(): Promise<AuthActionResult<User | null>> {
  try {
    const user = await getSessionUser();
    return { success: true, data: user };
  } catch (error: any) {
    return { success: false, error: error.message || 'An error occurred while fetching user session.' };
  }
}
