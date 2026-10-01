import { applicationHtmlPlugin } from './application-html.js';
import cesium from 'vite-plugin-cesium';

const LOOPBACK_ALLOWED_HOSTS = ['localhost', '127.0.0.1', '.local'];

/**
 * Deployment hostnames the dev/preview host check should accept, read from an
 * explicit environment object (never `process.env` directly): App Service's
 * WEBSITE_HOSTNAME plus a comma-separated GEV_ALLOWED_HOSTS for custom domains.
 * Wildcard spellings (`true`, `*`) are dropped so the check can never be
 * switched off from configuration.
 *
 * @param {Record<string, string|undefined>} env
 * @returns {string[]}
 */
export function allowedHostsFromEnv(env = {}) {
  const hosts = [
    env.WEBSITE_HOSTNAME,
    ...String(env.GEV_ALLOWED_HOSTS || '').split(','),
  ];
  return hosts
    .map((host) => String(host || '').trim())
    .filter((host) => host && host !== '*' && host.toLowerCase() !== 'true');
}

/** Build browser assets with explicit inputs; never load environment or providers. */
export function createBrowserViteConfig({
  plugins = [],
  publicDir,
  googleApiKey,
  cesiumToken,
  host = 'localhost',
  port = 4173,
  allowedHosts = [],
  command,
} = {}) {
  // Never `true`: even on a wildcard bind (container, 0.0.0.0) Vite's host
  // check stays on and accepts only loopback plus explicit deployment hosts.
  const hostAllowList = [
    ...new Set([...LOOPBACK_ALLOWED_HOSTS, ...allowedHosts]),
  ];
  return {
    plugins: [cesium(), applicationHtmlPlugin(), ...plugins],
    ...(publicDir === undefined ? {} : { publicDir }),
    // A production build must not clean the dependency cache a running dev
    // server is still serving optimized module URLs from.
    ...(command === 'build' ? { cacheDir: 'node_modules/.vite-build' } : {}),
    optimizeDeps: {
      // First reached through the SDR worker or a dynamic import. Pre-bundle
      // them at startup so first use cannot invalidate already-transformed
      // URLs with Vite's "Outdated Optimize Dep" 504 response.
      include: [
        '@jtarrio/signals/demod/demodulator.js',
        '@jtarrio/signals/demod/modes.js',
        '@jtarrio/webrtlsdr/rtlsdr.js',
        'egm96-universal',
      ],
    },
    server: {
      host: host || 'localhost',
      port: parseInt(port, 10) || 4173,
      allowedHosts: hostAllowList,
      fs: {
        deny: ['.env', '.env.*', '*.{crt,pem}', '**/.git/**', '**/ENVIRONMENT'],
      },
      // These headers protect the document containing Provider Settings.
      headers: {
        'X-Frame-Options': 'DENY',
        'Content-Security-Policy': "frame-ancestors 'none'",
      },
    },
    // `vite preview` (the production server for this repo — see server/standalone/
    // vite.config.js) reads its own host/port from `preview`, NOT `server`, and
    // otherwise defaults to port 4173 regardless of PORT/HOST env vars.
    preview: {
      host: host || 'localhost',
      port: parseInt(port, 10) || 4173,
      allowedHosts: hostAllowList,
      // Preview is the deployed server (behind App Service TLS). HSTS is only
      // honoured by browsers over HTTPS, so a local http preview is unaffected.
      headers: {
        'X-Frame-Options': 'DENY',
        'Content-Security-Policy': "frame-ancestors 'none'",
        'Strict-Transport-Security': 'max-age=31536000',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
      },
    },
    define: {
      'import.meta.env.GOOGLE_MAPS_API_KEY': JSON.stringify(googleApiKey),
      'import.meta.env.CESIUM_ION_TOKEN': JSON.stringify(cesiumToken),
    },
    build: { chunkSizeWarningLimit: 1500 },
  };
}
