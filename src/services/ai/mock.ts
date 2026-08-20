import type { QuizQuestion, ResumeAnalysisResult } from '@/types/database';
import type {
  AiService,
  RoadmapOptions,
  TaskNotesContext,
  SkillCourseRecommendation,
  WeeklyPlanSummaryInput,
} from '@/services/ai/types';
import { pickTemplate } from '@/services/ai/roadmap-templates';
import { draftTasksFromBrainDump } from '@/services/ai/taskPriorityHeuristics';

// ---------------------------------------------------------------------------
// Mock implementation — deterministic, heuristic templates driven by the input
// itself so the product demos coherently without a real model configured.
// See ARCHITECTURE.md §7.
// ---------------------------------------------------------------------------

const INTERVIEW_CATEGORIES = ['technical', 'behavioral', 'system_design', 'coding', 'resume', 'hr'] as const;

function sentenceSplit(text: string): string[] {
  return text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20);
}

const MIND_MAP_BRANCH_TEMPLATES = ['Fundamentals', 'Key Concepts', 'Applications', 'Advanced Topics'];

const TODO_KEYWORDS = ['to-do', 'todo', 'to do list', 'task list', 'my tasks', 'remind me', 'things to do', 'need to do'];
const URGENCY_WORDS = ['tonight', 'today', 'tomorrow', 'next week', 'next month', 'deadline', 'due '];
const LEARNING_GOAL_WORDS = ['become a', 'become an', 'learn ', 'study ', 'master ', 'get better at', 'improve my', 'want to learn'];
const CAREER_QUESTION_KEYWORDS = [
  'my resume',
  'my cv',
  'job description',
  ' jd ',
  'jd?',
  'suitable for',
  'good fit',
  'am i qualified',
  'am i a fit',
];

function isCareerQuestion(lower: string): boolean {
  return CAREER_QUESTION_KEYWORDS.some((kw) => lower.includes(kw));
}

/**
 * Heuristic for auto-detecting a task brain-dump typed/spoken directly into the chat (no
 * "/todo" widget click needed) — an explicit todo/task/reminder keyword, or the structural
 * shape of one: multiple distinct clauses (joined by "and then" or several sentences) combined
 * with a time/urgency cue, which a single learning-goal sentence like "I want to learn X"
 * won't have. A learning-goal phrase always wins even if a later sentence happens to mention a
 * deadline (e.g. "I want to become a data scientist. I have an interview next month.") — that's
 * still one goal statement with context, not a list of separate tasks.
 *
 * A long checklist-style paste (e.g. copied from a planner: many short, period-separated items,
 * with or without an "and then"/urgency cue) is also recognized by its shape alone — four or
 * more short clauses in a row reads as a list of separate to-dos even with no explicit deadline
 * word in it.
 */
