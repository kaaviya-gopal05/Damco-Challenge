import type { QaPair, QuizQuestion, Difficulty, ResumeAnalysisResult, InterviewCategory } from '@/types/database';

const INTERVIEW_CATEGORIES: InterviewCategory[] = ['technical', 'behavioral', 'system_design', 'coding', 'resume', 'hr'];

export interface GeneratedInterviewQuestionDraft {
  category: InterviewCategory;
  question: string;
  sampleAnswer: string;
  difficulty: Difficulty;
}

export interface GeneratedTask {
  title: string;
  description: string;
  estimatedHours: number;
}

export interface GeneratedPhase {
  title: string;
  description: string;
  tasks: GeneratedTask[];
}

export interface GeneratedRoadmap {
  title: string;
  description: string;
  estimatedDurationWeeks: number;
  difficulty: Difficulty;
  phases: GeneratedPhase[];
}

export interface RoadmapOptions {
  level?: Difficulty;
  deadline?: string;
  hoursPerDay?: number;
  materialText?: string;
}

export interface FlashcardDraft {
  front: string;
  back: string;
}

export interface TaskNotesContext {
  roadmapTitle: string;
  phaseTitle: string;
  taskTitle: string;
  taskDescription?: string;
}

export interface MindMapTreeNode {
  label: string;
  children: MindMapTreeNode[];
}

export interface SkillCourseRecommendation {
  title: string;
  provider: string;
  description: string;
}

export interface SkillImprovementPlan {
  summary: string;
  courses: SkillCourseRecommendation[];
  quiz: QuizQuestion[];
}

export interface AiService {
  generateRoadmap(goal: string, options?: RoadmapOptions): Promise<GeneratedRoadmap>;
  generateTaskNotes(context: TaskNotesContext): Promise<string>;
  generateMindMapTree(topic: string): Promise<MindMapTreeNode>;
  summarizeDocument(text: string, title: string): Promise<string>;
  extractKeyPoints(text: string): Promise<string[]>;
  generateQa(text: string): Promise<QaPair[]>;
  generateQuiz(text: string): Promise<QuizQuestion[]>;
  generateFlashcards(text: string, count: number): Promise<FlashcardDraft[]>;
  generateFlashcardsForTopic(topic: string, count: number): Promise<FlashcardDraft[]>;
  analyzeResume(resumeText: string, targetRole: string): Promise<ResumeAnalysisResult>;
  generateInterviewQuestions(role: string, gaps: string[]): Promise<GeneratedInterviewQuestionDraft[]>;
  generateSkillImprovementPlan(skillName: string, category?: string | null): Promise<SkillImprovementPlan>;
  chatReply(spaceTitle: string, history: { role: 'user' | 'assistant'; content: string }[]): Promise<string>;
  interpretChatIntent(message: string): Promise<ChatIntent>;
}

export type ChatIntentAction = 'roadmap' | 'mindmap' | 'flashcards' | 'chat';

export interface ChatIntent {
  action: ChatIntentAction;
  topic: string;
}

// ---------------------------------------------------------------------------
// Mock implementation — deterministic, heuristic templates driven by the input
// itself so the product demos coherently without a real model configured.
// See ARCHITECTURE.md §7.
// ---------------------------------------------------------------------------

interface TemplateTask {
  title: string;
  description: string;
}

interface TemplatePhase {
  title: string;
  description: string;
  tasks: TemplateTask[];
}

interface TemplateRoadmap {
  title: string;
  description: string;
  estimatedDurationWeeks: number;
  difficulty: Difficulty;
  phases: TemplatePhase[];
}

