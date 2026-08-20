import { supabase } from '@/lib/supabase';
import type { QaPair, QuizQuestion, ResumeAnalysisResult } from '@/types/database';
import type {
  AiService,
  ChatIntent,
  FlashcardDraft,
  GeneratedInterviewQuestionDraft,
  GeneratedRoadmap,
  GeneratedTaskDraft,
  MindMapTreeNode,
  RoadmapOptions,
  SelectionExplanation,
  SkillImprovementPlan,
  TaskNotesContext,
  WeeklyPlanSummary,
  WeeklyPlanSummaryInput,
} from '@/services/ai/types';

// ---------------------------------------------------------------------------
// Real implementation — Google Gemini, hardcoded to the gemini-2.5-flash model.
// Active whenever VITE_AI_ENABLED is set. See ARCHITECTURE.md §7 and
// docs/ai-workflow.md.
//
// The Gemini API key itself never ships to the browser: every prompt is sent
// to the `ai-complete` Supabase Edge Function (supabase/functions/ai-complete),
// which holds the key as a server-side secret and proxies the call to Google.
// This class only ever talks to our own Edge Function, authenticated with the
// caller's Supabase session via supabase-js.
// ---------------------------------------------------------------------------

interface AiCompleteResponse {
  text: string;
}

export class GeminiService implements AiService {
  private async complete(prompt: string, jsonMode = false): Promise<string> {
    const { data, error } = await supabase.functions.invoke<AiCompleteResponse>('ai-complete', {
      body: { prompt, jsonMode },
    });

    if (error) throw new Error(`AI request failed: ${error.message}`);
    if (!data?.text) throw new Error('AI service returned an empty response.');
    return data.text;
  }

