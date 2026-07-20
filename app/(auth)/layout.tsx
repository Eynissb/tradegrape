import Link from 'next/link';

/** Enveloppe centrée + glows pour les écrans d'authentification. */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="relative flex flex-1 items-center justify-center overflow-hidden px-6 py-16">
      <div className="glow glow-a" style={{ top: '-10%', left: '-8%' }} />
      <div className="glow glow-b" style={{ bottom: '-14%', right: '-8%' }} />

      <div className="relative z-10 w-full max-w-md">
        <Link
          href="/"
          className="mb-7 flex items-center justify-center gap-3"
          style={{ textDecoration: 'none', color: 'var(--ink)' }}
        >
          <span className="logomark h-9 w-9">
            <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
              <path
                d="M3 17l5-6 4 4 5-8 4 5"
                stroke="var(--on-accent)"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: '20px',
              letterSpacing: '-0.5px',
            }}
          >
            Tradawave
          </span>
        </Link>

        {children}
      </div>
    </main>
  );
}
