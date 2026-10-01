import { makeRateLimiter } from '../../../src/sources/rateLimit.js';
export { makeRateLimiter } from '../../../src/sources/rateLimit.js';

/**
 * Opt-in per-IP rate limiter for the cost-bearing API proxies (OpenAI / Google).
 * DEFAULT IS UNLIMITED: when the env var is unset, `0`, or non-numeric, this
 * returns `null` and the caller skips the check entirely — a runtime no-op that
 * preserves the original behavior. Only a positive integer N enables a fixed
 * 60s window of N requests/IP (built lazily once, then reused so its per-IP
 * window state persists across requests). The global backstop is set to a
 * generous multiple of the per-IP cap so a single host can't starve the rest.
 *
 * @param {string|undefined} envValue - Raw env value (requests/min/IP).
 * @returns {((key:string)=>boolean)|null} An `allow(key)` fn, or null when unlimited.
 */
export function makeOptInRateLimiter(envValue) {
  const max = Number(envValue);
  if (!Number.isFinite(max) || max <= 0) return null; // unset/0/garbage -> unlimited
  return makeRateLimiter({
    windowMs: 60_000,
    max: Math.floor(max),
    globalMax: Math.floor(max) * 20,
  });
}

/**
 * Strip a port (and IPv6 brackets) from one X-Forwarded-For hop. App Service
 * appends `ip:port` for IPv4 and `[ip]:port` for IPv6; a bare IPv6 address
 * (several colons, no brackets) is returned unchanged.
 */
function hostOfForwardedHop(hop) {
  const value = hop.trim();
  if (value.startsWith('[')) {
    const end = value.indexOf(']');
    return end > 1 ? value.slice(1, end) : '';
  }
  const colons = value.split(':').length - 1;
  return colons === 1 ? value.slice(0, value.indexOf(':')) : value;
}

/**
 * Client key for rate limiting.
 *
 * Locally (dev server, `npm run preview`) the socket peer is the real client,
 * and X-Forwarded-For is NOT trusted: it is client-controlled, so a rotating
 * value would mint fresh quota and grow the limiter map.
 *
 * Behind Azure App Service (detected by WEBSITE_INSTANCE_ID, which the platform
 * sets on every instance) the socket peer is the front end, so every caller
 * would share one bucket. There the platform appends the real peer as the
 * RIGHT-MOST X-Forwarded-For entry; only that hop is trusted, never the
 * client-supplied entries to its left.
 */
export function clientKey(req) {
  const socketKey = String(req.socket?.remoteAddress || 'local');
  if (!process.env.WEBSITE_INSTANCE_ID) return socketKey;
  const raw = req.headers?.['x-forwarded-for'];
  const header = Array.isArray(raw) ? raw.join(',') : String(raw || '');
  const hops = header.split(',').filter((hop) => hop.trim());
  const last = hops.length ? hostOfForwardedHop(hops.at(-1)) : '';
  return last || socketKey;
}