  /** Gemini's JSON mode is normally clean, but not guaranteed — an occasional truncated or
   *  slightly malformed response would otherwise surface as a hard failure (e.g. roadmap
   *  generation's "I couldn't generate that just now") on what's really just one bad response.
   *  Retried once, with a fresh model call rather than re-parsing the same bad text, before
   *  actually giving up — same resilience the edge-function side already has via
   *  callGeminiJsonValidated. */
  private async completeJson<T>(prompt: string, attempts = 2): Promise<T> {
    let lastError: unknown;
    for (let attempt = 0; attempt < attempts; attempt++) {
      try {
        const raw = await this.complete(prompt, true);
        return JSON.parse(raw) as T;
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError instanceof Error ? lastError : new Error('AI returned malformed JSON.');
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
        `Structure the notes with a clear hierarchy: use a level-2 heading (##) for each major section, level-3 (###) ` +
        `for subsections, short paragraphs, and bullet or numbered lists for anything list-like — never one long ` +
        `unbroken paragraph. If the topic involves writing or reading actual code, include a real, runnable code ` +
        `snippet in a fenced code block tagged with its language (e.g. \`\`\`python, \`\`\`javascript, \`\`\`sql) — ` +
        `never describe code in prose when a snippet would be clearer. If the topic involves any mathematical ` +
        `formula, equation, or calculation, write it using LaTeX syntax ($inline$ or $$block$$). If the topic ` +
        `involves a process, algorithm, architecture, or set of relationships that would be clearer as a diagram, ` +
        `include one using a fenced \`\`\`mermaid code block (flowchart or sequence diagram syntax). Only include a ` +
        `code snippet, formula, or diagram when it genuinely helps understanding — do not force one in. Keep the ` +
        `notes focused, around 250-450 words excluding any code or diagram blocks.`
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
        `logistics/culture-fit style questions. Each sampleAnswer is markdown: 2-4 sentences for most categories, ` +
        `formatted as short paragraphs and bullet points where that reads more clearly than one block of prose. For ` +
        `"coding" questions specifically, sampleAnswer MUST include a real, working code solution inside a fenced ` +
        `code block tagged with its language (e.g. \`\`\`python or \`\`\`javascript), plus 1-2 sentences explaining ` +
        `the approach and its time/space complexity — never describe the code only in prose. Return JSON matching ` +
        `exactly: ` +
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
        `the learner they can type "/" to generate a roadmap, mind map, flashcards, a resume skill-gap analysis, or ` +
        `find learning videos for this space — but don't force that reminder into every reply.\n\n${transcript}\n\nAssistant:`
    );
  }

  interpretChatIntent(message: string) {
    return this.completeJson<ChatIntent>(
      `A learner typed or spoke this message into a learning-app chat box: "${message}". Decide what they want. ` +
        `Return JSON matching exactly: { "action": "roadmap"|"mindmap"|"flashcards"|"todo"|"chat", "topic": string }. ` +
        `Use "roadmap" if they want a structured study plan or are stating a single learning goal (e.g. "become a...", ` +
        `"learn X", "I want to learn..."). Use "mindmap" only if they explicitly ask for a mind map or to break a topic ` +
        `into branches/concepts. Use "flashcards" only if they explicitly ask for flashcards or cards to memorize. ` +
        `Use "todo" if they are listing one or more concrete tasks, errands, appointments, or deadlines they need to ` +
        `get done — this is NOT a learning goal — such as a stream-of-consciousness list of things to do (e.g. "buy ` +
        `groceries, and then I have an exam next month, and I need to finish this pitch deck tonight"), a reminder, ` +
        `or an explicit to-do/task-list request. Use "chat" if the message is a question, greeting, or anything that ` +
        `isn't clearly asking to generate one of those things. "topic" is a short (under 10 words) restatement of ` +
        `what to generate content about — for "chat" or "todo" just repeat the message.`
    );
  }

  explainSelection(text: string) {
    const trimmed = text.trim();
    const isSingleWord = trimmed.length > 0 && !/\s/.test(trimmed);

    if (isSingleWord) {
      return this.completeJson<SelectionExplanation>(
        `Define this single word or short term as it would be understood in an educational context: "${trimmed}". ` +
          `Return JSON matching exactly: { "term": string, "explanation": string (a clear, simple 1-2 sentence ` +
          `definition), "example": string (one short sentence showing the word used naturally in context) }.`
      );
    }

    return this.completeJson<SelectionExplanation>(
      `Rewrite the following passage from a learner's study notes into a much simpler, plain-language explanation ` +
        `(2-3 sentences), as if explaining it to someone completely new to the topic. Return JSON matching exactly: ` +
        `{ "term": string (a short 3-6 word label summarizing what this passage is about), "explanation": string, ` +
        `"example": null }.\n\nPASSAGE:\n${trimmed}`
    );
  }

  generatePrioritizedTasks(brainDump: string, referenceDate: string) {
    return this.completeJson<GeneratedTaskDraft[]>(
      `A learner spoke or typed this stream-of-consciousness list of things they need to do: "${brainDump}". ` +
        `Today's date is ${referenceDate}. Split it into individual, distinct tasks. For each task, resolve any ` +
        `relative time reference (e.g. "tonight", "next week", "one month after") into an absolute date based on ` +
        `today's date, and assign a priority based on urgency and how close the deadline is — a task due today or ` +
        `tonight is "high", a task with any other firm date is usually "medium", and a task with no time reference ` +
        `at all is "low". Exception: career/academic tasks with real consequences if missed — interviews, project ` +
        `reports, presentations, exams, assignments, resumes, proposals, certifications — must never be "low": use ` +
        `"high" if they have any date, otherwise "medium". Return JSON matching exactly: [{ "title": string (short, actionable, under 10 words), ` +
        `"priority": "high"|"medium"|"low", "dueDate": string|null (YYYY-MM-DD, null if no time reference was given) }]. ` +
        `Order the array by priority (high first) then by dueDate (soonest first, nulls last).`
    );
  }

  generateWeeklyPlanSummary({ focusItems, rescheduledCount }: WeeklyPlanSummaryInput) {
    const itemLines =
      focusItems.length > 0
        ? focusItems.map((item) => `- ${item.day} (${item.source}${item.priority ? `, ${item.priority} priority` : ''}): ${item.title}`).join('\n')
        : '(nothing scheduled this week)';
    return this.completeJson<WeeklyPlanSummary>(
      `A learner's tasks for the next 7 days have just been organized deterministically (not by you) into this ` +
        `schedule:\n${itemLines}\n\n` +
        `${rescheduledCount > 0 ? `${rescheduledCount} overdue or unscheduled task(s) were moved to a specific day this week to avoid pile-ups. ` : ''}` +
        `Write a short, genuinely encouraging summary of this week as their coach — be specific to what's actually ` +
        `on the list, not generic. Return JSON matching exactly: { "summary": string (2-4 sentences, mention the ` +
        `total task count and call out anything time-sensitive), "dailyRhythm": string (1-2 sentences suggesting a ` +
        `realistic daily study rhythm, e.g. tackle the hardest item earlier in the day) }.`
    );
  }
}