const ROADMAP_TEMPLATES: Record<string, TemplateRoadmap> = {
  'data scientist': {
    title: 'Become a Data Scientist',
    description:
      'A structured path from programming fundamentals to a portfolio-ready, interview-prepared data scientist.',
    estimatedDurationWeeks: 20,
    difficulty: 'beginner',
    phases: [
      {
        title: 'Python Fundamentals',
        description: 'Core programming skills used throughout data science.',
        tasks: [
          { title: 'Variables, control flow & functions', description: 'Practice core Python syntax with small exercises.' },
          { title: 'Object-oriented programming', description: 'Classes, inheritance, and when to use them.' },
          { title: 'NumPy essentials', description: 'Arrays, broadcasting, vectorized operations.' },
          { title: 'Pandas essentials', description: 'DataFrames, cleaning, joining, and aggregating data.' },
        ],
      },
      {
        title: 'Statistics & Probability',
        description: 'The mathematical foundation behind every model.',
        tasks: [
          { title: 'Descriptive statistics', description: 'Mean, variance, distributions.' },
          { title: 'Probability theory', description: 'Random variables, Bayes theorem.' },
          { title: 'Hypothesis testing', description: 'p-values, confidence intervals, A/B testing.' },
        ],
      },
      {
        title: 'Machine Learning',
        description: 'Supervised and unsupervised learning fundamentals.',
        tasks: [
          { title: 'Regression & classification', description: 'Linear/logistic regression, decision trees.' },
          { title: 'Model evaluation', description: 'Cross-validation, metrics, overfitting.' },
          { title: 'Unsupervised learning', description: 'Clustering, dimensionality reduction.' },
        ],
      },
      {
        title: 'Projects',
        description: 'Apply everything to portfolio-ready projects.',
        tasks: [
          { title: 'End-to-end project #1', description: 'Pick a public dataset and ship a full analysis.' },
          { title: 'End-to-end project #2', description: 'A predictive modeling project with a written report.' },
        ],
      },
      {
        title: 'Interview Preparation',
        description: 'Prepare for technical and behavioral interviews.',
        tasks: [
          { title: 'SQL & coding practice', description: 'Practice common data manipulation questions.' },
          { title: 'Case study practice', description: 'Walk through open-ended analytical case studies.' },
          { title: 'Behavioral prep', description: 'Prepare STAR-format stories from your projects.' },
        ],
      },
    ],
  },
  'react': {
    title: 'Learn React in 30 Days',
    description: 'A focused, hands-on path to becoming productive with React.',
    estimatedDurationWeeks: 4,
    difficulty: 'beginner',
    phases: [
      {
        title: 'JavaScript & Web Foundations',
        description: 'The prerequisites React builds on.',
        tasks: [
          { title: 'Modern JavaScript (ES6+)', description: 'Arrow functions, destructuring, modules, promises.' },
          { title: 'DOM & browser basics', description: 'Events, the DOM tree, fetch.' },
        ],
      },
      {
        title: 'React Fundamentals',
        description: 'Components, props, and state.',
        tasks: [
          { title: 'Components & JSX', description: 'Function components and JSX syntax.' },
          { title: 'Props & state', description: 'useState and passing data between components.' },
          { title: 'Effects & lifecycle', description: 'useEffect and side effects.' },
        ],
      },
      {
        title: 'Building Real Apps',
        description: 'Routing, forms, and data fetching.',
        tasks: [
          { title: 'React Router', description: 'Client-side routing and nested routes.' },
          { title: 'Forms & validation', description: 'Controlled inputs and form state.' },
          { title: 'Data fetching', description: 'Fetching and caching remote data.' },
        ],
      },
      {
        title: 'Project & Polish',
        description: 'Ship a complete project.',
        tasks: [
          { title: 'Build a capstone project', description: 'A small full app that uses everything learned.' },
          { title: 'Deploy it', description: 'Ship it to a free static host.' },
        ],
      },
    ],
  },
  'machine learning interview': {
    title: 'Prepare for a Machine Learning Interview',
    description: 'Targeted preparation across ML theory, coding, and system design.',
    estimatedDurationWeeks: 6,
    difficulty: 'advanced',
    phases: [
      {
        title: 'ML Theory Review',
        description: 'Revisit the fundamentals interviewers probe deepest.',
        tasks: [
          { title: 'Bias-variance tradeoff', description: 'Be able to explain it with examples.' },
          { title: 'Regularization', description: 'L1 vs L2, when to use each.' },
          { title: 'Evaluation metrics', description: 'Precision/recall, ROC-AUC, when accuracy misleads.' },
        ],
      },
      {
        title: 'Coding Practice',
        description: 'Data structures, algorithms, and ML-specific coding.',
        tasks: [
          { title: 'Array & string problems', description: 'Practice a set of medium-difficulty problems daily.' },
          { title: 'Implement an algorithm from scratch', description: 'e.g. k-means or logistic regression without a library.' },
        ],
      },
      {
        title: 'ML System Design',
        description: 'Designing production ML systems end to end.',
        tasks: [
          { title: 'Design a recommendation system', description: 'Cover data, features, model, and serving.' },
          { title: 'Design an ML pipeline', description: 'Training, evaluation, deployment, monitoring.' },
        ],
      },
      {
        title: 'Mock Interviews',
        description: 'Simulate the real thing.',
        tasks: [
          { title: 'Behavioral mock interview', description: 'Practice STAR-format answers out loud.' },
          { title: 'Technical mock interview', description: 'Time-boxed practice with a peer or recording.' },
        ],
      },
    ],
  },
};

