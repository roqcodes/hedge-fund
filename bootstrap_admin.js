require('dotenv').config({ path: '.env' });
const { 
  CognitoIdentityProviderClient, 
  AdminCreateUserCommand, 
  AdminSetUserPasswordCommand,
  AdminUpdateUserAttributesCommand
} = require('@aws-sdk/client-cognito-identity-provider');

async function bootstrapAdmin() {
  const region = process.env.COGNITO_REGION;
  const userPoolId = process.env.COGNITO_USER_POOL_ID;

  if (!region || !userPoolId) {
    console.error("Error: COGNITO_REGION or COGNITO_USER_POOL_ID is missing from .env");
    process.exit(1);
  }

  const client = new CognitoIdentityProviderClient({ region });
  
  const email = 'manager@aibak.com';
  const password = 'Aibak@2026';

  console.log(`Attempting to create superadmin user in Cognito: ${email}`);

  try {
    // 1. Create User
    await client.send(new AdminCreateUserCommand({
      UserPoolId: userPoolId,
      Username: email,
      UserAttributes: [
        { Name: 'email', Value: email },
        { Name: 'email_verified', Value: 'true' },
        { Name: 'name', Value: 'Superadmin Manager' },
        { Name: 'custom:role', Value: 'admin' }
      ],
      MessageAction: 'SUPPRESS', // Don't send emails
    }));

    // 2. Set permanent password

    await client.send(new AdminSetUserPasswordCommand({
      UserPoolId: userPoolId,
      Username: email,
      Password: password,
      Permanent: true,
    }));

    console.log(`\n✅ SUCCESS! Superadmin created successfully.`);
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    console.log(`\nYou can now log in to the dashboard using these credentials.`);
  } catch (error) {
    if (error.name === 'UsernameExistsException') {
      console.log(`\n⚠️ The user ${email} already exists in your Cognito pool.`);
      console.log(`Attempting to update custom attributes and reset password...`);
      
      try {
        await client.send(new AdminUpdateUserAttributesCommand({
          UserPoolId: userPoolId,
          Username: email,
          UserAttributes: [
            { Name: 'custom:role', Value: 'admin' }
          ]
        }));

        await client.send(new AdminSetUserPasswordCommand({
          UserPoolId: userPoolId,
          Username: email,
          Password: password,
          Permanent: true,
        }));
        console.log(`\n✅ SUCCESS! Password reset successfully and custom:role updated.`);
        console.log(`Email: ${email}`);
        console.log(`Password: ${password}`);
      } catch (err) {
         console.error('Failed to update user:', err.message);
      }
    } else {
      console.error('❌ Failed to create admin user:', error.message);
    }
  }
}

bootstrapAdmin();
