import { useState, useRef, type ReactNode, type MouseEvent } from 'react';
import { cx } from '../ui';

export interface CardSpotlightProps {
  children: ReactNode;
  className?: string;
  spotlightColor?: string;
  radius?: number;
}

export function CardSpotlight({
  children,
  className,
  spotlightColor = 'rgba(34, 211, 238, 0.12)', // Default soft cyan glow
  radius = 350,
}: CardSpotlightProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setPosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cx(
        'relative overflow-hidden rounded-xl border border-line-strong/60 bg-ink-900/70 p-5 backdrop-blur-sm transition-all duration-300',
        className,
      )}
    >
      {/* Dynamic Cursor Spotlight Layer */}
      <div
        className="pointer-events-none absolute -inset-px transition-opacity duration-300"
        style={{
          opacity: isHovered ? 1 : 0,
          background: `radial-gradient(${radius}px circle at ${position.x}px ${position.y}px, ${spotlightColor}, transparent 80%)`,
        }}
      />
      {/* Card Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
