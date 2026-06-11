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
import { env } from '@/lib/env';

// Initialise the AWS Cognito Client
const cognitoClient = env.COGNITO_REGION 
  ? new CognitoIdentityProviderClient({ region: env.COGNITO_REGION })
  : null;

export interface CognitoUser {
  username: string;
  email: string;
  name: string;
  role: string;
  branchId?: string;
  status: string;
  created: string;
}

function getAttribute(attributes: AttributeType[] | undefined, name: string): string {
  if (!attributes) return '';
  const attr = attributes.find(a => a.Name === name);
  return attr?.Value || '';
}

export async function fetchCognitoUsersAction() {
  if (!cognitoClient || !env.COGNITO_USER_POOL_ID) {
    return { success: false, error: 'Cognito Client or User Pool ID is not configured.' };
  }

  try {
    const command = new ListUsersCommand({
      UserPoolId: env.COGNITO_USER_POOL_ID,
    });
    
    const response = await cognitoClient.send(command);
    
    const users: CognitoUser[] = (response.Users || []).map(u => {
      const email = getAttribute(u.Attributes, 'email');
      const name = getAttribute(u.Attributes, 'name');
      const role = getAttribute(u.Attributes, 'custom:role');
      const branchId = getAttribute(u.Attributes, 'custom:branchId');
      
      return {
        username: u.Username || email,
        email,
        name,
        role: role || 'admin',
        branchId,
        status: u.UserStatus || 'UNKNOWN',
        created: u.UserCreateDate ? u.UserCreateDate.toISOString() : new Date().toISOString()
      };
    });

    return { success: true, data: users };
  } catch (error: any) {
    console.error('Error fetching Cognito users:', error);
    return { success: false, error: error.message || 'Failed to fetch users' };
  }
}

export async function createCognitoUserAction(
  email: string, 
  name: string, 
  role: string, 
  branchId: string, 
  passwordRaw: string
) {
  if (!cognitoClient || !env.COGNITO_USER_POOL_ID) {
    return { success: false, error: 'Cognito Client or User Pool ID is not configured.' };
  }

  try {
    // 1. Create the user with SUPPRESS message action to bypass emails
    const createCommand = new AdminCreateUserCommand({
      UserPoolId: env.COGNITO_USER_POOL_ID,
      Username: email,
      UserAttributes: [
        { Name: 'email', Value: email },
        { Name: 'email_verified', Value: 'true' },
        { Name: 'name', Value: name },
        { Name: 'custom:role', Value: role },
        ...(branchId ? [{ Name: 'custom:branchId', Value: branchId.substring(0, 10) }] : [])
      ],
      MessageAction: 'SUPPRESS',
    });
    await cognitoClient.send(createCommand);

    // 2. Set the permanent password directly so they don't have to change it on first login
    const setPasswordCommand = new AdminSetUserPasswordCommand({
      UserPoolId: env.COGNITO_USER_POOL_ID,
      Username: email,
      Password: passwordRaw,
      Permanent: true,
    });
    await cognitoClient.send(setPasswordCommand);

    return { success: true };
  } catch (error: any) {
    console.error('Error creating Cognito user:', error);
    if (error.name === 'UsernameExistsException') {
      return { success: false, error: 'A user with this email already exists.' };
    }
    if (error.name === 'InvalidPasswordException') {
      return { success: false, error: 'Password does not meet Cognito requirements.' };
    }
    return { success: false, error: error.message || 'Failed to create user' };
  }
}

export async function updateCognitoUserPasswordAction(email: string, newPassword: string) {
  if (!cognitoClient || !env.COGNITO_USER_POOL_ID) {
    return { success: false, error: 'Cognito Client or User Pool ID is not configured.' };
  }

  try {
    const setPasswordCommand = new AdminSetUserPasswordCommand({
      UserPoolId: env.COGNITO_USER_POOL_ID,
      Username: email,
      Password: newPassword,
      Permanent: true,
    });
    await cognitoClient.send(setPasswordCommand);
    return { success: true };
  } catch (error: any) {
    console.error('Error resetting Cognito password:', error);
    return { success: false, error: error.message || 'Failed to reset password' };
  }
}

export async function updateCognitoUserAttributesAction(
  email: string,
  name: string
) {
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
  } catch (error: any) {
    console.error('Error updating Cognito user attributes:', error);
    return { success: false, error: error.message || 'Failed to update user attributes' };
  }
}

export async function deleteCognitoUserAction(email: string) {
  if (!cognitoClient || !env.COGNITO_USER_POOL_ID) {
    return { success: false, error: 'Cognito Client or User Pool ID is not configured.' };
  }

  try {
    const command = new AdminDeleteUserCommand({
      UserPoolId: env.COGNITO_USER_POOL_ID,
      Username: email,
    });
    await cognitoClient.send(command);
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting Cognito user:', error);
    return { success: false, error: error.message || 'Failed to delete user' };
  }
}
