import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFormValidation } from '../../hooks/useFormValidation';

describe('useFormValidation', () => {
  it('Hook initializes fieldErrors as {}', () => {
    const { result } = renderHook(() => useFormValidation());
    expect(result.current.fieldErrors).toEqual({});
  });

  it('validate({}) returns true and fieldErrors stays {}', () => {
    const { result } = renderHook(() => useFormValidation());
    let isValid;
    act(() => {
      isValid = result.current.validate({});
    });
    expect(isValid).toBe(true);
    expect(result.current.fieldErrors).toEqual({});
  });

  it('validate({ amount: "required" }) returns false', () => {
    const { result } = renderHook(() => useFormValidation());
    let isValid;
    act(() => {
      isValid = result.current.validate({ amount: 'required' });
    });
    expect(isValid).toBe(false);
  });

  it('validate({ amount: "required" }) sets fieldErrors.amount to "required"', () => {
    const { result } = renderHook(() => useFormValidation());
    act(() => {
      result.current.validate({ amount: 'required' });
    });
    expect(result.current.fieldErrors.amount).toBe('required');
  });

  it('validate({}) after validate({ amount: "err" }) clears all errors', () => {
    const { result } = renderHook(() => useFormValidation());
    act(() => {
      result.current.validate({ amount: 'err' });
    });
    expect(result.current.fieldErrors).toHaveProperty('amount');
    act(() => {
      result.current.validate({});
    });
    expect(result.current.fieldErrors).toEqual({});
  });

  it('clearFieldError("amount") removes only the "amount" key from fieldErrors', () => {
    const { result } = renderHook(() => useFormValidation());
    act(() => {
      result.current.validate({ amount: 'err' });
    });
    act(() => {
      result.current.clearFieldError('amount');
    });
    expect(result.current.fieldErrors).not.toHaveProperty('amount');
  });

  it('clearFieldError("amount") leaves other keys ("name") intact in fieldErrors', () => {
    const { result } = renderHook(() => useFormValidation());
    act(() => {
      result.current.validate({ amount: 'err1', name: 'err2' });
    });
    act(() => {
      result.current.clearFieldError('amount');
    });
    expect(result.current.fieldErrors).not.toHaveProperty('amount');
    expect(result.current.fieldErrors).toHaveProperty('name', 'err2');
  });

  it('clearAllErrors() resets fieldErrors to {}', () => {
    const { result } = renderHook(() => useFormValidation());
    act(() => {
      result.current.validate({ amount: 'err', name: 'err2' });
    });
    expect(Object.keys(result.current.fieldErrors).length).toBeGreaterThan(0);
    act(() => {
      result.current.clearAllErrors();
    });
    expect(result.current.fieldErrors).toEqual({});
  });

  it('calling validate twice with different errors replaces previous errors completely', () => {
    const { result } = renderHook(() => useFormValidation());
    act(() => {
      result.current.validate({ amount: 'err1', name: 'err2' });
    });
    act(() => {
      result.current.validate({ date: 'err3' });
    });
    // Should only have `date` — `amount` and `name` should be gone
    expect(Object.keys(result.current.fieldErrors)).toEqual(['date']);
    expect(result.current.fieldErrors.date).toBe('err3');
  });
});
