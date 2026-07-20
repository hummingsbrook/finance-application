import { useState, useCallback, useRef, useEffect } from 'react';
import api from '../lib/api';

/**
 * useDuplicateCheck - Custom hook for checking duplicate M-Pesa receipts/cheque numbers
 * 
 * @param {string} module - The API module: 'tithes', 'offerings', or 'expenses'
 * @returns {Object} { duplicateError, checkDuplicate, clearDuplicateError }
 */
export default function useDuplicateCheck(module) {
  const [duplicateError, setDuplicateError] = useState('');
  const timeoutRef = useRef(null);

  const clearDuplicateError = useCallback(() => {
    setDuplicateError('');
  }, []);

  const checkDuplicate = useCallback(async (value, field, excludeId) => {
    // Clear previous error
    setDuplicateError('');

    // Don't check empty values
    if (!value?.trim()) return;

    // Clear any existing timeout (debounce)
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Debounce the API call (400ms)
    timeoutRef.current = setTimeout(async () => {
      try {
        const params = { [field]: value };
        if (excludeId) params.excludeId = excludeId;
        
        const res = await api.get(`/${module}/check-duplicate`, { params });
        
        if (res.data?.duplicate) {
          if (field === 'mpesaReceiptNo') {
            setDuplicateError('This M-Pesa receipt number already exists.');
          } else if (field === 'chequeNumber') {
            setDuplicateError('This cheque number already exists.');
          } else {
            setDuplicateError('This value already exists.');
          }
        }
      } catch (err) {
        // Silently fail - don't show error for duplicate checks
        console.warn(`[${module}] Duplicate check failed:`, err);
      }
    }, 400);
  }, [module]);

  // Clear any pending debounce timeout when the component unmounts.
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { duplicateError, checkDuplicate, clearDuplicateError };
}
