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
  /** Total in the guest's selected currency (for display). */
  displayTotal:   number;
  currencySymbol: string;
  bookingRef: string;
  partnerEmail?: string;
  partnerName?:  string;
  hotelPhone?:        string;
  hotelEmail?:        string;
  hotelWhatsapp?:     string;
  hotelCheckinTime?:  string;
  hotelCheckoutTime?: string;
}

const ENABLED = process.env.NOTIFICATIONS_ENABLED === 'true';
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? 'noreply@hotel-deals.com';

function formatEmailTime(t: string): string {
  const [h, m] = t.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour}:${String(m).padStart(2, '0')} ${period}`;
}

const LOGO_HTML = `
  <div style="margin-bottom:14px">
    <span style="font-family:Arial,Helvetica,sans-serif;font-weight:900;font-size:22px;letter-spacing:0.1em;text-transform:uppercase;color:#ffffff">SELECTED</span><span style="font-family:Arial,Helvetica,sans-serif;font-weight:900;font-size:22px;letter-spacing:0.1em;text-transform:uppercase;color:#F59E0B">ROOM</span><sup style="font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;color:#93C5FD;letter-spacing:0">.com</sup>
  </div>
`;

const FOOTER_HTML = `
  <div style="text-align:center;padding:24px 32px;border-top:1px solid #e2e8f0;margin-top:8px">
    <p style="margin:0 0 6px">
      <span style="font-family:Arial,Helvetica,sans-serif;font-weight:900;font-size:14px;letter-spacing:0.1em;text-transform:uppercase;color:#1E3A8A">SELECTED</span><span style="font-family:Arial,Helvetica,sans-serif;font-weight:900;font-size:14px;letter-spacing:0.1em;text-transform:uppercase;color:#D97706">ROOM</span><sup style="font-family:Arial,Helvetica,sans-serif;font-size:9px;font-weight:700;color:#6b7280">.com</sup>
    </p>
    <p style="margin:0;color:#9ca3af;font-size:11px">Your last-minute hotel deals platform</p>
  </div>
`;

function guestConfirmationHtml(d: BookingEmailData): string {
  const hasContact = d.hotelPhone || d.hotelEmail || d.hotelWhatsapp;
  const hasTimes   = d.hotelCheckinTime || d.hotelCheckoutTime;

  const contactBlock = (hasContact || hasTimes) ? `
    <div style="background:#eef2ff;border:1px solid #c7d2fe;border-radius:10px;padding:20px;margin:20px 0">
      <p style="margin:0 0 12px;color:#3730a3;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em">Hotel Contact</p>
      ${d.hotelPhone    ? `<p style="margin:0 0 8px;color:#374151;font-size:14px">📞 <a href="tel:${d.hotelPhone}" style="color:#1d4ed8;text-decoration:none">${d.hotelPhone}</a></p>` : ''}
      ${d.hotelEmail    ? `<p style="margin:0 0 8px;color:#374151;font-size:14px">✉️ <a href="mailto:${d.hotelEmail}" style="color:#1d4ed8;text-decoration:none">${d.hotelEmail}</a></p>` : ''}
      ${d.hotelWhatsapp ? `<p style="margin:0 0 8px;color:#374151;font-size:14px">💬 <a href="https://wa.me/${d.hotelWhatsapp.replace(/[^0-9]/g, '')}" style="color:#059669;text-decoration:none">WhatsApp: ${d.hotelWhatsapp}</a></p>` : ''}
      ${hasTimes        ? `<p style="margin:${hasContact ? '12px' : '0'} 0 0;color:#374151;font-size:14px">🕐 Check-in from <strong>${d.hotelCheckinTime ? formatEmailTime(d.hotelCheckinTime) : '—'}</strong> &nbsp;|&nbsp; Check-out by <strong>${d.hotelCheckoutTime ? formatEmailTime(d.hotelCheckoutTime) : '—'}</strong></p>` : ''}
    </div>
  ` : '';

  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#1E3A8A;padding:24px 32px;border-radius:12px 12px 0 0">
        ${LOGO_HTML}
        <h1 style="color:white;margin:0;font-size:20px;font-weight:600;opacity:0.9">Booking Confirmed ✓</h1>
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
          <tr><td style="padding:8px 0;color:#6b7280;font-size:14px">Total</td><td style="padding:8px 0;font-weight:700;color:#059669;font-size:18px">${d.currencySymbol} ${d.displayTotal.toLocaleString()}</td></tr>
        </table>
        ${contactBlock}
        <p style="color:#6b7280;font-size:13px">Thank you for booking with us. See you soon!</p>
        ${FOOTER_HTML}
      </div>
    </div>
  `;
}

