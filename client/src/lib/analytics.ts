/**
 * analytics.ts — thin wrapper around GA4 gtag
 *
 * All custom events are typed here so every call-site stays consistent.
 * If gtag hasn't loaded (ad-blocker, SSR, test env) calls are silently
 * dropped — no runtime errors.
 */

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

function gtag(...args: unknown[]) {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag(...args);
  }
}

// ─── Consent ──────────────────────────────────────────────────────────────

const CONSENT_KEY = 'js-viz-cookie-consent';

export type ConsentStatus = 'granted' | 'denied' | null;

export function getConsentStatus(): ConsentStatus {
  const val = localStorage.getItem(CONSENT_KEY);
  if (val === 'granted' || val === 'denied') return val;
  return null;
}

export function grantConsent() {
  localStorage.setItem(CONSENT_KEY, 'granted');
  gtag('consent', 'update', { analytics_storage: 'granted' });
  window.dispatchEvent(new Event('cookie-consent-resolved'));
}

export function denyConsent() {
  localStorage.setItem(CONSENT_KEY, 'denied');
  gtag('consent', 'update', { analytics_storage: 'denied' });
  window.dispatchEvent(new Event('cookie-consent-resolved'));
}

// ─── Execution ────────────────────────────────────────────────────────────

export function trackRunClicked(fromState: 'idle' | 'paused' | 'breakpoint') {
  gtag('event', 'run_clicked', { from_state: fromState });
}

export function trackStepClicked() {
  gtag('event', 'step_clicked');
}

export function trackResetClicked() {
  gtag('event', 'reset_clicked');
}

export function trackExecutionCompleted(params: { steps_count: number; duration_ms: number }) {
  gtag('event', 'execution_completed', params);
}

export function trackSpeedChanged(speed_ms: number) {
  gtag('event', 'speed_changed', { speed_ms });
}

export function trackBreakpointToggled(line: number) {
  gtag('event', 'breakpoint_toggled', { line });
}

// ─── Examples ─────────────────────────────────────────────────────────────

export function trackExampleLoaded(title: string, category: string) {
  gtag('event', 'example_loaded', { example_title: title, example_category: category });
}

export function trackManageExamplesOpened() {
  gtag('event', 'manage_examples_opened');
}

export function trackFileImported(sizeBytes: number) {
  gtag('event', 'file_imported', { size_bytes: sizeBytes });
}

// ─── Features / Panels ────────────────────────────────────────────────────

export function trackPanelToggled(panel: string, enabled: boolean) {
  gtag('event', 'panel_toggled', { panel_name: panel, enabled });
}

export function trackShareClicked() {
  gtag('event', 'share_clicked');
}

export function trackTourStarted(from: 'onboarding' | 'toolbar') {
  gtag('event', 'tour_started', { from });
}

// ─── Feedback ─────────────────────────────────────────────────────────────

export function trackFeedbackSubmitted(feedback_type: string) {
  gtag('event', 'feedback_submitted', { feedback_type });
}
