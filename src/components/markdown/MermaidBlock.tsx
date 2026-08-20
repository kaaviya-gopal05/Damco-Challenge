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
        // suppressErrorRendering is required to actually get a rejected promise on invalid
        // syntax — without it, mermaid.render() resolves with its own "Syntax error in text"
        // bomb-icon SVG instead of throwing, and the catch below never fires (the AI
        // occasionally generates a diagram with invalid syntax; this hides it instead of
        // showing users a raw parser error).
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'strict',
          theme: 'neutral',
          fontFamily: 'inherit',
          suppressErrorRendering: true,
        });
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
