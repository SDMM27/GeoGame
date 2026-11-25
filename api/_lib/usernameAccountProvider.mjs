import { createHmac, randomBytes } from 'node:crypto'
import {
  AdminCreateUserCommand,
  AdminDeleteUserCommand,
  AdminInitiateAuthCommand,
  AdminSetUserPasswordCommand,
  CognitoIdentityProviderClient,
} from '@aws-sdk/client-cognito-identity-provider'
import { awsCredentialsProvider } from '@vercel/oidc-aws-credentials-provider'

const TIMEOUT_MS = 8000

export function getUsernamePasswordProvider() {
  const {
    USERNAME_AUTH_POOL_ID: userPoolId,
    USERNAME_AUTH_CLIENT_ID: clientId,
    USERNAME_AUTH_PEPPER: pepper,
    USERNAME_AUTH_AWS_ROLE_ARN: roleArn,
  } = process.env
  if (!userPoolId || !clientId || !/^[\da-f]{64}$/i.test(pepper ?? '')) return null
  if (process.env.VERCEL === '1' && !roleArn) return null

  const region = userPoolId.split('_')[0]
  const credentials = roleArn ? awsCredentialsProvider({ roleArn, clientConfig: { region } }) : undefined
  const client = new CognitoIdentityProviderClient({ region, credentials, maxAttempts: 1 })
  const send = (command) => client.send(command, { abortSignal: AbortSignal.timeout(TIMEOUT_MS) })

  // Cognito's admin password endpoint forbids spaces. A keyed, account-specific encoding lets users
  // choose passphrases and keeps Cognito responsible for hashing and verifying stored credentials.
  function providerPassword(uid, password) {
    const hash = createHmac('sha256', Buffer.from(pepper, 'hex'))
      .update('geogame-username-password-v1\0')
      .update(uid)
      .update('\0')
      .update(password.normalize('NFC'))
      .digest('base64url')
    return `Aa1!${hash}`
  }

  async function setPassword(uid, password) {
    try {
      await send(new AdminSetUserPasswordCommand({
        UserPoolId: userPoolId, Username: uid, Password: providerPassword(uid, password), Permanent: true,
      }))
    } catch (error) {
      throw providerError(error)
    }
  }

  return {
    async create(uid, password) {
      try {
        await send(new AdminCreateUserCommand({
          UserPoolId: userPoolId,
          Username: uid,
          MessageAction: 'SUPPRESS',
          TemporaryPassword: `Aa1!${randomBytes(32).toString('base64url')}`,
        }))
      } catch (error) {
        throw providerError(error)
      }
      await setPassword(uid, password)
    },
    async verify(uid, password) {
      try {
        const result = await send(new AdminInitiateAuthCommand({
          UserPoolId: userPoolId,
          ClientId: clientId,
          AuthFlow: 'ADMIN_USER_PASSWORD_AUTH',
          AuthParameters: { USERNAME: uid, PASSWORD: providerPassword(uid, password) },
        }))
        return !!result.AuthenticationResult?.AccessToken && !result.ChallengeName
      } catch (error) {
        if (['NotAuthorizedException', 'UserNotFoundException'].includes(error?.name)) return false
        throw providerError(error)
      }
    },
    setPassword,
    async remove(uid) {
      try {
        await send(new AdminDeleteUserCommand({ UserPoolId: userPoolId, Username: uid }))
      } catch (error) {
        if (error?.name !== 'UserNotFoundException') throw providerError(error)
      }
    },
  }
}

function providerError(error) {
  const failure = new Error('Username credential provider error')
  if (error?.name === 'TooManyRequestsException') failure.code = 'too_many_requests'
  return failure
}
