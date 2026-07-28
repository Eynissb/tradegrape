import { notFound } from 'next/navigation';
import { LOCALES, isLocale, type Locale } from '@/lib/i18n/comparator';
import PublicHeader from '@/app/(public)/_components/PublicHeader';

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
      {/* Canvas PLAT (réf. propfirmmatch) : le noir domine, le contraste vient des
          accents saturés — plus de blobs violets qui lavent la page. */}

      {/* Header fondu dans le hero : transparent en haut, solide au scroll. */}
      <PublicHeader locale={l} />

      {children}
    </div>
  );
}
