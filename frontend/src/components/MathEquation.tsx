import React, { useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface MathEquationProps {
  math: string;
  displayMode?: boolean;
  className?: string;
  ariaLabel?: string;
}

export const MathEquation: React.FC<MathEquationProps> = ({ 
  math, 
  displayMode = true,
  className = '',
  ariaLabel
}) => {
  const html = useMemo(() => {
    try {
      return katex.renderToString(math, {
        throwOnError: false,
        displayMode,
        output: 'htmlAndMathml'
      });
    } catch (err) {
      return `<code class="font-mono text-xs text-rose-500">${math}</code>`;
    }
  }, [math, displayMode]);

  return (
    <div 
      className={`katex-container select-text ${displayMode ? 'my-2 flex justify-center overflow-x-auto py-2' : 'inline'} ${className}`}
      aria-label={ariaLabel || math}
      role="math"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};
