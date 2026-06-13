/**
 * Email notification service powered by Resend.
 *
 * Gated by NOTIFICATIONS_ENABLED env var so emails are sent only in production.
 * During testing: emails are skipped but the intent is logged to console.
 * At launch: set NOTIFICATIONS_ENABLED=true in .env and add RESEND_API_KEY.
 *
 * Install when ready: npm install resend
 */

export interface BookingEmailData {
  guestName:  string;
  guestEmail: string;
  hotelName:  string;
  roomName:   string;
  checkIn:    string;
  checkOut:   string;
  nights:     number;
  totalPrice: number;
  bookingRef: string;
  partnerEmail?: string;
  partnerName?:  string;
}

const ENABLED = process.env.NOTIFICATIONS_ENABLED === 'true';
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? 'noreply@hotel-deals.com';

function guestConfirmationHtml(d: BookingEmailData): string {
  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#003B95;padding:24px 32px;border-radius:12px 12px 0 0">
        <h1 style="color:white;margin:0;font-size:22px">Booking Confirmed</h1>
      </div>
      <div style="background:#f8fafc;padding:32px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0">
        <p style="color:#374151">Hi <strong>${d.guestName}</strong>,</p>
        <p style="color:#374151">Your reservation is confirmed.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:8px 0;color:#6b7280;font-size:14px">Booking Ref</td><td style="padding:8px 0;font-weight:700;color:#111827">SR-${d.bookingRef}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280;font-size:14px">Hotel</td><td style="padding:8px 0;color:#111827">${d.hotelName}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280;font-size:14px">Room</td><td style="padding:8px 0;color:#111827">${d.roomName}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280;font-size:14px">Check-in</td><td style="padding:8px 0;color:#111827">${d.checkIn}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280;font-size:14px">Check-out</td><td style="padding:8px 0;color:#111827">${d.checkOut}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280;font-size:14px">Nights</td><td style="padding:8px 0;color:#111827">${d.nights}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280;font-size:14px">Total</td><td style="padding:8px 0;font-weight:700;color:#059669;font-size:18px">$${d.totalPrice.toLocaleString()}</td></tr>
        </table>
        <p style="color:#6b7280;font-size:13px">Thank you for booking with us. See you soon!</p>
      </div>
    </div>
  `;
}

function partnerNotificationHtml(d: BookingEmailData): string {
  const partnerRevenue = Math.round(d.totalPrice * 0.90 * 100) / 100;
  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#003B95;padding:24px 32px;border-radius:12px 12px 0 0">
        <h1 style="color:white;margin:0;font-size:22px">New Booking at ${d.hotelName}</h1>
      </div>
      <div style="background:#f8fafc;padding:32px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0">
        <p style="color:#374151">Hi <strong>${d.partnerName ?? 'Partner'}</strong>,</p>
        <p style="color:#374151">A new booking has been confirmed for your hotel.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:8px 0;color:#6b7280;font-size:14px">Booking Ref</td><td style="padding:8px 0;font-weight:700;color:#111827">SR-${d.bookingRef}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280;font-size:14px">Guest</td><td style="padding:8px 0;color:#111827">${d.guestName}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280;font-size:14px">Room</td><td style="padding:8px 0;color:#111827">${d.roomName}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280;font-size:14px">Check-in</td><td style="padding:8px 0;color:#111827">${d.checkIn}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280;font-size:14px">Check-out</td><td style="padding:8px 0;color:#111827">${d.checkOut}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280;font-size:14px">Total Booking</td><td style="padding:8px 0;color:#111827">$${d.totalPrice.toLocaleString()}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280;font-size:14px">Your Share (90%)</td><td style="padding:8px 0;font-weight:700;color:#059669;font-size:18px">$${partnerRevenue.toLocaleString()}</td></tr>
        </table>
      </div>
    </div>
  `;
}

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!ENABLED) {
    console.log(`[EmailService] NOTIFICATIONS_ENABLED=false — skipping email to ${to}: ${subject}`);
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('[EmailService] RESEND_API_KEY not set — skipping email');
    return;
  }

  // Dynamic import — package installed at launch with: npm install resend
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Resend } = require('resend') as { Resend: new (key: string) => { emails: { send: (opts: Record<string, unknown>) => Promise<{ error: unknown }> } } };
  const resend = new Resend(apiKey);

  const { error } = await resend.emails.send({ from: FROM_EMAIL, to, subject, html });
  if (error) {
    console.error('[EmailService] Send failed:', error);
  }
}

export async function sendBookingConfirmation(data: BookingEmailData): Promise<void> {
  await Promise.allSettled([
    sendEmail(
      data.guestEmail,
      `Booking Confirmed — ${data.hotelName} (SR-${data.bookingRef})`,
      guestConfirmationHtml(data)
    ),
    data.partnerEmail
      ? sendEmail(
          data.partnerEmail,
          `New Booking at ${data.hotelName}`,
          partnerNotificationHtml(data)
        )
      : Promise.resolve(),
  ]);
}
