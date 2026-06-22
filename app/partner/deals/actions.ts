'use server';

import { createSupabaseServerClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';
import { sendNewDealNotification, type NewDealNotificationData } from '@/lib/emailService';

export type DealStatus = 'active' | 'paused' | 'ended';

export type PartnerDeal = {
  id: string;
  hotel_id: number;
  hotel_name: string;
  hotel_city: string;
  room_id: number;
  room_name: string;
  base_price: number;
  deal_price: number;
  title: string | null;
  start_date: string;
  end_date: string;
  status: DealStatus;
  created_at: string;
};

export type DealRoom = {
  id: number;
  name: string;
  base_price: number;
  hotel_id: number;
  hotel_name: string;
  quantity_total: number;
  quantity_available: number;
};

export type CreateDealData = {
  hotel_id: number;
  room_id: number;
  deal_price: number;
  title?: string;
  start_date: string;
  end_date: string;
};

// ── getMyDeals ────────────────────────────────────────────────────────────────

export async function getMyDeals(): Promise<PartnerDeal[]> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('partner_deals')
    .select('id, hotel_id, room_id, deal_price, title, start_date, end_date, status, created_at, rooms(name, base_price), hotels(name, city)')
    .eq('partner_id', user.id)
    .order('created_at', { ascending: false });

  if (error || !data) return [];

  return data.map((row) => {
    const room  = Array.isArray(row.rooms)  ? row.rooms[0]  : row.rooms;
    const hotel = Array.isArray(row.hotels) ? row.hotels[0] : row.hotels;
    return {
      id:         String(row.id),
      hotel_id:   Number(row.hotel_id),
      hotel_name: String(hotel?.name ?? ''),
      hotel_city: String(hotel?.city ?? ''),
      room_id:    Number(row.room_id),
      room_name:  String(room?.name ?? ''),
      base_price: Number(room?.base_price ?? 0),
      deal_price: Number(row.deal_price),
      title:      row.title ? String(row.title) : null,
      start_date: String(row.start_date),
      end_date:   String(row.end_date),
      status:     row.status as DealStatus,
      created_at: String(row.created_at),
    };
  });
}

// ── getMyRooms ────────────────────────────────────────────────────────────────
// Returns all rooms across the partner's hotels (for the Add Deal selector).

export async function getMyRooms(): Promise<DealRoom[]> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('hotel_partners')
    .select('hotel_id, hotels(name, rooms(id, name, base_price, quantity_total, quantity_available))')
    .eq('user_id', user.id);

  if (error || !data) return [];

  const rooms: DealRoom[] = [];
  for (const hp of data) {
    const hotel = Array.isArray(hp.hotels) ? hp.hotels[0] : hp.hotels;
    if (!hotel) continue;
    const rawRooms = Array.isArray(hotel.rooms) ? hotel.rooms : [];
    for (const r of rawRooms) {
      rooms.push({
        id:                 Number(r.id),
        name:               String(r.name ?? ''),
        base_price:         Number(r.base_price ?? 0),
        hotel_id:           Number(hp.hotel_id),
        hotel_name:         String(hotel.name ?? ''),
        quantity_total:     Number(r.quantity_total ?? 1),
        quantity_available: Number(r.quantity_available ?? 0),
      });
    }
  }
  return rooms;
}

// ── createDeal ────────────────────────────────────────────────────────────────

export async function createDeal(
  data: CreateDealData,
): Promise<{ error?: string }> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  // Verify partner owns the hotel
  const { data: ownership } = await supabase
    .from('hotel_partners')
    .select('hotel_id')
    .eq('user_id', user.id)
    .eq('hotel_id', data.hotel_id)
    .maybeSingle();

  if (!ownership) return { error: 'Hotel not found in your portfolio' };

  const admin = createAdminClient();
  const { error } = await admin.from('partner_deals').insert({
    partner_id: user.id,
    hotel_id:   data.hotel_id,
    room_id:    data.room_id,
    deal_price: data.deal_price,
    title:      data.title ?? null,
    start_date: data.start_date,
    end_date:   data.end_date,
    status:     'active',
  });

  if (error) return { error: error.message };

  // Fire-and-forget: notify all active newsletter subscribers
  void (async () => {
    try {
      const { data: subs } = await admin
        .from('newsletter_subscribers')
        .select('email')
        .eq('is_active', true);

      if (!subs || subs.length === 0) return;

      const { data: room } = await admin
        .from('rooms')
        .select('name, base_price')
        .eq('id', data.room_id)
        .maybeSingle();

      const { data: hotel } = await admin
        .from('hotels')
        .select('name')
        .eq('id', data.hotel_id)
        .maybeSingle();

      if (!room || !hotel) return;

      const basePrice  = Number(room.base_price ?? 0);
      const dealPrice  = Number(data.deal_price);
      const discountPct = basePrice > 0
        ? Math.round(((basePrice - dealPrice) / basePrice) * 100)
        : 0;

      const notifications: NewDealNotificationData[] = subs.map((s) => ({
        subscriberEmail: s.email,
        hotelName:       String(hotel.name),
        hotelId:         Number(data.hotel_id),
        roomName:        String(room.name),
        dealPrice,
        basePrice,
        discountPct,
        endDate:         data.end_date,
      }));

      await sendNewDealNotification(notifications);
    } catch (err) {
      console.error('[createDeal] subscriber notification error:', err);
    }
  })();

  return {};
}

// ── updateDealStatus ──────────────────────────────────────────────────────────

export async function updateDealStatus(
  id: string,
  status: DealStatus,
): Promise<{ error?: string }> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const admin = createAdminClient();
  const { error } = await admin
    .from('partner_deals')
    .update({ status })
    .eq('id', id)
    .eq('partner_id', user.id);

  if (error) return { error: error.message };
  return {};
}

