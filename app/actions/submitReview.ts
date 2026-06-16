'use server';

import { createSupabaseServerClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';

export async function submitReview(
  bookingId: number,
  hotelId: number,
  rating: number,
  comment: string | null,
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  const admin = createAdminClient();

  // Insert review using admin client (bypasses RLS type issues)
  // We still enforce ownership: booking must belong to this user
  const { data: booking } = await admin
    .from('bookings')
    .select('id, user_id')
    .eq('id', bookingId)
    .single();

  if (!booking || booking.user_id !== user.id) {
    return { success: false, error: 'Booking not found or access denied' };
  }

  const { error: insertError } = await admin.from('reviews').insert({
    booking_id: bookingId,
    hotel_id:   hotelId,
    user_id:    user.id,
    rating,
    comment:    comment || null,
  });

  if (insertError) {
    if (insertError.code === '23505') {
      return { success: false, error: 'You have already submitted a review for this booking.' };
    }
    return { success: false, error: insertError.message };
  }

  // Update hotel aggregate rating using admin client
  const { data: allReviews } = await admin
    .from('reviews')
    .select('rating')
    .eq('hotel_id', hotelId);

  if (allReviews && allReviews.length > 0) {
    const count = allReviews.length;
    const avg = allReviews.reduce((s, r) => s + (r.rating as number), 0) / count;
    await admin
      .from('hotels')
      .update({ rating: parseFloat(avg.toFixed(2)), review_count: count })
      .eq('id', hotelId);
  }

  return { success: true, error: null };
}
