-- Migration: add video_url and video_title to sessions
-- These fields exist in the TypeScript types but were missing from the original migration.
-- The extension captures the YouTube/video URL and title at session start.

alter table public.sessions
  add column if not exists video_url   text,
  add column if not exists video_title text;
