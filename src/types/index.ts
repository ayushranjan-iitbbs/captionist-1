export interface AppUser {
  uid: string;
  name: string;
  email: string;
  phone?: string;
  photoURL?: string;
  preferredLanguage?: string;
  plan: PlanId;
  role: 'user' | 'admin';
  usage: {
    storageBytes: number;
    transcriptionSecondsUsed: number;
    audioCleansUsed: number;
  };
  createdAt: number;
  updatedAt: number;
}

export type PlanId = 'free' | 'editor' | 'creator' | 'studio';

export interface Plan {
  id: PlanId;
  name: string;
  priceMonthly: number; // INR
  priceYearly: number; // INR (effective monthly when billed yearly)
  popular?: boolean;
  tagline: string;
  features: string[];
  limits: {
    storageGB: number;
    transcriptionMinutes: number;
    audioCleans: number;
    watermark: boolean;
    aiTranslation: boolean;
  };
  uploadDurationMinutes: number;
  durationLimitText?: string;
}

export const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    priceMonthly: 0,
    priceYearly: 0,
    tagline: 'Get started',
    features: ['All Languages', '5 min transcription', '5 GB storage', 'Basic templates'],
    limits: {
      storageGB: 5,
      transcriptionMinutes: 5,
      audioCleans: 3,
      watermark: true,
      aiTranslation: false,
    },
    uploadDurationMinutes: 2,
  },
  {
    id: 'editor',
    name: 'Editor Plan',
    priceMonthly: 670,
    priceYearly: 558,
    tagline: 'Everything in Free, plus',
    features: ['AI Translation', 'Watermark removal', '60 min transcription', '50 GB storage'],
    limits: {
      storageGB: 50,
      transcriptionMinutes: 60,
      audioCleans: 30,
      watermark: false,
      aiTranslation: true,
    },
    uploadDurationMinutes: 2,
    durationLimitText: 'Max duration: 2 min',
  },
  {
    id: 'creator',
    name: 'Creator Plan',
    priceMonthly: 950,
    priceYearly: 791,
    popular: true,
    tagline: 'Everything in Editor, plus',
    features: ['Premium audio cleaning', 'Custom fonts', '200 min transcription', '200 GB storage'],
    limits: {
      storageGB: 200,
      transcriptionMinutes: 200,
      audioCleans: 100,
      watermark: false,
      aiTranslation: true,
    },
    uploadDurationMinutes: 5,
    durationLimitText: 'Max duration: 5 min',
  },
  {
    id: 'studio',
    name: 'Studio Plan',
    priceMonthly: 2400,
    priceYearly: 2000,
    tagline: 'Everything in Creator, plus',
    features: ['Team billing', 'Priority rendering', 'Unlimited transcription', '1 TB storage'],
    limits: {
      storageGB: 1000,
      transcriptionMinutes: 100000,
      audioCleans: 100000,
      watermark: false,
      aiTranslation: true,
    },
    uploadDurationMinutes: 30,
    durationLimitText: 'Max duration: 30 min',
  },
];

export interface Tutorial {
  id: string;
  title: string;
  description?: string;
  videoUrl: string;
  thumbnailUrl?: string;
  duration: string; // "3:17"
  order: number;
  createdAt: number;
}

export interface Testimonial {
  id: string;
  name: string;
  handle?: string;
  avatarUrl?: string;
  text: string;
  order: number;
}

export interface Creator {
  id: string;
  name: string;
  subtitle?: string;
  avatarUrl: string;
  order: number;
}

export interface LandingVideo {
  id: string;
  title: string;
  videoUrl: string;
  posterUrl?: string;
  section: 'hero' | 'templates' | 'testimonial';
  order: number;
}

export interface FontStyle {
  id: string;
  name: string;
  fontFamily: string;
  cssUrl?: string; // Google Fonts URL
  weight?: string;
  isCustom: boolean;
  previewText?: string;
  order: number;
}

export interface Project {
  id: string;
  uid: string;
  title: string;
  videoUrl?: string;
  language: string;
  status: 'uploaded' | 'transcribing' | 'ready' | 'failed';
  transcript?: { text: string; segments: any[] };
  thumbnailUrl?: string;
  durationSeconds?: number;
  createdAt: number;
  updatedAt: number;
}

export interface Transaction {
  id: string;
  uid: string;
  userEmail: string;
  planId: PlanId;
  amount: number; // gross INR before discount
  discount: number;
  finalAmount: number;
  couponCode?: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  status: 'created' | 'paid' | 'failed';
  createdAt: number;
}
