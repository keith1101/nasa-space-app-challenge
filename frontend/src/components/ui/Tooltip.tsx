import React from 'react';
import * as RadixTooltip from '@radix-ui/react-tooltip';
import { cx } from '../ui';

export function TooltipProvider({ children }: { children: React.ReactNode }) {
  return (
    <RadixTooltip.Provider delayDuration={150} skipDelayDuration={300}>
      {children}
    </RadixTooltip.Provider>
  );
}

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  className?: string;
  asChild?: boolean;
}

export function Tooltip({
  content,
  children,
  side = 'top',
  align = 'center',
  className,
  asChild = true,
}: TooltipProps) {
  if (!content) return <>{children}</>;

  return (
    <RadixTooltip.Root>
      <RadixTooltip.Trigger asChild={asChild}>{children}</RadixTooltip.Trigger>
      <RadixTooltip.Portal>
        <RadixTooltip.Content
          side={side}
          align={align}
          sideOffset={6}
          className={cx(
            'z-50 select-none rounded-lg border border-line-strong bg-ink-950/95 px-2.5 py-1.5 text-[11px] font-medium text-slate-200 shadow-xl backdrop-blur-md animate-in fade-in-0 zoom-in-95',
            className,
          )}
        >
          {content}
          <RadixTooltip.Arrow className="fill-ink-950" />
        </RadixTooltip.Content>
      </RadixTooltip.Portal>
    </RadixTooltip.Root>
  );
}
