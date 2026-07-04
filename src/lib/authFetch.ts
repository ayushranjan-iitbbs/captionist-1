'use client';

import { auth } from '@/lib/firebaseClient';

/** fetch wrapper that attaches the current Firebase ID token. */
export async function authFetch(input: string, init: RequestInit = {}) {
  const token = await auth.currentUser?.getIdToken();
  const headers = new Headers(init.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return fetch(input, { ...init, headers });
}
