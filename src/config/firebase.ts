import { initializeApp, getApps } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword, signOut as firebaseSignOut, reauthenticateWithCredential, EmailAuthProvider, updatePassword, sendPasswordResetEmail } from 'firebase/auth'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
}

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
export const auth = getAuth(app)

// Auth functions
export async function signIn(email: string, password: string) {
  return await signInWithEmailAndPassword(auth, email, password)
}

export async function signOut() {
  return await firebaseSignOut(auth)
}

export async function changePassword(currentPassword: string, newPassword: string) {
  const user = auth.currentUser

  if (!user || !user.email) {
    throw new Error('No user is signed in')
  }

  // Re-authenticate with current password
  const credential = EmailAuthProvider.credential(user.email, currentPassword)
  await reauthenticateWithCredential(user, credential)

  // Update password
  await updatePassword(user, newPassword)
}

export async function sendPasswordReset(email: string) {
  return await sendPasswordResetEmail(getAuth(), email)
}

export { app as firebaseApp }
