import { notFound, redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase-admin';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import Header from '@/app/components/Header';
import Footer from '@/app/components/Footer';
import ReviewForm from './ReviewForm';

interface PageProps {
  params: { token: string };
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });
}

export default async function ReviewPage({ params }: PageProps) {
  const bookingId = params.token;

  const admin = createAdminClient();

  // Fetch booking with hotel info
  const { data: booking } = await admin
    .from('bookings')
    .select('id, user_id, hotel_id, check_in, check_out, status, hotels(name, city)')
    .eq('id', bookingId)
    .single();

  if (!booking) notFound();

  const checkOutStr = (booking.check_out as string).slice(0, 10);
  const todayStr = new Date().toISOString().slice(0, 10);

  if (checkOutStr > todayStr || booking.status === 'cancelled') {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-md w-full text-center">
            <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>
            <h1 className="font-bold text-gray-900 text-lg mb-2">Review Not Available Yet</h1>
            <p className="text-gray-500 text-sm">
              Reviews can only be submitted after checkout. Please come back after{' '}
              <strong>{formatDate(checkOutStr)}</strong>.
            </p>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  // Check if review already exists
  const { data: existingReview } = await admin
    .from('reviews')
    .select('id')
    .eq('booking_id', bookingId)
    .maybeSingle();

  if (existingReview) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-md w-full text-center">
            <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="font-bold text-gray-900 text-lg mb-2">Review Already Submitted</h1>
            <p className="text-gray-500 text-sm">You have already reviewed this stay. Thank you!</p>
            <a
              href="/my-trips"
              className="mt-5 inline-flex items-center gap-2 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-all hover:-translate-y-0.5"
              style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)', boxShadow: '0 4px 14px rgba(30,58,138,0.3)' }}
            >
              View My Trips
            </a>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  // Check if user is authenticated
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const hotelName =
    (booking.hotels as { name?: string; city?: string } | null)?.name ?? 'Hotel';
  const hotelCity =
    (booking.hotels as { name?: string; city?: string } | null)?.city ?? '';

  if (!user) {
    const loginUrl = `/login?redirect=${encodeURIComponent(`/review/${bookingId}`)}`;
    return (
      <>
        <Header />
        <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-md w-full text-center">
            <div className="w-14 h-14 bg-brand-blue/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-brand-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </div>
            <h1 className="font-bold text-gray-900 text-xl mb-1">Leave a Review</h1>
            <p className="text-gray-500 text-sm mb-1">{hotelName}</p>
            {hotelCity && <p className="text-gray-400 text-xs mb-5">{hotelCity}</p>}
            <p className="text-gray-600 text-sm mb-6">
              Sign in to share your experience and help other travellers.
            </p>
            <a
              href={loginUrl}
              className="inline-flex items-center justify-center gap-2 text-white font-bold px-6 py-3 rounded-xl transition-all w-full hover:-translate-y-0.5"
              style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)', boxShadow: '0 4px 14px rgba(30,58,138,0.3)' }}
            >
              Sign in to Write a Review
            </a>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  // Check if this user owns the booking
  if (user.id !== booking.user_id) {
    redirect('/my-trips');
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-50">
        <div style={{ background: 'linear-gradient(135deg, #0F2260 0%, #1E3A8A 55%, #2563EB 100%)' }}>
          <div className="max-w-lg mx-auto px-4 sm:px-6 py-10">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #B45309 0%, #D97706 100%)' }}>
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </div>
              <div>
                <h1 className="text-white font-extrabold text-2xl leading-tight">Leave a Review</h1>
                <p className="text-white/60 text-sm">
                  {hotelName}{hotelCity ? ` · ${hotelCity}` : ''} · checked out {formatDate(checkOutStr)}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-lg mx-auto px-4 sm:px-6 py-8">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
            <ReviewForm
              bookingId={String(booking.id)}
              hotelId={Number(booking.hotel_id)}
              hotelName={hotelName}
            />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
