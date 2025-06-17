import { auth, googleProvider } from "./firebase"
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile,
  type User,
} from "firebase/auth"
import { doc, setDoc, getDoc } from "firebase/firestore"
import { db } from "./firebase"

export interface UserProfile {
  uid: string
  email: string
  displayName: string
  photoURL?: string
  createdAt: Date
  lastLoginAt: Date
}

export const signInWithEmail = async (email: string, password: string) => {
  const result = await signInWithEmailAndPassword(auth, email, password)
  await updateUserProfile(result.user)
  return result
}

export const signUpWithEmail = async (email: string, password: string, displayName: string) => {
  const result = await createUserWithEmailAndPassword(auth, email, password)
  await updateProfile(result.user, { displayName })
  await createUserProfile(result.user, displayName)
  return result
}

export const signInWithGoogle = async () => {
  const result = await signInWithPopup(auth, googleProvider)
  await createUserProfile(result.user, result.user.displayName || "")
  return result
}

export const signOut = async () => {
  await firebaseSignOut(auth)
}

const createUserProfile = async (user: User, displayName: string) => {
  const userRef = doc(db, "users", user.uid)
  const userSnap = await getDoc(userRef)

  if (!userSnap.exists()) {
    const userProfile: UserProfile = {
      uid: user.uid,
      email: user.email || "",
      displayName: displayName || user.displayName || "",
      photoURL: user.photoURL || undefined,
      createdAt: new Date(),
      lastLoginAt: new Date(),
    }

    await setDoc(userRef, userProfile)
  }
}

const updateUserProfile = async (user: User) => {
  const userRef = doc(db, "users", user.uid)
  await setDoc(
    userRef,
    {
      lastLoginAt: new Date(),
    },
    { merge: true },
  )
}
