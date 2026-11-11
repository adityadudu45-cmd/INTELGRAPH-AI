import React from "react";

export default function AuthLayout({ icon: Icon, title, subtitle, footer, children }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10">
      <div className="pointer-events-none absolute inset-0 ig-grid-fine opacity-30" />
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[26rem] w-[40rem] -translate-x-1/2 bg-[radial-gradient(50%_60%_at_50%_50%,hsl(var(--neon)/0.22),transparent_72%)]" />
      <div className="pointer-events-none absolute inset-0 ig-vignette" />

      <div className="relative w-full max-w-md">
        <div className="mb-9 text-center">
          <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-sm border border-primary/45 bg-primary/10 shadow-[0_0_40px_-12px_hsl(var(--neon)/0.95)]">
            <Icon className="h-7 w-7 text-primary" aria-hidden="true" />
          </div>
          <h1 className="font-display text-2xl font-semibold uppercase tracking-[0.12em] text-foreground">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        <div className="ig-holo ig-clip relative rounded-sm p-7 sm:p-8">
          <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent" />
          {children}
        </div>
        {footer && <p className="mt-6 text-center text-sm text-muted-foreground">{footer}</p>}
      </div>
    </div>
  );
}