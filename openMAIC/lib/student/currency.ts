/**
 * Multi-Currency & Regional Pricing Utilities
 *
 * Handles currency formatting, regional pricing lookup, and exchange rates
 * for the DailyAgile global student platform.
 */

export type Currency = 'USD' | 'GBP' | 'EUR' | 'INR' | 'AUD' | 'JPY' | 'CAD' | 'SGD' | 'HKD' | 'AED';

export interface RegionalPrice {
  currency: Currency;
  amount: number;
  region: string;
  displayFormat: string;
}

export interface CurrencyInfo {
  code: Currency;
  name: string;
  symbol: string;
  locale: string;
  decimalPlaces: number;
}

/**
 * Currency metadata for formatting
 * Includes proper decimal places (e.g., JPY has 0, USD has 2)
 */
const currencyMetadata: Record<Currency, CurrencyInfo> = {
  USD: {
    code: 'USD',
    name: 'US Dollar',
    symbol: '$',
    locale: 'en-US',
    decimalPlaces: 2,
  },
  GBP: {
    code: 'GBP',
    name: 'British Pound',
    symbol: '£',
    locale: 'en-GB',
    decimalPlaces: 2,
  },
  EUR: {
    code: 'EUR',
    name: 'Euro',
    symbol: '€',
    locale: 'en-DE',
    decimalPlaces: 2,
  },
  INR: {
    code: 'INR',
    name: 'Indian Rupee',
    symbol: '₹',
    locale: 'en-IN',
    decimalPlaces: 0,
  },
  AUD: {
    code: 'AUD',
    name: 'Australian Dollar',
    symbol: 'A$',
    locale: 'en-AU',
    decimalPlaces: 2,
  },
  JPY: {
    code: 'JPY',
    name: 'Japanese Yen',
    symbol: '¥',
    locale: 'ja-JP',
    decimalPlaces: 0,
  },
  CAD: {
    code: 'CAD',
    name: 'Canadian Dollar',
    symbol: 'C$',
    locale: 'en-CA',
    decimalPlaces: 2,
  },
  SGD: {
    code: 'SGD',
    name: 'Singapore Dollar',
    symbol: 'S$',
    locale: 'en-SG',
    decimalPlaces: 2,
  },
  HKD: {
    code: 'HKD',
    name: 'Hong Kong Dollar',
    symbol: 'HK$',
    locale: 'en-HK',
    decimalPlaces: 2,
  },
  AED: {
    code: 'AED',
    name: 'UAE Dirham',
    symbol: 'د.إ',
    locale: 'en-AE',
    decimalPlaces: 2,
  },
};

/**
 * Regional pricing mapping
 * This should be fetched from database in production
 * Price is in local currency for each region
 */
const regionalPricing: Record<string, { currency: Currency; basePrice: number }> = {
  // North America
  US: { currency: 'USD', basePrice: 49.99 },
  CA: { currency: 'CAD', basePrice: 64.99 },

  // Europe
  GB: { currency: 'GBP', basePrice: 39.99 },
  DE: { currency: 'EUR', basePrice: 45.00 },
  FR: { currency: 'EUR', basePrice: 45.00 },
  ES: { currency: 'EUR', basePrice: 45.00 },
  IT: { currency: 'EUR', basePrice: 45.00 },
  NL: { currency: 'EUR', basePrice: 45.00 },
  BE: { currency: 'EUR', basePrice: 45.00 },
  AT: { currency: 'EUR', basePrice: 45.00 },
  CH: { currency: 'EUR', basePrice: 50.00 },
  SE: { currency: 'EUR', basePrice: 45.00 },
  NO: { currency: 'EUR', basePrice: 50.00 },
  DK: { currency: 'EUR', basePrice: 45.00 },

  // Asia-Pacific
  IN: { currency: 'INR', basePrice: 3990 },
  AU: { currency: 'AUD', basePrice: 75.00 },
  NZ: { currency: 'AUD', basePrice: 75.00 },
  JP: { currency: 'JPY', basePrice: 5500 },
  CN: { currency: 'JPY', basePrice: 280 }, // CNY not supported, use JPY as proxy
  SG: { currency: 'SGD', basePrice: 69.99 },
  HK: { currency: 'HKD', basePrice: 389 },
  TH: { currency: 'SGD', basePrice: 69.99 },
  MY: { currency: 'SGD', basePrice: 69.99 },

  // Middle East
  AE: { currency: 'AED', basePrice: 184 },
  SA: { currency: 'AED', basePrice: 184 },
  KW: { currency: 'AED', basePrice: 184 },

  // Brazil
  BR: { currency: 'USD', basePrice: 49.99 }, // Brazilian pricing handled via BRL conversion
};

