import type { NextConfig } from "next";

const securityHeaders = [
  // Prevent the site from being embedded in iframes on other origins (clickjacking)
  { key: 'X-Frame-Options',        value: 'SAMEORIGIN' },
  // Block MIME-type sniffing
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Send full URL only for same-origin requests; strip to origin for cross-origin
  { key: 'Referrer-Policy',        value: 'strict-origin-when-cross-origin' },
  // Disable browser features not used by this app
  { key: 'Permissions-Policy',     value: 'camera=(), microphone=(), geolocation=(self), payment=()' },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },

  images: {
    remotePatterns: [
      // Unsplash — used for fallback and seeded hotel images
      { protocol: 'https', hostname: 'images.unsplash.com' },
      // Supabase Storage — hotel images uploaded via partner dashboard
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
  },
};

export default nextConfig;