// ── deleteDeal ────────────────────────────────────────────────────────────────

export async function deleteDeal(id: string): Promise<{ error?: string }> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const admin = createAdminClient();
  const { error } = await admin
    .from('partner_deals')
    .delete()
    .eq('id', id)
    .eq('partner_id', user.id);

  if (error) return { error: error.message };
  return {};
}

// ── exportDealsCSV ────────────────────────────────────────────────────────────

export async function exportDealsCSV(): Promise<string> {
  const deals = await getMyDeals();

  const header = 'room_name,hotel_name,deal_price,start_date,end_date,title,status';
  const rows = deals.map((d) =>
    [d.room_name, d.hotel_name, d.deal_price, d.start_date, d.end_date, d.title ?? '', d.status]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(','),
  );
  return [header, ...rows].join('\n');
}

// ── importDealsCSV ────────────────────────────────────────────────────────────
// Expected CSV format (header row required):
//   room_id,hotel_id,deal_price,start_date,end_date,title

export async function importDealsCSV(csvText: string): Promise<{ imported: number; errors: string[] }> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { imported: 0, errors: ['Not authenticated'] };

  const lines = csvText.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return { imported: 0, errors: ['CSV is empty or missing header'] };

  const header = lines[0].toLowerCase().split(',').map((h) => h.replace(/"/g, '').trim());
  const idx = (key: string) => header.indexOf(key);

  const roomIdCol     = idx('room_id');
  const hotelIdCol    = idx('hotel_id');
  const dealPriceCol  = idx('deal_price');
  const startDateCol  = idx('start_date');
  const endDateCol    = idx('end_date');
  const titleCol      = idx('title');

  if (roomIdCol < 0 || hotelIdCol < 0 || dealPriceCol < 0 || startDateCol < 0 || endDateCol < 0) {
    return { imported: 0, errors: ['CSV must have columns: room_id, hotel_id, deal_price, start_date, end_date'] };
  }

  // Fetch partner's owned hotel IDs to validate rows
  const { data: owned } = await supabase
    .from('hotel_partners')
    .select('hotel_id')
    .eq('user_id', user.id);
  const ownedHotelIds = new Set((owned ?? []).map((r) => Number(r.hotel_id)));

  const admin = createAdminClient();
  const errors: string[] = [];
  let imported = 0;

  const parseRow = (line: string): string[] => {
    const cells: string[] = [];
    let inQuote = false;
    let cell = '';
    for (const ch of line) {
      if (ch === '"') { inQuote = !inQuote; }
      else if (ch === ',' && !inQuote) { cells.push(cell); cell = ''; }
      else { cell += ch; }
    }
    cells.push(cell);
    return cells.map((c) => c.trim());
  };

  for (let i = 1; i < lines.length; i++) {
    const cols = parseRow(lines[i]);
    const rowNum = i + 1;

    const hotelId  = Number(cols[hotelIdCol]);
    const roomId   = Number(cols[roomIdCol]);
    const price    = Number(cols[dealPriceCol]);
    const start    = cols[startDateCol];
    const end      = cols[endDateCol];
    const title    = titleCol >= 0 ? (cols[titleCol] || null) : null;

    if (!ownedHotelIds.has(hotelId)) {
      errors.push(`Row ${rowNum}: hotel_id ${hotelId} not in your portfolio`);
      continue;
    }
    if (!roomId || !price || price <= 0) {
      errors.push(`Row ${rowNum}: invalid room_id or deal_price`);
      continue;
    }
    if (!start || !end || end < start) {
      errors.push(`Row ${rowNum}: invalid or reversed dates`);
      continue;
    }

    const { error } = await admin.from('partner_deals').insert({
      partner_id: user.id,
      hotel_id:   hotelId,
      room_id:    roomId,
      deal_price: price,
      start_date: start,
      end_date:   end,
      title,
      status:     'active',
    });

    if (error) { errors.push(`Row ${rowNum}: ${error.message}`); }
    else { imported++; }
  }

  return { imported, errors };
}

// ── updateRoomQuantity ────────────────────────────────────────────────────────
// Partners set the total inventory. quantity_available is then recomputed
// from actual bookings via get_room_availability RPC (not a manual delta).

export async function updateRoomQuantity(
  roomId: number,
  newTotal: number,
): Promise<{ available: number; error?: string }> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { available: 0, error: 'Not authenticated' };

  // Verify partner owns a hotel that has this room
  const { data: room } = await supabase
    .from('rooms')
    .select('id, hotel_id')
    .eq('id', roomId)
    .maybeSingle();

  if (!room) return { available: 0, error: 'Room not found' };

  const { data: ownership } = await supabase
    .from('hotel_partners')
    .select('hotel_id')
    .eq('user_id', user.id)
    .eq('hotel_id', room.hotel_id)
    .maybeSingle();

  if (!ownership) return { available: 0, error: 'You do not own this room' };

  const admin = createAdminClient();

  // 1. Save the new total
  const { error: updErr } = await admin
    .from('rooms')
    .update({ quantity_total: newTotal })
    .eq('id', roomId);

  if (updErr) return { available: 0, error: updErr.message };

  // 2. Recompute available from actual bookings via RPC
  const today    = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().split('T')[0];

  const { data: rpcData } = await admin.rpc('get_room_availability', {
    p_room_id:   String(roomId),
    p_check_in:  today,
    p_check_out: tomorrow,
  });

  const available = Number(rpcData ?? 0);
  await admin
    .from('rooms')
    .update({ quantity_available: available, available: available > 0 })
    .eq('id', roomId);

  return { available };
}
