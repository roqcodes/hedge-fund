'use server';

import { 
  CognitoIdentityProviderClient, 
  AdminCreateUserCommand, 
  AdminSetUserPasswordCommand, 
  AdminDeleteUserCommand, 
  AdminUpdateUserAttributesCommand,
  ListUsersCommand,
  AttributeType
} from '@aws-sdk/client-cognito-identity-provider';
import { getSessionUser } from '@/lib/auth';
import { env } from '@/lib/env';
import {
  lookupCognitoUserIdByEmail,
} from '@/app/actions/permissionActions';
import { seedDefaultStaffPermissions } from '@/lib/userPermissions';

const cognitoClient = env.COGNITO_REGION 
  ? new CognitoIdentityProviderClient({ region: env.COGNITO_REGION })
  : null;

export interface CognitoUser {
  username: string;
  email: string;
  name: string;
  role: string;
  branchId?: string;
  userId?: string;
  status: string;
  created: string;
}

function getAttribute(attributes: AttributeType[] | undefined, name: string): string {
  if (!attributes) return '';
  const attr = attributes.find(a => a.Name === name);
  return attr?.Value || '';
}

async function requireUserManagementAccess(branchSlug?: string) {
  const user = branchSlug ? await getSessionUser(branchSlug) : await getSessionUser();
  if (!user) {
    return { error: 'You must be signed in.' as const, user: null };
  }
  if (user.role === 'staff') {
    return { error: 'Staff cannot manage users.' as const, user: null };
  }
  if (branchSlug && user.role === 'branch_manager') {
    return { user, branchSlug };
  }
  if (!branchSlug && user.role === 'admin') {
    return { user, branchSlug: undefined };
  }
  return { error: 'Access denied.' as const, user: null };
}

export async function fetchCognitoUsersAction(branchSlug?: string) {
  const access = await requireUserManagementAccess(branchSlug);
  if ('error' in access && access.error) {
    return { success: false, error: access.error };
  }

  if (!cognitoClient || !env.COGNITO_USER_POOL_ID) {
    return { success: false, error: 'Cognito Client or User Pool ID is not configured.' };
  }

  try {
    const command = new ListUsersCommand({
      UserPoolId: env.COGNITO_USER_POOL_ID,
    });
    
    const response = await cognitoClient.send(command);
    
    let users: CognitoUser[] = (response.Users || []).map(u => {
      const email = getAttribute(u.Attributes, 'email');
      const name = getAttribute(u.Attributes, 'name');
      const role = getAttribute(u.Attributes, 'custom:role');
      const branchId = getAttribute(u.Attributes, 'custom:branchId');
      const userId = getAttribute(u.Attributes, 'sub');
      
      return {
        username: u.Username || email,
        email,
        name,
        role: role || 'admin',
        branchId,
        userId,
        status: u.UserStatus || 'UNKNOWN',
        created: u.UserCreateDate ? u.UserCreateDate.toISOString() : new Date().toISOString()
      };
    });

    if (access.user?.role === 'branch_manager' && access.user.branchId) {
      users = users.filter(u => u.branchId === access.user!.branchId);
    }

    return { success: true, data: users };
  } catch (error: unknown) {
    console.error('Error fetching Cognito users:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch users' };
  }
}

