import { NextRequest, NextResponse } from 'next/server';

// Geolocation to currency mapping
const COUNTRY_TO_CURRENCY: Record<string, { code: string; symbol: string; name: string }> = {
  // UK
  GB: { code: 'GBP', symbol: '£', name: 'British Pound' },

  // US & Americas
  US: { code: 'USD', symbol: '$', name: 'US Dollar' },
  CA: { code: 'CAD', symbol: '$', name: 'Canadian Dollar' },
  MX: { code: 'MXN', symbol: '$', name: 'Mexican Peso' },
  BR: { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
  AR: { code: 'ARS', symbol: '$', name: 'Argentine Peso' },
  AU: { code: 'AUD', symbol: '$', name: 'Australian Dollar' },
  NZ: { code: 'NZD', symbol: '$', name: 'New Zealand Dollar' },

  // Europe
  DE: { code: 'EUR', symbol: '€', name: 'Euro' },
  FR: { code: 'EUR', symbol: '€', name: 'Euro' },
  IT: { code: 'EUR', symbol: '€', name: 'Euro' },
  ES: { code: 'EUR', symbol: '€', name: 'Euro' },
  NL: { code: 'EUR', symbol: '€', name: 'Euro' },
  BE: { code: 'EUR', symbol: '€', name: 'Euro' },
  AT: { code: 'EUR', symbol: '€', name: 'Euro' },
  CH: { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc' },
  SE: { code: 'SEK', symbol: 'kr', name: 'Swedish Krona' },
  NO: { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone' },
  DK: { code: 'DKK', symbol: 'kr', name: 'Danish Krone' },

  // Asia
  IN: { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  JP: { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  CN: { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  SG: { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
  HK: { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar' },
  KR: { code: 'KRW', symbol: '₩', name: 'South Korean Won' },
  TH: { code: 'THB', symbol: '฿', name: 'Thai Baht' },
  MY: { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit' },

  // Middle East
  AE: { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
  SA: { code: 'SAR', symbol: 'ر.س', name: 'Saudi Riyal' },
  IL: { code: 'ILS', symbol: '₪', name: 'Israeli Shekel' },

  // Africa
  ZA: { code: 'ZAR', symbol: 'R', name: 'South African Rand' },
  EG: { code: 'EGP', symbol: '£', name: 'Egyptian Pound' },
};

// Conversion rates from GBP (base currency)
const CONVERSION_RATES: Record<string, number> = {
  GBP: 1.0,
  USD: 1.27,
  EUR: 0.87,
  CAD: 1.73,
  AUD: 1.95,
  NZD: 2.15,
  INR: 105.5,
  JPY: 189.5,
  CHF: 1.09,
  SEK: 13.5,
  NOK: 13.8,
  DKK: 6.48,
  CNY: 9.15,
  SGD: 1.71,
  HKD: 10.0,
  KRW: 1690,
  THB: 46.0,
  MYR: 5.95,
  AED: 4.66,
  SAR: 4.77,
  ILS: 4.81,
  ZAR: 24.0,
  EGP: 63.5,
  MXN: 21.6,
  BRL: 6.35,
  ARS: 1100,
};

export async function GET(request: NextRequest) {
  try {
    // Get country code from Vercel geolocation header (primary)
    let countryCode = request.headers.get('x-vercel-ip-country');

    // If no Vercel header, try to get IP and use fallback geolocation
    if (!countryCode) {
      const ip =
        request.headers.get('x-forwarded-for')?.split(',')[0] ||
        request.headers.get('x-real-ip') ||
        request.headers.get('cf-connecting-ip') ||
        'unknown';

      // Use ipapi.co as fallback (free tier: 30k requests/month)
      if (ip && ip !== 'unknown') {
        try {
          const geoResponse = await fetch(`https://ipapi.co/${ip}/json/`, {
            next: { revalidate: 3600 } // Cache for 1 hour
          });
          const geoData = await geoResponse.json();
          countryCode = geoData.country_code || null;
          console.log(`[GEO/CURRENCY] Fallback geolocation for IP ${ip}:`, geoData.country_code);
        } catch (error) {
          console.error('[GEO/CURRENCY] Fallback geolocation failed:', error);
        }
      }
    }

    // Allow testing with ?country=US query parameter (for local dev)
    const testCountry = request.nextUrl.searchParams.get('country');

    // Default to USD on localhost, GB on production
    const defaultCountry = process.env.NODE_ENV === 'development' ? 'US' : 'GB';
    const finalCountry = testCountry || countryCode || defaultCountry;

    // DEBUG: Log detection info
    console.log('[GEO/CURRENCY] Detected country:', countryCode);
    console.log('[GEO/CURRENCY] Test parameter:', testCountry);
    console.log('[GEO/CURRENCY] Final country:', finalCountry);
    console.log('[GEO/CURRENCY] Vercel header present:', !!request.headers.get('x-vercel-ip-country'));

    // Get currency info for country, default to GBP
    const currencyInfo = COUNTRY_TO_CURRENCY[finalCountry.toUpperCase()] || COUNTRY_TO_CURRENCY['GB'];
    const conversionRate = CONVERSION_RATES[currencyInfo.code] || 1.0;

    return NextResponse.json({
      countryCode: finalCountry.toUpperCase(),
      currency: {
        code: currencyInfo.code,
        symbol: currencyInfo.symbol,
        name: currencyInfo.name,
      },
      conversionRate,
      baseCurrency: 'GBP',
      environment: process.env.NODE_ENV,
      headerDetected: !!countryCode,
    });
  } catch (error) {
    console.error('Currency API error:', error);

    // Default to GBP on error
    return NextResponse.json({
      countryCode: 'GB',
      currency: {
        code: 'GBP',
        symbol: '£',
        name: 'British Pound',
      },
      conversionRate: 1.0,
      baseCurrency: 'GBP',
    });
  }
}
