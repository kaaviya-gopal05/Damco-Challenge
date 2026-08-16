-- Lets an assistant chat message carry a reference to whatever it generated (a roadmap,
-- mind map, or flashcard deck), so the chat can render an inline "Open" action that switches
-- the space's split-view panel to that artifact instead of the reply being plain text only.

alter table space_messages
  add column metadata jsonb not null default '{}'::jsonb;
