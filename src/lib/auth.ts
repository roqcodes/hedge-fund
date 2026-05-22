import 'server-only';
import { CognitoIdentityProviderClient, InitiateAuthCommand } from '@aws-sdk/client-cognito-identity-provider';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { User, UserRole } from '@/types';
import { env } from '@/lib/env';

const encodedKey = new TextEncoder().encode(env.SESSION_SECRET);

// Initialise the AWS Cognito Client (optional config if env is present)
let cognitoClient: CognitoIdentityProviderClient | null = null;
if (env.COGNITO_REGION) {
  cognitoClient = new CognitoIdentityProviderClient({ region: env.COGNITO_REGION });
}

export interface SessionPayload {
  email: string;
  role: UserRole;
  name: string;
  branchId?: string;
  idToken?: string; // We can optionally store the ID Token to present to downstream APIs
  expiresAt: string;
}

/**
 * Encrypts a payload into a signed JWT string.
 */
export async function encrypt(payload: Record<string, unknown>) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(encodedKey);
}

/**
 * Decrypts and verifies the session token.
 */
export async function decrypt(session: string | undefined = '') {
  try {
    const { payload } = await jwtVerify(session, encodedKey, {
      algorithms: ['HS256'],
    });
    return payload as unknown as SessionPayload;
  } catch (error) {
    return null;
  }
}

/**
 * Parses user attributes from the Cognito ID Token.
 */
function parseCognitoIdToken(idToken: string): User {
  try {
    const base64Url = idToken.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const decoded = JSON.parse(jsonPayload);

    const email = decoded.email || '';
    const name = decoded.name || decoded.given_name || email.split('@')[0] || 'User';
    
    // Determine role:
    // 1. Check custom attribute custom:role
    // 2. Check cognito:groups array
    // 3. Fallback based on email content or default to admin
    let role: UserRole = 'admin';
    if (decoded['custom:role'] === 'branch_manager' || decoded['custom:role'] === 'admin') {
      role = decoded['custom:role'] as UserRole;
    } else if (Array.isArray(decoded['cognito:groups'])) {
      if (decoded['cognito:groups'].includes('Admins')) {
        role = 'admin';
      } else if (decoded['cognito:groups'].includes('BranchManagers')) {
        role = 'branch_manager';
      }
    } else if (email.includes('manager')) {
      role = 'branch_manager';
    }

    // Determine branchId:
    // 1. Check custom attribute custom:branchId
    // 2. Fallback based on email domain or defaults
    const branchId = decoded['custom:branchId'] || (role === 'branch_manager' ? 'BR014' : undefined);

    return {
      email,
      name,
      role,
      branchId,
    };
  } catch (e) {
    console.error('Error parsing Cognito ID Token:', e);
    throw new Error('Invalid token format');
  }
}

/**
 * authenticates with AWS Cognito and creates a local secure session.
 */
export async function authenticateWithCognito(email: string, securityKey: string): Promise<User> {
  // If Cognito variables are missing, run in Developer Mock Mode for easy setup/dev
  if (!env.COGNITO_CLIENT_ID || !cognitoClient) {
    console.warn(
      'AWS Cognito client config missing. Running in developer mock mode. Configure COGNITO_CLIENT_ID and COGNITO_REGION to run dynamic AWS auth.'
    );
    
    // Simulate AWS latency
    await new Promise((resolve) => setTimeout(resolve, 800));

    // Simple dev credential validation
    if (securityKey.length < 4) {
      throw new Error('Invalid credentials. Password must be at least 4 characters.');
    }

    const isManager = email.includes('manager') || email.includes('branch');
    return {
      email,
      name: isManager ? 'Ahmed Al Maktoum' : 'John Doe',
      role: isManager ? 'branch_manager' : 'admin',
      branchId: isManager ? 'BR014' : undefined,
    };
  }

  try {
    const command = new InitiateAuthCommand({
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: env.COGNITO_CLIENT_ID,
      AuthParameters: {
        USERNAME: email,
        PASSWORD: securityKey,
      },
    });

    const response = await cognitoClient.send(command);

    if (response.ChallengeName === 'NEW_PASSWORD_REQUIRED') {
      throw new Error('New Password Required: This account has a temporary password. Please set a permanent password using the AWS CLI (admin-set-user-password) or log in via the Hosted UI once to set your permanent password.');
    }

    if (response.ChallengeName) {
      throw new Error(`Authentication Challenge Required: Account requires completing ${response.ChallengeName} challenge.`);
    }

    const idToken = response.AuthenticationResult?.IdToken;

    if (!idToken) {
      console.error('Cognito authentication response details:', JSON.stringify(response, null, 2));
      const responseKeys = Object.keys(response).join(', ');
      const authResultKeys = response.AuthenticationResult 
        ? Object.keys(response.AuthenticationResult).join(', ') 
        : 'undefined';
      throw new Error(`Authentication succeeded but no ID Token was returned by Cognito. Response keys: [${responseKeys}], AuthenticationResult keys: [${authResultKeys}]. Please check server logs for full response object.`);
    }

    // Parse user properties from ID Token
    const user = parseCognitoIdToken(idToken);
    return user;
  } catch (error: unknown) {
    console.error('AWS Cognito authentication error:', error);
    const err = error instanceof Error ? error : new Error('Authentication failed. Please try again.');
    const errName = (error as { name?: string })?.name;
    if (errName === 'ResourceNotFoundException') {
      throw new Error('Configuration Error: The authentication client does not exist. Please verify your COGNITO_CLIENT_ID and COGNITO_REGION settings in the .env file.');
    }
    if (err.message && err.message.includes('USER_PASSWORD_AUTH')) {
      throw new Error('Configuration Error: USER_PASSWORD_AUTH flow is not enabled on your AWS Cognito App Client. Please enable it under App Client advanced settings in your AWS console.');
    }
    if (errName === 'NotAuthorizedException') {
      throw new Error('Invalid email or security key. Please check your credentials.');
    }
    if (errName === 'UserNotFoundException') {
      throw new Error('User account not found.');
    }
    if (errName === 'PasswordResetRequiredException') {
      throw new Error('Password reset is required for this user pool account.');
    }
    if (errName === 'UserNotConfirmedException') {
      throw new Error('User account is not confirmed in Cognito user pool.');
    }
    throw err;
  }
}

/**
 * Creates a session cookie with the authenticated user data.
 */
export async function createSession(user: User) {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const session = await encrypt({
    ...user,
    expiresAt: expiresAt.toISOString(),
  });

  const cookieStore = await cookies();
  cookieStore.set('session', session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires: expiresAt,
    sameSite: 'lax',
    path: '/',
  });
}

/**
 * Deletes the session cookie.
 */
export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete('session');
}

/**
 * Retrieves the current session user details, if authenticated.
 */
export async function getSessionUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get('session')?.value;
  if (!session) return null;

  const payload = await decrypt(session);
  if (!payload) return null;

  // Check if session has expired
  if (new Date(payload.expiresAt) < new Date()) {
    return null;
  }

  return {
    email: payload.email,
    name: payload.name,
    role: payload.role,
    branchId: payload.branchId,
  };
}
