import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';

export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const hotelId = req.nextUrl.searchParams.get('id') ?? '5';
  const admin = createAdminClient();

  const [{ data: hotel, error: hotelErr }, { data: rooms, error: roomsErr }] = await Promise.all([
    admin.from('hotels').select('id, name, amenities').eq('id', Number(hotelId)).single(),
    admin.from('rooms').select('id, name, room_type, area_sqm, bed_type, features').eq('hotel_id', Number(hotelId)).limit(3),
  ]);

  return NextResponse.json({
    hotel: hotelErr ? { error: hotelErr.message } : hotel,
    rooms: roomsErr ? { error: roomsErr.message } : rooms,
  });
}
