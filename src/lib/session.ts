import { adminAuth, adminDb } from './firebaseAdmin';
import { COLLECTIONS } from './collections';
import type { AppUser } from '@/types';
import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';

/**
 * Verifies the Firebase ID token from either the Authorization header
 * (Bearer ...) or the `idToken` cookie, and returns the matching app user.
 */
export async function getSessionUser(req?: NextRequest): Promise<AppUser | null> {
  let token: string | undefined;

  if (req) {
    const header = req.headers.get('authorization');
    if (header?.startsWith('Bearer ')) token = header.slice(7);
  }
  if (!token) {
    const store = cookies();
    token = store.get('idToken')?.value;
  }
  if (!token) return null;

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    const snap = await adminDb.collection(COLLECTIONS.users).doc(decoded.uid).get();
    if (!snap.exists) return null;
    return { uid: decoded.uid, ...(snap.data() as Omit<AppUser, 'uid'>) };
  } catch {
    return null;
  }
}

export async function requireAdmin(req?: NextRequest): Promise<AppUser | null> {
  const user = await getSessionUser(req);
  if (!user || user.role !== 'admin') return null;
  return user;
}