function pickTemplate(goal: string, options?: RoadmapOptions): GeneratedRoadmap {
  const normalized = goal.toLowerCase();
  const match = Object.entries(ROADMAP_TEMPLATES).find(([key]) => normalized.includes(key));
  const template = match
    ? match[1]
    : {
        title: goal,
        description: `A structured roadmap to help you achieve: ${goal}.`,
        estimatedDurationWeeks: 8,
        difficulty: 'intermediate' as Difficulty,
        phases: [
          {
            title: 'Foundations',
            description: `Core concepts you need before going deeper into ${goal}.`,
            tasks: [
              { title: 'Research the fundamentals', description: 'Identify the 3-5 core concepts underpinning this goal.' },
              { title: 'Set up your learning environment', description: 'Tools, accounts, and resources you will need.' },
            ],
          },
          {
            title: 'Core Skills',
            description: 'Build the primary skills this goal requires.',
            tasks: [
              { title: 'Study the core curriculum', description: 'Work through a structured course or book.' },
              { title: 'Practice with exercises', description: 'Apply what you learn with small, focused exercises.' },
            ],
          },
          {
            title: 'Applied Practice',
            description: 'Apply your skills to something real.',
            tasks: [{ title: 'Build a small project', description: 'Use your new skills on a concrete, scoped project.' }],
          },
          {
            title: 'Mastery & Review',
            description: 'Consolidate and validate what you have learned.',
            tasks: [
              { title: 'Review and self-assess', description: 'Identify weak spots and revisit them.' },
              { title: 'Share or apply your work', description: 'Get feedback from a mentor, community, or real use.' },
            ],
          },
        ],
      };

  const deadlineWeeks = weeksUntil(options?.deadline);
  return {
    ...template,
    difficulty: options?.level ?? template.difficulty,
    estimatedDurationWeeks: deadlineWeeks ?? template.estimatedDurationWeeks,
    phases: template.phases.map((phase) => ({
      ...phase,
      tasks: phase.tasks.map((task) => ({ ...task, estimatedHours: 2 })),
    })),
  };
}

