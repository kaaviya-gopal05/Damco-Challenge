import type { Difficulty } from '@/types/database';
import type { GeneratedRoadmap, RoadmapOptions } from '@/services/ai/types';

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

function weeksUntil(deadline: string | undefined): number | null {
  if (!deadline) return null;
  const target = new Date(deadline);
  if (Number.isNaN(target.getTime())) return null;
  const days = Math.ceil((target.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  return days > 0 ? Math.max(1, Math.round(days / 7)) : null;
}

export function pickTemplate(goal: string, options?: RoadmapOptions): GeneratedRoadmap {
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
