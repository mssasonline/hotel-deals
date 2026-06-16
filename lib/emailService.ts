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

export interface PartnerWelcomeData {
  partnerName:  string;
  partnerEmail: string;
  tempPassword: string;
  hotelName?:   string;
  loginUrl:     string;
}

function partnerWelcomeHtml(d: PartnerWelcomeData): string {
  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#001E5A;padding:24px 32px;border-radius:12px 12px 0 0">
        <h1 style="color:white;margin:0;font-size:22px">Welcome to SelectedRoom Partner Portal</h1>
      </div>
      <div style="background:#f8fafc;padding:32px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0">
        <p style="color:#374151">Hi <strong>${d.partnerName}</strong>,</p>
        <p style="color:#374151">Your partner account has been created${d.hotelName ? ` for <strong>${d.hotelName}</strong>` : ''}. You can now log in and complete your hotel profile.</p>
        <div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin:20px 0">
          <p style="margin:0 0 8px;color:#6b7280;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em">Your Login Details</p>
          <table style="width:100%;border-collapse:collapse">
            <tr><td style="padding:6px 0;color:#6b7280;font-size:14px;width:120px">Email</td><td style="padding:6px 0;font-weight:600;color:#111827">${d.partnerEmail}</td></tr>
            <tr><td style="padding:6px 0;color:#6b7280;font-size:14px">Password</td><td style="padding:6px 0;font-family:monospace;font-size:16px;font-weight:700;color:#001E5A;background:#f0f4ff;padding:4px 8px;border-radius:4px">${d.tempPassword}</td></tr>
          </table>
        </div>
        <a href="${d.loginUrl}" style="display:inline-block;background:#001E5A;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;margin:8px 0">Log In to Partner Portal →</a>
        <p style="color:#9ca3af;font-size:12px;margin-top:24px">Please change your password after your first login. If you have any questions, reply to this email.</p>
      </div>
    </div>
  `;
}

export async function sendPartnerWelcome(data: PartnerWelcomeData): Promise<void> {
  await sendEmail(
    data.partnerEmail,
    'Your SelectedRoom Partner Account is Ready',
    partnerWelcomeHtml(data),
  );
}

export interface ReviewRequestData {
  guestName:  string;
  guestEmail: string;
  hotelName:  string;
  checkOut:   string;
  reviewUrl:  string;
}

function reviewRequestHtml(d: ReviewRequestData): string {
  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#003B95;padding:24px 32px;border-radius:12px 12px 0 0">
        <h1 style="color:white;margin:0;font-size:22px">How was your stay?</h1>
      </div>
      <div style="background:#f8fafc;padding:32px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0">
        <p style="color:#374151">Hi <strong>${d.guestName}</strong>,</p>
        <p style="color:#374151">We hope you enjoyed your recent stay at <strong>${d.hotelName}</strong> (checked out ${d.checkOut}).</p>
        <p style="color:#374151">Your feedback helps other travellers make the right choice. It only takes a minute!</p>
        <div style="text-align:center;margin:28px 0">
          <a href="${d.reviewUrl}" style="display:inline-block;background:#F59E0B;color:white;padding:14px 36px;border-radius:10px;text-decoration:none;font-weight:700;font-size:16px">
            ★ Write a Review
          </a>
        </div>
        <p style="color:#9ca3af;font-size:12px;margin-top:24px">
          If the button doesn't work, copy this link into your browser:<br/>
          <a href="${d.reviewUrl}" style="color:#003B95">${d.reviewUrl}</a>
        </p>
      </div>
    </div>
  `;
}

export async function sendReviewRequestEmail(data: ReviewRequestData): Promise<void> {
  await sendEmail(
    data.guestEmail,
    `How was your stay at ${data.hotelName}? Leave a review`,
    reviewRequestHtml(data),
  );
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
