import type { AppUser } from '@/types';

/** Reduce any phone format (+91…, 91…, bare 10-digit) to a comparable key. */
function phoneKey(raw?: string | null): string {
  return (raw || '').replace(/\D/g, '').slice(-10);
}

/** Admin emails from env (comma-separated). */
export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/** Admin phones from env (comma-separated; any format accepted). */
export function adminPhones(): string[] {
  return (process.env.ADMIN_PHONES || '')
    .split(',')
    .map((p) => phoneKey(p))
    .filter(Boolean);
}

/** Is this identity (by email and/or phone) configured as an admin? */
export function isAdminIdentity(params: { email?: string | null; phone?: string | null }): boolean {
  const email = (params.email || '').toLowerCase();
  const pk = phoneKey(params.phone);
  const emailMatch = !!email && adminEmails().includes(email);
  const phoneMatch = !!pk && adminPhones().includes(pk);
  return emailMatch || phoneMatch;
}

export function newUserDoc(params: {
  uid: string;
  name: string;
  email: string;
  phone?: string;
  photoURL?: string;
}): Omit<AppUser, 'uid'> {
  const now = Date.now();
  const role = isAdminIdentity({ email: params.email, phone: params.phone }) ? 'admin' : 'user';

  return {
    name: params.name || 'Creator',
    email: params.email,
    phone: params.phone,
    photoURL: params.photoURL,
    plan: 'free',
    role,
    usage: { storageBytes: 0, transcriptionSecondsUsed: 0, audioCleansUsed: 0 },
    createdAt: now,
    updatedAt: now,
  };
}