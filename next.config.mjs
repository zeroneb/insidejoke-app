/** @type {import('next').NextConfig} */
const nextConfig = {
  // Accept the publishable key under either name; the card form needs it in the browser.
  env: { NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || process.env.NEXT_STRIPE_PUBLISHABLE_KEY || process.env.STRIPE_PUBLISHABLE_KEY || process.env.STRIPE_PUBLIC_KEY || '' },
  distDir: process.env.NEXT_DIST_DIR || '.next',
  serverExternalPackages: ['@electric-sql/pglite', 'postgres'],
  // Keep server functions small on Vercel (each deployment's functions count toward
  // the plan's Function Storage). PGlite is only the local, no-database fallback and is
  // never used when deployed; the musl (Alpine) image binaries don't run on Vercel.
  ...(process.env.VERCEL ? {
    outputFileTracingExcludes: {
      '*': [
        'node_modules/@electric-sql/pglite/**',
        'node_modules/@img/sharp-libvips-linuxmusl-x64/**',
        'node_modules/@img/sharp-linuxmusl-x64/**'
      ]
    }
  } : {}),
  experimental: { serverActions: { bodySizeLimit: '6mb' } },
  poweredByHeader: false,
  // Security headers on every page: HTTPS only, no framing (clickjacking), no type sniffing,
  // and only our own site may use the camera/mic (voice and video notes).
  async headers() {
    return [{
      source: '/:path*',
      headers: [
        { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(self), microphone=(self), geolocation=(), payment=(self "https://js.stripe.com")' },
        { key: 'Content-Security-Policy', value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self' https://*.stripe.com" }
      ]
    }];
  }
};
export default nextConfig;
