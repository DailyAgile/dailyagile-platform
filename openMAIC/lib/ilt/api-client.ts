/**
 * API Client for ILT endpoints
 * Handles data fetching with error handling and retries
 */

import { Category, Course, Session, Instructor, ConversionData } from './types';

const API_BASE = '/api';
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // ms

class APIError extends Error {
  constructor(
    public statusCode: number,
    public originalError: Error,
    message: string
  ) {
    super(message);
    this.name = 'APIError';
  }
}

async function retryFetch<T>(
  url: string,
  options?: RequestInit,
  retries = MAX_RETRIES
): Promise<T> {
  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      throw new APIError(
        response.status,
        new Error(response.statusText),
        `API request failed: ${response.status} ${response.statusText}`
      );
    }

    return await response.json();
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }

    if (retries > 0 && error instanceof Error) {
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return retryFetch<T>(url, options, retries - 1);
    }

    throw new APIError(
      0,
      error instanceof Error ? error : new Error('Unknown error'),
      `Failed to fetch ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Fetch all ILT categories
 */
export async function fetchCategories(): Promise<Category[]> {
  return retryFetch<Category[]>(`${API_BASE}/ilt/categories`);
}

/**
 * Fetch a single category by ID
 */
export async function fetchCategory(id: string): Promise<Category> {
  return retryFetch<Category>(`${API_BASE}/ilt/categories/${id}`);
}

/**
 * Fetch courses by category
 */
export async function fetchCoursesByCategory(
  categoryId: string,
  page = 1,
  limit = 9
): Promise<{ courses: Course[]; total: number }> {
  return retryFetch<{ courses: Course[]; total: number }>(
    `${API_BASE}/ilt/courses?category=${categoryId}&page=${page}&limit=${limit}`
  );
}

/**
 * Fetch a single course
 */
export async function fetchCourse(courseId: string): Promise<Course> {
  return retryFetch<Course>(`${API_BASE}/ilt/courses/${courseId}`);
}

/**
 * Fetch sessions for a course
 */
export async function fetchCourseSessions(
  courseId: string
): Promise<Session[]> {
  return retryFetch<Session[]>(`${API_BASE}/ilt/sessions?course=${courseId}`);
}

/**
 * Fetch instructor data
 */
export async function fetchInstructor(instructorId: string): Promise<Instructor> {
  return retryFetch<Instructor>(`${API_BASE}/ilt/instructors/${instructorId}`);
}

/**
 * Fetch currency conversion data
 */
export async function fetchCurrencyData(): Promise<ConversionData> {
  return retryFetch<ConversionData>(`${API_BASE}/geo/currency`);
}

/**
 * Validate API response is of expected type
 */
export function isAPIError(error: unknown): error is APIError {
  return error instanceof APIError;
}
