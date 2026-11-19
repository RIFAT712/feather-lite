/**
 * Right-to-Left (RTL) language detection and configuration for Feather 2.0.
 * Standard Wikimedia RTL language codes.
 */

export const RTL_LOCALES = new Set([
  "ar",  // Arabic (العربية)
  "arc", // Aramaic
  "bcc", // Southern Balochi
  "bgn", // Western Balochi
  "bqi", // Bakhtiari
  "ckb", // Central Kurdish (سۆرانی)
  "dv",  // Dhivehi (ދިވެހިބަސް)
  "fa",  // Persian (فارسی)
  "glk", // Gilaki (گیلکی)
  "he",  // Hebrew (עברית)
  "khw", // Khowar
  "ks",  // Kashmiri (کٲشُر)
  "mzn", // Mazanderani (مازرونی)
  "pnb", // Western Punjabi (پنجابی)
  "ps",  // Pashto (پښتو)
  "sd",  // Sindhi (سنڌي)
  "sdh", // Southern Kurdish
  "ug",  // Uyghur (ئۇيغۇرچە)
  "ur",  // Urdu (اردو)
  "yi",  // Yiddish (ייִדיש)
]);

/**
 * Returns true if the provided locale code is written Right-to-Left.
 */
export function isRtlLocale(locale: string): boolean {
  if (!locale) return false;
  const base = locale.toLowerCase().split("-")[0];
  return RTL_LOCALES.has(base);
}

/**
 * Returns 'rtl' or 'ltr' for HTML dir attribute.
 */
export function getLocaleDirection(locale: string): "rtl" | "ltr" {
  return isRtlLocale(locale) ? "rtl" : "ltr";
}
