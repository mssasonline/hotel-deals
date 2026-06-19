import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://selectedroom.com';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',
          '/partner/',
          '/api/',
          '/booking/',
          '/my-bookings/',
          '/my-trips/',
          '/my-favorites/',
          '/account/',
          '/payment/',
          '/booking/success/',
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
