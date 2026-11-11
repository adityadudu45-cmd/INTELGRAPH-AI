import { useEffect, useRef } from 'react';
import useReducedMotion from '@/hooks/useReducedMotion';

/**
 * A single red light that trails the pointer across the public page.
 * Rendered once, never on top of content, and disabled for reduced motion or touch.
 */
export default function CursorGlow() {
  const ref = useRef(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || reduced) return undefined;
    if (window.matchMedia('(pointer: coarse)').matches) return undefined;

    let raf = 0;
    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;
    let x = targetX;
    let y = targetY;

    const onMove = (event) => {
      targetX = event.clientX;
      targetY = event.clientY;
    };

    const loop = () => {
      raf = requestAnimationFrame(loop);
      x += (targetX - x) * 0.1;
      y += (targetY - y) * 0.1;
      el.style.transform = `translate3d(${x - 260}px, ${y - 260}px, 0)`;
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    raf = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('pointermove', onMove);
      cancelAnimationFrame(raf);
    };
  }, [reduced]);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none fixed left-0 top-0 z-[5] hidden h-[520px] w-[520px] rounded-full opacity-80 mix-blend-screen md:block"
      style={{ background: 'radial-gradient(circle, hsl(var(--neon) / 0.10), transparent 62%)' }}
    />
  );
}