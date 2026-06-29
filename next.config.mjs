/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false, // don't advertise the framework/version
  async headers() {
    // Safe, app-wide hardening headers. A Content-Security-Policy is
    // intentionally omitted for now: the paper surface and Tiptap rely on
    // inline styles, so a CSP needs careful per-directive tuning (and likely a
    // nonce) before it can ship without breaking rendering. Tracked as a
    // follow-up.
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
        ],
      },
    ]
  },
}

export default nextConfig
