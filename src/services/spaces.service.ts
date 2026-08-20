import { supabase } from '@/lib/supabase';
import { getAiService } from '@/services/ai.service';
import { generateAndCreateRoadmap } from '@/services/roadmaps.service';
import { createMindMapFromAiTopic } from '@/services/mindmaps.service';
import { createDeckWithGeneratedCards } from '@/services/flashcards.service';
import { createTaskWithDate, generateAndCreateTasks } from '@/services/tasks.service';
import { askCareerQuestion } from '@/services/career.service';
import type {
  CareerProfile,
  Difficulty,
  Document,
  FlashcardDeck,
  MindMap,
  PendingDateTask,
  Roadmap,
  Space,
  SpaceContents,
  SpaceMessage,
  SpaceMessageMetadata,
} from '@/types/database';

export async function listSpaces(userId: string): Promise<Space[]> {
  const { data, error } = await supabase
    .from('spaces')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Space[];
}

export async function getSpace(spaceId: string): Promise<Space> {
  const { data, error } = await supabase.from('spaces').select('*').eq('id', spaceId).single();
  if (error) throw error;
  return data as Space;
}

export interface CreateSpaceInput {
  title: string;
  goalText?: string;
  deadline?: string;
  hoursPerDay?: number;
  level?: Difficulty;
}

