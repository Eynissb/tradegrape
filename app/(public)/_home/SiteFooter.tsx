import Link from 'next/link';
import { COMPARATOR_PATH, comparatorHref, LOCALES, type Locale } from '@/lib/i18n/comparator';
import { HOME_DICTS } from '@/lib/i18n/home';

/**
 * Pied de page public. Porte la transparence qui va avec le positionnement :
 * la DATE de génération des données du comparateur, comme le comparateur
 * l'affiche déjà. Un visiteur voit quand la base a été rafraîchie.
 *
 * `generatedAt` est passé depuis la page (ISR) — pas de `new Date()` ici, la
 * date affichée est celle du snapshot du catalogue, pas celle du rendu.
 */
export default function SiteFooter({
  locale,
  generatedAt,
}: {
  locale: Locale;
  generatedAt: string;
}) {
  const d = HOME_DICTS[locale];
  const other = locale === 'fr' ? 'en' : 'fr';

  return (
    <footer className="home-footer">
      <div className="home-footer-top">
        <div className="home-footer-brand">
          <span className="grad-text home-footer-logo">Tradegrape</span>
          <p className="home-footer-tag">{d.footerTagline}</p>
        </div>

        <nav className="home-footer-col" aria-label={d.footerNavTitle}>
          <span className="home-footer-ct">{d.footerNavTitle}</span>
          <Link href={comparatorHref(locale)} className="home-footer-link">{d.footerCompare}</Link>
          {/* Marketing : le lien pousse vers l'inscription gratuite. */}
          <Link href="/signup" className="home-footer-link">{d.footerJournal}</Link>
        </nav>

        <nav className="home-footer-col" aria-label={d.footerLangTitle}>
          <span className="home-footer-ct">{d.footerLangTitle}</span>
          {LOCALES.map((x) => (
            <Link
              key={x}
              href={`/${x}`}
              hrefLang={x}
              className={`home-footer-link${x === locale ? ' is-on' : ''}`}
            >
              {x === 'fr' ? 'Français' : 'English'}
            </Link>
          ))}
          {/* Lien direct vers la home de l'autre langue, cohérent avec hreflang. */}
          <Link href={`/${other}`} hrefLang={other} className="sr-only">
            {other === 'fr' ? 'Version française' : 'English version'} — /{COMPARATOR_PATH[other]}
          </Link>
        </nav>
      </div>

      <div className="home-footer-bottom">
        <span>{d.footerRights}</span>
        <span className="home-footer-data">
          {d.footerDataAsOf} <span className="num">{generatedAt.slice(0, 10)}</span>
        </span>
      </div>
    </footer>
  );
}
