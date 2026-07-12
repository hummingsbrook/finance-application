import { useState } from 'react';

/**
 * Lightweight form validation hook.
 *
 * Usage:
 *   const { fieldErrors, validate, clearFieldError, clearAllErrors } = useFormValidation();
 *
 *   // In submit handler:
 *   const errors = {};
 *   if (!form.amount) errors.amount = 'Amount is required';
 *   if (!validate(errors)) return; // stops submit, shows red fields
 *
 *   // On input change:
 *   onChange={(e) => { handleChange(e); clearFieldError('amount'); }}
 *
 *   // On Input component:
 *   <Input error={fieldErrors.amount} ... />
 */
export function useFormValidation() {
  const [fieldErrors, setFieldErrors] = useState({});

  const validate = (errors) => {
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const clearFieldError = (fieldName) => {
    setFieldErrors((prev) => {
      if (!prev[fieldName]) return prev;
      const next = { ...prev };
      delete next[fieldName];
      return next;
    });
  };

  const clearAllErrors = () => setFieldErrors({});

  return { fieldErrors, validate, clearFieldError, clearAllErrors };
}
