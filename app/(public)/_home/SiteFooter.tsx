import Link from 'next/link';
import { COMPARATOR_PATH, comparatorHref, LOCALES, type Locale } from '@/lib/i18n/comparator';
import { HOME_DICTS } from '@/lib/i18n/home';
import { FlagRound } from '@/app/(public)/_components/Flags';

/**
 * Pied de page public — reprend le langage visuel de la capsule (relief, drapeaux
 * ronds SVG). Ne porte QUE des liens réels : le comparateur et le journal
 * existent, pas encore les guides ni les pages légales — on n'affiche pas de
 * lien mort (positionnement honnêteté, §9).
 *
 * Il porte la transparence du produit : la DATE de génération des données du
 * comparateur, comme le comparateur l'affiche déjà. `generatedAt` vient de la
 * page (ISR) — pas de `new Date()` ici : la date est celle du snapshot, l'année
 * du copyright en est dérivée (`slice(0,4)`), pas celle du rendu.
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
  const year = generatedAt.slice(0, 4);

  return (
    <footer className="pub-footer">
      <div className="pub-footer-inner">
        <div className="pub-footer-top">
          <div className="pub-footer-brand">
            <Link href={`/${locale}`} className="pub-footer-logo" aria-label="Tradegrape">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/logo.svg" alt="Tradegrape" className="pub-footer-logo-img" />
            </Link>
            <p className="pub-footer-tag">{d.footerTagline}</p>
          </div>

          <nav className="pub-footer-col" aria-label={d.footerNavTitle}>
            <span className="pub-footer-ct">{d.footerNavTitle}</span>
            <Link href={comparatorHref(locale)} className="pub-footer-link">{d.footerCompare}</Link>
            {/* Marketing : le journal pousse vers l'inscription gratuite. */}
            <Link href="/signup" className="pub-footer-link">{d.footerJournal}</Link>
          </nav>

          <nav className="pub-footer-col" aria-label={d.footerAccountTitle}>
            <span className="pub-footer-ct">{d.footerAccountTitle}</span>
            <Link href="/login" className="pub-footer-link">{d.footerSignin}</Link>
            <Link href="/signup" className="pub-footer-link">{d.footerStart}</Link>
          </nav>

          <div className="pub-footer-col">
            <span className="pub-footer-ct">{d.footerLangTitle}</span>
            <div className="pub-footer-langs">
              {LOCALES.map((x) => (
                <Link
                  key={x}
                  href={`/${x}`}
                  hrefLang={x}
                  aria-label={x === 'fr' ? 'Français' : 'English'}
                  aria-current={x === locale ? 'true' : undefined}
                  className={`pub-footer-lang${x === locale ? ' is-on' : ''}`}
                >
                  <FlagRound locale={x} />
                </Link>
              ))}
            </div>
            {/* Lien texte vers l'autre langue, cohérent avec hreflang (SEO/a11y). */}
            <Link href={`/${other}`} hrefLang={other} className="sr-only">
              {other === 'fr' ? 'Version française' : 'English version'} — /{COMPARATOR_PATH[other]}
            </Link>
          </div>
        </div>

        <div className="pub-footer-bottom">
          <span>© <span className="num">{year}</span> Tradegrape — {d.footerRights}</span>
          <span className="pub-footer-data">
            <span className="pub-footer-dot" aria-hidden="true" />
            {d.footerDataAsOf} <span className="num">{generatedAt.slice(0, 10)}</span>
          </span>
        </div>
      </div>
    </footer>
  );
}
