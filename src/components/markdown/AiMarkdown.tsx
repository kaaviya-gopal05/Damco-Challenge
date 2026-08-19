import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { MermaidBlock } from '@/components/markdown/MermaidBlock';
import { CodeBlock } from '@/components/markdown/CodeBlock';

export function AiMarkdown({ content }: { content: string }) {
  return (
    <div className="prose prose-sm max-w-none text-ink-700 prose-headings:font-semibold prose-headings:text-ink-900 prose-h1:text-lg prose-h2:text-base prose-h3:text-sm prose-p:leading-relaxed prose-strong:text-ink-900 prose-a:text-brand-600 prose-li:marker:text-ink-400 prose-code:before:content-none prose-code:after:content-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          code(props) {
            const { className, children } = props;
            const languageMatch = /language-(\w+)/.exec(className ?? '');

            // No language class = inline `code`, not a fenced ```block``` — keep those as
            // simple styled spans rather than routing them through the full code-block UI.
            if (!languageMatch) {
              return <code className="rounded bg-ink-100 px-1.5 py-0.5 text-[0.85em] text-ink-800">{children}</code>;
            }

            const language = languageMatch[1];
            const codeText = String(children).replace(/\n$/, '');
            if (language === 'mermaid') {
              return <MermaidBlock code={codeText} />;
            }
            return <CodeBlock code={codeText} language={language} />;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
