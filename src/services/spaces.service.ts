import { supabase } from '@/lib/supabase';
import { getAiService } from '@/services/ai.service';
import { generateAndCreateRoadmap } from '@/services/roadmaps.service';
import { createMindMapFromAiTopic } from '@/services/mindmaps.service';
import { createDeckWithGeneratedCards } from '@/services/flashcards.service';
import type {
  CareerProfile,
  Difficulty,
  Document,
  FlashcardDeck,
  MindMap,
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
  const { error } = await supabase.from('spaces').delete().eq('id', spaceId);
  if (error) throw error;
}

type AttachableTable = 'roadmaps' | 'mind_maps' | 'flashcard_decks' | 'documents';

/**
 * Used by the "new space" chat/widget flow: the artifact (roadmap/mind map/deck/document) is
 * generated first with no space, then wrapped in a freshly created space here. Creating the
 * space only after generation succeeds means a cancelled or failed generation never leaves an
 * empty orphan space behind.
 */
export async function attachToNewSpace(
  userId: string,
  table: AttachableTable,
  recordId: string,
  title: string,
  goalText?: string
): Promise<Space> {
  const space = await createSpace(userId, { title, goalText });
  const { error } = await supabase.from(table).update({ space_id: space.id }).eq('id', recordId);
  if (error) throw error;
  return space;
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

/**
 * Figures out what a chat message is asking for and, when it's clearly a request to generate
 * a roadmap/mind map/flashcards, does the generation right here rather than just replying with
 * text — the reply then carries metadata pointing at what was created so the chat can render an
 * "Open" action. Anything ambiguous (questions, greetings, unclear requests) falls back to a
 * plain conversational reply.
 */
async function replyToMessage(
  userId: string,
  space: Space,
  content: string
): Promise<{ content: string; metadata: SpaceMessageMetadata }> {
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
  } catch {
    return { content: "I couldn't generate that just now — please try again.", metadata: {} };
  }

  const history = await listMessages(space.id);
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

export async function createSpaceFromMessage(
  userId: string,
  content: string
): Promise<{ space: Space; userMessage: SpaceMessage; assistantMessage: SpaceMessage }> {
  const title = content.length > 60 ? `${content.slice(0, 57)}...` : content;
  const space = await createSpace(userId, { title, goalText: content });
  const { userMessage, assistantMessage } = await sendChatMessage(userId, space, content);
  return { space, userMessage, assistantMessage };
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
    supabase.from('documents').select('id', { count: 'exact', head: true }).eq('user_id', userId).is('space_id', null),
  ]);

  const hasOrphans = (roadmapCount ?? 0) > 0 || (mindMapCount ?? 0) > 0 || (deckCount ?? 0) > 0 || (docCount ?? 0) > 0;
  if (hasOrphans) {
    const fallbackSpace = await createSpace(userId, { title: 'My Learning' });
    await Promise.all([
      supabase.from('roadmaps').update({ space_id: fallbackSpace.id }).eq('user_id', userId).is('space_id', null),
      supabase.from('mind_maps').update({ space_id: fallbackSpace.id }).eq('user_id', userId).is('space_id', null),
      supabase.from('flashcard_decks').update({ space_id: fallbackSpace.id }).eq('user_id', userId).is('space_id', null),
      supabase.from('documents').update({ space_id: fallbackSpace.id }).eq('user_id', userId).is('space_id', null),
    ]);
    didMigrate = true;
  }

  return didMigrate;
}