export async function createCognitoUserAction(
  email: string, 
  name: string, 
  role: string, 
  branchId: string, 
  passwordRaw: string,
  branchSlug?: string,
) {
  const access = await requireUserManagementAccess(branchSlug);
  if ('error' in access && access.error) {
    return { success: false, error: access.error };
  }

  if (access.user?.role === 'branch_manager') {
    if (role !== 'staff') {
      return { success: false, error: 'Branch managers can only create staff accounts.' };
    }
    if (branchId !== access.user.branchId) {
      return { success: false, error: 'You can only create users for your branch.' };
    }
  }

  if (!cognitoClient || !env.COGNITO_USER_POOL_ID) {
    return { success: false, error: 'Cognito Client or User Pool ID is not configured.' };
  }

  try {
    const createCommand = new AdminCreateUserCommand({
      UserPoolId: env.COGNITO_USER_POOL_ID,
      Username: email,
      UserAttributes: [
        { Name: 'email', Value: email },
        { Name: 'email_verified', Value: 'true' },
        { Name: 'name', Value: name },
        { Name: 'custom:role', Value: role },
        ...(branchId ? [{ Name: 'custom:branchId', Value: branchId }] : [])
      ],
      MessageAction: 'SUPPRESS',
    });
    await cognitoClient.send(createCommand);

    const setPasswordCommand = new AdminSetUserPasswordCommand({
      UserPoolId: env.COGNITO_USER_POOL_ID,
      Username: email,
      Password: passwordRaw,
      Permanent: true,
    });
    await cognitoClient.send(setPasswordCommand);

    if (role === 'staff' && branchId) {
      const userId = await lookupCognitoUserIdByEmail(email);
      if (userId) {
        await seedDefaultStaffPermissions(userId, branchId, access.user!.email);
      }
    }

    return { success: true };
  } catch (error: unknown) {
    console.error('Error creating Cognito user:', error);
    const errName = (error as { name?: string })?.name;
    if (errName === 'UsernameExistsException') {
      return { success: false, error: 'A user with this email already exists.' };
    }
    if (errName === 'InvalidPasswordException') {
      return { success: false, error: 'Password does not meet Cognito requirements.' };
    }
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create user' };
  }
}

/** @deprecated Use changeOwnPasswordAction — admins cannot reset other users' passwords. */
export async function updateCognitoUserPasswordAction(email: string, newPassword: string) {
  const user = await getSessionUser();
  if (!user || user.role !== 'admin') {
    return { success: false, error: 'Password reset for other users is disabled. Users must change their own password.' };
  }
  void email;
  void newPassword;
  return { success: false, error: 'Password reset for other users is disabled. Users must change their own password.' };
}

export async function updateCognitoUserAttributesAction(
  email: string,
  name: string,
  branchSlug?: string,
) {
  const access = await requireUserManagementAccess(branchSlug);
  if ('error' in access && access.error) {
    return { success: false, error: access.error };
  }

  if (!cognitoClient || !env.COGNITO_USER_POOL_ID) {
    return { success: false, error: 'Cognito Client or User Pool ID is not configured.' };
  }

  try {
    const updateCommand = new AdminUpdateUserAttributesCommand({
      UserPoolId: env.COGNITO_USER_POOL_ID,
      Username: email,
      UserAttributes: [
        { Name: 'name', Value: name }
      ],
    });
    await cognitoClient.send(updateCommand);
    return { success: true };
  } catch (error: unknown) {
    console.error('Error updating Cognito user attributes:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to update user attributes' };
  }
}

export async function deleteCognitoUserAction(email: string, branchSlug?: string) {
  const access = await requireUserManagementAccess(branchSlug);
  if ('error' in access && access.error) {
    return { success: false, error: access.error };
  }

  if (access.user?.email === email) {
    return { success: false, error: 'You cannot delete your own account.' };
  }

  if (!cognitoClient || !env.COGNITO_USER_POOL_ID) {
    return { success: false, error: 'Cognito Client or User Pool ID is not configured.' };
  }

  try {
    if (access.user?.role === 'branch_manager') {
      const listRes = await cognitoClient.send(new ListUsersCommand({
        UserPoolId: env.COGNITO_USER_POOL_ID,
        Filter: `email = "${email}"`,
        Limit: 1,
      }));
      const target = listRes.Users?.[0];
      const targetRole = getAttribute(target?.Attributes, 'custom:role');
      const targetBranch = getAttribute(target?.Attributes, 'custom:branchId');
      if (targetRole !== 'staff' || targetBranch !== access.user.branchId) {
        return { success: false, error: 'You can only remove staff from your branch.' };
      }
    }

    const userId = getAttribute(
      (await cognitoClient.send(new ListUsersCommand({
        UserPoolId: env.COGNITO_USER_POOL_ID,
        Filter: `email = "${email}"`,
        Limit: 1,
      }))).Users?.[0]?.Attributes,
      'sub',
    );

    const command = new AdminDeleteUserCommand({
      UserPoolId: env.COGNITO_USER_POOL_ID,
      Username: email,
    });
    await cognitoClient.send(command);

    if (userId) {
      const { deleteUserPermissions } = await import('@/lib/userPermissions');
      await deleteUserPermissions(userId);
    }

    return { success: true };
  } catch (error: unknown) {
    console.error('Error deleting Cognito user:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to delete user' };
  }
}