function weeksUntil(deadline: string | undefined): number | null {
  if (!deadline) return null;
  const target = new Date(deadline);
  if (Number.isNaN(target.getTime())) return null;
  const days = Math.ceil((target.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  return days > 0 ? Math.max(1, Math.round(days / 7)) : null;
}

function sentenceSplit(text: string): string[] {
  return text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20);
}

const MIND_MAP_BRANCH_TEMPLATES = ['Fundamentals', 'Key Concepts', 'Applications', 'Advanced Topics'];

const mockAiService: AiService = {
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
        sampleAnswer: `Demo sample answer. Connect a Gemini API key for real, role-specific interview questions.`,
        difficulty: (['beginner', 'intermediate', 'advanced'] as Difficulty[])[i % 3],
      }))
    );
  },

  async chatReply(spaceTitle: string) {
    await simulateLatency();
    return (
      `Got it — noted for "${spaceTitle}". Type \`/\` to generate a roadmap, mind map, flashcards, ` +
      `PDF insights, or find learning videos for this. (Connect a Gemini API key for a real conversational reply.)`
    );
  },

  async interpretChatIntent(message: string) {
    await simulateLatency();
    const lower = message.toLowerCase();
    if (lower.includes('flashcard')) return { action: 'flashcards', topic: message };
    if (lower.includes('mind map') || lower.includes('mindmap')) return { action: 'mindmap', topic: message };
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
};

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

// ---------------------------------------------------------------------------
// Real implementation — Google Gemini, hardcoded to the gemini-2.5-flash model.
// Active whenever VITE_AI_API_KEY is configured. See ARCHITECTURE.md §7.
// ---------------------------------------------------------------------------

const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

class GeminiService implements AiService {
  constructor(private apiKey: string) {}

  private async complete(prompt: string, jsonMode = false): Promise<string> {
    const res = await fetch(GEMINI_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': this.apiKey,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: jsonMode
          ? { responseMimeType: 'application/json', temperature: 0.4 }
          : { temperature: 0.5 },
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Gemini request failed: ${res.status} ${res.statusText} ${body}`.trim());
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('') ?? '';
    if (!text) throw new Error('Gemini returned an empty response.');
    return text;
  }

  private async completeJson<T>(prompt: string): Promise<T> {
    const raw = await this.complete(prompt, true);
    return JSON.parse(raw) as T;
  }

  generateRoadmap(goal: string, options?: RoadmapOptions) {
    const constraints = [
      options?.level ? `The learner's current level is "${options.level}".` : '',
      options?.deadline ? `They want to reach this goal by ${options.deadline}; size estimatedDurationWeeks accordingly.` : '',
      options?.hoursPerDay
        ? `They can study about ${options.hoursPerDay} hour(s) per day; keep each task's estimatedHours realistic against that pace.`
        : '',
      options?.materialText
        ? `Base the roadmap specifically on the study material provided below — derive phases and tasks from what it ` +
          `actually covers rather than generic knowledge of the topic.`
        : '',
    ]
      .filter(Boolean)
      .join(' ');

    const materialBlock = options?.materialText
      ? `\n\nSTUDY MATERIAL:\n${options.materialText.slice(0, 100000)}`
      : '';

    return this.completeJson<GeneratedRoadmap>(
      `Create a learning roadmap for the goal: "${goal}". ${constraints} ` +
        `Return JSON matching exactly: { "title": string, "description": string, "estimatedDurationWeeks": number, ` +
        `"difficulty": "beginner"|"intermediate"|"advanced", "phases": [{ "title": string, "description": string, ` +
        `"tasks": [{ "title": string, "description": string, "estimatedHours": number }] }] }. Include 4-6 phases ` +
        `with 2-5 tasks each. estimatedHours is how many hours of focused study that specific task takes (typically 1-8).` +
        materialBlock
    );
  }

  generateTaskNotes({ roadmapTitle, phaseTitle, taskTitle, taskDescription }: TaskNotesContext) {
    return this.complete(
      `Write clear, well-structured study notes in markdown explaining "${taskTitle}", a task inside the ` +
        `"${phaseTitle}" phase of a learning roadmap for "${roadmapTitle}". ` +
        `${taskDescription ? `Additional context: ${taskDescription}.` : ''} ` +
        `Include a short explanation, the key concepts/terms to know, and 1-2 practical examples or tips. ` +
        `Use markdown headings, bullet points, and tables where useful. ` +
        `If the topic involves any mathematical formula, equation, or calculation, write it using LaTeX syntax ` +
        `($inline$ or $$block$$). If the topic involves a process, algorithm, architecture, or set of relationships ` +
        `that would be clearer as a diagram, include one using a fenced \`\`\`mermaid code block (flowchart or ` +
        `sequence diagram syntax). Only include a formula or diagram when it genuinely helps understanding — do not ` +
        `force one in. Keep the notes focused, around 250-450 words excluding any diagram code.`
    );
  }

