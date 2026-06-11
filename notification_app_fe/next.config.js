/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow the frontend to call our backend on port 5000
  async rewrites() {
    return [];
  },
};

module.exports = nextConfig;
