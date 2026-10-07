import { useEffect, useState } from 'react'
import { watchAccount } from '../utils/account'

// { loading, account } where account is { uid, email, username } or null when signed out.
export function useAccountState(auth) {
  const [state, setState] = useState({ loading: true, account: null })
  useEffect(() => watchAccount(auth, (account) => setState({ loading: false, account })), [auth])
  return state
}
