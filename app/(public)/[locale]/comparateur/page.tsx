import { notFound } from 'next/navigation';
import ComparatorPage, { comparatorMetadata } from '@/app/(public)/_comparator/ComparatorPage';

/** Route canonique FR. ISR : le catalogue change rarement, le SEO veut du statique. */
export const revalidate = 3600;

/** Seul `/fr/comparateur` existe : `/en/comparateur` doit 404, pas dupliquer. */
export function generateStaticParams() {
  return [{ locale: 'fr' }];
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (locale !== 'fr') return {};
  return comparatorMetadata('fr');
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (locale !== 'fr') notFound();
  return <ComparatorPage locale="fr" />;
}
