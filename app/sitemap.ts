import type { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://selectedroom.com';

// Static routes that should always be in the sitemap
const staticRoutes: MetadataRoute.Sitemap = [
  { url: SITE_URL,               lastModified: new Date(), changeFrequency: 'daily',  priority: 1.0 },
  { url: `${SITE_URL}/search`,   lastModified: new Date(), changeFrequency: 'hourly', priority: 0.9 },
  { url: `${SITE_URL}/about`,    lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
  { url: `${SITE_URL}/contact`,  lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
  { url: `${SITE_URL}/privacy`,  lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
  { url: `${SITE_URL}/terms`,    lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Use the public anon key — no sensitive data is exposed; only hotel IDs are fetched
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const { data: hotels } = await supabase
    .from('hotels')
    .select('id, updated_at')
    .order('id');

  const hotelRoutes: MetadataRoute.Sitemap = (hotels ?? []).map((h) => ({
    url:             `${SITE_URL}/hotel/${h.id}`,
    lastModified:    h.updated_at ? new Date(h.updated_at) : new Date(),
    changeFrequency: 'daily' as const,
    priority:        0.8,
  }));

  return [...staticRoutes, ...hotelRoutes];
}