/**
 * Get currency metadata
 *
 * @param currency - Currency code
 * @returns Currency information with formatting details
 *
 * @example
 * const usd = getCurrencyInfo('USD');
 * console.log(usd.symbol); // "$"
 * console.log(usd.decimalPlaces); // 2
 */
export function getCurrencyInfo(currency: Currency): CurrencyInfo {
  return currencyMetadata[currency];
}

/**
 * Format price for a specific currency
 * Handles proper decimal places and locale-aware formatting
 *
 * @param amount - Price amount
 * @param currency - Currency code
 * @param locale - Optional locale override
 * @returns Formatted price string
 *
 * @example
 * formatPrice(49.99, 'USD');      // "$49.99"
 * formatPrice(3990, 'INR');       // "₹3,990"
 * formatPrice(5500, 'JPY');       // "¥5,500"
 * formatPrice(45.00, 'EUR');      // "45,00 €"
 */
export function formatPrice(
  amount: number,
  currency: Currency,
  locale?: string
): string {
  const info = getCurrencyInfo(currency);
  const formatter = new Intl.NumberFormat(locale || info.locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: info.decimalPlaces,
    maximumFractionDigits: info.decimalPlaces,
  });

  return formatter.format(amount);
}

/**
 * Get regional price for a region code
 * Uses country/region codes to determine local pricing
 *
 * @param regionCode - ISO country code (e.g., 'US', 'GB', 'IN')
 * @returns Regional pricing with currency and formatted price
 *
 * @example
 * const price = getRegionalPrice('GB');
 * console.log(price.amount);       // 39.99
 * console.log(price.currency);     // 'GBP'
 * console.log(price.displayFormat);// "£39.99"
 *
 * const defaultPrice = getRegionalPrice('XX');
 * console.log(defaultPrice.amount); // 49.99 (USD fallback)
 */
export function getRegionalPrice(regionCode: string): RegionalPrice {
  const upperCode = regionCode.toUpperCase();
  const pricing = regionalPricing[upperCode];

  if (!pricing) {
    // Default to USD if region not found
    return {
      currency: 'USD',
      amount: 49.99,
      region: 'Default',
      displayFormat: formatPrice(49.99, 'USD'),
    };
  }

  return {
    currency: pricing.currency,
    amount: pricing.basePrice,
    region: upperCode,
    displayFormat: formatPrice(pricing.basePrice, pricing.currency),
  };
}

/**
 * Get price for a course tier in a specific region
 * Different tiers (free, standard, professional) have different pricing
 *
 * @param tier - Pricing tier ('free', 'standard', 'professional', 'enterprise')
 * @param regionCode - ISO country code
 * @returns Regional price for the tier
 *
 * @example
 * const price = getTierPrice('professional', 'IN');
 * console.log(price.displayFormat); // "₹3,990"
 *
 * const price = getTierPrice('free', 'US');
 * console.log(price.displayFormat); // "Free"
 */
export function getTierPrice(
  tier: 'free' | 'standard' | 'professional' | 'enterprise',
  regionCode: string
): RegionalPrice & { tier: string } {
  const basePrice = getRegionalPrice(regionCode);

  if (tier === 'free') {
    return {
      ...basePrice,
      amount: 0,
      displayFormat: 'Free',
      tier,
    };
  }

  if (tier === 'standard') {
    // Standard tier is 60% of professional
    const standardAmount = Math.round(basePrice.amount * 0.6 * 100) / 100;
    return {
      ...basePrice,
      amount: standardAmount,
      displayFormat: formatPrice(standardAmount, basePrice.currency),
      tier,
    };
  }

  if (tier === 'enterprise') {
    // Enterprise tier is 40% discount (60% of professional × quantity discount)
    const enterpriseAmount = Math.round(basePrice.amount * 2.4 * 100) / 100;
    return {
      ...basePrice,
      amount: enterpriseAmount,
      displayFormat: formatPrice(enterpriseAmount, basePrice.currency),
      tier,
    };
  }

  // Default to professional
  return {
    ...basePrice,
    tier,
  };
}

