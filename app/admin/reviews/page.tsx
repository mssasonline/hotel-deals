import type { Metadata } from 'next';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export const metadata: Metadata = { title: 'Reviews — Admin Console' };

interface Review {
  id: string;
  guest_name: string | null;
  hotel_name: string | null;
  rating: number;
  comment: string | null;
  created_at: string;
  status: string;
}

export default async function AdminReviewsPage() {
  const supabase = await createSupabaseServerClient();

  const { data: reviews } = await supabase
    .from('reviews')
    .select('id, guest_name, hotel_name, rating, comment, created_at, status')
    .order('created_at', { ascending: false })
    .limit(50);

  const rows = (reviews ?? []) as Review[];

  const statusColor: Record<string, string> = {
    approved: 'bg-emerald-100 text-emerald-700',
    pending:  'bg-amber-100 text-amber-700',
    rejected: 'bg-red-100 text-red-700',
  };

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Guest Reviews</h1>
        <p className="text-sm text-gray-500 mt-1">{rows.length} most recent reviews</p>
      </div>

      {rows.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <p className="text-gray-400 text-sm">No reviews yet.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Guest', 'Hotel', 'Rating', 'Comment', 'Date', 'Status'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                    {r.guest_name ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                    {r.hotel_name ?? '—'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="flex items-center gap-1 text-amber-500 font-semibold">
                      ★ {r.rating.toFixed(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 max-w-xs truncate">
                    {r.comment ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                    {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${statusColor[r.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
