import {
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile,
  createUserWithEmailAndPassword,
  signInAnonymously,
} from "firebase/auth";
import { auth, googleProvider } from "./config";

export const PRESENCE_COLORS = [
  "#1a73e8",
  "#e53935",
  "#43a047",
  "#fb8c00",
  "#8e24aa",
  "#00acc1",
  "#f4511e",
  "#039be5",
];

export function getPresenceColor(uid: string): string {
  let hash = 0;
  for (let i = 0; i < uid.length; i++) {
    hash = uid.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PRESENCE_COLORS[Math.abs(hash) % PRESENCE_COLORS.length];
}

export async function signInWithGoogle(): Promise<void> {
  await signInWithPopup(auth, googleProvider);
}

export async function signInAsGuest(displayName: string): Promise<void> {
  const { user } = await signInAnonymously(auth);
  await updateProfile(user, { displayName });
}

export async function updateDisplayName(name: string): Promise<void> {
  if (!auth.currentUser) throw new Error("Not authenticated");
  await updateProfile(auth.currentUser, { displayName: name });
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}
