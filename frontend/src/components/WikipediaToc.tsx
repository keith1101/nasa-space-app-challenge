import React, { useState } from 'react';
import { List, ChevronDown, ChevronUp } from 'lucide-react';

export interface TocSubItem {
  id: string;
  number: string;
  label: string;
}

export interface TocItem {
  id: string;
  number: string;
  label: string;
  subItems?: TocSubItem[];
}

export interface WikipediaTocData {
  title: string;
  hideLabel: string;
  showLabel: string;
  items: TocItem[];
}

interface WikipediaTocProps {
  toc: WikipediaTocData;
  className?: string;
}

export const WikipediaToc: React.FC<WikipediaTocProps> = ({ toc, className = '' }) => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <nav 
      aria-label="Table of contents"
      className={`border border-[#a2a9b1] bg-[#f8f9fa] rounded-sm p-3.5 max-w-md my-4 font-sans text-xs text-spaceapps-nearblack shadow-xs ${className}`}
    >
      {/* Wikipedia Style TOC Header */}
      <div className="flex items-center justify-between border-b border-slate-300 pb-2">
        <div className="flex items-center space-x-1.5 font-bold text-sm text-spaceapps-nearblack">
          <List className="h-4 w-4 text-slate-700" />
          <span>{toc.title}</span>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          className="text-[11px] font-mono text-spaceapps-neonblue hover:underline cursor-pointer select-none px-1"
        >
          [{isOpen ? toc.hideLabel : toc.showLabel}]
        </button>
      </div>

      {/* Wikipedia Style TOC List */}
      {isOpen && (
        <ol className="mt-3 space-y-1.5 pl-1">
          {toc.items.map((item) => (
            <li key={item.id} className="leading-snug">
              <a
                href={`#${item.id}`}
                className="group inline-flex items-baseline text-spaceapps-neonblue hover:underline"
              >
                <span className="font-mono text-slate-600 font-bold mr-2 text-[11px] shrink-0">
                  {item.number}
                </span>
                <span className="font-medium text-slate-900 group-hover:text-spaceapps-neonblue">
                  {item.label}
                </span>
              </a>

              {/* Sub-items Level 2 */}
              {item.subItems && item.subItems.length > 0 && (
                <ol className="pl-6 mt-1 space-y-1">
                  {item.subItems.map((sub) => (
                    <li key={sub.id} className="leading-snug">
                      <a
                        href={`#${sub.id}`}
                        className="group inline-flex items-baseline text-slate-700 hover:text-spaceapps-neonblue hover:underline"
                      >
                        <span className="font-mono text-slate-500 mr-1.5 text-[10px] shrink-0">
                          {sub.number}
                        </span>
                        <span className="text-slate-600 group-hover:text-spaceapps-neonblue">
                          {sub.label}
                        </span>
                      </a>
                    </li>
                  ))}
                </ol>
              )}
            </li>
          ))}
        </ol>
      )}
    </nav>
  );
};
