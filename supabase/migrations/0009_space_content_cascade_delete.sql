-- Roadmaps/mind maps/flashcard decks/documents only exist as content inside a space now
-- (the old standalone pages are gone) — deleting a space should delete them along with it,
-- not orphan them with a null space_id (which left broken, unopenable entries in Memory).

alter table roadmaps drop constraint roadmaps_space_id_fkey;
alter table roadmaps add constraint roadmaps_space_id_fkey
  foreign key (space_id) references spaces(id) on delete cascade;

alter table mind_maps drop constraint mind_maps_space_id_fkey;
alter table mind_maps add constraint mind_maps_space_id_fkey
  foreign key (space_id) references spaces(id) on delete cascade;

alter table flashcard_decks drop constraint flashcard_decks_space_id_fkey;
alter table flashcard_decks add constraint flashcard_decks_space_id_fkey
  foreign key (space_id) references spaces(id) on delete cascade;

alter table documents drop constraint documents_space_id_fkey;
alter table documents add constraint documents_space_id_fkey
  foreign key (space_id) references spaces(id) on delete cascade;

-- Clean up rows already orphaned by a space deletion that happened before this migration.
delete from roadmaps where space_id is null;
delete from mind_maps where space_id is null;
delete from flashcard_decks where space_id is null;
delete from documents where space_id is null;
