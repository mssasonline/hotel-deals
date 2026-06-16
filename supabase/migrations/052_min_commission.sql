-- ============================================================
-- Migration 052: Minimum Commission
-- Date: 2026-06-15
--
-- 1. Adds min_commission key to platform_settings (default 5.00)
-- 2. Fixes handle_booking_confirmed to:
--    a. Read commission_rate dynamically (was hardcoded 10/90 in 047)
--    b. Apply MAX(calculated_admin, min_commission) so the platform
--       always earns at least min_commission per booking
--    c. Cap admin_amount at subtotal so partner_amount never goes negative
-- ============================================================

-- ── 1. Seed min_commission ────────────────────────────────────────────────────

INSERT INTO platform_settings (key, value)
VALUES ('min_commission', '5.00')
ON CONFLICT (key) DO NOTHING;

-- ── 2. Replace trigger ────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION handle_booking_confirmed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_subtotal       NUMERIC(12,2);
  v_admin_rate     NUMERIC(5,2);
  v_partner_rate   NUMERIC(5,2);
  v_min_commission NUMERIC(12,2);
  v_admin_amount   NUMERIC(12,2);
  v_partner_amount NUMERIC(12,2);
BEGIN
  IF NEW.payment_status = 'paid'
     AND (TG_OP = 'INSERT' OR OLD.payment_status IS DISTINCT FROM 'paid')
  THEN

    -- a) Decrement room availability
    IF NEW.room_id IS NOT NULL THEN
      UPDATE rooms
         SET quantity_available = GREATEST(0, quantity_available - COALESCE(NEW.room_count, 1))
       WHERE id = NEW.room_id;
    END IF;

    -- b) Read dynamic settings (fallback to defaults if rows missing)
    SELECT COALESCE(value::NUMERIC, 10)
      INTO v_admin_rate
      FROM platform_settings
     WHERE key = 'commission_rate';
    v_admin_rate   := COALESCE(v_admin_rate, 10);
    v_partner_rate := 100 - v_admin_rate;

    SELECT COALESCE(value::NUMERIC, 5)
      INTO v_min_commission
      FROM platform_settings
     WHERE key = 'min_commission';
    v_min_commission := COALESCE(v_min_commission, 5);

    -- c) Determine subtotal (prefer stored value, fall back to total / 1.15)
    v_subtotal := COALESCE(NEW.subtotal, ROUND(NEW.total_price / 1.15, 2));

    -- d) Apply min_commission: platform earns at least min_commission
    v_admin_amount   := GREATEST(
                          ROUND(v_subtotal * v_admin_rate / 100, 2),
                          v_min_commission
                        );
    -- Cap: admin_amount cannot exceed subtotal (partner can't go negative)
    v_admin_amount   := LEAST(v_admin_amount, v_subtotal);
    v_partner_amount := v_subtotal - v_admin_amount;

    -- e) Record revenue split (upsert — idempotent on re-payment)
    INSERT INTO booking_revenue (
      booking_id,
      total_amount,
      subtotal_amount,
      tax_amount,
      partner_rate,
      admin_rate,
      partner_amount,
      admin_amount
    )
    VALUES (
      NEW.id,
      NEW.total_price,
      v_subtotal,
      NEW.total_price - v_subtotal,
      v_partner_rate,
      v_admin_rate,
      v_partner_amount,
      v_admin_amount
    )
    ON CONFLICT (booking_id) DO UPDATE
      SET subtotal_amount = EXCLUDED.subtotal_amount,
          tax_amount      = EXCLUDED.tax_amount,
          partner_rate    = EXCLUDED.partner_rate,
          admin_rate      = EXCLUDED.admin_rate,
          partner_amount  = EXCLUDED.partner_amount,
          admin_amount    = EXCLUDED.admin_amount;

  END IF;

  RETURN NEW;
END;
$$;
