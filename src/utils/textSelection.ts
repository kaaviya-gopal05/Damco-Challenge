export type SelectionMode = 'word' | 'passage' | 'none';

export interface ClassifiedSelection {
  mode: SelectionMode;
  text: string;
}

const MAX_SENTENCES = 4;

function countSentences(text: string): number {
  const sentences = text
    .replace(/\s+/g, ' ')
    .trim()
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (sentences.length > 0) return sentences.length;
  return text.trim() ? 1 : 0;
}

/**
 * Decides what the "explain selection" feature should do with a piece of highlighted
 * text: a single word gets a definition, a short passage (up to 4 sentences) gets a
 * simplified explanation, and anything longer is deliberately ignored (`'none'`) so
 * the shortcut can't be used to summarize an entire document at once.
 */
export function classifySelection(rawText: string): ClassifiedSelection {
  const text = rawText.trim();
  if (!text) return { mode: 'none', text };

  const isSingleWord = !/\s/.test(text) && /[a-zA-Z]/.test(text);
  if (isSingleWord) return { mode: 'word', text };

  if (countSentences(text) > MAX_SENTENCES) return { mode: 'none', text };

  return { mode: 'passage', text };
}