function partnerNotificationHtml(d: BookingEmailData): string {
  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#1E3A8A;padding:24px 32px;border-radius:12px 12px 0 0">
        ${LOGO_HTML}
        <h1 style="color:white;margin:0;font-size:20px;font-weight:600;opacity:0.9">New Booking at ${d.hotelName}</h1>
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
          <tr><td style="padding:8px 0;color:#6b7280;font-size:14px">Total Booking</td><td style="padding:8px 0;color:#111827">${d.currencySymbol} ${d.displayTotal.toLocaleString()}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280;font-size:14px">Your Share (90%)</td><td style="padding:8px 0;font-weight:700;color:#059669;font-size:18px">${d.currencySymbol} ${Math.round(d.displayTotal * 0.90).toLocaleString()}</td></tr>
        </table>
        ${FOOTER_HTML}
      </div>
    </div>
  `;
}

async function sendEmail(to: string, subject: string, html: string, replyTo?: string): Promise<void> {
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

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject,
    html,
    ...(replyTo ? { reply_to: replyTo } : {}),
  });
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
      <div style="background:#1E3A8A;padding:24px 32px;border-radius:12px 12px 0 0">
        ${LOGO_HTML}
        <h1 style="color:white;margin:0;font-size:20px;font-weight:600;opacity:0.9">Welcome to the Partner Portal</h1>
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
        ${FOOTER_HTML}
      </div>
    </div>
  `;
}

