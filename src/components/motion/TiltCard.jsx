import { useRef } from 'react';
import { cn } from '@/lib/utils';
import useReducedMotion from '@/hooks/useReducedMotion';

/** Subtle perspective tilt that follows the pointer. */
export default function TiltCard({ children, className, strength = 7 }) {
  const ref = useRef(null);
  const reduced = useReducedMotion();

  const handleMove = (event) => {
    if (reduced) return;
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width - 0.5;
    const py = (event.clientY - rect.top) / rect.height - 0.5;
    el.style.transform = `perspective(1100px) rotateY(${(px * strength).toFixed(2)}deg) rotateX(${(-py * strength).toFixed(2)}deg) translate3d(0,0,0)`;
    el.style.setProperty('--ig-glow-x', `${((px + 0.5) * 100).toFixed(1)}%`);
    el.style.setProperty('--ig-glow-y', `${((py + 0.5) * 100).toFixed(1)}%`);
  };

  const reset = () => {
    const el = ref.current;
    if (!el) return;
    el.style.transform = 'perspective(1100px) rotateY(0deg) rotateX(0deg)';
  };

  return (
    <div
      ref={ref}
      onPointerMove={handleMove}
      onPointerLeave={reset}
      className={cn('transition-transform duration-300 ease-out will-change-transform', className)}
    >
      {children}
    </div>
  );
}