  generateMindMapTree(topic: string) {
    return this.completeJson<MindMapTreeNode>(
      `Break down the topic "${topic}" into a hierarchical mind map. Return JSON matching exactly: ` +
        `{ "label": string, "children": [{ "label": string, "children": [{ "label": string, "children": [] }] }] } ` +
        `with 4-6 top-level branches and 2-4 children under each. Keep every label under 6 words. The root label should be "${topic}".`
    );
  }

  summarizeDocument(text: string, title: string) {
    return this.complete(`Summarize this document titled "${title}" in 3-5 sentences:\n\n${text.slice(0, 100000)}`);
  }

  extractKeyPoints(text: string) {
    return this.completeJson<string[]>(
      `Extract up to 8 key points from this document as a JSON array of strings:\n\n${text.slice(0, 100000)}`
    );
  }

  generateQa(text: string) {
    return this.completeJson<QaPair[]>(
      `Generate up to 6 question/answer pairs about this document. Return JSON matching exactly: ` +
        `[{ "question": string, "answer": string }]:\n\n${text.slice(0, 100000)}`
    );
  }

  generateQuiz(text: string) {
    return this.completeJson<QuizQuestion[]>(
      `Generate up to 5 multiple-choice quiz questions about this document. Return JSON matching exactly: ` +
        `[{ "question": string, "options": [string, string, string, string], "correctIndex": number, "explanation": string }]` +
        `:\n\n${text.slice(0, 100000)}`
    );
  }

  generateFlashcards(text: string, count: number) {
    return this.completeJson<FlashcardDraft[]>(
      `Generate ${count} flashcards covering this document. Return JSON matching exactly: ` +
        `[{ "front": string, "back": string }]:\n\n${text.slice(0, 100000)}`
    );
  }

  generateFlashcardsForTopic(topic: string, count: number) {
    return this.completeJson<FlashcardDraft[]>(
      `Generate ${count} flashcards to help someone learn about "${topic}". Each card's front should be a ` +
        `focused question or term, and the back a clear, accurate answer or explanation (1-3 sentences). ` +
        `Cover a range of aspects: definitions, key terms, examples, and common misconceptions. ` +
        `Return JSON matching exactly: [{ "front": string, "back": string }]`
    );
  }

  analyzeResume(resumeText: string, targetRole: string) {
    return this.completeJson<ResumeAnalysisResult>(
      `You are an expert career coach. Carefully read every line of this resume, word for word, and analyze it ` +
        `against the target role "${targetRole}". Identify what the candidate is already strong in, what is ` +
        `missing or underdeveloped for this specific role, and rate their apparent proficiency in the 5-8 skills ` +
        `most relevant to this role. Return JSON matching exactly: { "summary": string (2-3 sentences overall ` +
        `assessment), "strengths": string[] (3-6 concrete strengths found in the resume), "gaps": string[] ` +
        `(3-6 concrete gaps relative to "${targetRole}"), "skillAssessments": [{ "skill": string, ` +
        `"currentLevel": number (0-5, 0 if not evidenced at all in the resume), "targetLevel": number (0-5, the ` +
        `level expected for "${targetRole}") }] }. Base every judgment strictly on what is actually written in ` +
        `the resume below, do not invent experience that isn't there:\n\n${resumeText.slice(0, 100000)}`
    );
  }

