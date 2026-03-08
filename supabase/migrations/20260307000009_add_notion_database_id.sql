-- Migration: add notion_database_id to users
-- Stores the ID of the user's "Clarvo AI Workspace" Notion database.
-- Created once on first export; reused for all subsequent exports.

alter table public.users
  add column if not exists notion_database_id text;
