-- ============================================================
-- Migration 019: Fix notifications INSERT policy
-- Date: 2026-06-04
--
-- The previous policy only allowed admins to insert notifications.
-- Users need to be able to create notifications for themselves
-- (e.g., booking confirmations).
-- ============================================================

DROP POLICY IF EXISTS "notifications_insert_admin" ON notifications;

CREATE POLICY "notifications_insert_own"
  ON notifications FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
