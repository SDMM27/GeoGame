// Google sign-in with a popup: web only (the website and the app's web build).
import { GoogleAuthProvider, reauthenticateWithPopup, signInWithPopup } from 'firebase/auth'

export const signInWithGoogle = (auth) => signInWithPopup(auth, new GoogleAuthProvider())

export const reauthenticateWithGoogle = (user) => reauthenticateWithPopup(user, new GoogleAuthProvider())
