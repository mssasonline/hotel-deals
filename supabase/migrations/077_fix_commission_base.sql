-- ============================================================
-- Migration 077: Fix commission calculation base
-- Date: 2026-06-27
--
-- Commission was incorrectly calculated as 10% of total_price (Gross).
-- Correct formula (industry standard):
--   commission_base = room_subtotal + service_charge (10%) + breakfast_total
--   admin_amount    = commission_base × 10%
--   partner_amount  = total_price − admin_amount
-- ============================================================

CREATE OR REPLACE FUNCTION handle_booking_confirmed()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_nights          INTEGER;
  v_service_charge  NUMERIC(12,2);
  v_breakfast       NUMERIC(12,2);
  v_commission_base NUMERIC(12,2);
  v_admin_amount    NUMERIC(12,2);
  v_partner_amount  NUMERIC(12,2);
BEGIN
  IF NEW.payment_status = 'paid' AND (TG_OP = 'INSERT' OR OLD.payment_status IS DISTINCT FROM 'paid') THEN

    -- a) Decrement room availability (floor at 0)
    IF NEW.room_id IS NOT NULL THEN
      UPDATE rooms
         SET quantity_available = GREATEST(0, quantity_available - COALESCE(NEW.room_count, 1))
       WHERE id = NEW.room_id;
    END IF;

    -- b) Compute commission base
    --    nights: difference in days between check_out and check_in (min 1)
    v_nights         := GREATEST(1, (NEW.check_out::date - NEW.check_in::date));

    --    service charge: 10% of room subtotal (UAE standard)
    v_service_charge := ROUND(COALESCE(NEW.subtotal, 0) * 0.10, 2);

    --    breakfast: price_per_person × guests × nights (0 if not included)
    v_breakfast      := CASE
                          WHEN NEW.breakfast_included = true
                           AND COALESCE(NEW.breakfast_price_per_person, 0) > 0
                          THEN ROUND(
                                 NEW.breakfast_price_per_person
                                 * COALESCE(NEW.guests_count, 1)
                                 * v_nights,
                               2)
                          ELSE 0
                        END;

    --    commission base = room subtotal + SC + breakfast
    v_commission_base := COALESCE(NEW.subtotal, 0) + v_service_charge + v_breakfast;

    --    platform takes 10% of commission base
    v_admin_amount   := ROUND(v_commission_base * 0.10, 2);

    --    partner receives the rest of gross
    v_partner_amount := ROUND(COALESCE(NEW.total_price, 0) - v_admin_amount, 2);

    -- c) Record revenue split (idempotent via ON CONFLICT DO NOTHING)
    INSERT INTO booking_revenue (
      booking_id,
      total_amount,
      partner_rate,
      admin_rate,
      partner_amount,
      admin_amount
    )
    VALUES (
      NEW.id,
      NEW.total_price,
      90.00,
      10.00,
      v_partner_amount,
      v_admin_amount
    )
    ON CONFLICT (booking_id) DO NOTHING;

  END IF;

  RETURN NEW;
END;
$$;
