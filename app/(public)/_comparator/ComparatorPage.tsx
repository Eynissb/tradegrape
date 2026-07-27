import { loadPublicCatalog } from '@/lib/catalog/query';
import { COMPARATOR_PATH, DICTS, comparatorHref, type Locale } from '@/lib/i18n/comparator';
import ComparatorView from './ComparatorView';

/**
 * Implémentation partagée des deux routes canoniques (`/fr/comparateur`,
 * `/en/compare`). Les fichiers de route ne font que fixer la locale et refuser
 * les croisements (`/fr/compare` → 404), pour éviter le contenu dupliqué.
 */

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://tradegrape.com';

export function comparatorMetadata(locale: Locale) {
  const d = DICTS[locale];
  const path = comparatorHref(locale);
  return {
    title: d.metaTitle,
    description: d.metaDescription,
    alternates: {
      canonical: `${SITE}${path}`,
      languages: {
        fr: `${SITE}/fr/${COMPARATOR_PATH.fr}`,
        en: `${SITE}/en/${COMPARATOR_PATH.en}`,
      },
    },
    openGraph: {
      title: d.metaTitle,
      description: d.metaDescription,
      url: `${SITE}${path}`,
      locale,
      type: 'website' as const,
    },
  };
}

export default async function ComparatorPage({ locale }: { locale: Locale }) {
  const d = DICTS[locale];
  const { offers, platformNames, generatedAt } = await loadPublicCatalog();

  /* JSON-LD : liste d'offres. On n'y met QUE des prix connus — déclarer un prix
     absent en 0 dans des données structurées serait un mensonge lisible par une
     machine, donc pire qu'à l'écran. */
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: d.metaTitle,
    numberOfItems: offers.length,
    itemListElement: offers.slice(0, 50).map((o, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'Product',
        name: `${o.firm.name} ${o.plan.name} ${o.size.toLocaleString('fr-FR')}`,
        brand: { '@type': 'Brand', name: o.firm.name },
        ...(o.totalPrice.known
          ? {
              offers: {
                '@type': 'Offer',
                price: o.totalPrice.value,
                priceCurrency: o.currency,
                availability: 'https://schema.org/InStock',
              },
            }
          : {}),
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        // Données structurées : construites côté serveur, aucune entrée utilisateur.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* App plein écran : la vue cliente fournit son propre chrome (logo, journal,
          barre d'actions, filtres pleine hauteur). Pas de titre marketing ici. */}
      <ComparatorView
        offers={offers}
        platformNames={platformNames}
        d={d}
        locale={locale}
        generatedAt={generatedAt}
      />
    </>
  );
}