  generateInterviewQuestions(role: string, gaps: string[]) {
    const gapsNote = gaps.length > 0 ? ` Weight questions toward these known gaps where relevant: ${gaps.join(', ')}.` : '';
    return this.completeJson<GeneratedInterviewQuestionDraft[]>(
      `Generate interview preparation questions for a candidate targeting the role "${role}".${gapsNote} ` +
        `Generate exactly 3 questions for each of these 6 categories: technical, behavioral, system_design, coding, ` +
        `resume, hr. "resume" category means questions about how to present/discuss their resume; "hr" means ` +
        `logistics/culture-fit style questions. Each question needs a concise, accurate sample answer (2-4 sentences, ` +
        `or a short code/algorithm sketch for coding questions). Return JSON matching exactly: ` +
        `[{ "category": "technical"|"behavioral"|"system_design"|"coding"|"resume"|"hr", "question": string, ` +
        `"sampleAnswer": string, "difficulty": "beginner"|"intermediate"|"advanced" }]. The "difficulty" field must be ` +
        `the exact lowercase string "beginner", "intermediate", or "advanced" — never "easy", "medium", "hard", or any ` +
        `other word. Return 18 items total.`
    );
  }

  generateSkillImprovementPlan(skillName: string, category?: string | null) {
    return this.completeJson<SkillImprovementPlan>(
      `Create a skill-improvement plan for the skill "${skillName}"${category ? ` (category: ${category})` : ''} ` +
        `for a learner who wants to get better at it. Return JSON matching exactly: { "summary": string, ` +
        `"courses": [{ "title": string, "provider": string, "description": string }], "quiz": [{ "question": string, ` +
        `"options": [string, string, string, string], "correctIndex": number, "explanation": string }] }. ` +
        `"summary" must be markdown study notes (roughly 150-300 words) explaining the skill, its key concepts, and ` +
        `one practical tip — use markdown headings/bullets, and only use LaTeX ($inline$ or $$block$$) if a formula ` +
        `genuinely helps. "courses" must have exactly 2 plausible, well-known course recommendations from real ` +
        `platforms (e.g. Coursera, Udemy, Pluralsight, edX). "quiz" must have exactly 4 multiple-choice questions ` +
        `testing understanding of "${skillName}", each with exactly 4 options and a short explanation.`
    );
  }

  chatReply(spaceTitle: string, history: { role: 'user' | 'assistant'; content: string }[]) {
    const transcript = history.map((m) => `${m.role === 'user' ? 'Learner' : 'Assistant'}: ${m.content}`).join('\n');
    return this.complete(
      `You are a friendly, concise learning assistant inside a workspace called "${spaceTitle}". Continue this ` +
        `conversation with one short, helpful reply (2-4 sentences, no markdown headings). If it's natural, remind ` +
        `the learner they can type "/" to generate a roadmap, mind map, flashcards, PDF insights, or find learning ` +
        `videos for this space — but don't force that reminder into every reply.\n\n${transcript}\n\nAssistant:`
    );
  }

  interpretChatIntent(message: string) {
    return this.completeJson<ChatIntent>(
      `A learner typed this message into a learning-app chat box: "${message}". Decide what they want. ` +
        `Return JSON matching exactly: { "action": "roadmap"|"mindmap"|"flashcards"|"chat", "topic": string }. ` +
        `Use "roadmap" if they want a structured study plan or are stating a learning goal (e.g. "become a...", ` +
        `"learn X", "I want to..."). Use "mindmap" only if they explicitly ask for a mind map or to break a topic ` +
        `into branches/concepts. Use "flashcards" only if they explicitly ask for flashcards or cards to memorize. ` +
        `Use "chat" if the message is a question, greeting, or anything that isn't clearly asking to generate one ` +
        `of those three things. "topic" is a short (under 10 words) restatement of what to generate content about ` +
        `— for "chat" just repeat the message.`
    );
  }
}

let cachedService: AiService | null = null;

export function getAiService(): AiService {
  if (cachedService) return cachedService;

  const apiKey = import.meta.env.VITE_AI_API_KEY;
  cachedService = apiKey ? new GeminiService(apiKey) : mockAiService;
  return cachedService;
}

export function isAiConfigured(): boolean {
  return Boolean(import.meta.env.VITE_AI_API_KEY);
}