export async function createSpace(userId: string, input: CreateSpaceInput): Promise<Space> {
  const { data, error } = await supabase
    .from('spaces')
    .insert({
      user_id: userId,
      title: input.title,
      goal_text: input.goalText ?? null,
      deadline: input.deadline ?? null,
      hours_per_day: input.hoursPerDay ?? null,
      level: input.level ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Space;
}

export async function deleteSpace(spaceId: string): Promise<void> {
  // career_profiles.space_id is "on delete set null" at the database level (nullable so a
  // profile *could* survive its space, same as roadmaps/mind maps/decks/documents) — but a career
  // profile only ever exists because a space's chat flow generated it, so leaving it behind would
  // strand its role on the Career Intelligence page with no way back to where it came from.
  // Deleted explicitly here rather than loosening the FK, since every other space-linked table
  // deliberately keeps the "survive its space" behavior.
  const { error: careerError } = await supabase.from('career_profiles').delete().eq('space_id', spaceId);
  if (careerError) throw careerError;
  const { error } = await supabase.from('spaces').delete().eq('id', spaceId);
  if (error) throw error;
}

/** Renames a space once its real subject becomes known after creation — e.g. a career space is
 *  created with a placeholder title ("Career Intelligence") before the target role is asked for
 *  in chat, and gets renamed to that role here so it reads correctly everywhere space titles show
 *  up (sidebar, spaces list, search) instead of every career space looking identical. */
export async function updateSpaceTitle(spaceId: string, title: string): Promise<void> {
  const { error } = await supabase.from('spaces').update({ title }).eq('id', spaceId);
  if (error) throw error;
}

export async function touchSpace(spaceId: string): Promise<void> {
  await supabase.from('spaces').update({ updated_at: new Date().toISOString() }).eq('id', spaceId);
}

export async function getSpaceContents(spaceId: string): Promise<SpaceContents> {
  const [roadmaps, mindMaps, flashcardDecks, documents, careerProfiles] = await Promise.all([
    supabase.from('roadmaps').select('*').eq('space_id', spaceId).order('created_at', { ascending: false }),
    supabase.from('mind_maps').select('*').eq('space_id', spaceId).order('created_at', { ascending: false }),
    supabase.from('flashcard_decks').select('*').eq('space_id', spaceId).order('created_at', { ascending: false }),
    supabase.from('documents').select('*').eq('space_id', spaceId).order('created_at', { ascending: false }),
    supabase.from('career_profiles').select('*').eq('space_id', spaceId).order('created_at', { ascending: false }).limit(1),
  ]);
  if (roadmaps.error) throw roadmaps.error;
  if (mindMaps.error) throw mindMaps.error;
  if (flashcardDecks.error) throw flashcardDecks.error;
  if (documents.error) throw documents.error;
  if (careerProfiles.error) throw careerProfiles.error;

  return {
    roadmaps: (roadmaps.data ?? []) as Roadmap[],
    mindMaps: (mindMaps.data ?? []) as MindMap[],
    flashcardDecks: (flashcardDecks.data ?? []) as FlashcardDeck[],
    documents: (documents.data ?? []) as Document[],
    careerProfile: ((careerProfiles.data ?? [])[0] as CareerProfile | undefined) ?? null,
  };
}

export async function listMessages(spaceId: string): Promise<SpaceMessage[]> {
  const { data, error } = await supabase
    .from('space_messages')
    .select('*')
    .eq('space_id', spaceId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as SpaceMessage[];
}

export async function addMessage(
  spaceId: string,
  role: 'user' | 'assistant',
  content: string,
  metadata: SpaceMessageMetadata = {}
): Promise<SpaceMessage> {
  const { data, error } = await supabase
    .from('space_messages')
    .insert({ space_id: spaceId, role, content, metadata })
    .select()
    .single();
  if (error) throw error;
  await touchSpace(spaceId);
  return data as SpaceMessage;
}

/** Phrases the next "what date is this for?" question, or wraps up with the usual summary once
 *  every important undated task from this brain-dump has been asked about. */
function taskDateQuestionReply(
  createdSoFar: number,
  next: PendingDateTask,
  remaining: PendingDateTask[]
): { content: string; metadata: SpaceMessageMetadata } {
  const soFar = createdSoFar > 0 ? `I've organized ${createdSoFar} task${createdSoFar === 1 ? '' : 's'} so far. ` : '';
  return {
    content: `${soFar}What date is "${next.title}" for? Reply with a date like 2026-12-01, or say "no date" to leave it flexible.`,
    metadata: { awaitingTaskDate: { title: next.title, priority: next.priority, remaining, createdSoFar } },
  };
}

function todoSummaryReply(space: Space, createdCount: number): { content: string; metadata: SpaceMessageMetadata } {
  if (createdCount === 0) {
    return { content: "I couldn't find any distinct tasks in that — try describing them one at a time.", metadata: {} };
  }
  return {
    content: `Organized ${createdCount} task${createdCount === 1 ? '' : 's'} for you, sorted by priority. Click Open below to view them.`,
    metadata: { artifactType: 'todo', artifactId: space.id, artifactTitle: 'To-do List' },
  };
}

/**
 * Figures out what a chat message is asking for and, when it's clearly a request to generate
 * a roadmap/mind map/flashcards/to-do list, does the generation right here rather than just
 * replying with text — the reply then carries metadata pointing at what was created so the chat
 * can render an "Open" action. A task brain-dump ("todo") needs no clarifying questions for
 * tasks that already have (or don't need) a date — those are prioritized and saved immediately.
 * The one exception is an important, undated task (e.g. "prepare for interview") — see
 * generateAndCreateTasks — which holds off creation and asks what date it's for instead; the
 * `awaiting` check right below picks up the reply to that question on the learner's next
 * message. A "career_question" (e.g. "Am I suitable for this JD?" with a pasted job
 * description) is answered with a RAG-grounded reply over this space's resume, when it has one —
 * see askCareerQuestion. Anything ambiguous (questions, greetings, unclear requests, or a career
 * question in a space with no resume on file) falls back to a plain conversational reply.
 */
async function replyToMessage(
  userId: string,
  space: Space,
  content: string
): Promise<{ content: string; metadata: SpaceMessageMetadata }> {
  const history = await listMessages(space.id);
  const lastAssistant = [...history].reverse().find((m) => m.role === 'assistant');
  const awaiting = lastAssistant?.metadata.awaitingTaskDate;
  if (awaiting) {
    const created = await createTaskWithDate(userId, space.id, awaiting, content);
    const createdSoFar = awaiting.createdSoFar + (created ? 1 : 0);
    const [next, ...rest] = awaiting.remaining;
    return next ? taskDateQuestionReply(createdSoFar, next, rest) : todoSummaryReply(space, createdSoFar);
  }

  const ai = getAiService();
  const intent = await ai.interpretChatIntent(content);
  const topic = intent.topic.trim() || content;

  try {
    if (intent.action === 'roadmap') {
      const roadmap = await generateAndCreateRoadmap({
        userId,
        goal: topic,
        spaceId: space.id,
        level: space.level ?? undefined,
        deadline: space.deadline ?? undefined,
        hoursPerDay: space.hours_per_day ?? undefined,
      });
      return {
        content: `I've generated a roadmap: "${roadmap.title}". Click Open below to view it.`,
        metadata: { artifactType: 'roadmap', artifactId: roadmap.id, artifactTitle: roadmap.title },
      };
    }
    if (intent.action === 'mindmap') {
      const { mindMap } = await createMindMapFromAiTopic(userId, topic, space.id);
      return {
        content: `I've generated a mind map: "${mindMap.title}". Click Open below to view it.`,
        metadata: { artifactType: 'mindmap', artifactId: mindMap.id, artifactTitle: mindMap.title },
      };
    }
    if (intent.action === 'flashcards') {
      const deck = await createDeckWithGeneratedCards(userId, topic, 10, space.id);
      return {
        content: `I've generated a flashcard deck: "${deck.title}". Click Open below to view it.`,
        metadata: { artifactType: 'flashcards', artifactId: deck.id, artifactTitle: deck.title },
      };
    }
    if (intent.action === 'todo') {
      const { createdTasks, pendingDateTasks } = await generateAndCreateTasks({ userId, spaceId: space.id, brainDump: content });
      const [next, ...rest] = pendingDateTasks;
      return next ? taskDateQuestionReply(createdTasks.length, next, rest) : todoSummaryReply(space, createdTasks.length);
    }
    if (intent.action === 'career_question') {
      const { data: profile } = await supabase
        .from('career_profiles')
        .select('resume_document_id')
        .eq('space_id', space.id)
        .not('resume_document_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (profile?.resume_document_id) {
        const answer = await askCareerQuestion(content, profile.resume_document_id);
        return { content: answer, metadata: {} };
      }
      // No resume on file for this space — fall through to a plain conversational reply below
      // rather than erroring, since the classifier can't see space context when it decides this.
    }
  } catch {
    return { content: "I couldn't generate that just now — please try again.", metadata: {} };
  }

  const reply = await ai.chatReply(
    space.title,
    history.slice(-20).map((m) => ({ role: m.role, content: m.content }))
  );
  return { content: reply, metadata: {} };
}

export async function sendChatMessage(
  userId: string,
  space: Space,
  content: string
): Promise<{ userMessage: SpaceMessage; assistantMessage: SpaceMessage }> {
  const userMessage = await addMessage(space.id, 'user', content);
  const { content: replyContent, metadata } = await replyToMessage(userId, space, content);
  const assistantMessage = await addMessage(space.id, 'assistant', replyContent, metadata);
  return { userMessage, assistantMessage };
}


/**
 * Spaces unify what used to be separate top-level Goals/Roadmaps/Mind Maps/Flashcards/Documents
 * pages. For a user who already has content from before Spaces existed (space_id is null),
 * this lazily migrates it, run once the first time their space list loads with zero spaces
 * but pre-existing content:
 *  - each existing learning_goals row becomes its own space (a goal always was a space's
 *    intent), and any roadmap already generated from that goal moves into it
 *  - anything left with no space_id (not tied to a goal) is grouped into one "My Learning"
 *    fallback space so nothing is orphaned
 */
export async function migrateOrphanedContentIntoDefaultSpace(userId: string): Promise<boolean> {
  const { data: goals, error: goalsError } = await supabase
    .from('learning_goals')
    .select('id, title, description, target_date')
    .eq('user_id', userId);
  if (goalsError) throw goalsError;

  let didMigrate = false;

  for (const goal of goals ?? []) {
    const space = await createSpace(userId, {
      title: goal.title,
      goalText: goal.description ?? undefined,
      deadline: goal.target_date ?? undefined,
    });
    await supabase.from('roadmaps').update({ space_id: space.id }).eq('goal_id', goal.id).is('space_id', null);
    didMigrate = true;
  }

  const [{ count: roadmapCount }, { count: mindMapCount }, { count: deckCount }, { count: docCount }] = await Promise.all([
    supabase.from('roadmaps').select('id', { count: 'exact', head: true }).eq('user_id', userId).is('space_id', null),
    supabase.from('mind_maps').select('id', { count: 'exact', head: true }).eq('user_id', userId).is('space_id', null),
    supabase.from('flashcard_decks').select('id', { count: 'exact', head: true }).eq('user_id', userId).is('space_id', null),
    // Resumes always have space_id null by design (see career.service.ts's createResumeDocument)
    // — they're not orphaned content, they were just never meant to belong to a space.
    supabase.from('documents').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('is_resume', false).is('space_id', null),
  ]);

  const hasOrphans = (roadmapCount ?? 0) > 0 || (mindMapCount ?? 0) > 0 || (deckCount ?? 0) > 0 || (docCount ?? 0) > 0;
  if (hasOrphans) {
    const fallbackSpace = await createSpace(userId, { title: 'My Learning' });
    await Promise.all([
      supabase.from('roadmaps').update({ space_id: fallbackSpace.id }).eq('user_id', userId).is('space_id', null),
      supabase.from('mind_maps').update({ space_id: fallbackSpace.id }).eq('user_id', userId).is('space_id', null),
      supabase.from('flashcard_decks').update({ space_id: fallbackSpace.id }).eq('user_id', userId).is('space_id', null),
      supabase.from('documents').update({ space_id: fallbackSpace.id }).eq('user_id', userId).eq('is_resume', false).is('space_id', null),
    ]);
    didMigrate = true;
  }

  return didMigrate;
}
