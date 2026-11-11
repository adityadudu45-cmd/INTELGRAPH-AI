import { useEffect, useRef } from 'react';
import useReducedMotion from '@/hooks/useReducedMotion';

const NODE_COUNT = 112;

function fibonacciSphere(count) {
  const points = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i += 1) {
    const y = 1 - (i / (count - 1)) * 2;
    const radius = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = golden * i;
    const jitter = 0.94 + ((i * 41) % 100) / 620;
    points.push({
      x: Math.cos(theta) * radius * jitter,
      y: y * jitter,
      z: Math.sin(theta) * radius * jitter
    });
  }
  return points;
}

function buildLinks(points) {
  const links = [];
  const seen = new Set();
  points.forEach((p, i) => {
    const nearest = points
      .map((q, j) => ({ j, d: (p.x - q.x) ** 2 + (p.y - q.y) ** 2 + (p.z - q.z) ** 2 }))
      .filter((o) => o.j !== i)
      .sort((a, b) => a.d - b.d)
      .slice(0, 2);
    nearest.forEach(({ j }) => {
      const key = i < j ? `${i}-${j}` : `${j}-${i}`;
      if (seen.has(key)) return;
      seen.add(key);
      links.push(i < j ? [i, j] : [j, i]);
    });
  });
  return links;
}

/**
 * Hero visual: a holographic intelligence sphere drawn on canvas —
 * depth-sorted nodes, volumetric red core, drifting particles and cursor lighting.
 * Static single frame when the visitor prefers reduced motion.
 */
