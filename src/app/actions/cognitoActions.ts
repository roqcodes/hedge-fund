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
import { logger } from '@/lib/logger';

const CUSTOMER_ROLE = 'customer';
const INVESTOR_ROLE = 'investor';

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
  if (user.role === 'staff' || user.role === 'delivery') {
    return { error: 'Staff/Delivery cannot manage users.' as const, user: null };
  }
  if (branchSlug && (user.role === 'branch_manager' || user.role.startsWith('warehouse_'))) {
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

    users = users.filter(u => u.role !== CUSTOMER_ROLE && u.role !== INVESTOR_ROLE);

    if (access.user?.role === 'branch_manager' && access.user.branchId) {
      users = users.filter(u => u.branchId === access.user!.branchId);
    }

    return { success: true, data: users };
  } catch (error: unknown) {
    logger.error({ error, branchSlug }, 'Error fetching Cognito users');
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

  if (access.user?.role === 'branch_manager' || access.user?.role?.startsWith('warehouse_')) {
    if (role !== 'staff' && !role.startsWith('warehouse_') && !role.startsWith('delivery')) {
      return { success: false, error: 'Managers can only create staff, warehouse, or delivery accounts.' };
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
    logger.error({ error, email, role, branchId, branchSlug }, 'Error creating Cognito user');
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
  role?: string,
  branchId?: string,
) {
  const access = await requireUserManagementAccess(branchSlug);
  if ('error' in access && access.error) {
    return { success: false, error: access.error };
  }

  if (!cognitoClient || !env.COGNITO_USER_POOL_ID) {
    return { success: false, error: 'Cognito Client or User Pool ID is not configured.' };
  }

  const isAdmin = access.user?.role === 'admin';

  if (!isAdmin && (role !== undefined || branchId !== undefined)) {
    return { success: false, error: 'Only superadmin can change role or branch assignment.' };
  }

  if (isAdmin && role === 'admin' && branchId) {
    return { success: false, error: 'Superadmin accounts cannot be assigned to a branch.' };
  }

  if (isAdmin && (role === 'branch_manager' || role === 'staff') && !branchId) {
    return { success: false, error: 'Branch managers and staff must be assigned to a branch.' };
  }

  try {
    const attributes: { Name: string; Value: string }[] = [{ Name: 'name', Value: name }];

    if (isAdmin && role) {
      attributes.push({ Name: 'custom:role', Value: role });
    }

    if (isAdmin) {
      if (role === 'admin') {
        attributes.push({ Name: 'custom:branchId', Value: '' });
      } else if (branchId) {
        attributes.push({ Name: 'custom:branchId', Value: branchId });
      }
    }

    const updateCommand = new AdminUpdateUserAttributesCommand({
      UserPoolId: env.COGNITO_USER_POOL_ID,
      Username: email,
      UserAttributes: attributes,
    });
    await cognitoClient.send(updateCommand);

    if (isAdmin && role === 'staff' && branchId) {
      const userId = await lookupCognitoUserIdByEmail(email);
      if (userId) {
        await seedDefaultStaffPermissions(userId, branchId, access.user!.email);
      }
    }

    return { success: true };
  } catch (error: unknown) {
    logger.error({ error, email, name, role, branchId, branchSlug }, 'Error updating Cognito user attributes');
    return { success: false, error: error instanceof Error ? error.message : 'Failed to update user attributes' };
  }
}

async function lookupCognitoUserByEmail(email: string) {
  if (!cognitoClient || !env.COGNITO_USER_POOL_ID) return null;
  const listRes = await cognitoClient.send(new ListUsersCommand({
    UserPoolId: env.COGNITO_USER_POOL_ID,
    Filter: `email = "${email}"`,
    Limit: 1,
  }));
  return listRes.Users?.[0] ?? null;
}

export async function resetCognitoUserPasswordAction(email: string, passwordRaw: string, branchSlug?: string) {
  const access = await requireUserManagementAccess(branchSlug);
  if ('error' in access && access.error) {
    return { success: false, error: access.error };
  }

  if (!cognitoClient || !env.COGNITO_USER_POOL_ID) {
    return { success: false, error: 'Cognito Client or User Pool ID is not configured.' };
  }

  try {
    const target = await lookupCognitoUserByEmail(email);
    if (!target) {
      return { success: false, error: 'User not found.' };
    }

    const targetRole = getAttribute(target.Attributes, 'custom:role');
    const targetBranch = getAttribute(target.Attributes, 'custom:branchId');

    if (access.user?.role === 'branch_manager') {
      if (targetRole !== 'staff' || targetBranch !== access.user.branchId) {
        return { success: false, error: 'You can only reset passwords for staff in your branch.' };
      }
    } else if (access.user?.role === 'admin') {
      if (targetRole === CUSTOMER_ROLE || targetRole === INVESTOR_ROLE) {
        return { success: false, error: 'Use customer or investor management to reset this account.' };
      }
    }

    const setPasswordCommand = new AdminSetUserPasswordCommand({
      UserPoolId: env.COGNITO_USER_POOL_ID,
      Username: email,
      Password: passwordRaw,
      Permanent: true,
    });
    await cognitoClient.send(setPasswordCommand);

    return { success: true };
  } catch (error: unknown) {
    logger.error({ error, email, branchSlug }, 'Error resetting Cognito user password');
    return { success: false, error: error instanceof Error ? error.message : 'Failed to reset password' };
  }
}

/** Reset a customer portal password (no existing password required). */
export async function resetCustomerCognitoPasswordAction(email: string, passwordRaw: string, branchSlug: string) {
  const user = await getSessionUser(branchSlug);
  if (!user) {
    return { success: false, error: 'You must be signed in.' };
  }
  if (user.role === 'customer' || user.role === 'delivery' || user.role.startsWith('warehouse_')) {
    return { success: false, error: 'Access denied.' };
  }

  if (!cognitoClient || !env.COGNITO_USER_POOL_ID) {
    return { success: false, error: 'Cognito Client or User Pool ID is not configured.' };
  }

  try {
    const { query } = await import('@/lib/db');
    const branchRes = await query(`SELECT id FROM branches WHERE slug = $1 LIMIT 1`, [branchSlug]);
    if (branchRes.rows.length === 0) {
      return { success: false, error: 'Branch not found.' };
    }
    const branchId = String(branchRes.rows[0].id);
    if (user.branchId && user.branchId !== branchId) {
      return { success: false, error: 'You are not authorized for this branch.' };
    }

    const custRes = await query(
      `SELECT id FROM customers WHERE LOWER(email) = LOWER($1) AND branch_id = $2 LIMIT 1`,
      [email.trim(), branchId],
    );
    if (custRes.rows.length === 0) {
      return { success: false, error: 'Customer not found in this branch.' };
    }

    const target = await lookupCognitoUserByEmail(email);
    if (!target) {
      return { success: false, error: 'Portal account not found.' };
    }
    const targetRole = getAttribute(target.Attributes, 'custom:role');
    if (targetRole !== CUSTOMER_ROLE) {
      return { success: false, error: 'This email is not a customer portal account.' };
    }

    await cognitoClient.send(new AdminSetUserPasswordCommand({
      UserPoolId: env.COGNITO_USER_POOL_ID,
      Username: email,
      Password: passwordRaw,
      Permanent: true,
    }));

    return { success: true };
  } catch (error: unknown) {
    logger.error({ error, email, branchSlug }, 'Error resetting customer password');
    return { success: false, error: error instanceof Error ? error.message : 'Failed to reset password' };
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
      if ((targetRole !== 'staff' && !(targetRole || '').startsWith('warehouse_')) || targetBranch !== access.user.branchId) {
        return { success: false, error: 'You can only remove staff or warehouse users from your branch.' };
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
    logger.error({ error, email, branchSlug }, 'Error deleting Cognito user');
    return { success: false, error: error instanceof Error ? error.message : 'Failed to delete user' };
  }
}

/** Create a Cognito login for a branch customer (not listed in branch staff users). */
export async function createCustomerCognitoUser(input: {
  email: string;
  name: string;
  branchId: string;
  password: string;
}): Promise<{ success: boolean; userId?: string; error?: string }> {
  if (!cognitoClient || !env.COGNITO_USER_POOL_ID) {
    return { success: false, error: 'Cognito Client or User Pool ID is not configured.' };
  }

  try {
    const createCommand = new AdminCreateUserCommand({
      UserPoolId: env.COGNITO_USER_POOL_ID,
      Username: input.email,
      UserAttributes: [
        { Name: 'email', Value: input.email },
        { Name: 'email_verified', Value: 'true' },
        { Name: 'name', Value: input.name },
        { Name: 'custom:role', Value: CUSTOMER_ROLE },
        { Name: 'custom:branchId', Value: input.branchId },
      ],
      MessageAction: 'SUPPRESS',
    });
    await cognitoClient.send(createCommand);

    const setPasswordCommand = new AdminSetUserPasswordCommand({
      UserPoolId: env.COGNITO_USER_POOL_ID,
      Username: input.email,
      Password: input.password,
      Permanent: true,
    });
    await cognitoClient.send(setPasswordCommand);

    const userId = await lookupCognitoUserIdByEmail(input.email);
    if (!userId) {
      return { success: false, error: 'Customer account was created but user id could not be resolved.' };
    }

    return { success: true, userId };
  } catch (error: unknown) {
    logger.error({ error, email: input.email, branchId: input.branchId }, 'Error creating customer Cognito user');
    const errName = (error as { name?: string })?.name;
    if (errName === 'UsernameExistsException') {
      return { success: false, error: 'A user with this email already exists.' };
    }
    if (errName === 'InvalidPasswordException') {
      return { success: false, error: 'Password does not meet Cognito requirements.' };
    }
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create customer account' };
  }
}

/** Create a Cognito login for an investor (Groups & Deals portal only). */
export async function createInvestorCognitoUser(input: {
  email: string;
  name: string;
  branchId: string;
  password: string;
}): Promise<{ success: boolean; userId?: string; error?: string }> {
  if (!cognitoClient || !env.COGNITO_USER_POOL_ID) {
    return { success: false, error: 'Cognito Client or User Pool ID is not configured.' };
  }

  try {
    const createCommand = new AdminCreateUserCommand({
      UserPoolId: env.COGNITO_USER_POOL_ID,
      Username: input.email,
      UserAttributes: [
        { Name: 'email', Value: input.email },
        { Name: 'email_verified', Value: 'true' },
        { Name: 'name', Value: input.name },
        { Name: 'custom:role', Value: INVESTOR_ROLE },
        { Name: 'custom:branchId', Value: input.branchId },
      ],
      MessageAction: 'SUPPRESS',
    });
    await cognitoClient.send(createCommand);

    const setPasswordCommand = new AdminSetUserPasswordCommand({
      UserPoolId: env.COGNITO_USER_POOL_ID,
      Username: input.email,
      Password: input.password,
      Permanent: true,
    });
    await cognitoClient.send(setPasswordCommand);

    const userId = await lookupCognitoUserIdByEmail(input.email);
    if (!userId) {
      return { success: false, error: 'Investor account was created but user id could not be resolved.' };
    }

    return { success: true, userId };
  } catch (error: unknown) {
    logger.error({ error, email: input.email, branchId: input.branchId }, 'Error creating investor Cognito user');
    const errName = (error as { name?: string })?.name;
    if (errName === 'UsernameExistsException') {
      return { success: false, error: 'A user with this email already exists.' };
    }
    if (errName === 'InvalidPasswordException') {
      return { success: false, error: 'Password does not meet Cognito requirements.' };
    }
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create investor account' };
  }
}

export async function deleteInvestorCognitoUser(email: string) {
  if (!cognitoClient || !env.COGNITO_USER_POOL_ID) {
    return { success: false, error: 'Cognito Client or User Pool ID is not configured.' };
  }

  try {
    const listRes = await cognitoClient.send(new ListUsersCommand({
      UserPoolId: env.COGNITO_USER_POOL_ID,
      Filter: `email = "${email}"`,
      Limit: 1,
    }));
    const target = listRes.Users?.[0];
    const targetRole = getAttribute(target?.Attributes, 'custom:role');
    if (targetRole !== INVESTOR_ROLE) {
      return { success: false, error: 'Refusing to delete non-investor Cognito account.' };
    }

    const command = new AdminDeleteUserCommand({
      UserPoolId: env.COGNITO_USER_POOL_ID,
      Username: email,
    });
    await cognitoClient.send(command);
    return { success: true };
  } catch (error: unknown) {
    logger.error({ error, email }, 'Error deleting investor Cognito user');
    return { success: false, error: error instanceof Error ? error.message : 'Failed to delete investor account' };
  }
}

export async function updateCognitoUserName(email: string, name: string) {
  if (!cognitoClient || !env.COGNITO_USER_POOL_ID) {
    return { success: false, error: 'Cognito Client or User Pool ID is not configured.' };
  }

  try {
    const updateCommand = new AdminUpdateUserAttributesCommand({
      UserPoolId: env.COGNITO_USER_POOL_ID,
      Username: email,
      UserAttributes: [{ Name: 'name', Value: name }],
    });
    await cognitoClient.send(updateCommand);
    return { success: true };
  } catch (error: unknown) {
    logger.error({ error, email, name }, 'Error updating Cognito user name');
    return { success: false, error: error instanceof Error ? error.message : 'Failed to update user name' };
  }
}

export async function deleteCognitoUserByEmail(email: string) {
  if (!cognitoClient || !env.COGNITO_USER_POOL_ID) {
    return { success: false, error: 'Cognito Client or User Pool ID is not configured.' };
  }

  try {
    const listRes = await cognitoClient.send(new ListUsersCommand({
      UserPoolId: env.COGNITO_USER_POOL_ID,
      Filter: `email = "${email}"`,
      Limit: 1,
    }));
    const target = listRes.Users?.[0];
    const targetRole = getAttribute(target?.Attributes, 'custom:role');
    if (targetRole !== CUSTOMER_ROLE) {
      return { success: false, error: 'Refusing to delete non-customer Cognito account.' };
    }

    const userId = getAttribute(target?.Attributes, 'sub');
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
    logger.error({ error, email }, 'Error deleting customer Cognito user');
    return { success: false, error: error instanceof Error ? error.message : 'Failed to delete customer account' };
  }
}
