import { describe, expect, it } from 'vitest';
import { mockAiService } from '@/services/ai/mock';

// mockAiService is what the app runs on when no AI provider is configured — it
// must degrade sanely on edge-case input (empty text, no sentences, an unknown
// goal) rather than throwing, since it's the default experience for anyone
// running this project without a Gemini key.

describe('mockAiService.generateRoadmap', () => {
  it('matches a known template by substring, case-insensitively', async () => {
    const roadmap = await mockAiService.generateRoadmap('I want to become a Data Scientist');
    expect(roadmap.title).toBe('Become a Data Scientist');
    expect(roadmap.phases.length).toBeGreaterThan(0);
  });

  it('falls back to a generic 4-phase roadmap for an unrecognized goal', async () => {
    const roadmap = await mockAiService.generateRoadmap('Become a Quantum Basket Weaver');
    expect(roadmap.title).toBe('Become a Quantum Basket Weaver');
    expect(roadmap.phases).toHaveLength(4);
    expect(roadmap.phases.every((p) => p.tasks.length > 0)).toBe(true);
  });

  it('every generated task has a positive estimatedHours', async () => {
    const roadmap = await mockAiService.generateRoadmap('react');
    for (const phase of roadmap.phases) {
      for (const task of phase.tasks) {
        expect(task.estimatedHours).toBeGreaterThan(0);
      }
    }
  });

  it('honors an explicit level override', async () => {
    const roadmap = await mockAiService.generateRoadmap('react', { level: 'advanced' });
    expect(roadmap.difficulty).toBe('advanced');
  });
});

describe('mockAiService.summarizeDocument', () => {
  it('summarizes the first few sentences of real text', async () => {
    const text =
      'React is a JavaScript library for building user interfaces. It uses a component model. ' +
      'State updates trigger re-renders. Hooks let you use state in function components.';
    const summary = await mockAiService.summarizeDocument(text, 'React Basics');
    expect(summary.length).toBeGreaterThan(0);
    expect(summary).toContain('React is a JavaScript library');
  });

  it('returns a clear message instead of an empty string for unusable input', async () => {
    const summary = await mockAiService.summarizeDocument('   ', 'Empty Doc');
    expect(summary).toContain('Empty Doc');
    expect(summary.length).toBeGreaterThan(0);
  });
});

describe('mockAiService.extractKeyPoints', () => {
  it('returns an empty array for text with no extractable sentences', async () => {
    const points = await mockAiService.extractKeyPoints('short. bits. only.');
    expect(points).toEqual([]);
  });

  it('caps at 8 points for long text', async () => {
    const longText = Array.from({ length: 20 }, (_, i) => `This is sentence number ${i} with enough length to count.`).join(' ');
    const points = await mockAiService.extractKeyPoints(longText);
    expect(points.length).toBeLessThanOrEqual(8);
  });
});

describe('mockAiService.generateQuiz', () => {
  it('produces well-formed quiz questions with a valid correctIndex', async () => {
    const text = 'Photosynthesis converts light energy into chemical energy stored in glucose molecules within plant cells.';
    const quiz = await mockAiService.generateQuiz(text);
    for (const q of quiz) {
      expect(q.options).toHaveLength(4);
      expect(q.correctIndex).toBeGreaterThanOrEqual(0);
      expect(q.correctIndex).toBeLessThan(q.options.length);
    }
  });
});

describe('mockAiService.analyzeResume', () => {
  it('flags unreadable resume text distinctly from a normal analysis', async () => {
    const result = await mockAiService.analyzeResume('', 'Software Engineer');
    expect(result.summary).toContain('Could not extract');
    expect(result.strengths).toEqual([]);
  });

  it('returns a skill assessment for a non-empty resume', async () => {
    const resumeText =
      'Built scalable backend services using Node.js and PostgreSQL for three years. ' +
      'Led a small team migrating a monolith to microservices.';
    const result = await mockAiService.analyzeResume(resumeText, 'Backend Engineer');
    expect(result.skillAssessments.length).toBeGreaterThan(0);
    for (const assessment of result.skillAssessments) {
      expect(assessment.currentLevel).toBeGreaterThanOrEqual(0);
      expect(assessment.targetLevel).toBeGreaterThanOrEqual(assessment.currentLevel);
    }
  });
});

describe('mockAiService.interpretChatIntent', () => {
  it.each([
    ['I want to learn Python', 'roadmap'],
    ['make me flashcards on osmosis', 'flashcards'],
    ['build a mind map of biology', 'mindmap'],
    ['what time is it', 'chat'],
    [
      'I want to buy two eggs, and then one month after, I will have an exam, and then tonight I need to complete this pitch deck.',
      'todo',
    ],
    ['I need to buy groceries and then finish my taxes by tomorrow', 'todo'],
    ['add this to my to-do list: call the dentist', 'todo'],
    ['remind me to submit the report', 'todo'],
  ] as const)('classifies "%s" as "%s"', async (message, expected) => {
    const intent = await mockAiService.interpretChatIntent(message);
    expect(intent.action).toBe(expected);
  });

  it('does not misclassify a plain learning-goal sentence as todo', async () => {
    const intent = await mockAiService.interpretChatIntent('I want to become a data scientist');
    expect(intent.action).toBe('roadmap');
  });

  it('does not misclassify a learning goal with a deadline sentence as todo', async () => {
    const intent = await mockAiService.interpretChatIntent(
      'I want to become a data scientist. I have an interview next month and need to prepare fast.'
    );
    expect(intent.action).toBe('roadmap');
  });

  it('classifies a long checklist-style paste as todo even with no explicit deadline words', async () => {
    const intent = await mockAiService.interpretChatIntent(
      'Check version control repositories for open pull requests.Run automated build pipelines to verify code integrity.' +
        'Review server health metrics and performance log dashboards.Clear pending system tickets in the issue tracker.' +
        'Attend the morning 15-minute agile scrum meeting.Implement core algorithmic logic for assigned features.' +
        'Write unit tests to achieve targeted code coverage.Deploy tested code artifacts to staging environments.'
    );
    expect(intent.action).toBe('todo');
  });
});