export default function HeroScene({ className = '' }) {
  const canvasRef = useRef(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    const nodes = fibonacciSphere(NODE_COUNT);
    const links = buildLinks(nodes);
    const particles = Array.from({ length: 58 }, (_, i) => ({
      x: Math.random() * 2 - 1,
      y: Math.random() * 2 - 1,
      z: 0.15 + Math.random() * 0.85,
      r: 0.6 + Math.random() * 1.5,
      phase: Math.random() * Math.PI * 2 + i
    }));

    let width = 0;
    let height = 0;
    let raf = 0;
    let visible = true;
    const pointer = { x: 0, y: 0, tx: 0, ty: 0, px: 0, py: 0, active: false };
    const started = performance.now();

    const project = (nx, ny, nz, spin, tilt, radius, cx, cy) => {
      const cosSpin = Math.cos(spin);
      const sinSpin = Math.sin(spin);
      const cosTilt = Math.cos(tilt);
      const sinTilt = Math.sin(tilt);

      const rx = nx * cosSpin - nz * sinSpin;
      const rz = nx * sinSpin + nz * cosSpin;
      const ry = ny * cosTilt - rz * sinTilt;
      const rz2 = ny * sinTilt + rz * cosTilt;

      const focal = radius * 2.7;
      const persp = focal / (focal + rz2 * radius);
      return {
        x: cx + rx * radius * persp,
        y: cy + ry * radius * persp,
        depth: rz2,
        persp
      };
    };

    function renderFrame(time) {
      ctx.clearRect(0, 0, width, height);
      const cx = width * 0.5;
      const cy = height * 0.47;
      const radius = Math.min(width, height) * 0.31;
      const pulse = 0.5 + 0.5 * Math.sin(time * 0.0009);
      const spin = reduced ? 0.85 : time * 0.00011 + pointer.x * 0.4;
      const tilt = -0.26 + (reduced ? 0 : pointer.y * 0.2);

      const halo = ctx.createRadialGradient(cx, cy, radius * 0.04, cx, cy, radius * 2.5);
      halo.addColorStop(0, `rgba(255,26,66,${(0.32 + pulse * 0.1).toFixed(3)})`);
      halo.addColorStop(0.26, 'rgba(255,0,60,0.15)');
      halo.addColorStop(0.6, 'rgba(150,0,34,0.055)');
      halo.addColorStop(1, 'rgba(255,0,60,0)');
      ctx.fillStyle = halo;
      ctx.fillRect(0, 0, width, height);

      const projected = nodes.map((n) => project(n.x, n.y, n.z, spin, tilt, radius, cx, cy));

      // orbital rings
      [0.62, 0.86].forEach((orbit, ringIndex) => {
        ctx.beginPath();
        for (let s = 0; s <= 96; s += 1) {
          const a = (s / 96) * Math.PI * 2;
          const p = project(Math.cos(a) * orbit, Math.sin(a) * orbit * 0.16, Math.sin(a) * orbit, spin + ringIndex * 0.6, tilt, radius, cx, cy);
          if (s === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        }
        ctx.strokeStyle = `rgba(255,0,60,${0.10 + pulse * 0.06})`;
        ctx.lineWidth = 0.8;
        ctx.stroke();
      });

      // connections
      for (let i = 0; i < links.length; i += 1) {
        const a = projected[links[i][0]];
        const b = projected[links[i][1]];
        const near = Math.max(0, Math.min(1, (2 - a.depth - b.depth) / 2.4));
        ctx.strokeStyle = `rgba(255,0,60,${(0.05 + near * near * 0.45).toFixed(3)})`;
        ctx.lineWidth = 0.5 + near * 1.1;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }

      // nodes, far to near
      const order = projected.map((_, i) => i).sort((a, b) => projected[b].depth - projected[a].depth);
      order.forEach((i) => {
        const p = projected[i];
        const near = Math.max(0, Math.min(1, (1 - p.depth) / 1.8));
        const dotR = 0.8 + near * 2.6;
        ctx.fillStyle = near > 0.72
          ? `rgba(255,255,255,${(0.35 + near * 0.6).toFixed(2)})`
          : `rgba(255,0,60,${(0.24 + near * 0.7).toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, dotR, 0, Math.PI * 2);
        ctx.fill();
        if (near > 0.82) {
          ctx.strokeStyle = 'rgba(255,70,110,0.28)';
          ctx.lineWidth = 0.7;
          ctx.beginPath();
          ctx.arc(p.x, p.y, dotR + 4, 0, Math.PI * 2);
          ctx.stroke();
        }
      });

      // intelligence core
      const coreR = radius * (0.34 + pulse * 0.02);
      const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR);
      core.addColorStop(0, 'rgba(255,255,255,0.92)');
      core.addColorStop(0.22, 'rgba(255,66,104,0.62)');
      core.addColorStop(0.55, 'rgba(255,0,60,0.22)');
      core.addColorStop(1, 'rgba(255,0,60,0)');
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
      ctx.fill();

      // particle field with parallax
      particles.forEach((pt) => {
        const drift = Math.sin(time * 0.0004 + pt.phase) * 9;
        const px = cx + pt.x * width * 0.44 * (0.55 + pt.z * 0.6) - pointer.x * 30 * pt.z + drift;
        const py = cy + pt.y * height * 0.4 * (0.55 + pt.z * 0.6) - pointer.y * 24 * pt.z + drift * 0.6;
        ctx.fillStyle = `rgba(255,${Math.round(50 + pt.z * 130)},120,${(0.07 + pt.z * 0.32).toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(px, py, pt.r * (0.55 + pt.z), 0, Math.PI * 2);
        ctx.fill();
      });

      // cursor-follow lighting
      if (!reduced && pointer.active) {
        const glow = ctx.createRadialGradient(pointer.px, pointer.py, 0, pointer.px, pointer.py, radius * 1.15);
        glow.addColorStop(0, 'rgba(255,30,70,0.16)');
        glow.addColorStop(0.45, 'rgba(255,0,60,0.05)');
        glow.addColorStop(1, 'rgba(255,0,60,0)');
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, width, height);
        ctx.globalCompositeOperation = 'source-over';
      }
    }

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      renderFrame(reduced ? 0 : performance.now() - started);
    };

    const onPointerMove = (event) => {
      const rect = canvas.getBoundingClientRect();
      pointer.tx = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
      pointer.ty = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
      pointer.px = event.clientX - rect.left;
      pointer.py = event.clientY - rect.top;
      pointer.active = pointer.px > 0 && pointer.py > 0 && pointer.px < rect.width && pointer.py < rect.height;
    };

    const onPointerLeave = () => {
      pointer.tx = 0;
      pointer.ty = 0;
      pointer.active = false;
    };

    resize();

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
    if (ro) ro.observe(canvas);

    const io = typeof IntersectionObserver !== 'undefined'
      ? new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }, { threshold: 0 })
      : null;
    if (io) io.observe(canvas);

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerleave', onPointerLeave);

    const loop = (now) => {
      raf = requestAnimationFrame(loop);
      pointer.x += (pointer.tx - pointer.x) * 0.055;
      pointer.y += (pointer.ty - pointer.y) * 0.055;
      if (!visible || document.hidden) return;
      renderFrame(now - started);
    };

    if (reduced) renderFrame(0);
    else raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerleave', onPointerLeave);
      if (ro) ro.disconnect();
      if (io) io.disconnect();
    };
  }, [reduced]);

  return <canvas ref={canvasRef} aria-hidden="true" className={className} />;
}