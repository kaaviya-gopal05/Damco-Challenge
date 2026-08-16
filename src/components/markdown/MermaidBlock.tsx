import { useEffect, useId, useState } from 'react';

let initialized = false;

export function MermaidBlock({ code }: { code: string }) {
  const id = useId().replace(/:/g, '');
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    import('mermaid').then(async ({ default: mermaid }) => {
      if (!initialized) {
        mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: 'neutral', fontFamily: 'inherit' });
        initialized = true;
      }
      try {
        const { svg } = await mermaid.render(`mermaid-${id}`, code);
        if (!cancelled) setSvg(svg);
      } catch {
        if (!cancelled) setError(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [code, id]);

  if (error) return null;
  if (!svg) {
    return <div className="my-4 h-24 animate-pulse rounded-xl bg-ink-100" />;
  }
  return (
    <div
      className="my-4 flex justify-center overflow-x-auto rounded-xl border border-ink-100 bg-white p-4"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
