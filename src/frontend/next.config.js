/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' }, // Allow any remote avatar
    ],
  },
};

module.exports = nextConfig;
