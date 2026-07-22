import Image from 'next/image';
import Link from 'next/link';

/** Enveloppe centrée + glows pour les écrans d'authentification. */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="ui relative flex flex-1 items-center justify-center overflow-hidden px-6 py-16">
      <div className="glow glow-a" style={{ top: '-10%', left: '-8%' }} />
      <div className="glow glow-b" style={{ bottom: '-14%', right: '-8%' }} />

      <div className="relative z-10 w-full max-w-md">
        <Link
          href="/"
          className="mb-7 flex items-center justify-center"
          aria-label="Tradegrape — accueil"
        >
          <Image
            src="/brand/logo.png"
            alt="Tradegrape"
            width={176}
            height={44}
            priority
          />
        </Link>

        {children}
      </div>
    </main>
  );
}
