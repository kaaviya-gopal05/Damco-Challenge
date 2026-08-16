export type ActiveView =
  | { type: 'overview' }
  | { type: 'roadmap'; id: string }
  | { type: 'mindmap'; id: string }
  | { type: 'flashcards'; id: string }
  | { type: 'document'; id: string }
  | { type: 'videos' };
