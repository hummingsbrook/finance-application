'use strict';

const MAX_LENGTHS = {
  name: 255,
  shortCode: 50,
  note: 1000,
  longText: 2000,
};

function stripTags(value) {
  if (typeof value !== 'string') return value;
  return value.replace(/<[^>]*>/g, '').trim();
}

function sanitizeString(value, maxLength) {
  if (value === undefined || value === null) return value;
  const cleaned = stripTags(String(value));
  if (cleaned.length > maxLength) {
    throw Object.assign(new Error(`Value exceeds maximum length of ${maxLength} characters.`), { code: 'INPUT_TOO_LONG' });
  }
  return cleaned;
}

module.exports = { sanitizeString, MAX_LENGTHS };
