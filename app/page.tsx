import Link from "next/link";

export default function Home() {
  return (
    <main className="relative flex flex-1 items-center justify-center overflow-hidden px-6 py-24">
      {/* Glows ambiants (classes définies dans globals.css) */}
      <div className="glow glow-a" style={{ top: "-8%", left: "-6%" }} />
      <div className="glow glow-b" style={{ bottom: "-12%", right: "-8%" }} />
      <div className="glow glow-c" style={{ top: "30%", left: "40%" }} />

      <section className="glass relative z-10 w-full max-w-xl px-10 py-12 text-center">
        <span
          className="text-xs font-semibold uppercase tracking-[0.2em]"
          style={{ color: "var(--ink3)" }}
        >
          Comparateur · Journal · Futures
        </span>

        <h1 className="mt-4 text-5xl font-extrabold leading-tight">
          <span className="grad-text">Tradawave</span>
        </h1>

        <p className="mt-5 text-lg" style={{ color: "var(--ink2)" }}>
          « Ne choisis pas ta prop firm. Teste-la d'abord. »
        </p>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/signup" className="btn-grad">
            Ouvrir mon journal gratuit
          </Link>
          <Link href="/login" className="btn-ghost">
            Se connecter
          </Link>
        </div>
      </section>
    </main>
  );
}
