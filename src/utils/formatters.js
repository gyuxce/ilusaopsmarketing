/**
 * Custom formatters to maintain pristine typographic consistency in our Swiss-inspired modernist layouts
 */

/**
 * Format numeric currency values safely (defaults to Rupiah/IDR)
 */
export function formatMoney(amount, currency = 'IDR') {
  const value = Number(amount || 0);
  if (currency === 'IDR') {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(value);
}

/**
 * Return a calendar date in the browser's local timezone.
 */
export function getLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse a YYYY-MM-DD value without shifting it through UTC.
 */
export function parseLocalDate(dateString) {
  if (typeof dateString !== 'string') return new Date(dateString);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateString);
  if (!match) return new Date(dateString);
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

/**
 * Clean short-form date labels (e.g. "2026-06-11" -> "11 Jun 2026")
 */
export function formatDate(dateString) {
  if (!dateString) return '-';
  try {
    const d = parseLocalDate(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch (err) {
    return dateString;
  }
}

/**
 * Turn technical key IDs / tags into legible uppercase/capitalized metrics labels
 */
export function labelize(text) {
  if (!text) return '';
  return text
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
}
