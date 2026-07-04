import Razorpay from 'razorpay';
import crypto from 'crypto';

let instance: Razorpay | null = null;

export function getRazorpay(): Razorpay {
  if (!instance) {
    const key_id = process.env.RAZORPAY_KEY_ID;
    const key_secret = process.env.RAZORPAY_KEY_SECRET;
    if (!key_id || !key_secret) throw new Error('Razorpay keys are not set');
    instance = new Razorpay({ key_id, key_secret });
  }
  return instance;
}

export async function createOrder(amountInr: number, receipt: string, notes: Record<string, string>) {
  const rzp = getRazorpay();
  return rzp.orders.create({
    amount: Math.round(amountInr * 100), // paise
    currency: 'INR',
    receipt,
    notes,
  });
}

export function verifySignature(orderId: string, paymentId: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return false;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  return expected === signature;
}
