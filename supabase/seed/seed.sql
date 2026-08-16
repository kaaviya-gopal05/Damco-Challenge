-- Optional seed data for local development. Populates the global catalogue tables
-- (skills, interview_questions) that the Career Intelligence feature reads from.
-- Safe to re-run: uses ON CONFLICT DO NOTHING keyed on natural uniqueness.

insert into skills (name, category, description) values
  ('Python', 'programming', 'General-purpose programming language widely used in data science and backend engineering'),
  ('SQL', 'data', 'Querying and manipulating relational databases'),
  ('Statistics', 'data', 'Probability, hypothesis testing, and statistical inference'),
  ('Machine Learning', 'data', 'Supervised, unsupervised, and reinforcement learning techniques'),
  ('Deep Learning', 'data', 'Neural networks, CNNs, RNNs, transformers'),
  ('Data Visualization', 'data', 'Communicating insights through charts and dashboards'),
  ('JavaScript', 'programming', 'Core language of the web'),
  ('TypeScript', 'programming', 'Typed superset of JavaScript'),
  ('React', 'frontend', 'Component-based UI library'),
  ('System Design', 'engineering', 'Designing scalable, reliable distributed systems'),
  ('Data Structures & Algorithms', 'engineering', 'Core CS fundamentals for coding interviews'),
  ('Product Sense', 'product', 'Judgement for prioritizing what to build and why'),
  ('A/B Testing', 'product', 'Designing and interpreting controlled experiments'),
  ('Communication', 'soft-skill', 'Explaining technical ideas clearly to any audience'),
  ('Cloud Infrastructure', 'engineering', 'AWS/GCP/Azure fundamentals, deployment, scaling')
on conflict (name) do nothing;

insert into interview_questions (career_track, category, question, sample_answer, difficulty) values
  ('data_scientist', 'technical', 'Explain the bias-variance tradeoff.', 'Bias is error from overly simplistic assumptions; variance is error from sensitivity to training data noise. Reducing one typically increases the other — the goal is the sweet spot that minimizes total generalization error.', 'intermediate'),
  ('data_scientist', 'technical', 'How would you handle a dataset with significant class imbalance?', 'Options include resampling (SMOTE, undersampling), class-weighted loss functions, choosing metrics like F1/PR-AUC instead of accuracy, and ensemble methods.', 'intermediate'),
  ('data_scientist', 'coding', 'Given a list of integers, find the two numbers that sum to a target value.', 'Use a hash map to store seen values and their indices, achieving O(n) time by checking target - current for each element.', 'beginner'),
  ('data_scientist', 'behavioral', 'Tell me about a time your analysis changed a business decision.', 'Use the STAR method: describe the Situation, the analytical Task, the Action you took, and the measurable Result on the business decision.', 'beginner'),
  ('software_engineer', 'system_design', 'Design a URL shortener.', 'Cover: hashing/base62 encoding for short codes, database schema, read-heavy caching strategy, redirect handling, and scaling considerations.', 'intermediate'),
  ('software_engineer', 'coding', 'Reverse a linked list.', 'Iterate with three pointers (prev, curr, next), reversing the `next` pointer at each step in O(n) time, O(1) space.', 'beginner'),
  ('software_engineer', 'technical', 'What is the difference between processes and threads?', 'Processes have isolated memory and are heavier to create; threads share memory within a process and are lighter, but require synchronization to avoid race conditions.', 'intermediate'),
  ('software_engineer', 'behavioral', 'Describe a conflict with a teammate and how you resolved it.', 'Use STAR: focus on listening to the other perspective, finding common ground tied to the shared goal, and the outcome for the team.', 'beginner'),
  ('product_manager', 'technical', 'How would you prioritize a backlog with limited engineering capacity?', 'Discuss a framework (RICE, impact/effort) and how you incorporate customer feedback, business goals, and technical debt into the ranking.', 'intermediate'),
  ('product_manager', 'hr', 'Why do you want to work here?', 'Tie your answer to the company''s mission, a specific product you admire, and how your background maps to their current priorities.', 'beginner'),
  ('ai_engineer', 'technical', 'What is the difference between fine-tuning and prompt engineering?', 'Fine-tuning updates model weights on a task-specific dataset; prompt engineering shapes the input to a frozen model to elicit the desired behavior without training.', 'intermediate'),
  ('ai_engineer', 'system_design', 'Design a RAG (retrieval-augmented generation) system for internal documentation search.', 'Cover: document chunking, embedding generation, a vector store, retrieval + reranking, and prompt construction with the retrieved context.', 'advanced'),
  ('business_analyst', 'technical', 'How do you validate that a metric is trustworthy before presenting it?', 'Check the data source and pipeline for known issues, cross-validate against a second source if possible, and sanity-check against domain expectations.', 'beginner'),
  ('business_analyst', 'resume', 'How should I quantify impact on my resume?', 'Use specific numbers tied to business outcomes (e.g. "reduced churn by 8% by identifying at-risk segments"), not just a list of tools used.', 'beginner'),
  ('data_analyst', 'coding', 'Write a SQL query to find the second-highest salary in an employees table.', 'Use `select max(salary) from employees where salary < (select max(salary) from employees)`, or `dense_rank()` for a more general nth-highest solution.', 'beginner')
on conflict do nothing;
