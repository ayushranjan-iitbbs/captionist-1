/**
 * MSG91 OTP integration.
 *
 * Uses the MSG91 OTP API. Flow mirrors the standardized Baba-family pattern:
 *   - validate registration status BEFORE sending an SMS (see auth routes)
 *   - send OTP
 *   - verify OTP
 *
 * Required env:
 *   MSG91_AUTH_KEY
 *   MSG91_OTP_TEMPLATE_ID
 *   MSG91_SENDER_ID (optional, depending on template)
 */

const BASE = 'https://control.msg91.com/api/v5';

function authKey(): string {
  const key = process.env.MSG91_AUTH_KEY;
  if (!key) throw new Error('MSG91_AUTH_KEY is not set');
  return key;
}

/** Normalize an Indian mobile number to MSG91 format (countrycode + number, no +). */
export function normalizeMobile(raw: string, defaultCountry = '91'): string {
  let n = raw.replace(/[^\d]/g, '');
  if (n.length === 10) n = defaultCountry + n;
  return n;
}

export async function sendOtp(mobile: string): Promise<{ success: boolean; message: string }> {
  const number = normalizeMobile(mobile);

  // Explicit, actionable config check (so failures aren't opaque 500s)
  if (!process.env.MSG91_AUTH_KEY) {
    return { success: false, message: 'MSG91_AUTH_KEY is not set' };
  }
  if (!process.env.MSG91_OTP_TEMPLATE_ID) {
    return { success: false, message: 'MSG91_OTP_TEMPLATE_ID is not set' };
  }

  const url = new URL(`${BASE}/otp`);
  url.searchParams.set('template_id', process.env.MSG91_OTP_TEMPLATE_ID);
  url.searchParams.set('mobile', number);
  if (process.env.MSG91_SENDER_ID) {
    url.searchParams.set('sender', process.env.MSG91_SENDER_ID);
  }
  url.searchParams.set('otp_length', '6');

  let data: any = {};
  try {
    const res = await fetch(url.toString(), {
      method: 'POST',
      headers: { authkey: authKey(), 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    data = await res.json().catch(() => ({}));
  } catch (e: any) {
    return { success: false, message: `MSG91 request failed: ${e?.message || 'network error'}` };
  }

  if (data.type === 'success') {
    return { success: true, message: 'OTP sent' };
  }
  // MSG91 puts the real reason in `message` (e.g. template not approved, invalid authkey)
  return { success: false, message: data.message || 'Failed to send OTP' };
}

export async function verifyOtp(
  mobile: string,
  otp: string
): Promise<{ success: boolean; message: string }> {
  const number = normalizeMobile(mobile);
  const url = new URL(`${BASE}/otp/verify`);
  url.searchParams.set('mobile', number);
  url.searchParams.set('otp', otp);

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: { authkey: authKey() },
  });

  const data = await res.json().catch(() => ({}));
  if (data.type === 'success') {
    return { success: true, message: 'OTP verified' };
  }
  return { success: false, message: data.message || 'Invalid OTP' };
}

export async function resendOtp(
  mobile: string,
  type: 'text' | 'voice' = 'text'
): Promise<{ success: boolean; message: string }> {
  const number = normalizeMobile(mobile);
  const url = new URL(`${BASE}/otp/retry`);
  url.searchParams.set('mobile', number);
  url.searchParams.set('retrytype', type);

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: { authkey: authKey() },
  });

  const data = await res.json().catch(() => ({}));
  return {
    success: data.type === 'success',
    message: data.message || (data.type === 'success' ? 'OTP resent' : 'Failed to resend'),
  };
}