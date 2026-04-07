// ============================================
// Auth — Authentication Layer
// ============================================

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from 'firebase/auth';
import {
  doc, getDoc, setDoc, updateDoc, serverTimestamp,
} from 'firebase/firestore';
import { auth, db, EMAIL_DOMAIN } from './firebase.js';

// Convert student ID to Firebase email format
export function idToEmail(studentId) {
  return `${studentId.toLowerCase().replace(/\s+/g, '')}@${EMAIL_DOMAIN}`;
}

// Convert email back to student ID
export function emailToId(email) {
  return email.replace(`@${EMAIL_DOMAIN}`, '');
}

// ---- Login ----
export async function login(studentId, password) {
  const email = idToEmail(studentId);
  const cred = await signInWithEmailAndPassword(auth, email, password);

  // Update last login
  const userRef = doc(db, 'users', cred.user.uid);
  await updateDoc(userRef, { lastLoginAt: serverTimestamp() }).catch(() => {});

  return cred.user;
}

// ---- Logout ----
export async function logout() {
  await signOut(auth);
}

// ---- Create user (admin only) ----
export async function createUser(studentId, password, userData = {}) {
  const email = idToEmail(studentId);

  // Create auth account
  const cred = await createUserWithEmailAndPassword(auth, email, password);

  // Create Firestore user doc
  const userDoc = {
    studentId,
    displayName: userData.displayName || studentId,
    role: userData.role || 'student',
    classId: userData.classId || '',
    createdAt: serverTimestamp(),
    lastLoginAt: null,
    streak: 0,
  };
  await setDoc(doc(db, 'users', cred.user.uid), userDoc);

  return { uid: cred.user.uid, ...userDoc };
}

// ---- Get current user profile ----
export async function getUserProfile(uid) {
  if (!uid) {
    const user = auth.currentUser;
    if (!user) return null;
    uid = user.uid;
  }
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  return { uid, ...snap.data() };
}

// ---- Update profile ----
export async function updateUserProfile(uid, updates) {
  await updateDoc(doc(db, 'users', uid), updates);
}

// ---- Change password ----
export async function changePassword(currentPassword, newPassword) {
  const user = auth.currentUser;
  if (!user) throw new Error('Not logged in');

  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, credential);
  await updatePassword(user, newPassword);
}

// ---- Check admin ----
export async function isAdmin() {
  const profile = await getUserProfile();
  return profile?.role === 'admin';
}

// ---- Auth state observer ----
let cachedProfile = null;

export function onAuthChange(callback) {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      cachedProfile = await getUserProfile(user.uid);
      callback({ user, profile: cachedProfile });
    } else {
      cachedProfile = null;
      callback({ user: null, profile: null });
    }
  });
}

export function getCachedProfile() {
  return cachedProfile;
}

export function getCurrentUid() {
  return auth.currentUser?.uid || null;
}
