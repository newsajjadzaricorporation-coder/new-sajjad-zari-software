// Performance monitoring utility
export function measurePerformance<T>(actionName: string, fn: () => T): T {
  const start = performance.now();
  try {
    const result = fn();
    const duration = performance.now() - start;
    if (duration > 100) {
      console.warn(`[PERF_WARNING] Action "${actionName}" took ${duration.toFixed(2)}ms (>100ms threshold)`);
    }
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    console.error(`[PERF_ERROR] Action "${actionName}" failed after ${duration.toFixed(2)}ms`, error);
    throw error;
  }
}

export async function measurePerformanceAsync<T>(actionName: string, fn: () => Promise<T>): Promise<T> {
  const start = performance.now();
  try {
    const result = await fn();
    const duration = performance.now() - start;
    if (duration > 100) {
      console.warn(`[PERF_WARNING] Async Action "${actionName}" took ${duration.toFixed(2)}ms (>100ms threshold)`);
    }
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    console.error(`[PERF_ERROR] Async Action "${actionName}" failed after ${duration.toFixed(2)}ms`, error);
    throw error;
  }
}

import { useEffect, useRef } from 'react';

export function useRenderPerformance(componentName: string) {
  const renderStartTime = useRef(performance.now());

  useEffect(() => {
    const duration = performance.now() - renderStartTime.current;
    if (duration > 100) {
      console.warn(`[PERF_WARNING] Component render "${componentName}" took ${duration.toFixed(2)}ms (>100ms threshold)`);
    }
    renderStartTime.current = performance.now();
  });
}
