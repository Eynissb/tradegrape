import { notFound } from 'next/navigation';
import Link from 'next/link';
import { LOCALES, isLocale, comparatorHref, type Locale } from '@/lib/i18n/comparator';

/**
 * Coquille publique, une par langue. Les deux locales sont pré-générées :
 * la porte d'entrée SEO ne doit pas dépendre d'un rendu à la demande.
 */
export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export default async function PublicLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const l = locale as Locale;

  return (
    <div className="ui pub-shell">
      {/* Glows ambiants — décor, jamais porteur de donnée. */}
      <div className="glow glow-a" style={{ top: '-10%', left: '-8%' }} aria-hidden="true" />
      <div className="glow glow-b" style={{ bottom: '-14%', right: '-10%' }} aria-hidden="true" />

      {/* Barre full-width ; le contenu reste dans un conteneur centré. */}
      <header className="pub-header">
        <div className="pub-header-inner">
          <Link href={`/${l}`} className="pub-brand">
            <span className="grad-text">Tradegrape</span>
          </Link>
          <nav className="pub-nav">
            <Link href={comparatorHref(l)} className="pub-navlink">
              {l === 'fr' ? 'Comparateur' : 'Compare'}
            </Link>
            <Link href="/app" className="pub-navlink">
              {l === 'fr' ? 'Journal' : 'Journal'}
            </Link>
          </nav>
          {/* Bascule de langue : garde la page équivalente, pas la racine. */}
          <div className="pub-locales">
            {LOCALES.map((x) => (
              <Link
                key={x}
                href={comparatorHref(x)}
                className={`pub-locale${x === l ? ' is-on' : ''}`}
                hrefLang={x}
              >
                {x.toUpperCase()}
              </Link>
            ))}
          </div>
        </div>
      </header>

      {children}
    </div>
  );
}
