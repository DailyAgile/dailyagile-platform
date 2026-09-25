/**
 * TypeScript interfaces for ILT platform data structures
 * Strict mode - no `any` types
 */

export interface Category {
  id: string;
  name: string;
  icon: string;
  description: string;
  courseCount: number;
}

export interface Course {
  id: string;
  categoryId: string;
  title: string;
  badge?: string;
  emoji?: string;
  description: string;
  regularPrice: number;
  salePrice?: number;
  discount?: string;
  instructorId: string;
  objectives: string[];
  overview: string;
  prerequisites: string[];
  certification: CertificationInfo;
}

export interface CertificationInfo {
  available: boolean;
  name?: string;
  format?: string;
  duration?: string;
  passingScore?: string;
  timingWindow?: string;
  cost?: string;
}

export interface Session {
  id: number;
  courseId: string;
  instructorId: string;
  format: string; // '2-day', '3-day', etc.
  dates: string; // e.g., "Sep 15-16, 2026"
  schedule: string; // 'Weekday (M-Tu)', 'Weekend (Fri-Sun)'
  times: string; // '9:00 AM - 5:00 PM EDT'
  regularPrice: number;
  salePrice?: number;
  discount?: string;
  available: number; // seats available
  waitlist: boolean;
}

export interface Instructor {
  id: string;
  name: string;
  title: string;
  experience: string;
  bio: string;
  rating: number;
  reviews: number;
  certifications: string[];
}

export interface Currency {
  code: string;
  symbol: string;
  name: string;
}

export interface ConversionData {
  currency: Currency;
  conversionRate: number;
}

export interface CarouselImage {
  id: string;
  url: string;
  alt: string;
  type: 'image' | 'video';
  videoUrl?: string;
}

export interface FilterState {
  month?: string;
  formats: string[];
  schedules: string[];
  times: string[];
  priceRange: [number, number];
  hideUnavailable: boolean;
}

export interface SessionFilterResult {
  sessions: Session[];
  count: number;
  totalCount: number;
}