function isTodoLikeMessage(lower: string): boolean {
  if (TODO_KEYWORDS.some((kw) => lower.includes(kw))) return true;
  if (LEARNING_GOAL_WORDS.some((w) => lower.includes(w))) return false;

  const clauses = lower
    .split(/\.\s*|\band then\b/)
    .map((s) => s.trim())
    .filter((s) => s.length > 2);
  const isLongChecklist = clauses.length >= 4 && clauses.every((c) => c.split(/\s+/).length <= 16);
  if (isLongChecklist) return true;

  const hasMultipleClauses = /\band then\b/.test(lower) || clauses.length >= 2;
  const hasUrgency = URGENCY_WORDS.some((w) => lower.includes(w)) || /\b\d+\s+(day|week|month)s?\b/.test(lower);
  return hasMultipleClauses && hasUrgency;
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function simulateLatency() {
  return new Promise((resolve) => setTimeout(resolve, 350));
}

export const mockAiService: AiService = {
  async generateRoadmap(goal: string, options?: RoadmapOptions) {
    await simulateLatency();
    return pickTemplate(goal, options);
  },

  async generateTaskNotes({ roadmapTitle, phaseTitle, taskTitle, taskDescription }: TaskNotesContext) {
    await simulateLatency();
    return [
      `## ${taskTitle}`,
      '',
      `Part of **${phaseTitle}** in your **${roadmapTitle}** roadmap.`,
      '',
      taskDescription ? taskDescription : `A focused look at ${taskTitle.toLowerCase()}.`,
      '',
      '### Key ideas',
      `- What ${taskTitle.toLowerCase()} is and why it matters here`,
      '- The core terms and building blocks to recognize',
      '- A common mistake beginners make with this topic',
      '',
      '### Try it',
      `Spend 15-20 minutes practicing ${taskTitle.toLowerCase()} with a small, concrete example before moving on.`,
      '',
      '```javascript',
      `// A tiny placeholder snippet — connect a Gemini API key for a real, topic-specific example.`,
      `function practice${taskTitle.replace(/[^a-zA-Z0-9]/g, '')}() {`,
      '  // your example goes here',
      '}',
      '```',
      '',
      '_Demo notes — connect a Gemini API key for real, topic-specific explanations._',
    ].join('\n');
  },

  async generateMindMapTree(topic: string) {
    await simulateLatency();
    return {
      label: topic,
      children: MIND_MAP_BRANCH_TEMPLATES.map((branch) => ({
        label: `${branch}: ${topic}`,
        children: [
          { label: `Core idea in ${branch.toLowerCase()}`, children: [] },
          { label: `Example related to ${branch.toLowerCase()}`, children: [] },
        ],
      })),
    };
  },

  async summarizeDocument(text: string, title: string) {
    await simulateLatency();
    const sentences = sentenceSplit(text);
    const summarySentences = sentences.slice(0, Math.min(5, sentences.length));
    if (summarySentences.length === 0) {
      return `"${title}" does not contain enough extractable text to summarize.`;
    }
    return summarySentences.join(' ');
  },

  async extractKeyPoints(text: string) {
    await simulateLatency();
    const sentences = sentenceSplit(text);
    return sentences.slice(0, 8).map((s) => (s.length > 140 ? `${s.slice(0, 137)}...` : s));
  },

  async generateQa(text: string) {
    await simulateLatency();
    const sentences = sentenceSplit(text).slice(0, 6);
    return sentences.map((s, i) => ({
      question: `What is a key idea from point ${i + 1} of this document?`,
      answer: s,
    }));
  },

  async generateQuiz(text: string) {
    await simulateLatency();
    const sentences = sentenceSplit(text).slice(0, 5);
    return sentences.map((s, i) => {
      const words = s.split(' ').filter((w) => w.length > 5);
      const answerWord = words[Math.floor(words.length / 2)] ?? 'concept';
      const options = shuffle([answerWord, 'unrelated term', 'random detail', 'opposite concept']);
      return {
        question: `Question ${i + 1}: According to the document, which term best completes this idea — "${s.slice(0, 80)}..."?`,
        options,
        correctIndex: options.indexOf(answerWord),
        explanation: s,
      } satisfies QuizQuestion;
    });
  },

  async generateFlashcards(text: string, count: number) {
    await simulateLatency();
    const sentences = sentenceSplit(text).slice(0, count);
    return sentences.map((s, i) => ({
      front: `Key concept #${i + 1}`,
      back: s,
    }));
  },

  async generateFlashcardsForTopic(topic: string, count: number) {
    await simulateLatency();
    const facets = ['definition', 'why it matters', 'a key term', 'a common mistake', 'a practical example', 'how it compares to a related idea'];
    return Array.from({ length: count }, (_, i) => {
      const facet = facets[i % facets.length];
      return {
        front: `${topic} — ${facet}`,
        back: `Demo answer covering the ${facet} of ${topic}. Connect a Gemini API key for real, topic-specific flashcards.`,
      };
    });
  },

  async analyzeResume(resumeText: string, targetRole: string) {
    await simulateLatency();
    const sentences = sentenceSplit(resumeText);
    return {
      summary:
        sentences.length > 0
          ? `Demo analysis for ${targetRole} — connect a Gemini API key for a real resume review.`
          : `Could not extract readable text from this resume to analyze against ${targetRole}.`,
      strengths: sentences.slice(0, 3).map((s) => (s.length > 120 ? `${s.slice(0, 117)}...` : s)),
      gaps: [`Demonstrated experience directly tied to ${targetRole}`, 'Quantified impact/metrics on recent work', 'Depth in the core tools this role expects'],
      skillAssessments: MIND_MAP_BRANCH_TEMPLATES.map((branch, i) => ({
        skill: branch,
        currentLevel: Math.max(0, 3 - i),
        targetLevel: 4,
      })),
    } satisfies ResumeAnalysisResult;
  },

  async generateInterviewQuestions(role: string, gaps: string[]) {
    await simulateLatency();
    const focus = gaps[0] ?? role;
    return INTERVIEW_CATEGORIES.flatMap((category) =>
      Array.from({ length: 3 }, (_, i) => ({
        category,
        question: `[Demo] A ${category.replace('_', ' ')} question #${i + 1} for a ${role} role, touching on ${focus}.`,
        sampleAnswer:
          category === 'coding'
            ? [
                'Demo sample answer.',
                '',
                '```python',
                '# Placeholder solution — connect a Gemini API key for a real, role-specific answer.',
                'def solve(items):',
                '    return sorted(items)',
                '```',
                '',
                '_Time: O(n log n), Space: O(n)._',
              ].join('\n')
            : `Demo sample answer. Connect a Gemini API key for real, role-specific interview questions.`,
        difficulty: (['beginner', 'intermediate', 'advanced'] as const)[i % 3],
      }))
    );
  },

  async chatReply(spaceTitle: string) {
    await simulateLatency();
    return (
      `Got it — noted for "${spaceTitle}". Type \`/\` to generate a roadmap, mind map, flashcards, ` +
      `a resume skill-gap analysis, or find learning videos for this. (Connect a Gemini API key for a real conversational reply.)`
    );
  },

  async interpretChatIntent(message: string) {
    await simulateLatency();
    const lower = message.toLowerCase();
    if (lower.includes('flashcard')) return { action: 'flashcards', topic: message };
    if (lower.includes('mind map') || lower.includes('mindmap')) return { action: 'mindmap', topic: message };
    if (isCareerQuestion(lower)) return { action: 'career_question', topic: message };
    if (isTodoLikeMessage(lower)) return { action: 'todo', topic: message };
    if (
      lower.includes('roadmap') ||
      lower.includes('become') ||
      lower.includes('learn ') ||
      lower.includes('plan') ||
      lower.includes('study path')
    ) {
      return { action: 'roadmap', topic: message };
    }
    return { action: 'chat', topic: message };
  },

  async generateSkillImprovementPlan(skillName: string) {
    await simulateLatency();
    const summary = [
      `## ${skillName}`,
      '',
      `A focused primer to help you build real, practical proficiency in ${skillName}.`,
      '',
      '### Key ideas',
      `- What ${skillName.toLowerCase()} is and why it matters`,
      '- The core building blocks to recognize',
      '- A common mistake beginners make with this topic',
      '',
      '### Try it',
      `Spend 15-20 minutes practicing ${skillName.toLowerCase()} with a small, concrete example before moving on.`,
      '',
      '_Demo notes — connect a Gemini API key for real, topic-specific explanations._',
    ].join('\n');

    const courses: SkillCourseRecommendation[] = [
      {
        title: `${skillName} Fundamentals`,
        provider: 'Coursera',
        description: `A structured introduction to ${skillName} with hands-on exercises. Demo recommendation — connect a Gemini API key for real suggestions.`,
      },
      {
        title: `Practical ${skillName}`,
        provider: 'Udemy',
        description: `Applied projects to build real proficiency in ${skillName}. Demo recommendation — connect a Gemini API key for real suggestions.`,
      },
    ];

    const quiz: QuizQuestion[] = [1, 2, 3, 4].map((i) => {
      const answer = `Core concept #${i} of ${skillName}`;
      const options = shuffle([answer, 'An unrelated term', 'A random implementation detail', 'The opposite of the correct concept']);
      return {
        question: `Demo question ${i}: which of these best relates to ${skillName}?`,
        options,
        correctIndex: options.indexOf(answer),
        explanation: 'Demo question — connect a Gemini API key for real, topic-specific quiz questions.',
      };
    });

    return { summary, courses, quiz };
  },

  async explainSelection(text: string) {
    await simulateLatency();
    const trimmed = text.trim();
    const isSingleWord = trimmed.length > 0 && !/\s/.test(trimmed);

    if (isSingleWord) {
      return {
        term: trimmed,
        explanation: `Demo definition of "${trimmed}" — connect a Gemini API key for a real, dictionary-quality definition.`,
        example: `Demo usage: "${trimmed}" would typically appear in a sentence like this. Connect a Gemini API key for a real example.`,
      };
    }

    const label = trimmed.length > 60 ? `${trimmed.slice(0, 57)}...` : trimmed || 'this passage';
    return {
      term: label,
      explanation:
        'Demo simplified explanation — connect a Gemini API key for a real, plain-language rewrite of this passage.',
      example: null,
    };
  },

  async generatePrioritizedTasks(brainDump: string, referenceDate: string) {
    await simulateLatency();
    return draftTasksFromBrainDump(brainDump, referenceDate);
  },

  async generateWeeklyPlanSummary({ focusItems, rescheduledCount }: WeeklyPlanSummaryInput) {
    await simulateLatency();
    const rescheduleNote = rescheduledCount > 0 ? ` ${rescheduledCount} task${rescheduledCount === 1 ? '' : 's'} moved to spread the week out evenly.` : '';
    return {
      summary:
        focusItems.length > 0
          ? `[Demo] You have ${focusItems.length} item${focusItems.length === 1 ? '' : 's'} lined up this week.${rescheduleNote} Connect a Gemini API key for a real, specific weekly summary.`
          : `[Demo] Nothing urgent is scheduled this week — a good time to get ahead on your roadmap. Connect a Gemini API key for a real weekly summary.`,
      dailyRhythm: '[Demo] Tackle your highest-priority item earlier in the day while your focus is freshest.',
    };
  },
};
