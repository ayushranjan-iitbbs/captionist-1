import { DEFAULT_TESTIMONIALS, DEFAULT_CREATORS } from './landingDefaults';
import type { Testimonial, Creator } from '@/types';

/**
 * Safely loads admin-managed landing content from Firestore.
 * Returns baked-in defaults whenever Firebase isn't configured/seeded,
 * so the marketing site always renders.
 */
export async function getLandingContent(): Promise<{
  testimonials: Testimonial[];
  creators: Creator[];
}> {
  try {
    const { adminDb } = await import('./firebaseAdmin');
    const { COLLECTIONS } = await import('./collections');

    const [tSnap, cSnap] = await Promise.all([
      adminDb.collection(COLLECTIONS.testimonials).orderBy('order').get(),
      adminDb.collection(COLLECTIONS.creators).orderBy('order').get(),
    ]);

    const testimonials = tSnap.empty
      ? DEFAULT_TESTIMONIALS
      : tSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Testimonial, 'id'>) }));
    const creators = cSnap.empty
      ? DEFAULT_CREATORS
      : cSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Creator, 'id'>) }));

    return { testimonials, creators };
  } catch {
    return { testimonials: DEFAULT_TESTIMONIALS, creators: DEFAULT_CREATORS };
  }
}
