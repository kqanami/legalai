import { useState, useCallback, useRef } from 'react';

/**
 * Hook for centralized API error handling.
 * Returns { error, loading, execute } where execute wraps async calls
 * with loading state and error capture.
 */
export function useApiCall() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const execute = useCallback(async (asyncFn, { onSuccess, onError, showError = true } = {}) => {
    setLoading(true);
    setError(null);
    try {
      const result = await asyncFn();
      if (onSuccess) onSuccess(result);
      return result;
    } catch (err) {
      const message = err?.message || 'Произошла ошибка';
      if (showError) setError(message);
      if (onError) onError(err);
      console.error('[API Error]', message, err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return { loading, error, execute, clearError };
}

/**
 * Hook to prevent double-click / rapid re-submission.
 * Returns a wrapped function that ignores calls within the cooldown period.
 */
export function useDebounceAction(cooldownMs = 1000) {
  const lastCallRef = useRef(0);
  const lockRef = useRef(false);

  return useCallback((fn) => {
    return async (...args) => {
      const now = Date.now();
      if (lockRef.current || now - lastCallRef.current < cooldownMs) {
        return; // Ignore rapid duplicate calls
      }
      lastCallRef.current = now;
      lockRef.current = true;
      try {
        return await fn(...args);
      } finally {
        lockRef.current = false;
      }
    };
  }, [cooldownMs]);
}

/**
 * Hook for debounced input values (e.g., search).
 */
export function useDebouncedValue(value, delayMs = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useState(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debouncedValue;
}
