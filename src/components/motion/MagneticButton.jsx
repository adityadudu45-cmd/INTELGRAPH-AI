import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import useReducedMotion from '@/hooks/useReducedMotion';

const VARIANTS = {
  primary:
    'bg-primary text-primary-foreground shadow-[0_0_30px_-8px_hsl(var(--neon)/0.95)] hover:shadow-[0_0_46px_-8px_hsl(var(--neon)/1)]',
  ghost:
    'border border-white/12 bg-white/[0.02] text-foreground hover:border-primary/60 hover:bg-primary/[0.07]'
};

/** Button or link with a magnetic pointer response and neon sheen. */
export default function MagneticButton({ to, href, onClick, children, variant = 'primary', className, type = 'button', disabled }) {
  const ref = useRef(null);
  const reduced = useReducedMotion();

  const move = (event) => {
    if (reduced) return;
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const dx = (event.clientX - rect.left) / rect.width - 0.5;
    const dy = (event.clientY - rect.top) / rect.height - 0.5;
    el.style.transform = `translate3d(${(dx * 10).toFixed(2)}px, ${(dy * 8).toFixed(2)}px, 0)`;
  };

  const reset = () => {
    const el = ref.current;
    if (!el) return;
    el.style.transform = 'translate3d(0,0,0)';
  };

  const classes = cn(
    'group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-sm px-6 py-3 font-display text-[12px] font-semibold uppercase tracking-[0.18em] transition-[transform,box-shadow,border-color,background-color] duration-200',
    VARIANTS[variant],
    disabled && 'pointer-events-none opacity-50',
    className
  );

  const inner = (
    <>
      <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
      <span className="relative flex items-center gap-2">{children}</span>
    </>
  );

  const handlers = { onPointerMove: move, onPointerLeave: reset, onClick };

  if (to) {
    return (
      <Link ref={ref} to={to} className={classes} {...handlers}>
        {inner}
      </Link>
    );
  }
  if (href) {
    return (
      <a ref={ref} href={href} className={classes} {...handlers}>
        {inner}
      </a>
    );
  }
  return (
    <button ref={ref} type={type} className={classes} disabled={disabled} {...handlers}>
      {inner}
    </button>
  );
}