/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.NEXT_DIST_DIR || '.next',
  serverExternalPackages: ['@electric-sql/pglite', 'postgres'],
  experimental: { serverActions: { bodySizeLimit: '6mb' } }
};
export default nextConfig;
