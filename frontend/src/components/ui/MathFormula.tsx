import { useMemo } from 'react';
import katex from 'katex';

export interface MathFormulaProps {
  tex: string;
  block?: boolean;
  className?: string;
  description?: string;
  ariaLabel?: string;
}

export function MathFormula({
  tex,
  block = false,
  className = '',
  description,
  ariaLabel,
}: MathFormulaProps) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(tex, {
        displayMode: block,
        throwOnError: false,
        trust: true,
      });
    } catch {
      return `<code class="font-mono text-cyan-300">${tex}</code>`;
    }
  }, [tex, block]);

  if (block) {
    return (
      <figure
        role="region"
        aria-label={ariaLabel || description || 'Mathematical formula'}
        className={`my-3 overflow-x-auto rounded-lg border border-line-strong/80 bg-ink-950/90 p-4 text-center text-slate-100 shadow-inner ${className}`}
      >
        <div
          className="inline-block text-left text-sm md:text-base text-cyan-100 font-serif"
          dangerouslySetInnerHTML={{ __html: html }}
        />
        {description && (
          <figcaption className="mt-2 text-center text-[11px] font-sans text-slate-400 italic">
            {description}
          </figcaption>
        )}
      </figure>
    );
  }

  return (
    <span
      role="math"
      aria-label={ariaLabel || tex}
      className={`inline-block font-serif text-cyan-200 ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