export async function sendPartnerWelcome(data: PartnerWelcomeData): Promise<void> {
  await sendEmail(
    data.partnerEmail,
    'Your SelectedRoom Partner Account is Ready',
    partnerWelcomeHtml(data),
    'partners@selectedroom.com',
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
      <div style="background:#1E3A8A;padding:24px 32px;border-radius:12px 12px 0 0">
        ${LOGO_HTML}
        <h1 style="color:white;margin:0;font-size:20px;font-weight:600;opacity:0.9">How was your stay?</h1>
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
          <a href="${d.reviewUrl}" style="color:#1E3A8A">${d.reviewUrl}</a>
        </p>
        ${FOOTER_HTML}
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

// ── Partner Deal Confirmation (pending → active) ───────────────────────────────

export interface DealApprovalData {
  partnerEmail:  string;
  partnerName:   string;
  hotelName:     string;
  hotelId:       number;
  roomName:      string;
  dealPrice:     number;
  basePrice:     number;
  discountPct:   number;
  startDate:     string;
  endDate:       string;
  approvalUrl:   string;
}

function dealApprovalHtml(d: DealApprovalData): string {
  const saving = Math.round(d.basePrice - d.dealPrice);
  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#1E3A8A;padding:24px 32px;border-radius:12px 12px 0 0">
        ${LOGO_HTML}
        <h1 style="color:white;margin:0;font-size:20px;font-weight:600;opacity:0.9">Review Your New Deal</h1>
      </div>
      <div style="background:#f8fafc;padding:32px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0">
        <p style="color:#374151">Hi <strong>${d.partnerName}</strong>,</p>
        <p style="color:#374151">You've created a new deal for <strong>${d.hotelName}</strong>. Please review the details below and confirm to publish it live on the site.</p>

        <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;margin:20px 0">
          <div style="background:linear-gradient(135deg,#1E3A8A,#2563EB);padding:18px 24px">
            <p style="margin:0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:rgba(255,255,255,0.6)">Deal Summary</p>
            <h2 style="margin:6px 0 4px;color:#fff;font-size:19px;font-weight:800">${d.hotelName}</h2>
            <p style="margin:0;color:rgba(255,255,255,0.7);font-size:13px">${d.roomName}</p>
          </div>
          <div style="padding:20px 24px">
            <table style="width:100%;border-collapse:collapse">
              <tr><td style="padding:7px 0;color:#6b7280;font-size:13px">Original price</td><td style="padding:7px 0;text-align:right;color:#ef4444;font-size:14px;text-decoration:line-through">AED ${d.basePrice.toLocaleString()}/night</td></tr>
              <tr><td style="padding:7px 0;color:#6b7280;font-size:13px">Deal price</td><td style="padding:7px 0;text-align:right;font-weight:800;color:#059669;font-size:20px">AED ${d.dealPrice.toLocaleString()}/night</td></tr>
              <tr><td style="padding:7px 0;color:#6b7280;font-size:13px">Guest saving</td><td style="padding:7px 0;text-align:right;font-weight:700;color:#D97706;font-size:14px">AED ${saving.toLocaleString()} (${d.discountPct}% off)</td></tr>
              <tr><td style="padding:7px 0;color:#6b7280;font-size:13px">Available from</td><td style="padding:7px 0;text-align:right;font-weight:600;color:#374151;font-size:14px">${d.startDate}</td></tr>
              <tr><td style="padding:7px 0;color:#6b7280;font-size:13px">Available until</td><td style="padding:7px 0;text-align:right;font-weight:600;color:#374151;font-size:14px">${d.endDate}</td></tr>
            </table>
          </div>
        </div>

        <div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:10px;padding:14px 18px;margin:0 0 24px">
          <p style="margin:0;color:#92400e;font-size:13px">
            ⚠️ <strong>This deal is not live yet.</strong> Click the button below to confirm and publish it. Once confirmed, it will appear on the site and subscribers will be notified.
          </p>
        </div>

        <div style="text-align:center">
          <a href="${d.approvalUrl}" style="display:inline-block;background:linear-gradient(135deg,#065F46,#059669);color:white;padding:14px 36px;border-radius:10px;text-decoration:none;font-weight:700;font-size:16px;letter-spacing:0.02em">
            ✓ Confirm &amp; Publish Deal
          </a>
        </div>

        <p style="color:#9ca3af;font-size:11px;margin-top:24px;text-align:center">
          If you did not create this deal or want to cancel it, simply ignore this email. The deal will not go live.
        </p>
        ${FOOTER_HTML}
      </div>
    </div>
  `;
}

export async function sendDealApprovalEmail(data: DealApprovalData): Promise<void> {
  await sendEmail(
    data.partnerEmail,
    `Action Required: Confirm your deal at ${data.hotelName}`,
    dealApprovalHtml(data),
    'partners@selectedroom.com',
  );
}

// ── New Deal Notification ──────────────────────────────────────────────────────

export interface NewDealNotificationData {
  subscriberEmail: string;
  hotelName:       string;
  hotelId:         number;
  roomName:        string;
  dealPrice:       number;
  basePrice:       number;
  discountPct:     number;
  endDate:         string;
}

function newDealNotificationHtml(d: NewDealNotificationData): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://selectedroom.com';
  const hotelUrl = `${siteUrl}/hotel/${d.hotelId}`;
  const saving = Math.round(d.basePrice - d.dealPrice);

  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#1E3A8A;padding:24px 32px;border-radius:12px 12px 0 0">
        ${LOGO_HTML}
        <h1 style="color:white;margin:0;font-size:20px;font-weight:600;opacity:0.9">🔥 New Deal Just Dropped</h1>
      </div>
      <div style="background:#f8fafc;padding:32px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0">
        <p style="color:#374151">A partner hotel just published an exclusive deal — available for selected dates only.</p>
        <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;margin:20px 0">
          <div style="background:linear-gradient(135deg,#1E3A8A,#2563EB);padding:20px 24px">
            <p style="margin:0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:rgba(255,255,255,0.6)">Partner Exclusive</p>
            <h2 style="margin:6px 0 4px;color:#fff;font-size:20px;font-weight:800">${d.hotelName}</h2>
            <p style="margin:0;color:rgba(255,255,255,0.7);font-size:13px">${d.roomName}</p>
          </div>
          <div style="padding:20px 24px">
            <table style="width:100%;border-collapse:collapse">
              <tr>
                <td style="padding:6px 0;color:#6b7280;font-size:13px">Original price</td>
                <td style="padding:6px 0;text-align:right;color:#ef4444;font-size:14px;text-decoration:line-through">AED ${d.basePrice.toLocaleString()}/night</td>
              </tr>
              <tr>
                <td style="padding:6px 0;color:#6b7280;font-size:13px">Deal price</td>
                <td style="padding:6px 0;text-align:right;font-weight:800;color:#059669;font-size:20px">AED ${d.dealPrice.toLocaleString()}/night</td>
              </tr>
              <tr>
                <td style="padding:6px 0;color:#6b7280;font-size:13px">You save</td>
                <td style="padding:6px 0;text-align:right;font-weight:700;color:#D97706;font-size:14px">AED ${saving.toLocaleString()} (${d.discountPct}% off)</td>
              </tr>
              <tr>
                <td style="padding:6px 0;color:#6b7280;font-size:13px">Available until</td>
                <td style="padding:6px 0;text-align:right;font-weight:600;color:#374151;font-size:14px">${d.endDate}</td>
              </tr>
            </table>
            <div style="text-align:center;margin-top:20px">
              <a href="${hotelUrl}" style="display:inline-block;background:linear-gradient(135deg,#92400E,#D97706);color:white;padding:13px 32px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px">
                View Deal →
              </a>
            </div>
          </div>
        </div>
        <p style="color:#9ca3af;font-size:11px;margin-top:20px;text-align:center">
          You are receiving this because you subscribed to deal alerts at selectedroom.com.
        </p>
        ${FOOTER_HTML}
      </div>
    </div>
  `;
}

export async function sendNewDealNotification(deals: NewDealNotificationData[]): Promise<void> {
  await Promise.allSettled(
    deals.map((d) =>
      sendEmail(
        d.subscriberEmail,
        `🔥 New Deal: ${d.discountPct}% off at ${d.hotelName} — Book before ${d.endDate}`,
        newDealNotificationHtml(d),
      )
    )
  );
}

// ── Booking Confirmation ───────────────────────────────────────────────────────

// ── Low Inventory Alert ───────────────────────────────────────────────────────

export interface LowInventoryAlertData {
  partnerEmail: string;
  hotelName:    string;
  itemName:     string;       // room name or deal title
  itemType:     'room' | 'deal';
  remaining:    number;
  total:        number;
  loginUrl:     string;
}

function lowInventoryHtml(d: LowInventoryAlertData): string {
  const link = `${d.loginUrl}${d.itemType === 'deal' ? '/deals' : '/rooms'}`;
  const pct  = d.total > 0 ? Math.round((d.remaining / d.total) * 100) : 0;
  const urgencyColor = d.remaining <= 1 ? '#dc2626' : '#d97706';
  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#1E3A8A;padding:24px 32px;border-radius:12px 12px 0 0">
        ${LOGO_HTML}
        <h1 style="color:white;margin:0;font-size:20px;font-weight:600;opacity:0.9">Low Inventory Alert</h1>
      </div>
      <div style="background:#f8fafc;padding:32px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0">
        <div style="background:${urgencyColor}15;border:1px solid ${urgencyColor}40;border-radius:10px;padding:20px;margin-bottom:24px">
          <p style="margin:0 0 4px;color:${urgencyColor};font-weight:700;font-size:16px">
            ⚠️ Only ${d.remaining} of ${d.total} slot${d.remaining !== 1 ? 's' : ''} remaining (${pct}%)
          </p>
          <p style="margin:0;color:#374151;font-size:14px">
            <strong>${d.hotelName}</strong> — ${d.itemName}
            <span style="color:#6b7280;margin-left:8px">(${d.itemType === 'deal' ? 'Special Deal' : 'Last-Minute Room'})</span>
          </p>
        </div>
        <p style="color:#374151">Would you like to increase the available slots to capture more bookings tonight?</p>
        <a href="${link}" style="display:inline-block;background:#001E5A;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;margin:8px 0">
          Increase Availability →
        </a>
        ${FOOTER_HTML}
      </div>
    </div>
  `;
}

export async function sendLowInventoryAlert(data: LowInventoryAlertData): Promise<void> {
  await sendEmail(
    data.partnerEmail,
    `⚠️ Low Inventory — ${data.hotelName}: ${data.itemName} (${data.remaining} left)`,
    lowInventoryHtml(data),
    'partners@selectedroom.com',
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
          partnerNotificationHtml(data),
          'partners@selectedroom.com'
        )
      : Promise.resolve(),
  ]);
}
