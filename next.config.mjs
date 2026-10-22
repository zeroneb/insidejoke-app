/** @type {import('next').NextConfig} */
const nextConfig = {
  // Accept the publishable key under either name; the card form needs it in the browser.
  env: { NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || process.env.NEXT_STRIPE_PUBLISHABLE_KEY || process.env.STRIPE_PUBLISHABLE_KEY || process.env.STRIPE_PUBLIC_KEY || '' },
  distDir: process.env.NEXT_DIST_DIR || '.next',
  serverExternalPackages: ['@electric-sql/pglite', 'postgres'],
  experimental: { serverActions: { bodySizeLimit: '6mb' } }
};
export default nextConfig;
