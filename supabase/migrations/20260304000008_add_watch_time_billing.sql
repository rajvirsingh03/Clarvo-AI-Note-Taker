-- Add watch_time_seconds to sessions (actual video play time, excluding pauses)
ALTER TABLE public.sessions
  ADD COLUMN watch_time_seconds integer NOT NULL DEFAULT 0;

-- Add free_minutes_used to users (running total of free tier minutes consumed)
ALTER TABLE public.users
  ADD COLUMN free_minutes_used numeric(10,2) NOT NULL DEFAULT 0;

-- Update sessions state CHECK constraint to include PAUSED
ALTER TABLE public.sessions
  DROP CONSTRAINT IF EXISTS sessions_state_check;

ALTER TABLE public.sessions
  ADD CONSTRAINT sessions_state_check
    CHECK (state IN ('RECORDING', 'PAUSED', 'COMPLETED', 'POST_PROCESSING'));

-- Atomic increment function for free minutes (used when session completes)
CREATE OR REPLACE FUNCTION public.increment_free_minutes(
  p_user_id uuid,
  p_minutes numeric
) RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.users
  SET free_minutes_used = free_minutes_used + p_minutes,
      updated_at = now()
  WHERE id = p_user_id;
$$;
