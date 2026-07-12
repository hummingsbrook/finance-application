/**
 * Format a number as Kenyan Shillings.
 * @param {number} amount
 * @returns {string} e.g. "KES 15,000.00"
 */
export function formatKES(amount) {
  if (amount == null || isNaN(amount)) return 'KES 0.00';
  const formatted = Math.abs(amount).toLocaleString('en-KE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return amount < 0 ? `-KES ${formatted}` : `KES ${formatted}`;
}

/**
 * Format an ISO date string as "Oct 24, 2023".
 * @param {string} date
 * @returns {string}
 */
export function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format an ISO date string as "Oct 24, 2023, 10:45 AM".
 * @param {string} date
 * @returns {string}
 */
export function formatDateTime(date) {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }) + ', ' + d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Get initials from first and last name.
 * @param {string} firstName
 * @param {string} lastName
 * @returns {string} e.g. "ES" for "Elder Samuel"
 */
export function getInitials(firstName, lastName) {
  const first = (firstName || '').trim();
  const last = (lastName || '').trim();
  if (!first && !last) return '?';
  return (
    (first.charAt(0) || '') + (last.charAt(0) || '')
  ).toUpperCase();
}

/**
 * Truncate a string to a maximum length, appending "...".
 * @param {string} str
 * @param {number} len
 * @returns {string}
 */
export function truncate(str, len) {
  if (!str) return '';
  if (str.length <= len) return str;
  return str.slice(0, len) + '...';
}