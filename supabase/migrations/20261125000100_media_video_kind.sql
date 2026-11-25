-- A video walkthrough is its own kind of media, next to tours, photos and scans.
-- Kept alone in its file: a new enum value can't be used in the transaction
-- that adds it.
alter type public.media_kind add value if not exists 'video';
