// ============================================
// Store — Firestore Data Layer
// ============================================

import {
  collection, doc, addDoc, getDoc, getDocs, updateDoc, deleteDoc,
  query, where, orderBy, limit, serverTimestamp, Timestamp,
} from 'firebase/firestore';
import { db } from './firebase.js';
import { getCurrentUid } from './auth.js';

function uid() { return getCurrentUid(); }

// ---- Materials ----

export async function getMaterials() {
  const u = uid(); if (!u) return [];
  const q = query(collection(db, 'materials'), where('userId', '==', u), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getMaterial(id) {
  const snap = await getDoc(doc(db, 'materials', id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function addMaterial(material) {
  const u = uid(); if (!u) return null;
  const data = {
    userId: u,
    title: material.title || '無題の教材',
    type: material.type || 'book',
    author: material.author || '',
    isbn: material.isbn || '',
    coverUrl: material.coverUrl || '',
    totalPages: material.totalPages || 0,
    currentPage: material.currentPage || 0,
    totalDuration: material.totalDuration || null,
    currentDuration: material.currentDuration || 0,
    memo: material.memo || '',
    createdAt: serverTimestamp(),
    completedAt: null,
  };
  const ref = await addDoc(collection(db, 'materials'), data);
  return { id: ref.id, ...data };
}

export async function updateMaterial(id, updates) {
  await updateDoc(doc(db, 'materials', id), updates);
}

export async function deleteMaterial(id) {
  await deleteDoc(doc(db, 'materials', id));
  // Delete associated logs
  const q = query(collection(db, 'studyLogs'), where('materialId', '==', id));
  const snap = await getDocs(q);
  const deletes = snap.docs.map(d => deleteDoc(d.ref));
  await Promise.all(deletes);
}

// ---- Study Logs ----

export async function getLogs() {
  const u = uid(); if (!u) return [];
  const q = query(collection(db, 'studyLogs'), where('userId', '==', u), orderBy('startTime', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => {
    const data = d.data();
    return {
      id: d.id, ...data,
      startTime: toISOString(data.startTime),
      endTime: toISOString(data.endTime),
    };
  });
}

export async function addLog(log) {
  const u = uid(); if (!u) return null;
  const data = {
    userId: u,
    materialId: log.materialId || '',
    startTime: log.startTime || new Date().toISOString(),
    endTime: log.endTime || new Date().toISOString(),
    duration: log.duration || 0,
    mode: log.mode || 'timer',
    pagesRead: log.pagesRead || 0,
    memo: log.memo || '',
    createdAt: serverTimestamp(),
  };
  const ref = await addDoc(collection(db, 'studyLogs'), data);
  return { id: ref.id, ...data };
}

export async function updateLog(id, updates) {
  await updateDoc(doc(db, 'studyLogs', id), updates);
}

export async function deleteLog(id) {
  await deleteDoc(doc(db, 'studyLogs', id));
}

// ---- Computed Data ----

export async function getTodayLogs() {
  const today = new Date().toISOString().slice(0, 10);
  const logs = await getLogs();
  return logs.filter(l => (l.startTime || '').slice(0, 10) === today);
}

export async function getTodayTotalSeconds() {
  const logs = await getTodayLogs();
  return logs.reduce((sum, l) => sum + (l.duration || 0), 0);
}

export async function getLogsByMaterial(materialId) {
  const logs = await getLogs();
  return logs.filter(l => l.materialId === materialId);
}

export async function getMaterialTotalTime(materialId) {
  const logs = await getLogsByMaterial(materialId);
  return logs.reduce((sum, l) => sum + (l.duration || 0), 0);
}

export async function getStreak() {
  const logs = await getLogs();
  if (logs.length === 0) return 0;
  const uniqueDates = [...new Set(logs.map(l => (l.startTime || '').slice(0, 10)))].sort().reverse();
  if (uniqueDates.length === 0) return 0;
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (uniqueDates[0] !== today && uniqueDates[0] !== yesterday) return 0;
  let streak = 1;
  for (let i = 0; i < uniqueDates.length - 1; i++) {
    const curr = new Date(uniqueDates[i]);
    const prev = new Date(uniqueDates[i + 1]);
    if ((curr - prev) / 86400000 === 1) streak++; else break;
  }
  return streak;
}

export async function getDailyTotals(days = 7) {
  const logs = await getLogs();
  const result = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now); date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().slice(0, 10);
    const dayLogs = logs.filter(l => (l.startTime || '').slice(0, 10) === dateStr);
    const total = dayLogs.reduce((sum, l) => sum + (l.duration || 0), 0);
    result.push({ date: dateStr, dayOfWeek: date.toLocaleDateString('ja-JP', { weekday: 'short' }), totalSeconds: total });
  }
  return result;
}

export async function getMaterialTimeDistribution() {
  const materials = await getMaterials();
  const logs = await getLogs();
  return materials.map(m => {
    const totalSec = logs.filter(l => l.materialId === m.id).reduce((s, l) => s + (l.duration || 0), 0);
    return { id: m.id, title: m.title, totalSeconds: totalSec };
  }).filter(m => m.totalSeconds > 0).sort((a, b) => b.totalSeconds - a.totalSeconds);
}

// ---- Class-wide queries (for stats/admin) ----

export async function getAllUsersLogs() {
  const q = query(collection(db, 'studyLogs'), orderBy('startTime', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => {
    const data = d.data();
    return { id: d.id, ...data, startTime: toISOString(data.startTime), endTime: toISOString(data.endTime) };
  });
}

export async function getAllUsers() {
  const snap = await getDocs(collection(db, 'users'));
  return snap.docs.map(d => ({ uid: d.id, ...d.data() }));
}

export async function getUserById(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? { uid: snap.id, ...snap.data() } : null;
}

// ---- Announcements ----

export async function getAnnouncements() {
  const now = new Date().toISOString();
  const q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
    .filter(a => !a.expiresAt || a.expiresAt >= now);
}

export async function addAnnouncement(data) {
  return addDoc(collection(db, 'announcements'), {
    title: data.title, body: data.body || '',
    createdBy: uid(), createdAt: serverTimestamp(),
    expiresAt: data.expiresAt || null,
  });
}

export async function deleteAnnouncement(id) {
  await deleteDoc(doc(db, 'announcements', id));
}

// ---- Settings ----

export function getSettings() {
  try { return JSON.parse(localStorage.getItem('st_settings')) || defaultSettings(); } catch { return defaultSettings(); }
}
export function updateSettings(updates) {
  const s = { ...getSettings(), ...updates };
  localStorage.setItem('st_settings', JSON.stringify(s));
  return s;
}
function defaultSettings() {
  return { pomodoroWork: 25, pomodoroBreak: 5, pomodoroLongBreak: 15, notificationsEnabled: true };
}

// ---- Helpers ----

function toISOString(val) {
  if (!val) return new Date().toISOString();
  if (typeof val === 'string') return val;
  if (val instanceof Timestamp) return val.toDate().toISOString();
  if (val.toDate) return val.toDate().toISOString();
  return new Date(val).toISOString();
}
