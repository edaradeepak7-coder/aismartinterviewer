'use client';

export function trackEvent(eventName: string, eventParams: Record<string, unknown> = {}) {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', eventName, eventParams);
  }
}

export function trackChartInteraction(chartName: string, action: string, params: Record<string, unknown> = {}) {
  trackEvent('chart_interaction', {
    chart_name: chartName,
    action,
    ...params,
  });
}

export function trackInterviewEvent(eventName: string, params: Record<string, unknown> = {}) {
  trackEvent(eventName, { category: 'interview', ...params });
}
