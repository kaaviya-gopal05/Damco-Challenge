import { describe, expect, it } from 'vitest';
import { classifySelection } from '@/utils/textSelection';

describe('classifySelection', () => {
  it('treats an empty or whitespace-only selection as none', () => {
    expect(classifySelection('').mode).toBe('none');
    expect(classifySelection('   ').mode).toBe('none');
  });

  it('classifies a single word as "word"', () => {
    expect(classifySelection('serendipity').mode).toBe('word');
    expect(classifySelection('  serendipity  ').mode).toBe('word');
  });

  it('classifies up to 4 sentences as "passage"', () => {
    const oneSentence = 'This is one sentence.';
    const fourSentences = 'One. Two. Three. Four.';
    expect(classifySelection(oneSentence).mode).toBe('passage');
    expect(classifySelection(fourSentences).mode).toBe('passage');
  });

  it('classifies a short multi-word phrase with no sentence punctuation as "passage"', () => {
    expect(classifySelection('machine learning').mode).toBe('passage');
  });

  it('ignores a selection of more than 4 sentences, even with the shortcut pressed', () => {
    const fiveSentences = 'One. Two. Three. Four. Five.';
    expect(classifySelection(fiveSentences).mode).toBe('none');
  });

  it('preserves the trimmed selected text on the result', () => {
    expect(classifySelection('  hello world.  ').text).toBe('hello world.');
  });
});