/**
 * Convert amount from one currency to another
 * Uses approximate exchange rates (should be fetched from API in production)
 *
 * @param amount - Amount to convert
 * @param fromCurrency - Source currency
 * @param toCurrency - Target currency
 * @returns Converted amount
 *
 * @example
 * const amount = convertCurrency(100, 'USD', 'EUR');
 * console.log(amount); // ~92.5 (approximate)
 */
export function convertCurrency(
  amount: number,
  fromCurrency: Currency,
  toCurrency: Currency
): number {
  if (fromCurrency === toCurrency) {
    return amount;
  }

  // Approximate exchange rates (to USD base)
  const exchangeRates: Record<Currency, number> = {
    USD: 1.0,
    GBP: 1.27,
    EUR: 1.09,
    INR: 0.012,
    AUD: 0.66,
    JPY: 0.0067,
    CAD: 0.73,
    SGD: 0.74,
    HKD: 0.128,
    AED: 0.272,
  };

  const usdAmount = amount / exchangeRates[fromCurrency];
  return usdAmount * exchangeRates[toCurrency];
}

/**
 * Get all supported currencies
 *
 * @returns Array of supported currency codes
 */
export function getSupportedCurrencies(): Currency[] {
  return Object.keys(currencyMetadata) as Currency[];
}

/**
 * Get all supported regions with their pricing
 *
 * @returns Record of region codes to pricing info
 */
export function getSupportedRegions(): Record<
  string,
  { currency: Currency; basePrice: number; name: string }
> {
  const regions: Record<string, { currency: Currency; basePrice: number; name: string }> = {
    US: { ...regionalPricing.US, name: 'United States' },
    CA: { ...regionalPricing.CA, name: 'Canada' },
    GB: { ...regionalPricing.GB, name: 'United Kingdom' },
    DE: { ...regionalPricing.DE, name: 'Germany' },
    FR: { ...regionalPricing.FR, name: 'France' },
    IN: { ...regionalPricing.IN, name: 'India' },
    AU: { ...regionalPricing.AU, name: 'Australia' },
    JP: { ...regionalPricing.JP, name: 'Japan' },
    SG: { ...regionalPricing.SG, name: 'Singapore' },
    AE: { ...regionalPricing.AE, name: 'United Arab Emirates' },
    BR: { ...regionalPricing.BR, name: 'Brazil' },
  };

  return regions;
}

/**
 * Detect region from IP address or browser info
 * Note: This should be combined with server-side IP geolocation in production
 *
 * @param locale - Browser locale string (e.g., 'en-US', 'de-DE')
 * @returns Detected region code
 *
 * @example
 * const region = detectRegionFromLocale('en-GB');
 * console.log(region); // 'GB'
 *
 * const region = detectRegionFromLocale('de-DE');
 * console.log(region); // 'DE'
 */
export function detectRegionFromLocale(locale: string): string {
  const parts = locale.split('-');
  if (parts.length > 1) {
    const countryCode = parts[1].toUpperCase();
    // Check if this country code has pricing defined
    if (regionalPricing[countryCode]) {
      return countryCode;
    }
  }

  // Default to US
  return 'US';
}

/**
 * Format currency pair for display (e.g., in analytics)
 *
 * @param amount - Amount to display
 * @param currency - Currency code
 * @param altAmount - Optional alternative amount
 * @param altCurrency - Optional alternative currency
 * @returns Formatted string for display
 *
 * @example
 * formatCurrencyPair(49.99, 'USD', 39.99, 'GBP');
 * // Output: "$49.99 / £39.99"
 */
export function formatCurrencyPair(
  amount: number,
  currency: Currency,
  altAmount?: number,
  altCurrency?: Currency
): string {
  const primary = formatPrice(amount, currency);

  if (altAmount !== undefined && altCurrency) {
    const alt = formatPrice(altAmount, altCurrency);
    return `${primary} / ${alt}`;
  }

  return primary;
}
