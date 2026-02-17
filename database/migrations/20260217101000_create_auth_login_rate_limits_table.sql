-- Migration: create auth login rate limits table
-- Created: 2026-02-17T10:10:00.000Z

-- ==================== UP ====================

CREATE TABLE IF NOT EXISTS public.auth_login_rate_limits (
  rate_key TEXT PRIMARY KEY,
  first_attempt_at TIMESTAMPTZ NOT NULL,
  failed_count INTEGER NOT NULL DEFAULT 0,
  blocked_until TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS auth_login_rate_limits_updated_at_idx
  ON public.auth_login_rate_limits (updated_at);

-- ==================== DOWN ====================

DROP TABLE IF EXISTS public.auth_login_rate_limits;
