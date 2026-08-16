import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { MermaidBlock } from '@/components/markdown/MermaidBlock';

export function AiMarkdown({ content }: { content: string }) {
  return (
    <div className="prose prose-sm max-w-none text-ink-700 prose-headings:text-ink-900 prose-strong:text-ink-900 prose-a:text-brand-600">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          code(props) {
            const { className, children, ...rest } = props;
            const match = /language-mermaid/.exec(className ?? '');
            if (match) {
              return <MermaidBlock code={String(children).replace(/\n$/, '')} />;
            }
            return (
              <code className={className} {...rest}>
                {children}
              </code>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
