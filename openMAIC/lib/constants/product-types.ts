/**
 * Product Type Constants
 * =======================
 *
 * Defines all product types that can be purchased through the platform.
 * Used to route webhook events to appropriate enrollment handlers.
 *
 * Adding a new product type:
 *   1. Add constant here: PRODUCT_TYPES.NEW_TYPE = 'new-type'
 *   2. Add handler in webhook route (app/api/quiz/stripe/webhook/route.ts)
 *   3. Add to SUPPORTED_PRODUCT_TYPES if it should trigger enrollment
 *   4. Update business logic tests
 *
 * Time Complexity: O(1) - all lookups are direct object access
 * No external dependencies
 *
 * Usage:
 *   import { PRODUCT_TYPES } from '@/lib/constants/product-types';
 *   if (session.metadata?.product_type === PRODUCT_TYPES.QUIZ) { ... }
 */

export const PRODUCT_TYPES = {
  /**
   * Single quiz or quiz bundle
   * Maps to quiz_id in database billing_history table
   * Most common product type (MVP phase)
   *
   * Metadata fields:
   *   - course_id: Quiz ID from quizzes table
   *   - email: Student email address
   */
  QUIZ: 'quiz',

  /**
   * Full course (Track A or Track B)
   * Maps to course_id in database
   * Reserved for future full-course product offerings
   *
   * Metadata fields:
   *   - course_id: Course ID (e.g., 'track-a-full', 'track-b-engineer')
   *   - email: Student email address
   *   - track: Optional track identifier ('a' or 'b')
   */
  COURSE: 'course',

  /**
   * Bundle of multiple courses
   * Maps to bundle_id in database
   * Reserved for future promotional bundled offerings
   *
   * Metadata fields:
   *   - bundle_id: Bundle ID (e.g., 'both-tracks-bundle')
   *   - email: Student email address
   *   - courses: JSON array of course IDs included
   */
  BUNDLE: 'bundle',

  /**
   * Corporate team license
   * Maps to corporate_licences table
   * Reserved for future B2B multi-seat offerings
   *
   * Metadata fields:
   *   - license_id: License ID
   *   - organization: Company name
   *   - seats: Number of seats purchased
   *   - admin_email: Primary admin contact
   */
  CORPORATE_LICENSE: 'corporate-license',
} as const;

/**
 * Type for product type values
 * Ensures type safety when comparing product types
 */
export type ProductType = (typeof PRODUCT_TYPES)[keyof typeof PRODUCT_TYPES];

/**
 * Product types that trigger student enrollment
 * Other product types might trigger different actions (e.g., admin notifications)
 */
export const ENROLLMENT_TRIGGER_PRODUCTS: readonly ProductType[] = [
  PRODUCT_TYPES.QUIZ,
  PRODUCT_TYPES.COURSE,
  PRODUCT_TYPES.BUNDLE,
] as const;

/**
 * Check if a product type triggers student enrollment
 * @param productType - The product type to check
 * @returns true if the product type requires enrollment processing
 */
export function triggersEnrollment(productType: unknown): productType is ProductType {
  return ENROLLMENT_TRIGGER_PRODUCTS.includes(productType as ProductType);
}

/**
 * Check if a product type is valid (known)
 * @param productType - The product type to validate
 * @returns true if the product type is recognized by the platform
 */
export function isValidProductType(productType: unknown): productType is ProductType {
  return Object.values(PRODUCT_TYPES).includes(productType as ProductType);
}

/**
 * Get the default metadata fields expected for a product type
 * Useful for validation before processing checkout events
 */
export const PRODUCT_REQUIRED_METADATA: Record<ProductType, string[]> = {
  [PRODUCT_TYPES.QUIZ]: ['course_id', 'email'],
  [PRODUCT_TYPES.COURSE]: ['course_id', 'email'],
  [PRODUCT_TYPES.BUNDLE]: ['bundle_id', 'email'],
  [PRODUCT_TYPES.CORPORATE_LICENSE]: ['license_id', 'organization', 'admin_email'],
} as const;

/**
 * Get required metadata fields for a given product type
 * @param productType - The product type
 * @returns Array of required metadata field names
 */
export function getRequiredMetadataFields(productType: ProductType): string[] {
  return PRODUCT_REQUIRED_METADATA[productType] || [];
}
