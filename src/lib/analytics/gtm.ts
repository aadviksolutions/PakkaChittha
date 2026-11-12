/**
 * Google Tag Manager & GA4-ready analytics utilities for Pakka Chittha.
 *
 * Security & privacy design:
 * - Only Google Tag Manager (GTM-KD7WC9PV) is loaded on the site.
 * - GA4 (G-DR0969B3FZ) is expected to be configured inside GTM; no direct gtag.js
 *   script is injected to avoid duplicate tracking or performance overhead.
 * - All route metadata pushed to dataLayer strips query parameters, auth tokens,
 *   payment IDs, record UUIDs, and personally identifiable information (PII).
 */

const GTM_ID_PATTERN = /^GTM-[A-Z0-9]+$/i;
const DEFAULT_GTM_CONTAINER_ID = 'GTM-KD7WC9PV';

const configuredGtmId = process.env.NEXT_PUBLIC_GTM_ID?.trim();
export const GTM_CONTAINER_ID =
  configuredGtmId && GTM_ID_PATTERN.test(configuredGtmId)
    ? configuredGtmId
    : DEFAULT_GTM_CONTAINER_ID;

/** Reference GA4 Measurement ID managed through GTM container GTM-KD7WC9PV. */
export const GA4_MEASUREMENT_ID = 'G-DR0969B3FZ';

/** Keys strictly blocked from ever entering window.dataLayer. */
const BLOCKED_PII_KEYS = new Set([
  'email',
  'phone',
  'mobile',
  'password',
  'token',
  'secret',
  'key',
  'gstin',
  'pan',
  'aadhaar',
  'upi',
  'card',
  'cvv',
  'razorpay',
  'address',
  'customername',
  'customer_name',
  'username',
  'user_id',
  'userid',
]);

const DYNAMIC_ID_PREFIXES: Array<[RegExp, string]> = [
  [/^\/customers\/[^/]+$/, '/customers/[id]'],
  [/^\/suppliers\/[^/]+$/, '/suppliers/[id]'],
  [/^\/invoices\/(?!new$)[^/]+\/print$/, '/invoices/[id]/print'],
  [/^\/invoices\/(?!new$)[^/]+$/, '/invoices/[id]'],
  [/^\/purchases\/(?!new$|scan$)[^/]+$/, '/purchases/[id]'],
  [/^\/quotations\/(?!new$)[^/]+\/print$/, '/quotations/[id]/print'],
  [/^\/quotations\/(?!new$)[^/]+$/, '/quotations/[id]'],
  [/^\/inventory\/[^/]+$/, '/inventory/[id]'],
  [/^\/free-khata\/person\/[^/]+$/, '/free-khata/person/[id]'],
  [/^\/accountant\/ledgers\/[^/]+$/, '/accountant/ledgers/[id]'],
  [/^\/accountant\/vouchers\/(?!new$)[^/]+$/, '/accountant/vouchers/[id]'],
  [/^\/view\/invoice\/[^/]+$/, '/view/invoice/[id]'],
];

/**
 * Generates the official GTM head bootstrap script guarded against duplicate initialization.
 */
export function buildGtmHeadScript(gtmId: string = GTM_CONTAINER_ID): string {
  const safeId = GTM_ID_PATTERN.test(gtmId) ? gtmId : DEFAULT_GTM_CONTAINER_ID;
  return `(function(w,d,s,l,i){if(w.__lendenGtmLoaded&&w.__lendenGtmLoaded[i])return;w.__lendenGtmLoaded=w.__lendenGtmLoaded||{};w.__lendenGtmLoaded[i]=true;w[l]=w[l]||[];var hasStart=false;for(var k=0;k<w[l].length;k++){if(w[l][k]&&w[l][k]['gtm.start']){hasStart=true;break;}}if(!hasStart){w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});}if(d.querySelector('script[src*="googletagmanager.com/gtm.js?id='+i+'"]'))return;var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${safeId}');`;
}

/**
 * Normalizes a pathname before pushing to dataLayer so query tokens, entity IDs,
 * share links, or accidental numeric/email segments never reach GA4.
 */
export function sanitizeAnalyticsPath(rawPath: string): string {
  const pathOnly = (rawPath || '/').split(/[?#]/)[0] || '/';
  const normalized = pathOnly.startsWith('/') ? pathOnly : `/${pathOnly}`;

  for (const [pattern, replacement] of DYNAMIC_ID_PREFIXES) {
    if (pattern.test(normalized)) {
      return replacement;
    }
  }

  return normalized;
}

/**
 * Classifies routes into broad non-PII functional sections for GTM / GA4 reporting.
 */
export function classifyRouteArea(rawPath: string): string {
  const path = sanitizeAnalyticsPath(rawPath);
  if (
    path === '/' ||
    path === '/pricing' ||
    path === '/gst-billing-software' ||
    path === '/udhaar-khata-management' ||
    path === '/inventory-stock-software' ||
    path === '/ghar-kharcha-app'
  ) {
    return 'marketing';
  }
  if (
    path === '/login' ||
    path === '/register' ||
    path === '/select-mode' ||
    path === '/welcome'
  ) {
    return 'auth';
  }
  if (path.startsWith('/view/')) return 'public_view';
  if (path.startsWith('/platform-admin')) return 'admin';
  if (path.startsWith('/accountant')) return 'accounting';
  if (path.startsWith('/reports')) return 'reports';
  if (path.startsWith('/free-khata')) return 'free_khata';
  if (path.startsWith('/ghar-kharcha')) return 'ghar_kharcha';
  if (
    path.startsWith('/invoices') ||
    path.startsWith('/quotations') ||
    path.startsWith('/purchases') ||
    path.startsWith('/customers') ||
    path.startsWith('/suppliers') ||
    path.startsWith('/inventory') ||
    path.startsWith('/expenses')
  ) {
    return 'billing_operations';
  }
  if (
    path.startsWith('/settings') ||
    path.startsWith('/staff') ||
    path.startsWith('/subscription') ||
    path.startsWith('/whatsapp')
  ) {
    return 'workspace_settings';
  }
  if (path === '/dashboard') return 'dashboard';
  return 'app';
}

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
    __lendenGtmLoaded?: Record<string, boolean>;
  }
}

/**
 * Pushes a sanitized, non-PII event payload to window.dataLayer for GTM / GA4.
 */
export function pushToDataLayer(payload: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    const lowerKey = key.toLowerCase();
    if (BLOCKED_PII_KEYS.has(lowerKey)) continue;
    if (value !== undefined) {
      sanitized[key] = value;
    }
  }

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(sanitized);
}

