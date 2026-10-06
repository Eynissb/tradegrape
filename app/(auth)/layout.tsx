import Image from 'next/image';
import Link from 'next/link';
import AuthArt from './AuthArt';
import AuthWave from './AuthWave';

/**
 * Écrans d'authentification en SPLIT-SCREEN : panneau promo de marque à gauche
 * (masqué en mobile), formulaire à droite. Le panneau promo reprend le langage
 * « mesh glow » du hero / de la section alertes (blobs animés indigo→fuchsia→
 * magenta). L'auth elle-même (server actions) est inchangée.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="ui auth-split">
      <aside className="auth-promo">
        <div className="auth-promo-glow" aria-hidden="true">
          <span className="auth-promo-blob auth-promo-blob--1" />
          <span className="auth-promo-blob auth-promo-blob--2" />
          <span className="auth-promo-blob auth-promo-blob--3" />
        </div>
        <AuthWave />

        <Link href="/" className="auth-promo-logo" aria-label="Tradegrape — accueil">
          <Image src="/brand/logo.png" alt="Tradegrape" width={176} height={44} priority />
        </Link>

        <AuthArt />

        <div className="auth-promo-body">
          <span className="auth-promo-eyebrow">Comparateur · Journal · Futures</span>
          <h2 className="auth-promo-title">Teste ta prop firm avant de payer.</h2>
          <p className="auth-promo-sub">
            Prix TTC réels, règles vérifiées, santé réelle des firms. Puis journalise
            tes comptes et sache si ton challenge va vraiment passer.
          </p>
        </div>
      </aside>

      <section className="auth-panel">
        <div className="auth-panel-inner">
          <Link href="/" className="auth-panel-logo" aria-label="Tradegrape — accueil">
            <Image src="/brand/logo.png" alt="Tradegrape" width={156} height={39} priority />
          </Link>
          {children}
        </div>
      </section>
    </main>
  );
}
