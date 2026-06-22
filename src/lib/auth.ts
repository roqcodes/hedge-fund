import 'server-only';
import { CognitoIdentityProviderClient, InitiateAuthCommand, GetUserCommand } from '@aws-sdk/client-cognito-identity-provider';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { User, UserRole } from '@/types';
import { env } from '@/lib/env';

const encodedKey = new TextEncoder().encode(env.SESSION_SECRET);

// Initialise the AWS Cognito Client
const cognitoClient = env.COGNITO_REGION 
  ? new CognitoIdentityProviderClient({ region: env.COGNITO_REGION })
  : null;

export interface SessionPayload {
  id?: string;
  email: string;
  role: UserRole;
  name: string;
  branchId?: string;
  idToken?: string;
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
 * authenticates with AWS Cognito and creates a local secure session.
 */
export async function authenticateWithCognito(email: string, securityKey: string): Promise<User> {
  // Strict check for AWS Cognito env variables
  if (!env.COGNITO_CLIENT_ID || !env.COGNITO_REGION || !env.COGNITO_USER_POOL_ID || !cognitoClient) {
    throw new Error('Configuration Error: AWS Cognito Client ID, User Pool ID, or Region is missing from your .env file. Authentication is securely locked until properly configured.');
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
      throw new Error('New Password Required: This account has a temporary password. Please set a permanent password via the Superadmin dashboard or Hosted UI.');
    }

    if (response.ChallengeName) {
      throw new Error(`Authentication Challenge Required: Account requires completing ${response.ChallengeName} challenge.`);
    }

    const idToken = response.AuthenticationResult?.IdToken;

    if (!idToken) {
      throw new Error('Authentication succeeded but no ID Token was returned by Cognito.');
    }

    const accessToken = response.AuthenticationResult?.AccessToken;

    if (!accessToken) {
      throw new Error('Authentication succeeded but no Access Token was returned by Cognito.');
    }

    // Securely fetch attributes directly from Cognito using the user's own token
    const userRes = await cognitoClient.send(new GetUserCommand({
      AccessToken: accessToken
    }));

    const getAttr = (name: string) => userRes.UserAttributes?.find(a => a.Name === name)?.Value;
    
    const roleAttr = getAttr('custom:role') as UserRole | undefined;
    const branchIdAttr = getAttr('custom:branchId');
    const nameAttr = getAttr('name') || email.split('@')[0];
    const userId = getAttr('sub');

    if (!roleAttr || (roleAttr !== 'admin' && roleAttr !== 'branch_manager')) {
      throw new Error('Access Denied: Your account has not been assigned a valid role by an Administrator.');
    }
    if (!userId) {
      throw new Error('Authentication succeeded but no user id was returned by Cognito.');
    }

    return {
      id: userId,
      email,
      name: nameAttr,
      role: roleAttr,
      branchId: branchIdAttr,
    };
  } catch (error: unknown) {
    console.error('AWS Cognito authentication error:', error);
    const err = error instanceof Error ? error : new Error('Authentication failed. Please try again.');
    const errName = (error as { name?: string })?.name;
    if (errName === 'ResourceNotFoundException') {
      throw new Error('Configuration Error: The authentication client does not exist. Please verify your COGNITO_CLIENT_ID and COGNITO_REGION settings.');
    }
    if (err.message && err.message.includes('USER_PASSWORD_AUTH')) {
      throw new Error('Configuration Error: USER_PASSWORD_AUTH flow is not enabled on your AWS Cognito App Client.');
    }
    if (errName === 'NotAuthorizedException') {
      throw new Error('Invalid email or password. Please check your credentials and try again.');
    }
    if (errName === 'UserNotFoundException') {
      throw new Error('Invalid email or password. Please check your credentials and try again.'); // Do not reveal if user exists or not for security
    }
    throw err;
  }
}

/**
 * Creates a session cookie with the authenticated user data.
 */
export async function createSession(user: User, branchSlug?: string) {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const session = await encrypt({
    ...user,
    expiresAt: expiresAt.toISOString(),
  });

  const cookieName = branchSlug ? `session_${branchSlug}` : 'session_superadmin';
  const cookiePath = branchSlug ? `/${branchSlug}` : '/';

  const cookieStore = await cookies();
  cookieStore.set(cookieName, session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires: expiresAt,
    sameSite: 'lax',
    path: cookiePath,
  });
}

/**
 * Deletes the session cookie.
 */
export async function deleteSession(branchSlug?: string) {
  const cookieName = branchSlug ? `session_${branchSlug}` : 'session_superadmin';
  const cookieStore = await cookies();
  cookieStore.delete(cookieName);
}

/**
 * Retrieves the current session user details, if authenticated.
 * Enforces that the session role matches the expected context.
 */
export async function getSessionUser(branchSlug?: string): Promise<User | null> {
  const cookieName = branchSlug ? `session_${branchSlug}` : 'session_superadmin';
  const cookieStore = await cookies();
  const session = cookieStore.get(cookieName)?.value;
  if (!session) return null;

  const payload = await decrypt(session);
  if (!payload) return null;

  if (new Date(payload.expiresAt) < new Date()) {
    return null;
  }

  // Defence-in-depth: verify the session role matches the expected context
  if (branchSlug && payload.role !== 'branch_manager') return null;
  if (!branchSlug && payload.role !== 'admin') return null;

  return {
    id: payload.id,
    email: payload.email,
    name: payload.name,
    role: payload.role,
    branchId: payload.branchId,
  };
}
