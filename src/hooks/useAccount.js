import { useEffect, useState } from 'react'
import { watchAccount } from '../utils/account'
import { readSnapshot } from '../utils/localSnapshot'

// { loading, account } where account is { uid, email, username } or null when signed out.
// `ready` (optional promise): the first account is reported once it settles (the app's session migration).
export function useAccountState(auth, ready) {
  // The account last seen on this device shows at once; the session check below confirms or replaces it.
  const [state, setState] = useState(() => {
    const account = readSnapshot('account')
    return account ? { loading: false, account } : { loading: true, account: null }
  })
  useEffect(() => watchAccount(auth, (account) => setState({ loading: false, account }), { ready }), [auth, ready])
  return state
}
